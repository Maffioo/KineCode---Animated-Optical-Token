import { Scanner } from './Scanner.ts';
import { VerificationResult, GuidanceFeedback } from '../core/types.ts';
import { fromHex } from '../core/crypto.ts';

const SafeHTMLElement = (
  typeof HTMLElement !== 'undefined' ? HTMLElement : class {}
) as typeof HTMLElement;

export class KineScannerElement extends SafeHTMLElement {
  private scanner: Scanner | null = null;
  private video: HTMLVideoElement;
  private overlay: HTMLCanvasElement;
  private statusEl: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.aspectRatio = '4 / 3';
    container.style.background = '#000000';
    container.style.borderRadius = '12px';
    container.style.overflow = 'hidden';

    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = 'cover';

    this.overlay = document.createElement('canvas');
    this.overlay.width = 640;
    this.overlay.height = 480;
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none';

    this.statusEl = document.createElement('div');
    this.statusEl.style.position = 'absolute';
    this.statusEl.style.bottom = '12px';
    this.statusEl.style.left = '50%';
    this.statusEl.style.transform = 'translateX(-50%)';
    this.statusEl.style.background = 'rgba(8, 9, 14, 0.88)';
    this.statusEl.style.color = '#FFFFFF';
    this.statusEl.style.padding = '6px 16px';
    this.statusEl.style.borderRadius = '20px';
    this.statusEl.style.fontSize = '13px';
    this.statusEl.style.fontFamily = 'system-ui, sans-serif';
    this.statusEl.textContent = 'Point camera at the KineCode';

    container.appendChild(this.video);
    container.appendChild(this.overlay);
    container.appendChild(this.statusEl);
    this.shadowRoot!.appendChild(container);
  }

  static get observedAttributes(): string[] {
    return [
      'secretKey',
      'secretkey',
      'secret-key',
      'webhookUrl',
      'webhookurl',
      'webhook-url',
      'maxAge',
      'maxage',
      'max-age',
      'time-window',
      'maxCaptureMs',
      'maxcapturems',
      'max-capture-ms',
      'autoRedirect',
      'autoredirect',
      'auto-redirect',
      'autoStart',
      'autostart',
      'auto-start'
    ];
  }

  private getAttr(camelName: string, kebabFallback?: string): string | null {
    return (
      this.getAttribute(camelName) ??
      this.getAttribute(camelName.toLowerCase()) ??
      (kebabFallback ? this.getAttribute(kebabFallback) : null)
    );
  }

  async connectedCallback(): Promise<void> {
    const webhookUrl = this.getAttr('webhookUrl', 'webhook-url') || undefined;
    const secretKeyHex = this.getAttr('secretKey', 'secret-key');
    const secretKey = secretKeyHex ? fromHex(secretKeyHex) : undefined;
    const maxAgeAttr =
      this.getAttr('maxAge', 'max-age') || this.getAttribute('time-window') || '6';
    const maxAge = parseInt(maxAgeAttr, 10);
    const maxCaptureMsRaw = this.getAttr('maxCaptureMs', 'max-capture-ms');
    const maxCaptureMs = maxCaptureMsRaw ? parseInt(maxCaptureMsRaw, 10) : undefined;
    const autoRedirect = this.getAttr('autoRedirect', 'auto-redirect') === 'true';

    this.scanner = new Scanner({
      videoElement: this.video,
      overlayCanvas: this.overlay,
      secretKey,
      webhookUrl,
      maxAge,
      maxCaptureMs,
      autoRedirect,
      onGuidanceChange: (guidance: GuidanceFeedback) => {
        this.statusEl.textContent = guidance.message;
      },
      onProgress: (locked, total) => {
        this.statusEl.textContent = `Capturing: ${locked}/${total} frames`;
        this.dispatchEvent(
          new CustomEvent('scan-progress', {
            detail: { lockedFrames: locked, totalFrames: total }
          })
        );
      },
      onValidScan: (result: VerificationResult) => {
        if (result.valid) {
          this.statusEl.textContent = result.targetUrl
            ? `Unlocked: ${result.targetUrl}`
            : `Presence Verified (Session: ${result.sessionId})`;
          this.dispatchEvent(new CustomEvent('validscan', { detail: result }));
          this.dispatchEvent(new CustomEvent('valid-scan', { detail: result }));
        } else {
          this.statusEl.textContent = `Verification failed: ${result.error || 'Invalid token'}`;
          this.dispatchEvent(new CustomEvent('scan-error', { detail: result }));
        }
      }
    });

    if (
      this.hasAttribute('autoStart') ||
      this.hasAttribute('autostart') ||
      this.hasAttribute('auto-start')
    ) {
      try {
        await this.scanner.startCamera();
      } catch (_e) {
        this.statusEl.textContent = 'Camera permission required';
      }
    }
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (!this.scanner) return;
    const key = name.toLowerCase();
    if (key === 'secretkey' || key === 'secret-key') {
      this.scanner.setSecretKey(newVal ? fromHex(newVal) : undefined);
    } else if (key === 'webhookurl' || key === 'webhook-url') {
      this.scanner.setWebhookUrl(newVal || '');
    } else if ((key === 'maxage' || key === 'max-age' || key === 'time-window') && newVal) {
      this.scanner.setAllowedTimeWindowSec(parseInt(newVal, 10) || 6);
    } else if ((key === 'maxcapturems' || key === 'max-capture-ms') && newVal) {
      this.scanner.setMaxCaptureDurationMs(parseInt(newVal, 10) || 3000);
    } else if (key === 'autoredirect' || key === 'auto-redirect') {
      this.scanner.setAutoRedirect(newVal === 'true');
    }
  }

  disconnectedCallback(): void {
    if (this.scanner) {
      this.scanner.stop();
      this.scanner = null;
    }
  }

  public getScanner(): Scanner | null {
    return this.scanner;
  }
}

// Register custom element <kine-scanner>
if (typeof customElements !== 'undefined' && !customElements.get('kine-scanner')) {
  customElements.define('kine-scanner', KineScannerElement);
}
