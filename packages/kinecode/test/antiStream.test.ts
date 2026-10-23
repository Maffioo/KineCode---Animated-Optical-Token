import { describe, it, expect } from 'vitest';
import { AntiStreamDetector } from '../src/scanner/AntiStreamDetector.ts';

describe('AntiStreamDetector', () => {
  it('should detect 20Hz optical flicker with high confidence', () => {
    const detector = new AntiStreamDetector();

    // Simulate 20 frames alternating between high luminance (220) and low luminance (30)
    for (let i = 0; i < 20; i++) {
      const lum = i % 2 === 0 ? 220 : 30;
      detector.pushSample(lum);
    }

    const result = detector.evaluate();
    expect(result.isLive).toBe(true);
    expect(result.score).toBeGreaterThan(70);
    expect(result.variance).toBeGreaterThan(5000);
  });

  it('should reject static screenshots (zero flicker)', () => {
    const detector = new AntiStreamDetector();

    // Constant luminance across all frames (e.g., photo on a phone)
    for (let i = 0; i < 20; i++) {
      detector.pushSample(180);
    }

    const result = detector.evaluate();
    expect(result.isLive).toBe(false);
    expect(result.score).toBeLessThan(30);
    expect(result.variance).toBe(0);
  });

  it('should reject low-framerate video relay (slow transitions)', () => {
    const detector = new AntiStreamDetector();

    // Slow changes (e.g. 1-2Hz from 5fps screen sharing)
    for (let i = 0; i < 20; i++) {
      const lum = i < 10 ? 200 : 40;
      detector.pushSample(lum);
    }

    const result = detector.evaluate();
    // Only 1 transition across 20 frames
    expect(result.isLive).toBe(false);
  });
});
