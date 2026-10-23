/**
 * Anti-Stream / Anti-Relay Detector
 * Tracks outer ring luminance across camera frames to detect 15-30Hz optical flicker.
 * A static screenshot or low-framerate video relay (Discord/Zoom) will fail this check.
 */

export class AntiStreamDetector {
  private history: number[] = [];
  private readonly windowSize: number = 20; // Last 20 samples (~600ms at 30fps)
  private readonly thresholdVariance: number = 300; // Minimum luminance variance for active flicker

  /**
   * Push a luminance sample (0..255) from the outer flicker ring
   */
  public pushSample(luminance: number): void {
    this.history.push(luminance);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  /**
   * Calculates the temporal variance and flicker score (0..100)
   */
  public evaluate(): { isLive: boolean; score: number; variance: number } {
    if (this.history.length < 8) {
      return { isLive: true, score: 50, variance: 0 };
    }

    const n = this.history.length;
    const mean = this.history.reduce((a, b) => a + b, 0) / n;
    const variance =
      this.history.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;

    // Count transitions (high-to-low / low-to-high crossings across mean)
    let transitions = 0;
    for (let i = 1; i < n; i++) {
      const prev = this.history[i - 1]! - mean;
      const curr = this.history[i]! - mean;
      if (prev * curr < 0) {
        transitions++;
      }
    }

    // High variance + high transition count indicates optical flicker
    const score = Math.min(100, Math.round((variance / this.thresholdVariance) * 60 + transitions * 10));
    const isLive = variance > 100 && transitions >= 2;

    return { isLive, score, variance };
  }

  public reset(): void {
    this.history = [];
  }
}
