import QRCode from 'qrcode';
import { computeCRC8 } from './crc8.ts';
import { computeTruncatedHmacSync, fromHex, toHex } from './crypto.ts';
import {
  FrameData,
  RawPayload,
  DynamicEnvelope,
  ActionMode,
  VerificationResult,
  CAPSULES_COUNT,
  GRID_NODES_COUNT,
  TOTAL_FRAMES
} from './types.ts';

function toHexByte(val: number): string {
  return (val & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

function bytesToHexUpper(bytes: ArrayLike<number>): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += toHexByte(bytes[i]!);
  }
  return out;
}

function hexToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

/**
 * Generates a deterministic XOR mask byte for a given cycleNonce and byte offset.
 * Ensures that even if the target URL is static, every cycle has completely different bytes
 * across all frames and no single frame leaks plain-text URL fragments.
 */
export function computeCycleMaskByte(cycleNonce: number, byteIndex: number): number {
  return computeCRC8([cycleNonce & 0xff, (byteIndex >> 8) & 0xff, byteIndex & 0xff, 0xa5]);
}

/**
 * Generates a 2D binary matrix (1 = dark module, 0 = light module) for a QR Code.
 * For 12-char uppercase alphanumeric strings, this produces a Version 1 (21x21) QR matrix.
 */
