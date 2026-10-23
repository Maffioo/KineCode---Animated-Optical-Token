import { RGB, PALETTE } from './types.ts';

export interface CalibratedPalette {
  cyan: RGB;
  magenta: RGB;
  yellow: RGB;
  white: RGB;
}

export const DEFAULT_CALIBRATION: CalibratedPalette = {
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  yellow: [255, 255, 0],
  white: [255, 255, 255]
};

/**
 * Compute Euclidean distance between two RGB colors
 */
export function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Classify an observed RGB color against calibrated reference colors.
 * Returns 0 (Cyan), 1 (Magenta), 2 (Yellow), or 3 (White).
 */
export function classifyColor(observed: RGB, calibration: CalibratedPalette = DEFAULT_CALIBRATION): number {
  const references: [number, RGB][] = [
    [0, calibration.cyan],
    [1, calibration.magenta],
    [2, calibration.yellow],
    [3, calibration.white]
  ];

  let bestIndex = 0;
  let minDistance = Infinity;

  for (const [index, ref] of references) {
    const dist = colorDistance(observed, ref);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = index;
    }
  }

  return bestIndex;
}

/**
 * Sample a box of pixels around (cx, cy) and average the RGB values
 * to reduce sensor noise.
 */
export function sampleBoxAverage(
  imageData: ImageData,
  cx: number,
  cy: number,
  boxRadius: number = 2
): RGB {
  const { width, height, data } = imageData;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  const startX = Math.max(0, Math.floor(cx - boxRadius));
  const endX = Math.min(width - 1, Math.floor(cx + boxRadius));
  const startY = Math.max(0, Math.floor(cy - boxRadius));
  const endY = Math.min(height - 1, Math.floor(cy + boxRadius));

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const idx = (y * width + x) * 4;
      totalR += data[idx]!;
      totalG += data[idx + 1]!;
      totalB += data[idx + 2]!;
      count++;
    }
  }

  if (count === 0) return [0, 0, 0];
  return [
    Math.round(totalR / count),
    Math.round(totalG / count),
    Math.round(totalB / count)
  ];
}

/**
 * Convert color index (0..3) to hex string
 */
export function colorIndexToHex(index: number): string {
  return PALETTE[index]?.hex ?? '#FFFFFF';
}

/**
 * Convert color index (0..3) to RGB
 */
export function colorIndexToRGB(index: number): RGB {
  return PALETTE[index]?.rgb ?? [255, 255, 255];
}
