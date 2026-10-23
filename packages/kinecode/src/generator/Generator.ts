import {
  FrameData,
  TOTAL_FRAMES,
  FRAME_INTERVAL_MS,
  VisualSkinType,
  ActionMode
} from '../core/types.ts';
import {
  computeEd25519Truncated,
  computeTruncatedHmacSync,
  generateKeyPair,
  fromHex,
  toHex
} from '../core/crypto.ts';
import {
  packEnvelopeSignableMessage,
  buildDynamicEnvelope,
  encodeEnvelopeToFrames,
  constructSignedUrl
} from '../core/framing.ts';
import { renderFluidWave, RenderContext } from './skins/FluidWave.ts';
import { renderRadialEqualizer } from './skins/RadialEqualizer.ts';
import { renderSonarRipple } from './skins/SonarRipple.ts';

export interface GeneratorOptions {
  canvas: HTMLCanvasElement;
  /** Destination URL or Webhook endpoint reconstructed after N frames (HTML: `url`) */
  url?: string;
  /** Number of cyclic frames required to unlock the URL, e.g. 4, 6, 8, 12 (HTML: `frames`) */
  frames?: number;
  /** Frame rotation speed in Hz, e.g. 2, 4, 6, 8 (HTML: `fps`) */
  fps?: number;
  /** Token freshness window in seconds, default 6 (HTML: `max-age`) */
  maxAge?: number;
  /** Post-handshake action: 'redirect' | 'webhook' | 'both' (HTML: `action-mode`) */
  actionMode?: ActionMode;
  /** If true (default), rolls nonce & refreshes frames every cycle (HTML: `rotate-every-cycle`) */
  rotateEveryCycle?: boolean;
  /** Room or session identifier as number or hex string e.g. '0xCAFE1234' (HTML: `session-id`) */
  sessionId?: number | string;
  /** 32-byte secret key as hex string or Uint8Array (HTML: `secret-key`) */
  secretKey?: string | Uint8Array;
  /** Optional canvas size in px (HTML: `size`) */
  size?: number;

  // Backwards-compatible aliases
  targetUrl?: string;
  totalFrames?: number;
  maxAgeSec?: number;
  privateKey?: Uint8Array;
  useHmac?: boolean;
  skin?: VisualSkinType;
  centerLogoUrl?: string;
  showAntiStreamRing?: boolean;
}