export function generateQrMatrix(text: string): number[][] {
  const qrModule = QRCode as unknown as {
    create?: typeof QRCode.create;
    default?: { create?: typeof QRCode.create };
  };
  const createFn = qrModule.create ?? qrModule.default?.create;
  if (!createFn) {
    throw new Error('QRCode.create not available');
  }
  const qr = createFn(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const matrix: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) {
      row.push(qr.modules.get(r, c) ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Encodes a single KineCode frame into a compact 12-character uppercase Alphanumeric QR string:
 * Format: "KC:<frameIdx>:<byteAHex><byteBHex>:<crcHex>" (e.g. "KC:0:1A2B:F4")
 * Uses only characters in the ISO/IEC 18004 Alphanumeric table so it fits in QR Version 1 (21x21).
 */
export function encodeFrameToQrString(
  frameIndex: number,
  byteA: number,
  byteB: number,
  checksum: number
): string {
  return `KC:${frameIndex & 0x07}:${toHexByte(byteA)}${toHexByte(byteB)}:${toHexByte(checksum)}`;
}

/**
 * Encodes a dynamic multi-frame chunk into an uppercase Alphanumeric QR string:
 * Format: "KC2:<frameIdxHex>:<totalFramesHex>:<cycleNonceHex>:<chunkHex>:<crcHex>"
 * Uses exclusively characters in the QR Alphanumeric charset (0-9, A-Z, ':') for high density.
 */
export function encodeDynamicFrameToQrString(
  frameIndex: number,
  totalFrames: number,
  cycleNonce: number,
  chunkBytes: number[]
): { qrPayload: string; checksum: number } {
  const crcInput = [frameIndex & 0xff, totalFrames & 0xff, cycleNonce & 0xff, ...chunkBytes];
  const checksum = computeCRC8(crcInput);
  const idxHex = (frameIndex & 0x0f).toString(16).toUpperCase();
  const totalHex = (totalFrames & 0x0f).toString(16).toUpperCase();
  const nonceHex = toHexByte(cycleNonce);
  const chunkHex = bytesToHexUpper(chunkBytes);
  const crcHex = toHexByte(checksum);

  return {
    qrPayload: `KC2:${idxHex}:${totalHex}:${nonceHex}:${chunkHex}:${crcHex}`,
    checksum
  };
}

/**
 * Decodes either a legacy ("KC:...") or dynamic ("KC2:...") QR string into a FrameData object.
 * Returns null if the string is not a valid KineCode frame or if CRC-8 fails.
 */
export function decodeQrFrameString(qrText: string): FrameData | null {
  if (!qrText) return null;
  const clean = qrText.trim().toUpperCase();

  // 1. Check KC2 Dynamic Envelope Frame: KC2:<idxHex>:<totalHex>:<nonceHex>:<chunkHex>:<crcHex>
  const kc2Match = /^KC2:([0-9A-F]):([0-9A-F]):([0-9A-F]{2}):([0-9A-F]+):([0-9A-F]{2})$/.exec(
    clean
  );
  if (kc2Match) {
    const frameIndex = parseInt(kc2Match[1]!, 16);
    const totalFrames = parseInt(kc2Match[2]!, 16);
    const cycleNonce = parseInt(kc2Match[3]!, 16);
    const chunkHex = kc2Match[4]!;
    const checksum = parseInt(kc2Match[5]!, 16);

    if (chunkHex.length % 2 !== 0 || totalFrames < 2 || frameIndex >= totalFrames) {
      return null;
    }

    const chunkBytes = hexToBytes(chunkHex);
    const expectedCrc = computeCRC8([frameIndex, totalFrames, cycleNonce, ...chunkBytes]);
    if (checksum !== expectedCrc) {
      return null;
    }

    const byteA = chunkBytes[0] ?? 0;
    const byteB = chunkBytes[1] ?? 0;
    const clock = frameIndex & 1;

    return {
      frameIndex,
      totalFrames,
      cycleNonce,
      chunkBytes,
      clock,
      dataBytes: [byteA, byteB],
      checksum,
      capsuleColors: [],
      capsuleHeights: [],
      matrixBits: encodeFrameToMatrixBits(frameIndex & 0x07, byteA, byteB, checksum),
      qrPayload: clean,
      qrModules: []
    };
  }

  // 2. Legacy 8-frame format: KC:<0-7>:<byteA><byteB>:<crc>
  const match = /^KC:([0-7]):([0-9A-F]{2})([0-9A-F]{2}):([0-9A-F]{2})$/.exec(clean);
  if (!match) return null;

  const frameIndex = parseInt(match[1]!, 10);
  const byteA = parseInt(match[2]!, 16);
  const byteB = parseInt(match[3]!, 16);
  const checksum = parseInt(match[4]!, 16);

  const expectedCrc = computeCRC8([frameIndex, byteA, byteB]);
  if (checksum !== expectedCrc) {
    return null;
  }

  const clock = frameIndex & 1;
  const matrixBits = encodeFrameToMatrixBits(frameIndex, byteA, byteB, checksum);

  return {
    frameIndex,
    totalFrames: TOTAL_FRAMES,
    clock,
    dataBytes: [byteA, byteB],
    checksum,
    capsuleColors: [],
    capsuleHeights: [],
    matrixBits,
    qrPayload: clean,
    qrModules: []
  };
}

/**
 * Packs raw payload components into a 16-byte Uint8Array:
 * - Bytes 0..3: sessionId (uint32 big-endian)
 * - Bytes 4..7: timestamp (uint32 big-endian)
 * - Bytes 8..14: signature (7 bytes)
 * - Byte 15: CRC-8 over bytes 0..14
 */
export function buildPayload(
  sessionId: number,
  timestamp: number,
  signature7: Uint8Array
): Uint8Array {
  if (signature7.length !== 7) {
    throw new Error('Signature must be exactly 7 bytes');
  }

  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);
  view.setUint32(0, sessionId, false);
  view.setUint32(4, timestamp, false);
  payload.set(signature7, 8);

  // Compute CRC8 over first 15 bytes
  payload[15] = computeCRC8(payload.subarray(0, 15));
  return payload;
}

/**
 * Unpacks 16-byte buffer into RawPayload
 */
export function parsePayload(payload: Uint8Array): RawPayload {
  if (payload.length !== 16) {
    throw new Error('Payload must be exactly 16 bytes');
  }
  const view = new DataView(payload.buffer, payload.byteOffset, 16);
  return {
    sessionId: view.getUint32(0, false),
    timestamp: view.getUint32(4, false),
    signature: payload.slice(8, 15),
    crc8: payload[15]!
  };
}

/**
 * Encodes a single frame into 36 binary (0 | 1) cells for the 6x6 B/W matrix
 */
export function encodeFrameToMatrixBits(
  frameIndex: number,
  byteA: number,
  byteB: number,
  checksum: number
): number[] {
  const clock = frameIndex & 1;
  const bits = new Array<number>(GRID_NODES_COUNT).fill(0);

  bits[0] = 1;
  bits[1] = 0;

  bits[2] = (frameIndex >> 2) & 1;
  bits[3] = (frameIndex >> 1) & 1;
  bits[4] = frameIndex & 1;
  bits[5] = clock;

  for (let b = 0; b < 8; b++) {
    bits[6 + b] = (byteA >> (7 - b)) & 1;
    bits[14 + b] = (byteB >> (7 - b)) & 1;
    bits[22 + b] = (checksum >> (7 - b)) & 1;
  }

  bits[30] = 1;
  bits[31] = 0;
  bits[32] = 1;
  bits[33] = 0;
  bits[34] = 1;
  bits[35] = 1 - clock;

  return bits;
}

/**
 * Decodes 36 binary (0 | 1) cells from the 6x6 B/W matrix into a FrameData object.
 */
export function decodeMatrixFrame(bits: number[]): FrameData | null {
  if (bits.length !== GRID_NODES_COUNT) return null;

  if (bits[0] !== 1 || bits[1] !== 0) {
    return null;
  }

  if (
    bits[30] !== 1 ||
    bits[31] !== 0 ||
    bits[32] !== 1 ||
    bits[33] !== 0 ||
    bits[34] !== 1
  ) {
    return null;
  }

  const frameIndex = ((bits[2]! & 1) << 2) | ((bits[3]! & 1) << 1) | (bits[4]! & 1);
  const clock = bits[5]! & 1;
  const invClock = bits[35]! & 1;

  if (frameIndex < 0 || frameIndex >= TOTAL_FRAMES) {
    return null;
  }
  if (clock !== (frameIndex & 1) || invClock !== 1 - clock) {
    return null;
  }

  let byteA = 0;
  let byteB = 0;
  let checksum = 0;
  for (let b = 0; b < 8; b++) {
    byteA = (byteA << 1) | (bits[6 + b]! & 1);
    byteB = (byteB << 1) | (bits[14 + b]! & 1);
    checksum = (checksum << 1) | (bits[22 + b]! & 1);
  }

  const expectedCrc = computeCRC8([frameIndex, byteA, byteB]);
  if (checksum !== expectedCrc) {
    return null;
  }

  const qrPayload = encodeFrameToQrString(frameIndex, byteA, byteB, checksum);

  return {
    frameIndex,
    clock,
    dataBytes: [byteA, byteB],
    checksum,
    capsuleColors: [],
    capsuleHeights: [],
    matrixBits: [...bits],
    qrPayload,
    qrModules: []
  };
}

/**
 * Slices 16-byte payload into 8 FrameData packets, each containing a QR Version 1 (21x21) matrix.
 */
export function encodePayloadToFrames(payload: Uint8Array): FrameData[] {
  if (payload.length !== 16) {
    throw new Error('Payload must be 16 bytes to encode into 8 frames');
  }

  const frames: FrameData[] = [];

  for (let frameIndex = 0; frameIndex < TOTAL_FRAMES; frameIndex++) {
    const byteA = payload[frameIndex * 2]!;
    const byteB = payload[frameIndex * 2 + 1]!;
    const clock = frameIndex % 2;

    const checksum = computeCRC8([frameIndex, byteA, byteB]);
    const qrPayload = encodeFrameToQrString(frameIndex, byteA, byteB, checksum);
    const qrModules = generateQrMatrix(qrPayload);
    const matrixBits = encodeFrameToMatrixBits(frameIndex, byteA, byteB, checksum);

    const capsuleColors = new Array<number>(CAPSULES_COUNT);
    const capsuleHeights = new Array<number>(CAPSULES_COUNT);

    capsuleColors[0] = 0;
    capsuleHeights[0] = 1;
    capsuleColors[1] = frameIndex & 0x03;
    capsuleHeights[1] = 1;
    capsuleColors[2] = ((frameIndex >> 2) & 0x01) | (clock << 1);
    capsuleHeights[2] = 1;

    capsuleColors[3] = (byteA >> 6) & 0x03;
    capsuleColors[4] = (byteA >> 4) & 0x03;
    capsuleColors[5] = (byteA >> 2) & 0x03;
    capsuleColors[6] = byteA & 0x03;

    capsuleColors[7] = (byteB >> 6) & 0x03;
    capsuleColors[8] = (byteB >> 4) & 0x03;
    capsuleColors[9] = (byteB >> 2) & 0x03;
    capsuleColors[10] = byteB & 0x03;

    for (let c = 3; c <= 10; c++) {
      capsuleHeights[c] = (capsuleColors[c]! & 0x02) !== 0 ? 1 : 0;
    }

    capsuleColors[11] = (checksum >> 6) & 0x03;
    capsuleColors[12] = (checksum >> 4) & 0x03;
    capsuleColors[13] = (checksum >> 2) & 0x03;
    capsuleColors[14] = checksum & 0x03;
    for (let c = 11; c <= 14; c++) {
      capsuleHeights[c] = (capsuleColors[c]! & 0x02) !== 0 ? 1 : 0;
    }

    capsuleColors[15] = clock === 0 ? 2 : 3;
    capsuleHeights[15] = clock;

    frames.push({
      frameIndex,
      clock,
      dataBytes: [byteA, byteB],
      checksum,
      capsuleColors,
      capsuleHeights,
      matrixBits,
      qrPayload,
      qrModules
    });
  }

  return frames;
}

/**
 * Decodes 16 sampled capsule color indices into a FrameData object.
 */
export function decodeCapsuleFrame(colors: number[]): FrameData | null {
  if (colors.length === GRID_NODES_COUNT) {
    return decodeMatrixFrame(colors);
  }
  if (colors.length !== CAPSULES_COUNT) return null;

  if (colors[0] !== 0) {
    return null;
  }

  const idxLow = colors[1]! & 0x03;
  const idxHighRaw = colors[2]! & 0x03;
  const idxBit2 = idxHighRaw & 0x01;
  const clock = (idxHighRaw >> 1) & 0x01;
  const frameIndex = (idxBit2 << 2) | idxLow;

  if (frameIndex < 0 || frameIndex >= TOTAL_FRAMES) {
    return null;
  }

  const tailColor = colors[15]!;
  if ((clock === 0 && tailColor !== 2) || (clock === 1 && tailColor !== 3)) {
    return null;
  }

  const byteA =
    ((colors[3]! & 0x03) << 6) |
    ((colors[4]! & 0x03) << 4) |
    ((colors[5]! & 0x03) << 2) |
    (colors[6]! & 0x03);

  const byteB =
    ((colors[7]! & 0x03) << 6) |
    ((colors[8]! & 0x03) << 4) |
    ((colors[9]! & 0x03) << 2) |
    (colors[10]! & 0x03);

  const checksum =
    ((colors[11]! & 0x03) << 6) |
    ((colors[12]! & 0x03) << 4) |
    ((colors[13]! & 0x03) << 2) |
    (colors[14]! & 0x03);

  const expectedCrc = computeCRC8([frameIndex, byteA, byteB]);
  if (checksum !== expectedCrc) {
    return null;
  }

  const matrixBits = encodeFrameToMatrixBits(frameIndex, byteA, byteB, checksum);
  const qrPayload = encodeFrameToQrString(frameIndex, byteA, byteB, checksum);

  return {
    frameIndex,
    clock,
    dataBytes: [byteA, byteB],
    checksum,
    capsuleColors: [...colors],
    capsuleHeights: [],
    matrixBits,
    qrPayload,
    qrModules: []
  };
}

/**
 * Assembles 8 captured FrameData objects into the complete 16-byte payload.
 */
export function assemblePayload(framesMap: Map<number, FrameData>): Uint8Array | null {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    if (!framesMap.has(i)) {
      return null;
    }
  }

  const payload = new Uint8Array(16);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frame = framesMap.get(i)!;
    payload[i * 2] = frame.dataBytes[0];
    payload[i * 2 + 1] = frame.dataBytes[1];
  }

  const computedCrc = computeCRC8(payload.subarray(0, 15));
  if (payload[15] !== computedCrc) {
    return null;
  }

  return payload;
}

