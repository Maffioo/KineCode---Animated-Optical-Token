import { RenderContext, drawCalibrationCore, drawFlickerRing } from './RadialEqualizer.ts';
import { colorIndexToHex } from '../../core/color.ts';
import { CAPSULES_COUNT } from '../../core/types.ts';

/**
 * Alternative visual skin: "Sonar Ripple"
 * Renders smooth concentric pulsed rings with color-coded data sectors.
 */
export function renderSonarRipple(opts: RenderContext): void {
  const { ctx, width, height, currentFrame, totalTimeMs } = opts;

  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);

  ctx.fillStyle = '#05070B';
  ctx.fillRect(0, 0, width, height);

  const outerFlickerRadius = minDim * 0.46;
  const innerFlickerRadius = minDim * 0.44;
  const coreRadius = minDim * 0.12;

  // 1. Draw outer 20Hz flicker ring
  drawFlickerRing(ctx, centerX, centerY, innerFlickerRadius, outerFlickerRadius, totalTimeMs);

  // 2. Draw static central calibration core
  drawCalibrationCore(ctx, centerX, centerY, coreRadius);

  // 3. Sonar rings
  const ringCount = 4;
  const baseRadius = minDim * 0.18;
  const maxRadius = minDim * 0.40;
  const ringStep = (maxRadius - baseRadius) / ringCount;

  for (let r = 0; r < ringCount; r++) {
    const ringRadius = baseRadius + r * ringStep;
    const itemsPerRing = CAPSULES_COUNT / ringCount; // 4 items per ring
    const arcSpan = (2 * Math.PI) / itemsPerRing;

    for (let j = 0; j < itemsPerRing; j++) {
      const capsuleIdx = r * itemsPerRing + j;
      const colorIdx = currentFrame.capsuleColors[capsuleIdx]!;
      const colorHex = colorIndexToHex(colorIdx);

      const startAngle = j * arcSpan - Math.PI / 2;
      const endAngle = startAngle + arcSpan * 0.85;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = minDim * 0.035;
      ctx.lineCap = 'round';
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
  }
}
