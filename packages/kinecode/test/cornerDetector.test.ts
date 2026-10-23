import { describe, it, expect } from 'vitest';
import jsQR from 'jsqr';
import {
  computeHomography,
  computeQuadArea,
  evaluateGuidance
} from '../src/scanner/CornerDetector.ts';
import {
  QR_VERSION_1_SIZE,
  QuadCorners,
  FrameData
} from '../src/core/types.ts';
import {
  buildPayload,
  encodePayloadToFrames,
  decodeQrFrameString,
  assemblePayload
} from '../src/core/framing.ts';

/**
 * Helper to synthesize an ImageData buffer containing a rendered Version 1 (21x21) QR Code frame
 * exactly as rendered by FluidWave.ts.
 */
function renderQrFrameToImageData(
  width: number,
  height: number,
  frame: FrameData,
  rotation90Steps: number = 0
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height * 4; i += 4) {
    data[i] = 10;
    data[i + 1] = 10;
    data[i + 2] = 12;
    data[i + 3] = 255;
  }

  const size = Math.min(width, height);
  const offsetX = Math.round((width - size) / 2);
  const offsetY = Math.round((height - size) / 2);

  const modules = frame.qrModules;
  const matrixSize = modules.length;
  const quietZoneModules = 4;
  const totalModules = matrixSize + quietZoneModules * 2;

  const cardSize = Math.round(size * 0.88);
  const cardX = offsetX + Math.round((size - cardSize) / 2);
  const cardY = offsetY + Math.round((size - cardSize) / 2);

  const fillRectBW = (rx: number, ry: number, rw: number, rh: number, val: number) => {
    const x0 = Math.max(0, Math.floor(rx));
    const y0 = Math.max(0, Math.floor(ry));
    const x1 = Math.min(width, Math.ceil(rx + rw));
    const y1 = Math.min(height, Math.ceil(ry + rh));
    const cx = width / 2;
    const cy = height / 2;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        let tx = x;
        let ty = y;
        const dx = x - cx;
        const dy = y - cy;
        if (rotation90Steps === 1) {
          tx = Math.round(cx - dy);
          ty = Math.round(cy + dx);
        } else if (rotation90Steps === 2) {
          tx = Math.round(cx - dx);
          ty = Math.round(cy - dy);
        } else if (rotation90Steps === 3) {
          tx = Math.round(cx + dy);
          ty = Math.round(cy - dx);
        }
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          const idx = (ty * width + tx) * 4;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
        }
      }
    }
  };

  // 1. White Quiet Zone Card
  fillRectBW(cardX, cardY, cardSize, cardSize, 255);

  // 2. Black QR Modules
  const modulePx = cardSize / totalModules;
  for (let r = 0; r < matrixSize; r++) {
    const row = modules[r]!;
    for (let c = 0; c < matrixSize; c++) {
      if (row[c] === 1) {
        fillRectBW(
          cardX + (c + quietZoneModules) * modulePx,
          cardY + (r + quietZoneModules) * modulePx,
          modulePx,
          modulePx,
          0
        );
      }
    }
  }

  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('Animated QR Version 1 (21x21) Pipeline & jsQR Scanner', () => {
  it('generates compact Version 1 (21x21) QR matrices for all 8 frames', () => {
    const payload = buildPayload(
      0x12345678,
      99887766,
      new Uint8Array([1, 2, 3, 4, 5, 6, 7])
    );
    const frames = encodePayloadToFrames(payload);
    expect(frames.length).toBe(8);

    for (const f of frames) {
      expect(f.qrPayload).toMatch(/^KC:[0-7]:[0-9A-F]{4}:[0-9A-F]{2}$/);
      expect(f.qrModules.length).toBe(QR_VERSION_1_SIZE); // 21x21 Version 1 QR!
      expect(f.qrModules[0]!.length).toBe(QR_VERSION_1_SIZE);
    }
  });

  it('decodes all 8 animated QR frames using jsQR across 0°, 90°, 180°, and 270° rotations', () => {
    const sessionId = 0xcafe1234;
    const timestamp = 44556677;
    const sig7 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11]);
    const payload = buildPayload(sessionId, timestamp, sig7);
    const frames = encodePayloadToFrames(payload);

    for (const rotSteps of [0, 1, 2, 3]) {
      const captured = new Map<number, FrameData>();

      for (let f = 0; f < frames.length; f++) {
        const img = renderQrFrameToImageData(360, 360, frames[f]!, rotSteps);
        const qrResult = jsQR(img.data, img.width, img.height, {
          inversionAttempts: 'attemptBoth'
        });

        expect(qrResult).not.toBeNull();
        expect(qrResult!.data).toBe(frames[f]!.qrPayload);

        const decoded = decodeQrFrameString(qrResult!.data);
        expect(decoded).not.toBeNull();
        expect(decoded!.frameIndex).toBe(f);
        captured.set(decoded!.frameIndex, decoded!);
      }

      const reconstructed = assemblePayload(captured);
      expect(reconstructed).not.toBeNull();
      expect(reconstructed).toEqual(payload);
    }
  });

  it('rejects tampered or non-KineCode QR strings', () => {
    expect(decodeQrFrameString('https://example.com')).toBeNull();
    expect(decodeQrFrameString('KC:0:1A2B:00')).toBeNull(); // invalid CRC-8
  });

  it('computes homography and guidance states accurately', () => {
    const quad: QuadCorners = [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 500 },
      { x: 100, y: 500 }
    ];
    const map = computeHomography(quad);
    expect(map(0.5, 0.5).x).toBeCloseTo(300, 1);
    expect(computeQuadArea(quad)).toBe(160000);
    expect(evaluateGuidance(null, 640, 480).status).toBe('searching');
  });
});