function actionModeToBits(mode: ActionMode): number {
  if (mode === 'webhook') return 1;
  if (mode === 'both') return 2;
  return 0;
}

function bitsToActionMode(bits: number): ActionMode {
  if (bits === 1) return 'webhook';
  if (bits === 2) return 'both';
  return 'redirect';
}

/**
 * Packs the message bytes to be cryptographically signed for a DynamicEnvelope:
 * [sessionId (4B) || timestampSec (4B) || maxAgeSec (1B) || actionMode (1B) || urlBytes (NB)]
 */
export function packEnvelopeSignableMessage(
  sessionId: number,
  timestampSec: number,
  maxAgeSec: number,
  actionMode: ActionMode,
  targetUrl: string
): Uint8Array {
  const urlBytes = new TextEncoder().encode(targetUrl.trim());
  const buf = new Uint8Array(10 + urlBytes.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, sessionId, false);
  view.setUint32(4, timestampSec, false);
  buf[8] = Math.max(1, Math.min(255, maxAgeSec));
  buf[9] = actionModeToBits(actionMode);
  buf.set(urlBytes, 10);
  return buf;
}

/**
 * Builds a complete binary DynamicEnvelope containing sessionId, timestampSec, maxAgeSec,
 * 7-byte cryptographic signature, and UTF-8 targetUrl, protected by CRC-8.
 */
