import { describe, it, expect } from 'vitest';
import {
  classifyColor,
  CalibratedPalette
} from '../src/core/color.ts';

describe('Color Classification', () => {
  it('should correctly classify exact palette colors', () => {
    expect(classifyColor([0, 255, 255])).toBe(0); // Cyan
    expect(classifyColor([255, 0, 255])).toBe(1); // Magenta
    expect(classifyColor([255, 255, 0])).toBe(2); // Yellow
    expect(classifyColor([255, 255, 255])).toBe(3); // White
  });

  it('should correctly classify noisy colors with default calibration', () => {
    // Slightly warm / shifted cyan
    expect(classifyColor([10, 240, 230])).toBe(0);
    // Slightly dark magenta
    expect(classifyColor([220, 20, 220])).toBe(1);
    // Slightly greenish yellow
    expect(classifyColor([240, 250, 30])).toBe(2);
    // Slightly off-white
    expect(classifyColor([235, 235, 240])).toBe(3);
  });

  it('should adapt to severe ambient shift via dynamic calibration', () => {
    // Suppose severe yellow wash from projector lamp shifts cyan towards green:
    const shiftedCalibration: CalibratedPalette = {
      cyan: [50, 220, 180],
      magenta: [230, 40, 200],
      yellow: [255, 240, 20],
      white: [250, 245, 210]
    };

    // A sampled pixel close to shifted cyan
    const observedCyan: [number, number, number] = [55, 215, 175];
    expect(classifyColor(observedCyan, shiftedCalibration)).toBe(0);
  });
});
