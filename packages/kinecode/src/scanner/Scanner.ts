import jsQR from 'jsqr';
import {
  FrameData,
  TOTAL_FRAMES,
  VerificationResult,
  GuidanceFeedback,
  QuadCorners,
  Point2D
} from '../core/types.ts';
import {
  DEFAULT_CALIBRATION,
  CalibratedPalette
} from '../core/color.ts';
import {
  decodeQrFrameString,
  assemblePayload,
  parsePayload,
  assembleDynamicEnvelope,
  packEnvelopeSignableMessage,
  constructSignedUrl
} from '../core/framing.ts';
import { packMessageHeader, verifyTruncatedHmac, fromHex, toHex } from '../core/crypto.ts';
import { AntiStreamDetector } from './AntiStreamDetector.ts';
import { evaluateGuidance } from './CornerDetector.ts';

export interface ScannerOptions {
  videoElement?: HTMLVideoElement;
  sourceCanvas?: HTMLCanvasElement; // For desktop loopback / virtual testing
  overlayCanvas: HTMLCanvasElement;
  /** Optional 32-byte secret key as hex string or Uint8Array (HTML: `secret-key`) */
  secretKey?: string | Uint8Array;
  /** Maximum allowed age in seconds, default 6 (HTML: `max-age`) */
  maxAge?: number;
  /** Maximum burst time in ms to lock all N frames (HTML: `max-capture-ms`) */
  maxCaptureMs?: number;
  /** Optional webhook URL to POST verified scans (HTML: `webhook-url`) */
  webhookUrl?: string;
  /** Automatically navigate to signedUrl when actionMode is 'redirect' or 'both' (HTML: `auto-redirect`) */
  autoRedirect?: boolean;

  // Backwards-compatible aliases
  publicKeyHex?: string;
  allowedTimeWindowSec?: number;
  maxCaptureDurationMs?: number;

  onProgress?: (lockedCount: number, total: number) => void;
  onValidScan?: (result: VerificationResult) => void;
  onDebugUpdate?: (debugInfo: ScannerDebugInfo) => void;
  onGuidanceChange?: (guidance: GuidanceFeedback) => void;
}

export interface ScannerDebugInfo {
  fps: number;
  lockedFrames: number[];
  totalFrames: number;
  cycleNonce: number | null;
  calibration: CalibratedPalette;
  antiStreamScore: number;
  antiStreamLive: boolean;
  lastDecodedFrame: number | null;
  guidanceMessage: string;
}

export class Scanner {
  private videoElement?: HTMLVideoElement;
  private sourceCanvas?: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private secretKey?: Uint8Array;
  private allowedTimeWindowSec: number;
  private maxCaptureDurationMs?: number;
  private webhookUrl?: string;
  private autoRedirect: boolean;

  private onProgress?: (lockedCount: number, total: number) => void;
  private onValidScan?: (result: VerificationResult) => void;
  private onDebugUpdate?: (debugInfo: ScannerDebugInfo) => void;
  private onGuidanceChange?: (guidance: GuidanceFeedback) => void;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private mediaStream: MediaStream | null = null;

  private antiStreamDetector: AntiStreamDetector = new AntiStreamDetector();
  private dynamicCalibration: CalibratedPalette = { ...DEFAULT_CALIBRATION };

  private framesBuffer: Map<number, FrameData> = new Map();
  private activeTotalFrames: number = 0; // 0 = auto-detecting until first frame is locked
  private activeCycleNonce: number | null = null;
  private cycleStartTimeMs: number = 0;
  private lastLockedFrameIndex: number = -1;
  private prevQuad: QuadCorners | null = null;
  private scanCooldownUntil: number = 0;
  private latestGuidance: GuidanceFeedback = {
    status: 'searching',
    message: 'Point camera at the KineCode',
    confidence: 0,
    quadCorners: null,
    areaRatio: 0
  };

  private frameCount: number = 0;
  private lastFpsCalcTime: number = 0;
  private currentFps: number = 0;

  constructor(options: ScannerOptions) {
    this.videoElement = options.videoElement;
    this.sourceCanvas = options.sourceCanvas;
    this.overlayCanvas = options.overlayCanvas;

    const ctx = this.overlayCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from overlayCanvas');
    this.overlayCtx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) throw new Error('Could not get 2D context from offscreenCanvas');
    this.offscreenCtx = offCtx;