export function buildDynamicEnvelope(opts: {
  sessionId: number;
  timestampSec: number;
  maxAgeSec: number;
  actionMode: ActionMode;
  signature7: Uint8Array;
  targetUrl: string;
}): Uint8Array {
  if (opts.signature7.length !== 7) {
    throw new Error('Signature must be 7 bytes');
  }
  const urlBytes = new TextEncoder().encode(opts.targetUrl.trim());
  if (urlBytes.length > 200) {
    throw new Error('Target URL must not exceed 200 UTF-8 bytes');
  }

  const totalLen = 19 + urlBytes.length;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);

  buf[0] = (2 << 4) | (actionModeToBits(opts.actionMode) & 0x03);
  view.setUint32(1, opts.sessionId, false);
  view.setUint32(5, opts.timestampSec, false);
  buf[9] = Math.max(1, Math.min(255, opts.maxAgeSec));
  buf.set(opts.signature7, 10);
  buf[17] = urlBytes.length;
  buf.set(urlBytes, 18);
  buf[18 + urlBytes.length] = computeCRC8(buf.subarray(0, 18 + urlBytes.length));

  return buf;
}

/**
 * Unpacks and validates a binary DynamicEnvelope buffer.
 */
export function parseDynamicEnvelope(buffer: Uint8Array): DynamicEnvelope | null {
  if (buffer.length < 19) return null;
  const version = (buffer[0]! >> 4) & 0x0f;
  if (version !== 2) return null;

  const actionMode = bitsToActionMode(buffer[0]! & 0x03);
  const urlLen = buffer[17]!;
  const expectedTotalLen = 19 + urlLen;
  if (buffer.length < expectedTotalLen) return null;

  const expectedCrc = computeCRC8(buffer.subarray(0, 18 + urlLen));
  const actualCrc = buffer[18 + urlLen]!;
  if (expectedCrc !== actualCrc) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, expectedTotalLen);
  const sessionId = view.getUint32(1, false);
  const timestampSec = view.getUint32(5, false);
  const maxAgeSec = buffer[9]!;
  const signature = buffer.slice(10, 17);
  const urlBytes = buffer.slice(18, 18 + urlLen);
  const targetUrl = new TextDecoder().decode(urlBytes);

  return {
    version,
    actionMode,
    sessionId,
    timestampSec,
    maxAgeSec,
    signature,
    targetUrl,
    crc8: actualCrc
  };
}

