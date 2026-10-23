import { Scanner, fromHex, type VerificationResult, type GuidanceFeedback } from 'kinecode';

const videoEl = document.getElementById('camera-feed') as HTMLVideoElement;
const overlayCanvas = document.getElementById('reticle-overlay') as HTMLCanvasElement;
const startBtn = document.getElementById('start-cam-btn') as HTMLButtonElement;
const progressVal = document.getElementById('progress-val') as HTMLElement;
const hudHint = document.getElementById('hud-hint') as HTMLElement;
const successModal = document.getElementById('success-modal') as HTMLElement;
const successDomain = document.getElementById('success-domain') as HTMLElement;
const btnOpenLink = document.getElementById('btn-open-link') as HTMLAnchorElement;
const btnDone = document.getElementById('btn-done') as HTMLButtonElement;

// Default pre-shared room secret (can be overridden by ?secret= URL param)
const urlParams = new URLSearchParams(window.location.search);
const secretParam = urlParams.get('secret') || '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const secretKey = fromHex(secretParam);

let scanner: Scanner | null = null;

function extractDomain(rawUrl?: string): string {
  if (!rawUrl) return 'Verified Token';
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'Verified Token';
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname || trimmed;
  } catch {
    const match = /^(?:https?:\/\/)?([^/?#:]+)/i.exec(trimmed);
    return match?.[1] || trimmed;
  }
}

function resizeCanvas(): void {
  const rect = overlayCanvas.getBoundingClientRect();
  overlayCanvas.width = rect.width;
  overlayCanvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateIndicators(lockedFrames: number[]): void {
  for (let i = 0; i < 8; i++) {
    const el = document.getElementById(`slot-${i}`);
    if (el) {
      if (lockedFrames.includes(i)) {
        el.classList.add('locked');
      } else {
        el.classList.remove('locked');
      }
    }
  }
}

async function startScanner(): Promise<void> {
  resizeCanvas();

  scanner = new Scanner({
    videoElement: videoEl,
    overlayCanvas: overlayCanvas,
    secretKey,
    allowedTimeWindowSec: 10,
    onGuidanceChange: (guidance: GuidanceFeedback) => {
      if (hudHint) {
        hudHint.textContent = guidance.message;
      }
    },
    onProgress: (locked, total) => {
      if (progressVal && total > 0) {
        progressVal.textContent = `${locked} / ${total} (${Math.round((locked / total) * 100)}%)`;
      }
      if (window.navigator.vibrate && locked > 0) {
        window.navigator.vibrate(25);
      }
    },
    onValidScan: (res: VerificationResult) => {
      if (res.valid) {
        if (window.navigator.vibrate) {
          window.navigator.vibrate([80, 50, 120]);
        }
        if (successDomain) {
          successDomain.textContent = extractDomain(res.targetUrl || res.signedUrl);
        }
        if (btnOpenLink) {
          if (res.signedUrl) {
            btnOpenLink.href = res.signedUrl;
            btnOpenLink.style.display = 'inline-flex';
          } else {
            btnOpenLink.style.display = 'none';
          }
        }
        if (successModal) {
          successModal.style.display = 'flex';
        }
        // Notify React Native WebView if running inside Expo
        const win = window as any;
        if (win.ReactNativeWebView?.postMessage) {
          win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VALID_SCAN', ...res }));
        }
      }
    },
    onDebugUpdate: (info) => {
      updateIndicators(info.lockedFrames);
    }
  });

  try {
    await scanner.startCamera();
    startBtn.style.display = 'none';
  } catch (err: any) {
    console.warn('Auto start failed:', err);
    startBtn.style.display = 'block';
    if (hudHint) {
      hudHint.textContent = 'Tap "Start Camera" to grant permission';
    }
  }
}

startBtn.addEventListener('click', () => {
  startScanner();
});

btnDone.addEventListener('click', () => {
  successModal.style.display = 'none';
  if (scanner) {
    scanner.resetScan();
  }
});

// Auto-start on load
window.addEventListener('DOMContentLoaded', () => {
  startScanner();
});