export class Generator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionId: number;
  private privateKey: Uint8Array;
  private useHmac: boolean;
  private totalFrames: number;
  private targetUrl: string;
  private actionMode: ActionMode;
  private maxAgeSec: number;
  private rotateEveryCycle: boolean;
  private skin: VisualSkinType;
  private centerLogoImage: HTMLImageElement | null = null;
  private showAntiStreamRing: boolean = true;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  private currentPayloadEpoch: number = -1;
  private currentCycleNumber: number = -1;
  private cycleNonce: number = 0;
  private lastTimestampSec: number = 0;
  private lastSignature7: Uint8Array = new Uint8Array(7);
  private activePayload: Uint8Array | null = null;
  private activeFrames: FrameData[] = [];

  private currentFrameIndex: number = 0;
  private prevFrame: FrameData | null = null;
  private frameDurationMs: number = FRAME_INTERVAL_MS; // 250ms

  constructor(options: GeneratorOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;

    if (options.size && options.size > 0) {
      this.canvas.width = options.size;
      this.canvas.height = options.size;
    }

    const rawSession = options.sessionId ?? 0x1a2b3c4d;
    this.sessionId =
      typeof rawSession === 'string'
        ? rawSession.trim().startsWith('0x')
          ? parseInt(rawSession.trim(), 16)
          : parseInt(rawSession.trim(), 10)
        : rawSession;

    this.useHmac = options.useHmac ?? true;
    const rawFrames = options.frames ?? options.totalFrames ?? TOTAL_FRAMES;
    this.totalFrames = Math.max(2, Math.min(15, rawFrames));
    this.targetUrl = (options.url ?? options.targetUrl ?? '').trim();
    this.actionMode = options.actionMode ?? 'redirect';
    const rawMaxAge = options.maxAge ?? options.maxAgeSec ?? 6;
    this.maxAgeSec = Math.max(2, Math.min(120, rawMaxAge));
    this.rotateEveryCycle = options.rotateEveryCycle !== false;
    this.skin = options.skin ?? 'fluid-wave';
    this.showAntiStreamRing = options.showAntiStreamRing !== false;
    this.cycleNonce = Math.floor(Math.random() * 256);

    if (options.fps && options.fps > 0) {
      this.frameDurationMs = 1000 / options.fps;
    }

    if (options.centerLogoUrl) {
      this.setCenterLogo(options.centerLogoUrl);
    }

    const rawKey = options.secretKey ?? options.privateKey;
    if (typeof rawKey === 'string' && rawKey.trim().length > 0) {
      this.privateKey = fromHex(rawKey.trim());
    } else if (rawKey instanceof Uint8Array && rawKey.length > 0) {
      this.privateKey = rawKey;
    } else {
      // Default placeholder 32 bytes
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      this.privateKey = randomBytes;
    }

    // Immediately populate frames synchronously so the QR code renders on Frame 0 without waiting
    this.refreshPayloadSync();
  }

  public async init(): Promise<void> {
    if (!this.privateKey || this.privateKey.length !== 32) {
      const pair = await generateKeyPair();
      this.privateKey = pair.privateKeyBytes;
    }
    await this.refreshPayload();
  }

  public setSessionId(id: number): void {
    this.sessionId = id;
    this.refreshPayloadSync();
  }

  public getSessionId(): number {
    return this.sessionId;
  }

  public setPrivateKey(key: Uint8Array): void {
    if (key && key.length > 0) {
      this.privateKey = key;
      this.refreshPayloadSync();
    }
  }

  public getPrivateKey(): Uint8Array {
    return this.privateKey;
  }

  public setTotalFrames(frames: number): void {
    this.totalFrames = Math.max(2, Math.min(15, Math.floor(frames)));
    this.currentFrameIndex = 0;
    this.refreshPayloadSync();
  }

  public getTotalFrames(): number {
    return this.totalFrames;
  }

  public setTargetUrl(url: string): void {
    this.targetUrl = url.trim();
    this.refreshPayloadSync();
  }

  public getTargetUrl(): string {
    return this.targetUrl;
  }

  public setActionMode(mode: ActionMode): void {
    this.actionMode = mode;
    this.refreshPayloadSync();
  }

  public getActionMode(): ActionMode {
    return this.actionMode;
  }

  public setMaxAgeSec(sec: number): void {
    this.maxAgeSec = Math.max(2, Math.min(120, Math.floor(sec)));
    this.refreshPayloadSync();
  }

  public getMaxAgeSec(): number {
    return this.maxAgeSec;
  }

  public setFps(fps: number): void {
    if (fps > 0) {
      this.frameDurationMs = 1000 / fps;
    }
  }

  public getFps(): number {
    return Math.round(1000 / this.frameDurationMs);
  }

  public setRotateEveryCycle(rotate: boolean): void {
    this.rotateEveryCycle = rotate;
  }

  public getRotateEveryCycle(): boolean {
    return this.rotateEveryCycle;
  }

  public getCycleNonce(): number {
    return this.cycleNonce;
  }

  public getLastTimestampSec(): number {
    return this.lastTimestampSec;
  }

  public getLastSignatureHex(): string {
    return toHex(this.lastSignature7);
  }

  public getSignedUrl(): string {
    if (!this.targetUrl) return '';
    return constructSignedUrl(
      this.targetUrl,
      this.sessionId,
      this.lastTimestampSec,
      this.lastSignature7,
      this.cycleNonce
    );
  }

  public setSkin(skin: VisualSkinType): void {
    this.skin = skin;
  }

  public getSkin(): VisualSkinType {
    return this.skin;
  }

  public setShowAntiStreamRing(show: boolean): void {
    this.showAntiStreamRing = show;
  }

  public setCenterLogo(imageUrl: string): void {
    if (!imageUrl) {
      this.centerLogoImage = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.centerLogoImage = img;
    };
    img.src = imageUrl;
  }

  /**
   * Synchronously refreshes the cryptographic payload and re-encodes the N cyclic QR frames.
   */
  public refreshPayloadSync(): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const timestampEpoch = Math.floor(nowSec / 4);
    this.currentPayloadEpoch = timestampEpoch;
    this.lastTimestampSec = nowSec;

    // Advance cycleNonce so consecutive cycles never share identical QR frames
    this.cycleNonce = (this.cycleNonce + 1 + (Math.floor(Math.random() * 127) & 0x7f)) & 0xff;

    const signableMsg = packEnvelopeSignableMessage(
      this.sessionId,
      nowSec,
      this.maxAgeSec,
      this.actionMode,
      this.targetUrl
    );

    const signature7 = computeTruncatedHmacSync(signableMsg, this.privateKey);
    this.lastSignature7 = signature7;

    this.activePayload = buildDynamicEnvelope({
      sessionId: this.sessionId,
      timestampSec: nowSec,
      maxAgeSec: this.maxAgeSec,
      actionMode: this.actionMode,
      signature7,
      targetUrl: this.targetUrl
    });

    this.activeFrames = encodeEnvelopeToFrames(
      this.activePayload,
      this.totalFrames,
      this.cycleNonce
    );
  }

  /**
   * Refreshes the cryptographic payload and re-encodes the N cyclic frames.
   */
  public async refreshPayload(): Promise<void> {
    if (this.useHmac) {
      this.refreshPayloadSync();
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const timestampEpoch = Math.floor(nowSec / 4);
    this.currentPayloadEpoch = timestampEpoch;
    this.lastTimestampSec = nowSec;

    this.cycleNonce = (this.cycleNonce + 1 + (Math.floor(Math.random() * 127) & 0x7f)) & 0xff;

    const signableMsg = packEnvelopeSignableMessage(
      this.sessionId,
      nowSec,
      this.maxAgeSec,
      this.actionMode,
      this.targetUrl
    );

    const signature7 = await computeEd25519Truncated(signableMsg, this.privateKey);
    this.lastSignature7 = signature7;

    this.activePayload = buildDynamicEnvelope({
      sessionId: this.sessionId,
      timestampSec: nowSec,
      maxAgeSec: this.maxAgeSec,
      actionMode: this.actionMode,
      signature7,
      targetUrl: this.targetUrl
    });

    this.activeFrames = encodeEnvelopeToFrames(
      this.activePayload,
      this.totalFrames,
      this.cycleNonce
    );
  }

  public getActivePayload(): Uint8Array | null {
    return this.activePayload;
  }

  public getActiveFrames(): FrameData[] {
    return this.activeFrames;
  }

  public getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * Starts the continuous rendering loop (requestAnimationFrame)
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Render first frame immediately so even background tabs have a rendered canvas
    this.renderStep(performance.now());

    const loop = (time: number) => {
      if (!this.isRunning) return;
      this.renderStep(time);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stops the continuous rendering loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Renders a single frame at the given timestamp `nowMs`.
   */
  public renderStep(nowMs: number): void {
    const cycleDurationMs = this.totalFrames * this.frameDurationMs;
    // Rotate payload every 2 full passes so a scanner joining mid-cycle (e.g. frame 2..3..0..1)
    // can always capture all N frames within a single contiguous pass before the nonce rolls.
    const rotationEpoch = Math.floor(nowMs / (cycleDurationMs * 2));

    if (this.rotateEveryCycle) {
      if (this.currentCycleNumber !== -1 && rotationEpoch !== this.currentCycleNumber) {
        this.currentCycleNumber = rotationEpoch;
        this.refreshPayload();
      } else if (this.currentCycleNumber === -1) {
        this.currentCycleNumber = rotationEpoch;
      }
    } else {
      const nowSec = Math.floor(Date.now() / 1000);
      const timestampEpoch = Math.floor(nowSec / 4);
      if (timestampEpoch !== this.currentPayloadEpoch) {
        this.refreshPayload();
      }
    }

    if (this.activeFrames.length === 0) return;

    // Calculate which of the N cyclic frames we are in
    const elapsedSinceCycle = nowMs % cycleDurationMs;
    const targetFrameIdx =
      Math.floor(elapsedSinceCycle / this.frameDurationMs) % this.activeFrames.length;
    const frameProgressMs = elapsedSinceCycle % this.frameDurationMs;

    if (targetFrameIdx !== this.currentFrameIndex) {
      this.prevFrame = this.activeFrames[this.currentFrameIndex] ?? null;
      this.currentFrameIndex = targetFrameIdx;
    }

    const currentFrame = this.activeFrames[this.currentFrameIndex]!;

    const renderCtx: RenderContext = {
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      currentFrame,
      prevFrame: this.prevFrame,
      frameProgressMs,
      totalTimeMs: nowMs,
      centerLogoImage: this.centerLogoImage,
      showAntiStreamRing: this.showAntiStreamRing
    };

    if (this.skin === 'radial-equalizer') {
      renderRadialEqualizer(renderCtx);
    } else if (this.skin === 'sonar-ripple') {
      renderSonarRipple(renderCtx);
    } else {
      renderFluidWave(renderCtx);
    }
  }
}