/**
 * Splits a DynamicEnvelope across `totalFrames` (e.g. 4, 6, 8, 12) cyclic frames
 * and XOR-masks every byte with `cycleNonce` so no single frame contains plain-text URL fragments
 * and frames never repeat from one cycle to the next.
 */
export function encodeEnvelopeToFrames(
  envelope: Uint8Array,
  totalFrames: number = 8,
  cycleNonce: number = 0
): FrameData[] {
  const clampedFrames = Math.max(2, Math.min(15, Math.floor(totalFrames)));
  const nonce = cycleNonce & 0xff;
  const chunkSize = Math.ceil(envelope.length / clampedFrames);
  const paddedLen = chunkSize * clampedFrames;

  const masked = new Uint8Array(paddedLen);
  for (let i = 0; i < paddedLen; i++) {
    const rawByte = i < envelope.length ? envelope[i]! : 0;
    masked[i] = rawByte ^ computeCycleMaskByte(nonce, i);
  }

  const frames: FrameData[] = [];

  for (let frameIndex = 0; frameIndex < clampedFrames; frameIndex++) {
    const start = frameIndex * chunkSize;
    const chunkBytes = Array.from(masked.subarray(start, start + chunkSize));
    const clock = frameIndex & 1;

    const { qrPayload, checksum } = encodeDynamicFrameToQrString(
      frameIndex,
      clampedFrames,
      nonce,
      chunkBytes
    );
    const qrModules = generateQrMatrix(qrPayload);

    const byteA = chunkBytes[0] ?? 0;
    const byteB = chunkBytes[1] ?? 0;
    const matrixBits = encodeFrameToMatrixBits(frameIndex & 0x07, byteA, byteB, checksum);

    const capsuleColors = new Array<number>(CAPSULES_COUNT).fill(0);
    const capsuleHeights = new Array<number>(CAPSULES_COUNT).fill(1);
    capsuleColors[0] = 0;
    capsuleColors[1] = frameIndex & 0x03;
    capsuleColors[2] = ((frameIndex >> 2) & 0x01) | (clock << 1);
    capsuleColors[3] = (byteA >> 6) & 0x03;
    capsuleColors[4] = (byteA >> 4) & 0x03;
    capsuleColors[5] = (byteA >> 2) & 0x03;
    capsuleColors[6] = byteA & 0x03;
    capsuleColors[7] = (byteB >> 6) & 0x03;
    capsuleColors[8] = (byteB >> 4) & 0x03;
    capsuleColors[9] = (byteB >> 2) & 0x03;
    capsuleColors[10] = byteB & 0x03;
    capsuleColors[11] = (checksum >> 6) & 0x03;
    capsuleColors[12] = (checksum >> 4) & 0x03;
    capsuleColors[13] = (checksum >> 2) & 0x03;
    capsuleColors[14] = checksum & 0x03;
    capsuleColors[15] = clock === 0 ? 2 : 3;

    frames.push({
      frameIndex,
      totalFrames: clampedFrames,
      cycleNonce: nonce,
      chunkBytes,
      clock,
      dataBytes: [byteA, byteB],
      checksum,
      capsuleColors,
      capsuleHeights,
      matrixBits,
      qrPayload,
      qrModules
    });
  }

  return frames;
}

