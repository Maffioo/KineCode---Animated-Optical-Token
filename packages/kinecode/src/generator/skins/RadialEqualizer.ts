import { FrameData, CAPSULES_COUNT, MORPH_DURATION_MS } from '../../core/types.ts';
import { colorIndexToHex } from '../../core/color.ts';

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
 * Cubic bezier / smoothstep interpolation
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Renders the central 4-color static calibration core.
 * Top-left: Cyan (0)
 * Top-right: Magenta (1)
 * Bottom-right: Yellow (2)
 * Bottom-left: White (3)
 */
export function drawCalibrationCore(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  coreRadius: number,
  centerLogoImage?: HTMLImageElement | null
): void {
  ctx.save();

  const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FFFFFF'];
  const angles = [
    [-Math.PI, -Math.PI / 2], // Top-Left
    [-Math.PI / 2, 0],        // Top-Right
    [0, Math.PI / 2],         // Bottom-Right
    [Math.PI / 2, Math.PI]    // Bottom-Left
  ];

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, coreRadius, angles[i]![0]!, angles[i]![1]!);
    ctx.closePath();
    ctx.fillStyle = colors[i]!;
    ctx.fill();
  }

  // Inner badge to prevent center blending and host optional custom logo
  const badgeRadius = coreRadius * 0.40;
  ctx.beginPath();
  ctx.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0A0A0C';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (centerLogoImage && centerLogoImage.complete && centerLogoImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeRadius - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      centerLogoImage,
      centerX - (badgeRadius - 2),
      centerY - (badgeRadius - 2),
      (badgeRadius - 2) * 2,
      (badgeRadius - 2) * 2
    );
    ctx.restore();
  } else {
    // Center white dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders the 20Hz anti-stream flicker ring on the outer boundary.
 */
export function drawFlickerRing(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  totalTimeMs: number
): void {
  ctx.save();

  // 20Hz toggle = 25ms per phase (period = 50ms)
  const isHighContrast = Math.floor(totalTimeMs / 25) % 2 === 0;

  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
  ctx.fillStyle = isHighContrast ? '#FFFFFF' : '#14141A';
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the "Radial Equalizer" visual skin.
 */
export function renderRadialEqualizer(opts: RenderContext): void {
  const {
    ctx,
    width,
    height,
    currentFrame,
    prevFrame,
    frameProgressMs,
    totalTimeMs,
    centerLogoImage,
    showAntiStreamRing
  } = opts;

  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);

  // Background
  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, width, height);

  // Radii dimensions
  const outerFlickerRadius = minDim * 0.46;
  const innerFlickerRadius = minDim * 0.44;
  const coreRadius = minDim * 0.12;
  const baseCapsuleRadius = minDim * 0.16;
  const maxCapsuleLength = minDim * 0.22;
  const minCapsuleLength = minDim * 0.10;
  const capsuleWidth = minDim * 0.024;

  // 1. Draw outer 20Hz flicker ring (if enabled)
  if (showAntiStreamRing !== false) {
    drawFlickerRing(ctx, centerX, centerY, innerFlickerRadius, outerFlickerRadius, totalTimeMs);
  }

  // 2. Draw static central calibration core (with optional center logo)
  drawCalibrationCore(ctx, centerX, centerY, coreRadius, centerLogoImage);

  // 3. Draw radial capsules
  // Calculate interpolation factor: 0..50ms is morph, 50..250ms is stable plateau
  const morphT = Math.min(1, frameProgressMs / MORPH_DURATION_MS);
  const easedT = easeInOutCubic(morphT);

  for (let i = 0; i < CAPSULES_COUNT; i++) {
    // Capsule 0 is at top (-PI/2)
    const angle = (i * (2 * Math.PI)) / CAPSULES_COUNT - Math.PI / 2;

    const currColorIdx = currentFrame.capsuleColors[i]!;
    const currHeightFlag = currentFrame.capsuleHeights[i] ?? 1;
    const targetLength = currHeightFlag === 1 ? maxCapsuleLength : minCapsuleLength;

    let displayLength = targetLength;
    let colorHex = colorIndexToHex(currColorIdx);

    if (prevFrame && morphT < 1) {
      const prevHeightFlag = prevFrame.capsuleHeights[i] ?? 1;
      const prevTargetLength = prevHeightFlag === 1 ? maxCapsuleLength : minCapsuleLength;
      displayLength = prevTargetLength + (targetLength - prevTargetLength) * easedT;

      // During the short 50ms morph, display current frame color if easedT > 0.5
      if (easedT <= 0.5) {
        colorHex = colorIndexToHex(prevFrame.capsuleColors[i]!);
      }
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // Subtle neon glow
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 12;

    ctx.fillStyle = colorHex;

    const rx = baseCapsuleRadius;
    const ry = -capsuleWidth / 2;
    const rw = displayLength;
    const rh = capsuleWidth;
    const radius = capsuleWidth / 2;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, radius);
    } else {
      ctx.rect(rx, ry, rw, rh);
    }
    ctx.fill();

    ctx.restore();
  }
}
