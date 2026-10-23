export type RGB = [number, number, number];

export interface Point2D {
  x: number;
  y: number;
}

export type QuadCorners = [Point2D, Point2D, Point2D, Point2D]; // [TL, TR, BR, BL]

export interface ColorDefinition {
  name: string;
  hex: string;
  rgb: RGB;
  bits: number; // 0..3 (2 bits)
}

export const PALETTE: Record<number, ColorDefinition> = {
  0: { name: 'Cyan', hex: '#00FFFF', rgb: [0, 255, 255], bits: 0 },
  1: { name: 'Magenta', hex: '#FF00FF', rgb: [255, 0, 255], bits: 1 },
  2: { name: 'Yellow', hex: '#FFFF00', rgb: [255, 255, 0], bits: 2 },
  3: { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255], bits: 3 }
};

export const TOTAL_FRAMES = 8;
export const CAPSULES_COUNT = 16;
export const GRID_NODES_COUNT = 36;
export const GRID_SIZE = 6;
export const QR_VERSION_1_SIZE = 21; // 21x21 modules (QR Version 1)
export const FRAME_RATE_HZ = 4; // 250ms per frame
export const FRAME_INTERVAL_MS = 1000 / FRAME_RATE_HZ; // 250ms
export const MORPH_DURATION_MS = 0; // Crisp QR transitions
export const HOLD_DURATION_MS = 250; // Full 250ms hold plateau

/**
 * Normalized coordinates for the 3 QR-style Finder Patterns (TL, TR, BL).
 */
export const FINDER_PATTERN_SPECS = {
  tl: { u: 0.14, v: 0.14 },
  tr: { u: 0.86, v: 0.14 },
  bl: { u: 0.14, v: 0.86 },
  span: 0.72,
  size: 0.18
} as const;

/**
 * Normalized (u, v) coordinates in [0..1] x [0..1] for the 36 B/W squares in the 6x6 matrix.
 */
export const FLUID_GRID_COORDINATES: Array<{ u: number; v: number }> = (() => {
  const coords: Array<{ u: number; v: number }> = [];
  const start = 0.275;
  const step = 0.09;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      coords.push({
        u: Math.round((start + col * step) * 10000) / 10000,
        v: Math.round((start + row * step) * 10000) / 10000
      });
    }
  }
  return coords;
})();

export type GuidanceStatus =
  | 'searching'
  | 'too_far'
  | 'too_close'
  | 'stabilize'
  | 'locked';

export type ActionMode = 'redirect' | 'webhook' | 'both';

export interface GuidanceFeedback {
  status: GuidanceStatus;
  message: string;
  confidence: number; // 0..1
  quadCorners: QuadCorners | null;
  finderCenters?: [Point2D, Point2D, Point2D] | null; // [TL, TR, BL]
  areaRatio: number;
}

export interface FrameData {
  frameIndex: number; // 0..(totalFrames - 1)
  totalFrames?: number; // N cyclic frames (default 8)
  cycleNonce?: number; // 0..255 rolling cycle nonce (changes every cycle)
  chunkBytes?: number[]; // Variable-length masked bytes for KC2 frames
  clock: number; // 0 or 1
  dataBytes: [number, number]; // 2 bytes for legacy frame (16 bits)
  checksum: number; // 8-bit checksum for this frame
  capsuleColors: number[]; // 16 legacy values (0..3)
  capsuleHeights: number[]; // 16 legacy values (0 or 1)
  matrixBits: number[]; // 36 binary values (0 or 1)
  qrPayload: string; // Standard QR Alphanumeric string e.g. "KC:0:1A2B:F4" or "KC2:..."
  qrModules: number[][]; // Binary QR matrix (1 = black module, 0 = white module)
}

export interface RawPayload {
  sessionId: number; // 4 bytes (uint32)
  timestamp: number; // 4 bytes (Unix seconds / 4)
  signature: Uint8Array; // 7 bytes (truncated Ed25519 / HMAC)
  crc8: number; // 1 byte
}

export interface DynamicEnvelope {
  version: number; // 2
  actionMode: ActionMode;
  sessionId: number; // uint32
  timestampSec: number; // Exact Unix timestamp in seconds
  maxAgeSec: number; // Allowed freshness window in seconds (e.g. 6)
  signature: Uint8Array; // 7 bytes
  targetUrl: string; // Reconstructed destination/webhook URL
  crc8: number;
}

export interface VerificationResult {
  valid: boolean;
  sessionId?: number;
  timestamp?: number;
  timeDiffSeconds?: number;
  maxAgeSec?: number;
  captureDurationMs?: number;
  totalFrames?: number;
  cycleNonce?: number;
  actionMode?: ActionMode;
  targetUrl?: string;
  signedUrl?: string;
  signatureHex?: string;
  signatureValid?: boolean;
  crcValid?: boolean;
  antiStreamScore?: number;
  error?: string;
  rawPayload?: Uint8Array;
}

export type VisualSkinType = 'fluid-wave' | 'radial-equalizer' | 'sonar-ripple';