/**
 * Reassembles and unmasks all `totalFrames` captured KC2 frames from the same cycle
 * into a validated DynamicEnvelope.
 */
export function assembleDynamicEnvelope(
  framesMap: Map<number, FrameData>,
  expectedTotalFrames?: number
): { envelope: DynamicEnvelope; rawBytes: Uint8Array; cycleNonce: number } | null {
  const firstFrame = framesMap.values().next().value as FrameData | undefined;
  if (!firstFrame || firstFrame.chunkBytes === undefined || firstFrame.cycleNonce === undefined) {
    return null;
  }

  const totalFrames = expectedTotalFrames ?? firstFrame.totalFrames ?? TOTAL_FRAMES;
  const cycleNonce = firstFrame.cycleNonce;

  if (framesMap.size < totalFrames) {
    return null;
  }

  const maskedBytes: number[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const frame = framesMap.get(i);
    if (!frame || !frame.chunkBytes || frame.cycleNonce !== cycleNonce) {
      return null;
    }
    maskedBytes.push(...frame.chunkBytes);
  }

  const unmasked = new Uint8Array(maskedBytes.length);
  for (let i = 0; i < maskedBytes.length; i++) {
    unmasked[i] = maskedBytes[i]! ^ computeCycleMaskByte(cycleNonce, i);
  }

  const parsed = parseDynamicEnvelope(unmasked);
  if (!parsed) return null;

  const exactLen = 19 + new TextEncoder().encode(parsed.targetUrl).length;
  return {
    envelope: parsed,
    rawBytes: unmasked.slice(0, exactLen),
    cycleNonce
  };
}

/**
 * Appends KineCode cryptographic proof parameters (`kc_session`, `kc_ts`, `kc_nonce`, `kc_sig`)
 * to the reconstructed target URL so the destination server can optionally verify freshness & authenticity.
 */
export function constructSignedUrl(
  baseUrl: string,
  sessionId: number,
  timestampSec: number,
  signature: Uint8Array,
  cycleNonce?: number
): string {
  const cleanUrl = baseUrl.trim();
  if (!cleanUrl) return '';

  const sigHex = Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const sessionHex = `0x${sessionId.toString(16).toUpperCase()}`;
  const separator = cleanUrl.includes('?') ? '&' : '?';

  const params = new URLSearchParams();
  params.set('kc_session', sessionHex);
  params.set('kc_ts', String(timestampSec));
  if (cycleNonce !== undefined) {
    params.set('kc_nonce', toHexByte(cycleNonce));
  }
  params.set('kc_sig', sigHex);

  return `${cleanUrl}${separator}${params.toString()}`;
}

export interface VerifySignedUrlOptions {
  maxAge?: number; // Allowed age in seconds (default 6)
  actionMode?: ActionMode; // Expected action mode (default 'redirect')
}

export interface SignedUrlVerification {
  valid: boolean;
  baseUrl?: string;
  sessionId?: number;
  timestamp?: number;
  timeDiffSeconds?: number;
  cycleNonce?: number;
  signatureValid?: boolean;
  error?: string;
}

/**
 * 1-Line Server Helper: Validates a KineCode Signed URL (`?kc_session=...&kc_ts=...&kc_nonce=...&kc_sig=...`)
 * against your secret key and freshness window.
 */
