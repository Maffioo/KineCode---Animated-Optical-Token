import {
  Point2D,
  QuadCorners,
  GuidanceFeedback,
  FINDER_PATTERN_SPECS
} from '../core/types.ts';

interface FinderCluster {
  x: number;
  y: number;
  size: number;
  count: number;
}

/**
 * Computes the 3x3 projective homography matrix mapping normalized [0..1] x [0..1]
 * coordinates to camera image coordinates (x, y) defined by 4 quad corners:
 * [TL, TR, BR, BL] -> [(0,0), (1,0), (1,1), (0,1)]
 */
export function computeHomography(quad: QuadCorners): (u: number, v: number) => Point2D {
  const [p0, p1, p2, p3] = quad; // TL, TR, BR, BL

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;

  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;

  // Affine / parallelogram fast path
  if (Math.abs(sx) < 1e-4 && Math.abs(sy) < 1e-4) {
    const h00 = p1.x - p0.x;
    const h01 = p3.x - p0.x;
    const h02 = p0.x;
    const h10 = p1.y - p0.y;
    const h11 = p3.y - p0.y;
    const h12 = p0.y;

    return (u: number, v: number): Point2D => ({
      x: h00 * u + h01 * v + h02,
      y: h10 * u + h11 * v + h12
    });
  }

  const denom = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denom) < 1e-7) {
    return (u: number, v: number): Point2D => ({
      x: (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x,
      y: (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y
    });
  }

  const h20 = (sx * dy2 - sy * dx2) / denom;
  const h21 = (dx1 * sy - dy1 * sx) / denom;
  const h00 = p1.x - p0.x + h20 * p1.x;
  const h01 = p3.x - p0.x + h21 * p3.x;
  const h02 = p0.x;
  const h10 = p1.y - p0.y + h20 * p1.y;
  const h11 = p3.y - p0.y + h21 * p3.y;
  const h12 = p0.y;

  return (u: number, v: number): Point2D => {
    const w = h20 * u + h21 * v + 1.0;
    return {
      x: (h00 * u + h01 * v + h02) / w,
      y: (h10 * u + h11 * v + h12) / w
    };
  };
}

/**
 * Extrapolates the full [0..1]x[0..1] token QuadCorners [TL, TR, BR, BL]
 * from the 3 detected Finder Pattern centers [F_TL, F_TR, F_BL].
 */
export function quadFromThreeFinders(
  fTl: Point2D,
  fTr: Point2D,
  fBl: Point2D
): QuadCorners {
  const span = FINDER_PATTERN_SPECS.span; // 0.72
  const offset = FINDER_PATTERN_SPECS.tl.u; // 0.14

  const ux = (fTr.x - fTl.x) / span;
  const uy = (fTr.y - fTl.y) / span;
  const vx = (fBl.x - fTl.x) / span;
  const vy = (fBl.y - fTl.y) / span;

  const tl: Point2D = {
    x: fTl.x - offset * ux - offset * vx,
    y: fTl.y - offset * uy - offset * vy
  };
  const tr: Point2D = {
    x: tl.x + ux,
    y: tl.y + uy
  };
  const bl: Point2D = {
    x: tl.x + vx,
    y: tl.y + vy
  };
  const br: Point2D = {
    x: tl.x + ux + vx,
    y: tl.y + uy + vy
  };

  return [tl, tr, br, bl];
}

/**
 * Computes polygon area using the Shoelace formula
 */
export function computeQuadArea(quad: QuadCorners): number {
  const [p0, p1, p2, p3] = quad;
  return Math.abs(
    0.5 *
      (p0.x * p1.y - p1.x * p0.y +
        p1.x * p2.y - p2.x * p1.y +
        p2.x * p3.y - p3.x * p2.y +
        p3.x * p0.y - p0.x * p3.y)
  );
}

/**
 * Evaluates guidance state based on detected quad properties
 */
export function evaluateGuidance(
  quad: QuadCorners | null,
  imgWidth: number,
  imgHeight: number,
  prevQuad?: QuadCorners | null,
  finderCenters?: [Point2D, Point2D, Point2D] | null
): GuidanceFeedback {
  if (!quad) {
    return {
      status: 'searching',
      message: 'Point camera at the KineCode',
      confidence: 0,
      quadCorners: null,
      finderCenters: null,
      areaRatio: 0
    };
  }

  const totalArea = imgWidth * imgHeight;
  const quadArea = computeQuadArea(quad);
  const areaRatio = quadArea / totalArea;

  const margin = 4;
  const pointsToCheck = finderCenters ?? quad;
  const touchesBorder = pointsToCheck.some(
    p => p.x <= margin || p.x >= imgWidth - margin || p.y <= margin || p.y >= imgHeight - margin
  );

  if (areaRatio < 0.035) {
    return {
      status: 'too_far',
      message: 'Move closer to the code',
      confidence: 0.6,
      quadCorners: quad,
      finderCenters: finderCenters ?? null,
      areaRatio
    };
  }

  if (areaRatio > 0.92 || touchesBorder) {
    return {
      status: 'too_close',
      message: 'Move slightly back',
      confidence: 0.6,
      quadCorners: quad,
      finderCenters: finderCenters ?? null,
      areaRatio
    };
  }

  if (prevQuad) {
    let movement = 0;
    for (let i = 0; i < 4; i++) {
      const dx = quad[i]!.x - prevQuad[i]!.x;
      const dy = quad[i]!.y - prevQuad[i]!.y;
      movement += Math.sqrt(dx * dx + dy * dy);
    }
    const avgMovement = movement / 4;
    if (avgMovement > 22) {
      return {
        status: 'stabilize',
        message: 'Hold device steady',
        confidence: 0.75,
        quadCorners: quad,
        finderCenters: finderCenters ?? null,
        areaRatio
      };
    }
  }

  return {
    status: 'locked',
    message: 'Locked — Capturing...',
    confidence: 0.98,
    quadCorners: quad,
    finderCenters: finderCenters ?? null,
    areaRatio
  };
}

/**
 * QR-Style 3-Finder Pattern Detector (1:1:3:1:1 Concentric Square Scanner).
 * Automatically locates Top-Left, Top-Right, and Bottom-Left finder squares,
 * resolves 360° rotation, and computes the exact perspective grid.
 */
export class CornerDetector {
  private smoothedQuad: QuadCorners | null = null;
  private smoothedFinders: [Point2D, Point2D, Point2D] | null = null;
  private lostFramesCount: number = 0;
  private readonly smoothAlpha = 0.65;

  public detect(imageData: ImageData): {
    quad: QuadCorners | null;
    finderCenters: [Point2D, Point2D, Point2D] | null;
    threshold: number;
    confidence: number;
    guidance: GuidanceFeedback;
  } {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const lum = new Uint8Array(totalPixels);

    let minLum = 255;
    let maxLum = 0;

    for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
      const yVal = (77 * data[p]! + 150 * data[p + 1]! + 29 * data[p + 2]!) >> 8;
      lum[i] = yVal;
      if (yVal < minLum) minLum = yVal;
      if (yVal > maxLum) maxLum = yVal;
    }

    const baseThreshold = minLum + ((maxLum - minLum) >> 1);

    if (maxLum - minLum < 30) {
      return {
        quad: null,
        finderCenters: null,
        threshold: 128,
        confidence: 0,
        guidance: evaluateGuidance(null, width, height)
      };
    }

    // Multi-threshold pass to handle uneven room / screen exposure
    const candidateThresholds = [
      baseThreshold,
      minLum + Math.round((maxLum - minLum) * 0.35),
      minLum + Math.round((maxLum - minLum) * 0.65)
    ];

    let foundFinders: [Point2D, Point2D, Point2D] | null = null;
    let activeThreshold = baseThreshold;

    for (const thresh of candidateThresholds) {
      foundFinders = this.detectThreeFinderPatterns(lum, width, height, thresh);
      if (foundFinders) {
        activeThreshold = thresh;
        break;
      }
    }

    if (foundFinders) {
      this.lostFramesCount = 0;
      const prevQuadSnapshot = this.smoothedQuad;
      const rawQuad = quadFromThreeFinders(foundFinders[0], foundFinders[1], foundFinders[2]);

      let activeQuad: QuadCorners;
      let activeFinders: [Point2D, Point2D, Point2D];

      if (this.smoothedQuad && this.smoothedFinders) {
        const a = this.smoothAlpha;
        activeQuad = [
          {
            x: this.smoothedQuad[0].x * (1 - a) + rawQuad[0].x * a,
            y: this.smoothedQuad[0].y * (1 - a) + rawQuad[0].y * a
          },
          {
            x: this.smoothedQuad[1].x * (1 - a) + rawQuad[1].x * a,
            y: this.smoothedQuad[1].y * (1 - a) + rawQuad[1].y * a
          },
          {
            x: this.smoothedQuad[2].x * (1 - a) + rawQuad[2].x * a,
            y: this.smoothedQuad[2].y * (1 - a) + rawQuad[2].y * a
          },
          {
            x: this.smoothedQuad[3].x * (1 - a) + rawQuad[3].x * a,
            y: this.smoothedQuad[3].y * (1 - a) + rawQuad[3].y * a
          }
        ];
        activeFinders = [
          {
            x: this.smoothedFinders[0].x * (1 - a) + foundFinders[0].x * a,
            y: this.smoothedFinders[0].y * (1 - a) + foundFinders[0].y * a
          },
          {
            x: this.smoothedFinders[1].x * (1 - a) + foundFinders[1].x * a,
            y: this.smoothedFinders[1].y * (1 - a) + foundFinders[1].y * a
          },
          {
            x: this.smoothedFinders[2].x * (1 - a) + foundFinders[2].x * a,
            y: this.smoothedFinders[2].y * (1 - a) + foundFinders[2].y * a
          }
        ];
      } else {
        activeQuad = rawQuad;
        activeFinders = foundFinders;
      }

      this.smoothedQuad = activeQuad;
      this.smoothedFinders = activeFinders;

      const guidance = evaluateGuidance(activeQuad, width, height, prevQuadSnapshot, activeFinders);
      return {
        quad: activeQuad,
        finderCenters: activeFinders,
        threshold: activeThreshold,
        confidence: guidance.confidence,
        guidance
      };
    }

    // Brief grace period (up to 4 frames) if hand motion momentarily blurs a finder
    this.lostFramesCount++;
    if (this.smoothedQuad && this.smoothedFinders && this.lostFramesCount <= 4) {
      const guidance = evaluateGuidance(
        this.smoothedQuad,
        width,
        height,
        this.smoothedQuad,
        this.smoothedFinders
      );
      return {
        quad: this.smoothedQuad,
        finderCenters: this.smoothedFinders,
        threshold: activeThreshold,
        confidence: 0.5,
        guidance
      };
    }

    this.smoothedQuad = null;
    this.smoothedFinders = null;
    return {
      quad: null,
      finderCenters: null,
      threshold: activeThreshold,
      confidence: 0,
      guidance: evaluateGuidance(null, width, height)
    };
  }

  /**
   * Scans the binary luminance image for the 3 QR-style 1:1:3:1:1 Finder Patterns
   * and returns them ordered as [TL, TR, BL].
   */
  private detectThreeFinderPatterns(
    lum: Uint8Array,
    width: number,
    height: number,
    threshold: number
  ): [Point2D, Point2D, Point2D] | null {
    const clusters: FinderCluster[] = [];
    const maxFinderWidth = Math.min(width, height) * 0.45;

    for (let y = 4; y < height - 4; y += 2) {
      const rowOffset = y * width;
      const counts = [0, 0, 0, 0, 0];
      let state = 0;

      let x = 2;
      while (x < width - 2 && lum[rowOffset + x]! < threshold) {
        x++;
      }

      for (; x < width - 2; x++) {
        const isWhite = lum[rowOffset + x]! >= threshold;

        if (isWhite) {
          if (state === 1 || state === 3) {
            state++;
          }
          counts[state]!++;
        } else {
          if (state === 0 || state === 2) {
            state++;
            counts[state]!++;
          } else if (state === 4) {
            if (this.matchesFinderRatio(counts, maxFinderWidth)) {
              const totalW = counts[0]! + counts[1]! + counts[2]! + counts[3]! + counts[4]!;
              const cx = x - counts[4]! - counts[3]! - counts[2]! / 2;

              const verified = this.verifyVerticalAndRing(
                lum,
                width,
                height,
                Math.round(cx),
                y,
                totalW,
                threshold
              );

              if (verified) {
                this.addCandidateCluster(clusters, verified.x, verified.y, verified.size);
              }
            }

            counts[0] = counts[2]!;
            counts[1] = counts[3]!;
            counts[2] = counts[4]!;
            counts[3] = 1;
            counts[4] = 0;
            state = 3;
          } else {
            counts[state]!++;
          }
        }
      }
    }

    const validClusters = clusters
      .filter(c => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    if (validClusters.length < 3) {
      return null;
    }

    return this.selectBestFinderTriplet(validClusters);
  }

  private matchesFinderRatio(counts: number[], maxFinderWidth: number): boolean {
    const w0 = counts[0]!;
    const b1 = counts[1]!;
    const w2 = counts[2]!;
    const b3 = counts[3]!;
    const w4 = counts[4]!;

    if (w0 === 0 || b1 === 0 || w2 < 3 || b3 === 0 || w4 === 0) {
      return false;
    }

    const total = w0 + b1 + w2 + b3 + w4;
    if (total < 12 || total > maxFinderWidth) {
      return false;
    }

    const unit = total / 7.0;
    const maxVar = unit * 0.78;

    return (
      Math.abs(w0 - unit) <= maxVar &&
      Math.abs(b1 - unit) <= maxVar &&
      Math.abs(w2 - 3.0 * unit) <= unit * 1.45 &&
      Math.abs(b3 - unit) <= maxVar &&
      Math.abs(w4 - unit) <= maxVar
    );
  }

  private verifyVerticalAndRing(
    lum: Uint8Array,
    width: number,
    height: number,
    cx: number,
    startY: number,
    horizontalTotal: number,
    threshold: number
  ): { x: number; y: number; size: number } | null {
    if (cx < 4 || cx >= width - 4) return null;

    const maxSteps = Math.ceil(horizontalTotal * 1.6);

    let yUp = startY;
    let v2Up = 0;
    while (yUp >= 0 && lum[yUp * width + cx]! >= threshold && v2Up <= maxSteps) {
      v2Up++;
      yUp--;
    }
    let v1Up = 0;
    while (yUp >= 0 && lum[yUp * width + cx]! < threshold && v1Up <= maxSteps) {
      v1Up++;
      yUp--;
    }
    let v0Up = 0;
    while (yUp >= 0 && lum[yUp * width + cx]! >= threshold && v0Up <= maxSteps) {
      v0Up++;
      yUp--;
    }

    let yDown = startY + 1;
    let v2Down = 0;
    while (yDown < height && lum[yDown * width + cx]! >= threshold && v2Down <= maxSteps) {
      v2Down++;
      yDown++;
    }
    let v3Down = 0;
    while (yDown < height && lum[yDown * width + cx]! < threshold && v3Down <= maxSteps) {
      v3Down++;
      yDown++;
    }
    let v4Down = 0;
    while (yDown < height && lum[yDown * width + cx]! >= threshold && v4Down <= maxSteps) {
      v4Down++;
      yDown++;
    }

    const vCounts = [v0Up, v1Up, v2Up + v2Down, v3Down, v4Down];
    if (!this.matchesFinderRatio(vCounts, Math.min(width, height) * 0.45)) {
      return null;
    }

    const verticalTotal = vCounts[0]! + vCounts[1]! + vCounts[2]! + vCounts[3]! + vCounts[4]!;
    if (Math.abs(verticalTotal - horizontalTotal) > Math.max(verticalTotal, horizontalTotal) * 0.45) {
      return null;
    }

    const cy = startY + (v2Down - v2Up) / 2;
    const rcy = Math.round(cy);

    // Re-center cx horizontally at rcy
    let xLeft = cx;
    while (xLeft > 0 && lum[rcy * width + xLeft]! >= threshold && cx - xLeft <= maxSteps) {
      xLeft--;
    }
    let xRight = cx;
    while (xRight < width - 1 && lum[rcy * width + xRight]! >= threshold && xRight - cx <= maxSteps) {
      xRight++;
    }
    const refinedCx = (xLeft + xRight) / 2;
    const rcx = Math.round(refinedCx);

    const avgSize = (horizontalTotal + verticalTotal) / 2;
    const unit = avgSize / 7.0;

    // Concentric Ring Check:
    // Diagonal points at ±1.85*unit must lie inside the 5x5 Black ring
    const dBlack = Math.max(1, Math.round(unit * 1.85));
    if (
      rcy - dBlack < 1 ||
      rcy + dBlack >= height - 1 ||
      rcx - dBlack < 1 ||
      rcx + dBlack >= width - 1
    ) {
      return null;
    }

    const bNW = lum[(rcy - dBlack) * width + (rcx - dBlack)]! < threshold ? 1 : 0;
    const bNE = lum[(rcy - dBlack) * width + (rcx + dBlack)]! < threshold ? 1 : 0;
    const bSW = lum[(rcy + dBlack) * width + (rcx - dBlack)]! < threshold ? 1 : 0;
    const bSE = lum[(rcy + dBlack) * width + (rcx + dBlack)]! < threshold ? 1 : 0;

    if (bNW + bNE + bSW + bSE < 3) {
      return null;
    }

    return { x: refinedCx, y: cy, size: avgSize };
  }

  private addCandidateCluster(
    clusters: FinderCluster[],
    x: number,
    y: number,
    size: number
  ): void {
    for (const c of clusters) {
      const dx = c.x - x;
      const dy = c.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(c.size, size) * 0.65) {
        const nextCount = c.count + 1;
        c.x = (c.x * c.count + x) / nextCount;
        c.y = (c.y * c.count + y) / nextCount;
        c.size = (c.size * c.count + size) / nextCount;
        c.count = nextCount;
        return;
      }
    }
    clusters.push({ x, y, size, count: 1 });
  }

  private selectBestFinderTriplet(
    clusters: FinderCluster[]
  ): [Point2D, Point2D, Point2D] | null {
    let bestScore = Infinity;
    let bestTriplet: [Point2D, Point2D, Point2D] | null = null;

    const n = clusters.length;
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        for (let k = j + 1; k < n; k++) {
          const pts = [clusters[i]!, clusters[j]!, clusters[k]!];

          const d01 = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
          const d12 = Math.hypot(pts[1]!.x - pts[2]!.x, pts[1]!.y - pts[2]!.y);
          const d20 = Math.hypot(pts[2]!.x - pts[0]!.x, pts[2]!.y - pts[0]!.y);

          let tl: FinderCluster;
          let pA: FinderCluster;
          let pB: FinderCluster;
          let legA: number;
          let legB: number;

          if (d12 >= d01 && d12 >= d20) {
            tl = pts[0]!;
            pA = pts[1]!;
            pB = pts[2]!;
            legA = d01;
            legB = d20;
          } else if (d20 >= d01 && d20 >= d12) {
            tl = pts[1]!;
            pA = pts[0]!;
            pB = pts[2]!;
            legA = d01;
            legB = d12;
          } else {
            tl = pts[2]!;
            pA = pts[0]!;
            pB = pts[1]!;
            legA = d20;
            legB = d12;
          }

          if (legA < 20 || legB < 20) continue;

          const ratio = legA / legB;
          if (ratio < 0.55 || ratio > 1.8) continue;

          const vAx = pA.x - tl.x;
          const vAy = pA.y - tl.y;
          const vBx = pB.x - tl.x;
          const vBy = pB.y - tl.y;
          const cosAngle = Math.abs((vAx * vBx + vAy * vBy) / (legA * legB));
          if (cosAngle > 0.45) continue;

          const score = Math.abs(1 - ratio) + cosAngle;
          if (score < bestScore) {
            bestScore = score;
            const cross = vAx * vBy - vAy * vBx;
            const tr = cross > 0 ? pA : pB;
            const bl = cross > 0 ? pB : pA;
            bestTriplet = [
              { x: tl.x, y: tl.y },
              { x: tr.x, y: tr.y },
              { x: bl.x, y: bl.y }
            ];
          }
        }
      }
    }

    return bestTriplet;
  }

  public reset(): void {
    this.smoothedQuad = null;
    this.smoothedFinders = null;
    this.lostFramesCount = 0;
  }
}
