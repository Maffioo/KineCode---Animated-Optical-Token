import { describe, it, expect } from 'vitest';
import {
  buildPayload,
  parsePayload,
  encodePayloadToFrames,
  decodeCapsuleFrame,
  assemblePayload,
  buildDynamicEnvelope,
  parseDynamicEnvelope,
  encodeEnvelopeToFrames,
  decodeQrFrameString,
  assembleDynamicEnvelope,
  constructSignedUrl,
  packEnvelopeSignableMessage,
  verifySignedUrl,
  FrameCollector
} from '../src/core/framing.ts';
import { computeTruncatedHmacSync } from '../src/core/crypto.ts';
import { FrameData } from '../src/core/types.ts';

describe('Framing Protocol', () => {
  it('should build and parse payloads consistently', () => {
    const sessionId = 0xdeadbeef;
    const timestamp = 12345678;
    const sig7 = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);

    const payload = buildPayload(sessionId, timestamp, sig7);
    expect(payload.length).toBe(16);

    const parsed = parsePayload(payload);
    expect(parsed.sessionId).toBe(sessionId);
    expect(parsed.timestamp).toBe(timestamp);
    expect(parsed.signature).toEqual(sig7);
    expect(parsed.crc8).toBe(payload[15]);
  });

  it('should encode payload into 8 frames and decode them flawlessly', () => {
    const sessionId = 0xabcdef01;
    const timestamp = 98765432;
    const sig7 = new Uint8Array([7, 6, 5, 4, 3, 2, 1]);
    const payload = buildPayload(sessionId, timestamp, sig7);

    const frames = encodePayloadToFrames(payload);
    expect(frames.length).toBe(8);

    const framesMap = new Map<number, FrameData>();

    // Test cyclic arrival (starting at frame index 3)
    const arrivalOrder = [3, 4, 5, 6, 7, 0, 1, 2];

    for (const idx of arrivalOrder) {
      const originalFrame = frames[idx]!;
      const decoded = decodeCapsuleFrame(originalFrame.capsuleColors);

      expect(decoded).not.toBeNull();
      expect(decoded!.frameIndex).toBe(idx);
      expect(decoded!.dataBytes).toEqual(originalFrame.dataBytes);

      framesMap.set(decoded!.frameIndex, decoded!);
    }

    // Assemble payload from captured cyclic frames
    const assembled = assemblePayload(framesMap);
    expect(assembled).not.toBeNull();
    expect(assembled).toEqual(payload);
  });

  it('should reject frames with corrupted capsule values', () => {
    const sessionId = 0x11223344;
    const timestamp = 55667788;
    const sig7 = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
    const payload = buildPayload(sessionId, timestamp, sig7);
    const frames = encodePayloadToFrames(payload);

    const corruptedColors = [...frames[0]!.capsuleColors];
    // Corrupt one data capsule
    corruptedColors[4] = (corruptedColors[4]! + 1) % 4;

    const decoded = decodeCapsuleFrame(corruptedColors);
    expect(decoded).toBeNull(); // Must fail CRC and return null
  });

  it('should fragment and reconstruct a destination URL across 4, 6, or 8 dynamic frames', () => {
    const targetUrl = 'https://presenze.unimi.it/checkin?aula=302';
    const sig7 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x12]);

    const envelope = buildDynamicEnvelope({
      sessionId: 0xcafe1234,
      timestampSec: 1729681200,
      maxAgeSec: 6,
      actionMode: 'redirect',
      signature7: sig7,
      targetUrl
    });

    const parsedDirect = parseDynamicEnvelope(envelope);
    expect(parsedDirect).not.toBeNull();
    expect(parsedDirect!.targetUrl).toBe(targetUrl);

    for (const totalFrames of [4, 6, 8, 12]) {
      const cycleNonce = 0x5a;
      const frames = encodeEnvelopeToFrames(envelope, totalFrames, cycleNonce);
      expect(frames.length).toBe(totalFrames);

      const captured = new Map<number, FrameData>();
      for (const f of frames) {
        // Verify no single QR payload exposes plain-text URL characters
        expect(f.qrPayload).not.toContain('UNIMI');
        expect(f.qrPayload).not.toContain('HTTPS');

        const decoded = decodeQrFrameString(f.qrPayload);
        expect(decoded).not.toBeNull();
        expect(decoded!.totalFrames).toBe(totalFrames);
        expect(decoded!.cycleNonce).toBe(cycleNonce);
        captured.set(decoded!.frameIndex, decoded!);
      }

      const assembled = assembleDynamicEnvelope(captured, totalFrames);
      expect(assembled).not.toBeNull();
      expect(assembled!.envelope.targetUrl).toBe(targetUrl);
      expect(assembled!.envelope.sessionId).toBe(0xcafe1234);
      expect(assembled!.envelope.timestampSec).toBe(1729681200);
      expect(assembled!.envelope.maxAgeSec).toBe(6);
      expect(assembled!.envelope.actionMode).toBe('redirect');
    }
  });

  it('should produce completely different frames across cycles and reject mixed-cycle frames', () => {
    const envelope = buildDynamicEnvelope({
      sessionId: 0x12345678,
      timestampSec: 1729681500,
      maxAgeSec: 6,
      actionMode: 'webhook',
      signature7: new Uint8Array([1, 2, 3, 4, 5, 6, 7]),
      targetUrl: 'https://api.example.com/webhook'
    });

    const framesCycleA = encodeEnvelopeToFrames(envelope, 4, 0x11);
    const framesCycleB = encodeEnvelopeToFrames(envelope, 4, 0x22);

    // Every single frame must be different between Cycle A and Cycle B
    for (let i = 0; i < 4; i++) {
      expect(framesCycleA[i]!.qrPayload).not.toBe(framesCycleB[i]!.qrPayload);
    }

    // Mixing 2 frames from Cycle A and 2 frames from Cycle B must fail reassembly
    const mixedMap = new Map<number, FrameData>();
    mixedMap.set(0, decodeQrFrameString(framesCycleA[0]!.qrPayload)!);
    mixedMap.set(1, decodeQrFrameString(framesCycleA[1]!.qrPayload)!);
    mixedMap.set(2, decodeQrFrameString(framesCycleB[2]!.qrPayload)!);
    mixedMap.set(3, decodeQrFrameString(framesCycleB[3]!.qrPayload)!);

    expect(assembleDynamicEnvelope(mixedMap, 4)).toBeNull();
  });

  it('should construct a signed destination URL with KineCode query parameters', () => {
    const sig = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd]);
    const signedUrl = constructSignedUrl(
      'https://presenze.unimi.it/checkin?aula=302',
      0xcafe1234,
      1729681200,
      sig,
      0xa7
    );

    expect(signedUrl).toContain('https://presenze.unimi.it/checkin?aula=302&');
    expect(signedUrl).toContain('kc_session=0xCAFE1234');
    expect(signedUrl).toContain('kc_ts=1729681200');
    expect(signedUrl).toContain('kc_nonce=A7');
    expect(signedUrl).toContain('kc_sig=0123456789abcd');
  });

  it('should collect frames with FrameCollector and verify signed URL with verifySignedUrl', () => {
    const secretHex = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
    const baseUrl = 'https://presenze.unimi.it/checkin?aula=302';
    const sessionId = 0xcafe1234;
    const nowSec = Math.floor(Date.now() / 1000);
    const maxAgeSec = 6;

    const signable = packEnvelopeSignableMessage(
      sessionId,
      nowSec,
      maxAgeSec,
      'redirect',
      baseUrl
    );
    const sig7 = computeTruncatedHmacSync(
      signable,
      new Uint8Array(secretHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    );

    const envelope = buildDynamicEnvelope({
      sessionId,
      timestampSec: nowSec,
      maxAgeSec,
      actionMode: 'redirect',
      signature7: sig7,
      targetUrl: baseUrl
    });

    const frames = encodeEnvelopeToFrames(envelope, 4, 0x3f);
    const collector = new FrameCollector({ secretKey: secretHex, maxAge: 6 });

    expect(collector.pushFrame(frames[0]!.qrPayload).status).toBe('collecting');
    expect(collector.pushFrame(frames[1]!.qrPayload).status).toBe('collecting');
    expect(collector.pushFrame(frames[2]!.qrPayload).status).toBe('collecting');

    const finalStep = collector.pushFrame(frames[3]!.qrPayload);
    expect(finalStep.status).toBe('verified');
    expect(finalStep.result?.valid).toBe(true);
    expect(finalStep.result?.signedUrl).toBeDefined();

    // Verify signed URL with 1-line server helper
    const urlCheck = verifySignedUrl(finalStep.result!.signedUrl!, secretHex, { maxAge: 6 });
    expect(urlCheck.valid).toBe(true);
    expect(urlCheck.baseUrl).toBe(baseUrl);
    expect(urlCheck.sessionId).toBe(sessionId);
  });
});