export function verifySignedUrl(
  signedUrl: string,
  secretKey: Uint8Array | string,
  options: VerifySignedUrlOptions = {}
): SignedUrlVerification {
  try {
    const keyBytes = typeof secretKey === 'string' ? fromHex(secretKey) : secretKey;
    const maxAge = options.maxAge ?? 6;
    const actionMode = options.actionMode ?? 'redirect';

    // Strip kc_* query params to recover exact original baseUrl
    const kcIdx = signedUrl.search(/[?&]kc_session=/);
    if (kcIdx === -1) {
      return { valid: false, error: 'Missing kc_session parameter in URL' };
    }

    const baseUrl = signedUrl.slice(0, kcIdx);
    const queryStr = signedUrl.slice(kcIdx + 1);
    const params = new URLSearchParams(queryStr);

    const rawSession = params.get('kc_session');
    const rawTs = params.get('kc_ts');
    const rawSig = params.get('kc_sig');
    const rawNonce = params.get('kc_nonce');

    if (!rawSession || !rawTs || !rawSig) {
      return { valid: false, error: 'Missing KineCode query parameters' };
    }

    const sessionId = rawSession.startsWith('0x')
      ? parseInt(rawSession, 16)
      : parseInt(rawSession, 10);
    const timestamp = parseInt(rawTs, 10);
    const cycleNonce = rawNonce ? parseInt(rawNonce, 16) : undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    const timeDiffSeconds = Math.abs(nowSec - timestamp);

    if (timeDiffSeconds > maxAge) {
      return {
        valid: false,
        baseUrl,
        sessionId,
        timestamp,
        timeDiffSeconds,
        cycleNonce,
        error: `Token expired (${timeDiffSeconds}s > ${maxAge}s)`
      };
    }

    const signable = packEnvelopeSignableMessage(
      sessionId,
      timestamp,
      maxAge,
      actionMode,
      baseUrl
    );
    const expectedSig = computeTruncatedHmacSync(signable, keyBytes);
    const actualSig = fromHex(rawSig);

    let signatureValid = actualSig.length === 7;
    if (signatureValid) {
      for (let i = 0; i < 7; i++) {
        if (actualSig[i] !== expectedSig[i]) {
          signatureValid = false;
          break;
        }
      }
    }

    return {
      valid: signatureValid,
      baseUrl,
      sessionId,
      timestamp,
      timeDiffSeconds,
      cycleNonce,
      signatureValid,
      error: signatureValid ? undefined : 'Invalid cryptographic signature'
    };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

export interface FrameCollectorOptions {
  secretKey?: Uint8Array | string;
  maxAge?: number; // Allowed freshness window in seconds (default 6)
  maxCaptureMs?: number; // Max burst time to capture all N frames (default auto)
}

export interface FrameCollectorStep {
  status: 'ignored' | 'collecting' | 'verified' | 'rejected';
  lockedFrames: number;
  totalFrames: number;
  lockedIndices: number[];
  isNewSlot?: boolean;
  result?: VerificationResult;
}

/**
 * Stateful headless decoder for custom / mobile QR scanners (React Native, Flutter, Capacitor, Web Workers).
 * Feed raw QR strings into `pushFrame(qrText)` and it automatically handles:
 * - Dynamic N-frame auto-detection (4, 6, 8, 12 frames)
 * - Cycle nonce transitions & burst timeout resets
 * - XOR unmasking, CRC-8 verification, timestamp freshness, and HMAC signature validation
 */
export class FrameCollector {
  private framesBuffer: Map<number, FrameData> = new Map();
  private activeTotalFrames: number = 0;
  private activeCycleNonce: number | null = null;
  private cycleStartTimeMs: number = 0;
  private secretKey?: Uint8Array;
  private maxAge?: number;
  private maxCaptureMs?: number;

  constructor(options: FrameCollectorOptions = {}) {
    if (options.secretKey) {
      this.secretKey =
        typeof options.secretKey === 'string' ? fromHex(options.secretKey) : options.secretKey;
    }
    this.maxAge = options.maxAge;
    this.maxCaptureMs = options.maxCaptureMs;
  }

  public reset(): void {
    this.framesBuffer.clear();
    this.activeTotalFrames = 0;
    this.activeCycleNonce = null;
    this.cycleStartTimeMs = 0;
  }

  public pushFrame(qrText: string, nowMs: number = Date.now()): FrameCollectorStep {
    const decoded = decodeQrFrameString(qrText);
    if (!decoded) {
      return {
        status: 'ignored',
        lockedFrames: this.framesBuffer.size,
        totalFrames: this.activeTotalFrames,
        lockedIndices: Array.from(this.framesBuffer.keys()).sort(),
        isNewSlot: false
      };
    }

    const total = decoded.totalFrames ?? TOTAL_FRAMES;
    this.activeTotalFrames = total;

    if (
      decoded.cycleNonce !== undefined &&
      this.activeCycleNonce !== null &&
      decoded.cycleNonce !== this.activeCycleNonce
    ) {
      this.framesBuffer.clear();
      this.activeCycleNonce = decoded.cycleNonce;
      this.cycleStartTimeMs = nowMs;
    }

    const burstLimit = this.maxCaptureMs ?? Math.max(3000, total * 450);
    if (
      this.framesBuffer.size > 0 &&
      this.cycleStartTimeMs > 0 &&
      nowMs - this.cycleStartTimeMs > burstLimit
    ) {
      this.framesBuffer.clear();
      this.cycleStartTimeMs = nowMs;
      this.activeCycleNonce = decoded.cycleNonce ?? null;
    }

    if (this.framesBuffer.size === 0) {
      this.cycleStartTimeMs = nowMs;
      this.activeCycleNonce = decoded.cycleNonce ?? null;
    }

    const isNewSlot = !this.framesBuffer.has(decoded.frameIndex);
    this.framesBuffer.set(decoded.frameIndex, decoded);
    const lockedIndices = Array.from(this.framesBuffer.keys()).sort();

    if (this.framesBuffer.size < total) {
      return {
        status: 'collecting',
        lockedFrames: this.framesBuffer.size,
        totalFrames: total,
        lockedIndices,
        isNewSlot
      };
    }

    // All N frames collected: assemble & verify
    const captureDurationMs = Math.max(0, Math.round(nowMs - this.cycleStartTimeMs));

    // Handle legacy 8-frame 16-byte KC payloads
    if (decoded.chunkBytes === undefined) {
      const legacyBytes = assemblePayload(this.framesBuffer);
      this.framesBuffer.clear();
      if (!legacyBytes) {
        return {
          status: 'rejected',
          lockedFrames: 0,
          totalFrames: total,
          lockedIndices: [],
          isNewSlot,
          result: { valid: false, crcValid: false, error: 'Legacy payload CRC-8 mismatch' }
        };
      }
      const parsedLegacy = parsePayload(legacyBytes);
      return {
        status: 'verified',
        lockedFrames: total,
        totalFrames: total,
        lockedIndices,
        isNewSlot,
        result: {
          valid: true,
          sessionId: parsedLegacy.sessionId,
          timestamp: parsedLegacy.timestamp,
          captureDurationMs,
          totalFrames: total,
          crcValid: true,
          rawPayload: legacyBytes
        }
      };
    }

    const assembled = assembleDynamicEnvelope(this.framesBuffer, total);
    this.framesBuffer.clear();

    if (!assembled) {
      return {
        status: 'rejected',
        lockedFrames: 0,
        totalFrames: total,
        lockedIndices: [],
        isNewSlot,
        result: { valid: false, crcValid: false, error: 'Envelope CRC-8 mismatch' }
      };
    }

    const { envelope, rawBytes, cycleNonce } = assembled;
    const nowSec = Math.floor(Date.now() / 1000);
    const timeDiffSeconds = Math.abs(nowSec - envelope.timestampSec);
    const effectiveMaxAge =
      this.maxAge !== undefined
        ? Math.min(this.maxAge, envelope.maxAgeSec || this.maxAge)
        : envelope.maxAgeSec || 6;
    const timeValid = timeDiffSeconds <= effectiveMaxAge;

    let signatureValid = true;
    if (this.secretKey) {
      const signable = packEnvelopeSignableMessage(
        envelope.sessionId,
        envelope.timestampSec,
        envelope.maxAgeSec,
        envelope.actionMode,
        envelope.targetUrl
      );
      const expectedSig = computeTruncatedHmacSync(signable, this.secretKey);
      for (let i = 0; i < 7; i++) {
        if (expectedSig[i] !== envelope.signature[i]) {
          signatureValid = false;
          break;
        }
      }
    }

    const signedUrl = envelope.targetUrl
      ? constructSignedUrl(
          envelope.targetUrl,
          envelope.sessionId,
          envelope.timestampSec,
          envelope.signature,
          cycleNonce
        )
      : undefined;

    const valid = timeValid && signatureValid;
    const result: VerificationResult = {
      valid,
      sessionId: envelope.sessionId,
      timestamp: envelope.timestampSec,
      timeDiffSeconds,
      maxAgeSec: effectiveMaxAge,
      captureDurationMs,
      totalFrames: total,
      cycleNonce,
      actionMode: envelope.actionMode,
      targetUrl: envelope.targetUrl || undefined,
      signedUrl,
      signatureHex: toHex(envelope.signature),
      crcValid: true,
      signatureValid,
      rawPayload: rawBytes,
      error: !timeValid
        ? `Token expired (${timeDiffSeconds}s > ${effectiveMaxAge}s)`
        : !signatureValid
        ? 'Invalid cryptographic signature'
        : undefined
    };

    return {
      status: valid ? 'verified' : 'rejected',
      lockedFrames: total,
      totalFrames: total,
      lockedIndices,
      result
    };
  }
}
