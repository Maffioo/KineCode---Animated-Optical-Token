import { FrameData } from '../core/types.ts';
import { generateQrMatrix } from '../core/framing.ts';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentFrame: FrameData;
  prevFrame: FrameData | null;
  frameProgressMs: number; // 0..250ms
  totalTimeMs: number;
  centerLogoImage?: HTMLImageElement | null;
  showAntiStreamRing?: boolean;
}

/**
 * Standard High-Contrast QR Matrix Renderer:
 * Renders an ISO/IEC 18004 Version 1 QR Code (21x21 modules) with a 4-module
 * white quiet zone card on a dark backdrop for instant optical camera decoding.
 */
export function renderQrFrame(opts: RenderContext): void {
  const { ctx, width, height, currentFrame } = opts;

  const size = Math.min(width, height);
  const offsetX = Math.round((width - size) / 2);
  const offsetY = Math.round((height - size) / 2);

  // 1. Fill outer canvas background dark
  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, width, height);

  // Ensure qrModules are populated
  const modules =
    currentFrame.qrModules && currentFrame.qrModules.length > 0
      ? currentFrame.qrModules
      : generateQrMatrix(currentFrame.qrPayload || `KC:${currentFrame.frameIndex}:0000:00`);

  const matrixSize = modules.length; // 21 for Version 1 QR
  const quietZoneModules = 4; // Standard 4-module ISO quiet zone
  const totalModules = matrixSize + quietZoneModules * 2; // 29 modules

  const cardSize = Math.round(size * 0.92);
  const cardX = offsetX + Math.round((size - cardSize) / 2);
  const cardY = offsetY + Math.round((size - cardSize) / 2);

  // 2. Crisp White Quiet-Zone Card (#FFFFFF)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cardY, cardSize, cardSize);

  // 3. Draw 21x21 large Black QR modules (#000000) without anti-aliasing seams
  const modulePx = cardSize / totalModules;

  ctx.fillStyle = '#000000';
  for (let r = 0; r < matrixSize; r++) {
    const row = modules[r]!;
    const y0 = Math.floor(cardY + (r + quietZoneModules) * modulePx);
    const y1 = Math.ceil(cardY + (r + quietZoneModules + 1) * modulePx);
    const h = y1 - y0;

    for (let c = 0; c < matrixSize; c++) {
      if (row[c] === 1) {
        const x0 = Math.floor(cardX + (c + quietZoneModules) * modulePx);
        const x1 = Math.ceil(cardX + (c + quietZoneModules + 1) * modulePx);
        ctx.fillRect(x0, y0, x1 - x0, h);
      }
    }
  }
}