    if (typeof options.secretKey === 'string' && options.secretKey.trim().length > 0) {
      this.secretKey = fromHex(options.secretKey.trim());
    } else if (options.secretKey instanceof Uint8Array) {
      this.secretKey = options.secretKey;
    }
    this.allowedTimeWindowSec = options.maxAge ?? options.allowedTimeWindowSec ?? 6;
    this.maxCaptureDurationMs = options.maxCaptureMs ?? options.maxCaptureDurationMs;
    this.webhookUrl = options.webhookUrl;
    this.autoRedirect = options.autoRedirect ?? false;

    this.onProgress = options.onProgress;
    this.onValidScan = options.onValidScan;
    this.onDebugUpdate = options.onDebugUpdate;
    this.onGuidanceChange = options.onGuidanceChange;
  }

  public setSecretKey(key: Uint8Array | undefined): void {
    this.secretKey = key;
  }

  public setAllowedTimeWindowSec(sec: number): void {
    this.allowedTimeWindowSec = Math.max(2, sec);
  }

  public setMaxCaptureDurationMs(ms: number): void {
    this.maxCaptureDurationMs = Math.max(800, ms);
  }

  public setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  public setAutoRedirect(auto: boolean): void {
    this.autoRedirect = auto;
  }

  public async startCamera(): Promise<void> {
    if (this.sourceCanvas) {
      this.startLoop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access not supported by this browser');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    if (this.videoElement) {
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();
    }

    this.startLoop();
  }

  public startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFpsCalcTime = performance.now();

    const loop = (time: number) => {
      if (!this.isRunning) return;
      this.processFrame(time);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.prevQuad = null;
  }

  public resetScan(): void {
    this.framesBuffer.clear();
    this.activeCycleNonce = null;
    this.cycleStartTimeMs = 0;
    this.lastLockedFrameIndex = -1;
    this.prevQuad = null;
    this.antiStreamDetector.reset();
    if (this.onProgress) {
      this.onProgress(0, this.activeTotalFrames);
    }
  }

  /**
   * Processes a decoded QR payload string (from jsQR or native BarcodeDetector)
   */
  public processQrString(qrData: string, now: number = performance.now()): FrameData | null {
    const decodedFrame = decodeQrFrameString(qrData);
    if (!decodedFrame) return null;

    const frameTotal = decodedFrame.totalFrames ?? TOTAL_FRAMES;
    this.activeTotalFrames = frameTotal;

    // 1. Check if the generator rotated to a new cycleNonce mid-scan
    if (
      decodedFrame.cycleNonce !== undefined &&
      this.activeCycleNonce !== null &&
      decodedFrame.cycleNonce !== this.activeCycleNonce
    ) {
      this.framesBuffer.clear();
      this.activeCycleNonce = decodedFrame.cycleNonce;
      this.cycleStartTimeMs = now;
    }

    // 2. Enforce strict burst capture timeout from first frame locked (anti-photo-swipe defense)
    const maxBurstMs = this.maxCaptureDurationMs ?? Math.max(3000, frameTotal * 450);
    if (this.framesBuffer.size > 0 && this.cycleStartTimeMs > 0 && now - this.cycleStartTimeMs > maxBurstMs) {
      this.framesBuffer.clear();
      this.cycleStartTimeMs = now;
      this.activeCycleNonce = decodedFrame.cycleNonce ?? null;
    }

    if (this.framesBuffer.size === 0) {
      this.cycleStartTimeMs = now;
      this.activeCycleNonce = decodedFrame.cycleNonce ?? null;
    }

    if (decodedFrame.frameIndex !== this.lastLockedFrameIndex) {
      this.lastLockedFrameIndex = decodedFrame.frameIndex;
      // Record alternating frame clock transition for anti-static-photo liveness check
      this.antiStreamDetector.pushSample(decodedFrame.clock === 1 ? 240 : 15);
    }

    this.framesBuffer.set(decodedFrame.frameIndex, decodedFrame);
    if (this.onProgress) {
      this.onProgress(this.framesBuffer.size, frameTotal);
    }

    if (this.framesBuffer.size === frameTotal && now > this.scanCooldownUntil) {
      this.verifyAndCompleteScan(now);
    }

    return decodedFrame;
  }

  /**
   * Main processing loop running on every animation frame using battle-tested jsQR
   */
  public processFrame(now: number): void {
    this.frameCount++;
    if (now - this.lastFpsCalcTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCalcTime));
      this.frameCount = 0;
      this.lastFpsCalcTime = now;
    }

    let srcWidth = 0;
    let srcHeight = 0;

    if (this.sourceCanvas) {
      srcWidth = this.sourceCanvas.width;
      srcHeight = this.sourceCanvas.height;
    } else if (this.videoElement && this.videoElement.videoWidth > 0) {
      srcWidth = this.videoElement.videoWidth;
      srcHeight = this.videoElement.videoHeight;
    }

    if (srcWidth === 0 || srcHeight === 0) return;

    const targetW = 640;
    const targetH = Math.round((srcHeight / srcWidth) * 640);
    if (this.offscreenCanvas.width !== targetW || this.offscreenCanvas.height !== targetH) {
      this.offscreenCanvas.width = targetW;
      this.offscreenCanvas.height = targetH;
    }

    if (this.sourceCanvas) {
      this.offscreenCtx.drawImage(this.sourceCanvas, 0, 0, targetW, targetH);
    } else if (this.videoElement) {
      this.offscreenCtx.drawImage(this.videoElement, 0, 0, targetW, targetH);
    }

    const imageData = this.offscreenCtx.getImageData(0, 0, targetW, targetH);

    // 1. Scan for QR Code using battle-tested jsQR (with Reed-Solomon error correction)
    const qrResult = jsQR(imageData.data, targetW, targetH, {
      inversionAttempts: 'attemptBoth'
    });

    let activeQuad: QuadCorners | null = null;
    let finderCenters: [Point2D, Point2D, Point2D] | null = null;
    let decodedFrame: FrameData | null = null;

    if (qrResult) {
      activeQuad = [
        qrResult.location.topLeftCorner,
        qrResult.location.topRightCorner,
        qrResult.location.bottomRightCorner,
        qrResult.location.bottomLeftCorner
      ];
      finderCenters = [
        qrResult.location.topLeftFinderPattern,
        qrResult.location.topRightFinderPattern,
        qrResult.location.bottomLeftFinderPattern
      ];

      this.latestGuidance = evaluateGuidance(
        activeQuad,
        targetW,
        targetH,
        this.prevQuad,
        finderCenters
      );
      this.prevQuad = activeQuad;

      decodedFrame = this.processQrString(qrResult.data, now);
    } else {
      this.latestGuidance = evaluateGuidance(null, targetW, targetH);
      this.prevQuad = null;
    }

    if (this.onGuidanceChange) {
      this.onGuidanceChange(this.latestGuidance);
    }

    // 2. Render AR Tracking HUD on overlay canvas
    this.drawAugmentedRealityHUD(
      activeQuad,
      finderCenters,
      this.latestGuidance,
      targetW,
      targetH,
      decodedFrame?.frameIndex ?? null
    );

    // 3. Debug Update
    if (this.onDebugUpdate) {
      const antiStreamEval = this.antiStreamDetector.evaluate();
      this.onDebugUpdate({
        fps: this.currentFps,
        lockedFrames: Array.from(this.framesBuffer.keys()).sort(),
        totalFrames: this.activeTotalFrames,
        cycleNonce: this.activeCycleNonce,
        calibration: this.dynamicCalibration,
        antiStreamScore: antiStreamEval.score,
        antiStreamLive: antiStreamEval.isLive,
        lastDecodedFrame: decodedFrame?.frameIndex ?? null,
        guidanceMessage: this.latestGuidance.message
      });
    }
  }

  /**
   * Verifies full payload integrity, burst timing, timestamp freshness, and cryptography
   */
  private async verifyAndCompleteScan(now: number): Promise<void> {
    const captureDurationMs = this.cycleStartTimeMs > 0 ? Math.round(now - this.cycleStartTimeMs) : 0;
    const antiStreamEval = this.antiStreamDetector.evaluate();

    // 1. Try Dynamic Envelope (KC2) first
    const dynamicAssembled = assembleDynamicEnvelope(this.framesBuffer, this.activeTotalFrames);
    if (dynamicAssembled) {
      const { envelope, rawBytes, cycleNonce } = dynamicAssembled;
      const nowSec = Math.floor(Date.now() / 1000);
      const timeDiffSeconds = Math.abs(nowSec - envelope.timestampSec);
      const effectiveMaxAge = envelope.maxAgeSec > 0 ? envelope.maxAgeSec : this.allowedTimeWindowSec;
      const timeValid = timeDiffSeconds <= effectiveMaxAge;

      let signatureValid = true;
      if (this.secretKey) {
        const signableMsg = packEnvelopeSignableMessage(
          envelope.sessionId,
          envelope.timestampSec,
          envelope.maxAgeSec,
          envelope.actionMode,
          envelope.targetUrl
        );
        signatureValid = await verifyTruncatedHmac(signableMsg, this.secretKey, envelope.signature);
      }

      const signatureHex = toHex(envelope.signature);
      const signedUrl = envelope.targetUrl
        ? constructSignedUrl(
            envelope.targetUrl,
            envelope.sessionId,
            envelope.timestampSec,
            envelope.signature,
            cycleNonce
          )
        : undefined;

      const verificationResult: VerificationResult = {
        valid: timeValid && signatureValid && antiStreamEval.isLive,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestampSec,
        timeDiffSeconds,
        maxAgeSec: effectiveMaxAge,
        captureDurationMs,
        totalFrames: this.activeTotalFrames,
        cycleNonce,
        actionMode: envelope.actionMode,
        targetUrl: envelope.targetUrl || undefined,
        signedUrl,
        signatureHex,
        crcValid: true,
        signatureValid,
        antiStreamScore: antiStreamEval.score,
        rawPayload: rawBytes,
        error: !timeValid
          ? `Code expired (${timeDiffSeconds}s ago, max window: ${effectiveMaxAge}s)`
          : !signatureValid
          ? 'Invalid cryptographic signature'
          : !antiStreamEval.isLive
          ? 'Anti-Stream verification failed (possible static photo)'
          : undefined
      };

      this.scanCooldownUntil = now + 2500;
      this.framesBuffer.clear();

      if (this.onValidScan) {
        this.onValidScan(verificationResult);
      }

      if (verificationResult.valid) {
        const shouldWebhook =
          envelope.actionMode === 'webhook' ||
          envelope.actionMode === 'both' ||
          Boolean(this.webhookUrl);
        if (shouldWebhook) {
          this.dispatchWebhook(verificationResult);
        }

        if (
          this.autoRedirect &&
          signedUrl &&
          (envelope.actionMode === 'redirect' || envelope.actionMode === 'both')
        ) {
          window.location.assign(signedUrl);
        }
      }
      return;
    }

    // 2. Fallback to Legacy 8-frame 16-byte Payload (KC)
    const payload = assemblePayload(this.framesBuffer);
    if (!payload) return;

    const parsed = parsePayload(payload);

    const nowSec = Math.floor(Date.now() / 1000);
    const currentEpoch = Math.floor(nowSec / 4);
    const timeDiffSeconds = Math.abs(currentEpoch - parsed.timestamp) * 4;

    const timeValid = timeDiffSeconds <= this.allowedTimeWindowSec;
    let signatureValid = true;

    if (this.secretKey) {
      const header = packMessageHeader(parsed.sessionId, parsed.timestamp);
      signatureValid = await verifyTruncatedHmac(header, this.secretKey, parsed.signature);
    }

    const verificationResult: VerificationResult = {
      valid: timeValid && signatureValid && antiStreamEval.isLive,
      sessionId: parsed.sessionId,
      timestamp: parsed.timestamp,
      timeDiffSeconds,
      captureDurationMs,
      totalFrames: TOTAL_FRAMES,
      signatureHex: toHex(parsed.signature),
      crcValid: true,
      signatureValid,
      antiStreamScore: antiStreamEval.score,
      rawPayload: payload,
      error: !timeValid
        ? `Timestamp expired (diff: ${timeDiffSeconds}s, allowed: ${this.allowedTimeWindowSec}s)`
        : !signatureValid
        ? 'Invalid cryptographic signature'
        : !antiStreamEval.isLive
        ? 'Anti-Stream verification failed (possible static photo)'
        : undefined
    };

    this.scanCooldownUntil = now + 2500;
    this.framesBuffer.clear();

    if (this.onValidScan) {
      this.onValidScan(verificationResult);
    }

    if (verificationResult.valid && this.webhookUrl) {
      this.dispatchWebhook(verificationResult);
    }
  }

  private async dispatchWebhook(result: VerificationResult): Promise<void> {
    const endpoint = this.webhookUrl || result.targetUrl;
    if (!endpoint) return;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'proof_of_presence_verified',
          sessionId: result.sessionId,
          sessionIdHex: result.sessionId ? `0x${result.sessionId.toString(16).toUpperCase()}` : undefined,
          timestamp: result.timestamp,
          timeDiffSeconds: result.timeDiffSeconds,
          captureDurationMs: result.captureDurationMs,
          totalFrames: result.totalFrames,
          cycleNonce: result.cycleNonce,
          signature: result.signatureHex,
          targetUrl: result.targetUrl,
          signedUrl: result.signedUrl,
          verifiedAt: new Date().toISOString(),
          antiStreamScore: result.antiStreamScore
        })
      });
    } catch (e) {
      console.warn('Webhook dispatch failed:', e);
    }
  }

  /**
   * Draws the Augmented Reality (AR) HUD highlighting the detected QR code and 3 Finder Patterns
   */
  private drawAugmentedRealityHUD(
    quad: QuadCorners | null,
    finderCenters: [Point2D, Point2D, Point2D] | null,
    guidance: GuidanceFeedback,
    bufW: number,
    bufH: number,
    lastFrameIdx: number | null
  ): void {
    const canvas = this.overlayCanvas;
    const ctx = this.overlayCtx;

    const scaleX = canvas.width / bufW;
    const scaleY = canvas.height / bufH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (quad) {
      const p0 = { x: quad[0].x * scaleX, y: quad[0].y * scaleY };
      const p1 = { x: quad[1].x * scaleX, y: quad[1].y * scaleY };
      const p2 = { x: quad[2].x * scaleX, y: quad[2].y * scaleY };
      const p3 = { x: quad[3].x * scaleX, y: quad[3].y * scaleY };

      const isLocked = guidance.status === 'locked';
      const hudColor = isLocked ? '#00FF88' : guidance.status === 'stabilize' ? '#FFFF00' : '#00FFFF';

      ctx.save();
      ctx.strokeStyle = hudColor;
      ctx.lineWidth = 3;

      // Draw tracked QR bounding quadrilateral
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.stroke();

      // Highlight the 3 detected QR Finder Patterns (TL, TR, BL)
      if (finderCenters) {
        const labels = ['TL', 'TR', 'BL'];
        for (let i = 0; i < 3; i++) {
          const fc = finderCenters[i]!;
          const fx = fc.x * scaleX;
          const fy = fc.y * scaleY;

          ctx.fillStyle = '#00FF88';
          ctx.beginPath();
          ctx.arc(fx, fy, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText(labels[i]!, fx + 10, fy + 4);
        }
      }
      ctx.restore();
    }

    // Top status guidance banner
    ctx.save();
    const bannerW = Math.min(canvas.width * 0.88, 360);
    const bannerH = 40;
    const bannerX = (canvas.width - bannerW) / 2;
    const bannerY = 20;

    ctx.fillStyle = 'rgba(8, 9, 14, 0.88)';
    ctx.strokeStyle = guidance.status === 'locked' ? '#00FF88' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guidance.message, canvas.width / 2, bannerY + bannerH / 2);
    ctx.restore();

    // Bottom acquisition progress segments (Auto-detected N cyclic frames)
    ctx.save();
    const lockedCount = this.framesBuffer.size;
    const totalSegs = this.activeTotalFrames;
    const barW = Math.min(canvas.width * 0.75, 280);
    const barH = 10;
    const barX = (canvas.width - barW) / 2;
    const barY = canvas.height - 32;

    if (totalSegs > 0) {
      const segSpacing = 4;
      const segW = (barW - (totalSegs - 1) * segSpacing) / totalSegs;

      for (let s = 0; s < totalSegs; s++) {
        const isAcquired = this.framesBuffer.has(s);
        const isCurrent = lastFrameIdx === s;
        const x = barX + s * (segW + segSpacing);

        ctx.fillStyle = isAcquired
          ? '#00FF88'
          : isCurrent
          ? '#FFFFFF'
          : 'rgba(255, 255, 255, 0.2)';

        ctx.beginPath();
        ctx.roundRect(x, barY, segW, barH, 4);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Frames: ${lockedCount}/${totalSegs}`, canvas.width / 2, barY - 10);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ready to scan...', canvas.width / 2, barY - 4);
    }
    ctx.restore();
  }
}
