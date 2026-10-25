import { Generator } from './Generator.ts';
import { ActionMode } from '../core/types.ts';
import { fromHex } from '../core/crypto.ts';

const SafeHTMLElement = (
  typeof HTMLElement !== 'undefined' ? HTMLElement : class {}
) as typeof HTMLElement;

export class KineCodeElement extends SafeHTMLElement {
  private generator: Generator | null = null;
  private canvas: HTMLCanvasElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.canvas = document.createElement('canvas');
    this.canvas.width = 600;
    this.canvas.height = 600;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        width: 100%;
        max-width: 600px;
        aspect-ratio: 1 / 1;
        background: #08090E;
        border-radius: 12px;
        overflow: hidden;
      }
    `;

    this.shadowRoot!.appendChild(style);
    this.shadowRoot!.appendChild(this.canvas);
  }

  static get observedAttributes(): string[] {
    return [
      'url',
      'frames',
      'fps',
      'maxAge',
      'maxage',
      'max-age',
      'actionMode',
      'actionmode',
      'action-mode',
      'rotateEveryCycle',
      'rotateeverycycle',
      'rotate-every-cycle',
      'sessionId',
      'sessionid',
      'session-id',
      'secretKey',
      'secretkey',
      'secret-key',
      'centerLogoUrl',
      'centerlogourl',
      'center-logo-url',
      'showAntiStream',
      'showantistream',
      'show-anti-stream',
      'size'
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
    const rawSessionId = this.getAttr('sessionId', 'session-id') || '0xCAFE1234';
    const sessionId = rawSessionId.startsWith('0x')
      ? parseInt(rawSessionId, 16)
      : parseInt(rawSessionId, 10);
    const totalFrames = parseInt(this.getAttr('frames') || '8', 10);
    const fps = parseFloat(this.getAttr('fps') || '4');
    const targetUrl = this.getAttr('url', 'target-url') || '';
    const actionMode = (this.getAttr('actionMode', 'action-mode') as ActionMode) || 'redirect';
    const maxAgeSec = parseInt(this.getAttr('maxAge', 'max-age') || '6', 10);
    const rotateEveryCycle = this.getAttr('rotateEveryCycle', 'rotate-every-cycle') !== 'false';
    const centerLogoUrl = this.getAttr('centerLogoUrl', 'center-logo-url') || undefined;
    const showAntiStream = this.getAttr('showAntiStream', 'show-anti-stream') !== 'false';
    const secretKeyHex = this.getAttr('secretKey', 'secret-key');
    const privateKey = secretKeyHex ? fromHex(secretKeyHex) : undefined;
    const sizeAttr = this.getAttr('size');
    if (sizeAttr) {
      this.style.maxWidth = `${parseInt(sizeAttr, 10)}px`;
    }

    this.generator = new Generator({
      canvas: this.canvas,
      sessionId,
      frames: totalFrames,
      fps,
      url: targetUrl,
      actionMode,
      maxAge: maxAgeSec,
      rotateEveryCycle,
      centerLogoUrl,
      showAntiStreamRing: showAntiStream,
      secretKey: privateKey,
      useHmac: true
    });

    await this.generator.init();
    this.generator.start();
  }

  disconnectedCallback(): void {
    if (this.generator) {
      this.generator.stop();
      this.generator = null;
    }
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    const key = name.toLowerCase();
    if (key === 'size' && newVal) {
      this.style.maxWidth = `${parseInt(newVal, 10)}px`;
    }
    if (!this.generator) return;

    if ((key === 'sessionid' || key === 'session-id') && newVal) {
      const id = newVal.startsWith('0x') ? parseInt(newVal, 16) : parseInt(newVal, 10);
      this.generator.setSessionId(id);
    } else if (key === 'frames' && newVal) {
      this.generator.setTotalFrames(parseInt(newVal, 10) || 8);
    } else if (key === 'fps' && newVal) {
      this.generator.setFps(parseFloat(newVal) || 4);
    } else if (key === 'url' || key === 'target-url') {
      this.generator.setTargetUrl(newVal || '');
    } else if ((key === 'actionmode' || key === 'action-mode') && newVal) {
      this.generator.setActionMode(newVal as ActionMode);
    } else if ((key === 'maxage' || key === 'max-age') && newVal) {
      this.generator.setMaxAgeSec(parseInt(newVal, 10) || 6);
    } else if (key === 'rotateeverycycle' || key === 'rotate-every-cycle') {
      this.generator.setRotateEveryCycle(newVal !== 'false');
    } else if (key === 'centerlogourl' || key === 'center-logo-url') {
      this.generator.setCenterLogo(newVal || '');
    } else if (key === 'showantistream' || key === 'show-anti-stream') {
      this.generator.setShowAntiStreamRing(newVal !== 'false');
    } else if ((key === 'secretkey' || key === 'secret-key') && newVal) {
      this.generator.setPrivateKey(fromHex(newVal));
    }
  }

  public getGenerator(): Generator | null {
    return this.generator;
  }
}

// Register custom element <kine-code>
if (typeof customElements !== 'undefined' && !customElements.get('kine-code')) {
  customElements.define('kine-code', KineCodeElement);
}
