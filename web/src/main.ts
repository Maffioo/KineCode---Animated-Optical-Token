import {
  Generator,
  Scanner,
  fromHex,
  generateKeyPair,
  type VerificationResult,
  type ActionMode
} from 'kinecode';

// State
let dualGenerator: Generator;
let builderGenerator: Generator;
let camScanner: Scanner | null = null;

let currentSecretKey = fromHex('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20');
let currentSecretKeyHex = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
let currentSessionId = 0xcafe1234;
let currentSessionRaw = '0xCAFE1234';
let currentTotalFrames = 4;
let currentTargetUrl = 'https://attendance.example.com/checkin?room=302';
let currentActionMode: ActionMode = 'redirect';
let currentFps = 4;
let allowedTimeWindow = 6;
let currentRotateEveryCycle = true;

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

function setupTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const panels = document.querySelectorAll<HTMLElement>('.view-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      if (!targetId) return;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

function renderSlotBoxes(
  containerId: string,
  prefix: string,
  totalFrames: number,
  lockedFrames: number[]
): void {
  if (totalFrames <= 0) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (container.children.length !== totalFrames) {
    container.style.gridTemplateColumns = `repeat(${totalFrames}, 1fr)`;
    container.innerHTML = '';
    for (let i = 0; i < totalFrames; i++) {
      const box = document.createElement('div');
      box.className = 'slot-box';
      box.id = `${prefix}-${i}`;
      box.textContent = String(i);
      container.appendChild(box);
    }
  }

  for (let i = 0; i < totalFrames; i++) {
    const slotEl = document.getElementById(`${prefix}-${i}`);
    if (slotEl) {
      if (lockedFrames.includes(i)) {
        slotEl.classList.add('locked');
      } else {
        slotEl.classList.remove('locked');
      }
    }
  }
}

function updateLiveInspector(): void {
  if (!dualGenerator) return;

  const total = dualGenerator.getTotalFrames();
  const currentIdx = dualGenerator.getCurrentFrameIndex();
  const nonceHex = `0x${dualGenerator.getCycleNonce().toString(16).toUpperCase().padStart(2, '0')}`;
  const fps = dualGenerator.getFps();
  const frameMs = Math.round(1000 / fps);
  const cycleSec = (total / fps).toFixed(2);
  const frames = dualGenerator.getActiveFrames();
  const activeFrame = frames[currentIdx];

  // Top badge on generator card
  const genBadge = document.getElementById('dual-gen-badge');
  if (genBadge) {
    const modeLabel = currentRotateEveryCycle ? 'Rolling XOR' : 'Epoch';
    genBadge.textContent = `${modeLabel} • ${total} Frames • ${fps} FPS (${cycleSec}s/cycle)`;
  }

  // Nonce pill
  const nonceBadge = document.getElementById('insp-nonce-badge');
  if (nonceBadge) {
    nonceBadge.textContent = `Cycle Nonce: ${nonceHex}`;
  }

  // Frame slots bar
  const frameText = document.getElementById('insp-frame-text');
  if (frameText) {
    frameText.textContent = `Frame ${currentIdx + 1} / ${total} (Index #${currentIdx})`;
  }
  renderSlotBoxes('insp-progress-slots', 'insp-slot', total, [currentIdx]);

  // Table rows
  const targetUrlEl = document.getElementById('insp-target-url');
  if (targetUrlEl) {
    targetUrlEl.textContent = currentTargetUrl || '(Session Token Only — No URL)';
  }

  const actionModeEl = document.getElementById('insp-action-mode');
  if (actionModeEl) {
    actionModeEl.textContent =
      currentActionMode === 'redirect'
        ? 'Redirect to Signed URL'
        : currentActionMode === 'webhook'
        ? 'Webhook POST JSON'
        : 'Webhook POST + Redirect URL';
  }

  const totalFramesEl = document.getElementById('insp-total-frames');
  if (totalFramesEl) {
    totalFramesEl.textContent = `${total} cyclic frames required to unlock URL`;
  }

  const fpsDurationEl = document.getElementById('insp-fps-duration');
  if (fpsDurationEl) {
    fpsDurationEl.textContent = `${fps} FPS (${frameMs}ms per frame • ${cycleSec}s per full cycle)`;
  }

  const maxAgeEl = document.getElementById('insp-max-age');
  if (maxAgeEl) {
    maxAgeEl.textContent = `${allowedTimeWindow} seconds (rejects recorded videos older than ${allowedTimeWindow}s)`;
  }

  const rotModeEl = document.getElementById('insp-rotation-mode');
  if (rotModeEl) {
    rotModeEl.textContent = currentRotateEveryCycle
      ? 'Enabled (New XOR Nonce and signature every cycle — photos cannot be reused)'
      : 'Epoch-only rotation';
  }

  const sessionEl = document.getElementById('insp-session-id');
  if (sessionEl) {
    sessionEl.textContent = `${currentSessionRaw} (${currentSessionId >>> 0})`;
  }

  const rawQrEl = document.getElementById('insp-raw-qr');
  if (rawQrEl && activeFrame) {
    rawQrEl.textContent = activeFrame.qrPayload;
  }

  const qrSizeEl = document.getElementById('insp-qr-size');
  if (qrSizeEl && activeFrame) {
    const dim = activeFrame.qrModules.length;
    const ver = Math.round((dim - 17) / 4);
    qrSizeEl.textContent = `${dim}×${dim} modules (ISO QR Version ${ver} • Error Correction M)`;
  }

  const tsSigEl = document.getElementById('insp-ts-sig');
  if (tsSigEl) {
    tsSigEl.textContent = `kc_ts=${dualGenerator.getLastTimestampSec()} | kc_sig=${dualGenerator.getLastSignatureHex()}`;
  }

  const signedUrlEl = document.getElementById('insp-signed-url');
  if (signedUrlEl) {
    const signedUrl = dualGenerator.getSignedUrl();
    if (signedUrl) {
      signedUrlEl.innerHTML = `<a href="${signedUrl}" target="_blank" rel="noopener" style="color: var(--accent-green); text-decoration: underline">${signedUrl}</a>`;
    } else {
      signedUrlEl.textContent = '(No URL configured)';
    }
  }
}

async function initDualTestbench(): Promise<void> {
  const genCanvas = document.getElementById('dual-gen-canvas') as HTMLCanvasElement;

  dualGenerator = new Generator({
    canvas: genCanvas,
    sessionId: currentSessionId,
    privateKey: currentSecretKey,
    useHmac: true,
    fps: currentFps,
    totalFrames: currentTotalFrames,
    targetUrl: currentTargetUrl,
    actionMode: currentActionMode,
    maxAgeSec: allowedTimeWindow,
    rotateEveryCycle: currentRotateEveryCycle
  });

  dualGenerator.start();
  updateLiveInspector();

  // Reroll cycle button
  document.getElementById('dual-reroll-btn')?.addEventListener('click', () => {
    dualGenerator.refreshPayloadSync();
    updateLiveInspector();
  });

  // Switch to Builder button
  document.getElementById('dual-edit-builder-btn')?.addEventListener('click', () => {
    document.querySelector<HTMLButtonElement>('[data-tab="builder-view"]')?.click();
  });

  // Fullscreen button
  const fsBtn = document.getElementById('dual-fs-btn');
  const genContainer = document.getElementById('dual-gen-container');
  fsBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      genContainer?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
}

async function initBuilder(): Promise<void> {
  const previewCanvas = document.getElementById('bld-preview-canvas') as HTMLCanvasElement;
  const urlInput = document.getElementById('bld-url') as HTMLInputElement;
  const actionSelect = document.getElementById('bld-action-mode') as HTMLSelectElement;
  const fpsSelect = document.getElementById('bld-fps') as HTMLSelectElement;
  const maxAgeSelect = document.getElementById('bld-max-age') as HTMLSelectElement;
  const rotateCheckbox = document.getElementById('bld-rotate-cycle') as HTMLInputElement;
  const sessionInput = document.getElementById('bld-session-id') as HTMLInputElement;
  const secretInput = document.getElementById('bld-secret-key') as HTMLInputElement;
  const genKeyBtn = document.getElementById('bld-gen-key-btn');
  const copyHtmlBtn = document.getElementById('bld-copy-html-btn');
  const applyTestbenchBtn = document.getElementById('bld-apply-testbench-btn');
  const codeHtmlEl = document.getElementById('bld-code-html');
  const codeOutputEl = document.getElementById('bld-code-output');
  const liveMetaBadge = document.getElementById('bld-live-meta');
  const frameBtns = document.querySelectorAll<HTMLButtonElement>('#bld-frames-group .chip-btn');

  let bldFrames = 4;

  builderGenerator = new Generator({
    canvas: previewCanvas,
    sessionId: currentSessionId,
    privateKey: currentSecretKey,
    useHmac: true,
    fps: currentFps,
    totalFrames: bldFrames,
    targetUrl: currentTargetUrl,
    actionMode: currentActionMode,
    maxAgeSec: allowedTimeWindow,
    rotateEveryCycle: true
  });

  builderGenerator.start();

  const updateFrameButtonTimes = (fps: number) => {
    frameBtns.forEach(btn => {
      const fCount = parseInt(btn.dataset.frames || '4', 10);
      const timeSpan = btn.querySelector<HTMLElement>('.frame-time-label');
      if (timeSpan) {
        const label = timeSpan.dataset.label || '';
        const seconds = (fCount / fps).toFixed(1);
        timeSpan.textContent = `~${seconds}s ${label}`;
      }
    });
  };

  const syncBuilderAndTestbench = () => {
    const rawUrl = urlInput.value.trim();
    const mode = actionSelect.value as ActionMode;
    const fps = parseInt(fpsSelect.value, 10) || 4;
    const maxAge = parseInt(maxAgeSelect.value, 10) || 6;
    const rotate = rotateCheckbox.checked;
    const rawSession = sessionInput.value.trim() || '0xCAFE1234';
    const sessionNum = rawSession.startsWith('0x')
      ? parseInt(rawSession, 16)
      : parseInt(rawSession, 10);
    const keyHex = secretInput.value.trim();

    // Update frame buttons duration labels dynamically based on selected FPS
    updateFrameButtonTimes(fps);

    // Update global state
    currentTargetUrl = rawUrl;
    currentTotalFrames = bldFrames;
    currentActionMode = mode;
    currentFps = fps;
    allowedTimeWindow = maxAge;
    currentRotateEveryCycle = rotate;
    currentSessionRaw = rawSession;
    if (!Number.isNaN(sessionNum)) {
      currentSessionId = sessionNum;
    }
    if (keyHex.length >= 16) {
      currentSecretKeyHex = keyHex;
      currentSecretKey = fromHex(keyHex);
    }

    // Update both Builder Preview Generator and Dual Testbench Generator immediately
    for (const gen of [builderGenerator, dualGenerator]) {
      if (!gen) continue;
      gen.setTargetUrl(currentTargetUrl);
      gen.setTotalFrames(currentTotalFrames);
      gen.setActionMode(currentActionMode);
      gen.setFps(currentFps);
      gen.setMaxAgeSec(allowedTimeWindow);
      gen.setRotateEveryCycle(currentRotateEveryCycle);
      gen.setSessionId(currentSessionId);
      gen.setPrivateKey(currentSecretKey);
    }

    updateLiveInspector();

    const htmlSnippet = `<!-- 1. Import KineCode Web Component -->
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>

<!-- 2. Place the Dynamic KineCode QR on your page -->
<kine-code
  url="${currentTargetUrl}"
  frames="${currentTotalFrames}"
  fps="${currentFps}"
  maxAge="${allowedTimeWindow}"
  actionMode="${currentActionMode}"
  rotateEveryCycle="${currentRotateEveryCycle}"
  sessionId="${currentSessionRaw}"
  secretKey="${currentSecretKeyHex}">
</kine-code>`;

    if (codeHtmlEl) {
      codeHtmlEl.textContent = htmlSnippet;
    }

    const sampleSignedUrl = builderGenerator.getSignedUrl() || '(No URL configured)';
    const sampleTs = builderGenerator.getLastTimestampSec();
    const sampleSig = builderGenerator.getLastSignatureHex();
    const sampleNonce = builderGenerator.getCycleNonce();

    if (codeOutputEl) {
      if (mode === 'redirect') {
        codeOutputEl.textContent = `// Signed URL reconstructed and opened by the Scanner after ${bldFrames}/${bldFrames} frames (~${(bldFrames / fps).toFixed(1)}s):\n${sampleSignedUrl}`;
      } else if (mode === 'webhook') {
        codeOutputEl.textContent = `// POST JSON payload dispatched to ${rawUrl || 'webhook'}:\n${JSON.stringify(
          {
            event: 'proof_of_presence_verified',
            sessionIdHex: rawSession,
            timestamp: sampleTs,
            cycleNonce: sampleNonce,
            totalFrames: bldFrames,
            signature: sampleSig,
            signedUrl: sampleSignedUrl
          },
          null,
          2
        )}`;
      } else {
        codeOutputEl.textContent = `// 1) POST JSON to Webhook + 2) Redirect user to:\n${sampleSignedUrl}`;
      }
    }
  };

  setInterval(() => {
    if (liveMetaBadge && builderGenerator) {
      const nonceHex = builderGenerator.getCycleNonce().toString(16).toUpperCase().padStart(2, '0');
      const idx = builderGenerator.getCurrentFrameIndex() + 1;
      const tot = builderGenerator.getTotalFrames();
      liveMetaBadge.textContent = `Frame ${idx}/${tot} • Nonce: 0x${nonceHex}`;
    }
    updateLiveInspector();
  }, 120);

  frameBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      frameBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bldFrames = parseInt(btn.dataset.frames || '4', 10);
      syncBuilderAndTestbench();
    });
  });

  [urlInput, actionSelect, fpsSelect, maxAgeSelect, rotateCheckbox, sessionInput, secretInput].forEach(
    el => {
      el?.addEventListener('input', syncBuilderAndTestbench);
      el?.addEventListener('change', syncBuilderAndTestbench);
    }
  );

  genKeyBtn?.addEventListener('click', async () => {
    const pair = await generateKeyPair();
    secretInput.value = pair.privateKeyHex;
    syncBuilderAndTestbench();
  });

  copyHtmlBtn?.addEventListener('click', async () => {
    if (!codeHtmlEl) return;
    await navigator.clipboard.writeText(codeHtmlEl.textContent || '');
    copyHtmlBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyHtmlBtn.textContent = 'Copy HTML';
    }, 1800);
  });

  applyTestbenchBtn?.addEventListener('click', () => {
    syncBuilderAndTestbench();
    const splitTabBtn = document.querySelector<HTMLButtonElement>('[data-tab="split-view"]');
    splitTabBtn?.click();
  });

  syncBuilderAndTestbench();
}

function initCameraScanner(): void {
  const startBtn = document.getElementById('cam-start-btn');
  const video = document.getElementById('cam-video') as HTMLVideoElement;
  const overlay = document.getElementById('cam-overlay') as HTMLCanvasElement;
  const resultAlert = document.getElementById('cam-result-alert');
  const popupOverlay = document.getElementById('cam-popup-overlay');
  const popupDomain = document.getElementById('cam-popup-domain');
  const popupOpenBtn = document.getElementById('cam-popup-open-btn') as HTMLAnchorElement | null;
  const popupNewScanBtn = document.getElementById('cam-popup-new-scan-btn');

  popupNewScanBtn?.addEventListener('click', () => {
    if (popupOverlay) popupOverlay.style.display = 'none';
    if (resultAlert) resultAlert.style.display = 'none';
    camScanner?.resetScan();
  });

  startBtn?.addEventListener('click', async () => {
    if (camScanner) {
      camScanner.stop();
      camScanner = null;
      startBtn.textContent = 'Start Camera';
      return;
    }

    startBtn.textContent = 'Stop Camera';

    camScanner = new Scanner({
      videoElement: video,
      overlayCanvas: overlay,
      onProgress: (locked, total) => {
        const pText = document.getElementById('cam-progress-text');
        if (pText) pText.textContent = `${locked} / ${total}`;
      },
      onValidScan: (res: VerificationResult) => {
        if (res.valid) {
          if (resultAlert) resultAlert.style.display = 'none';
          if (popupDomain) {
            popupDomain.textContent = extractDomain(res.targetUrl || res.signedUrl);
          }
          if (popupOpenBtn) {
            if (res.signedUrl) {
              popupOpenBtn.href = res.signedUrl;
              popupOpenBtn.style.display = 'inline-flex';
            } else {
              popupOpenBtn.style.display = 'none';
            }
          }
          if (popupOverlay) {
            popupOverlay.style.display = 'flex';
          }
        } else if (resultAlert) {
          resultAlert.style.display = 'block';
          resultAlert.style.background = 'rgba(255, 51, 102, 0.15)';
          resultAlert.style.border = '1px solid #FF3366';
          resultAlert.style.color = '#FF3366';
          resultAlert.innerHTML = `<strong>Verification Failed:</strong> ${res.error}`;
        }
      },
      onDebugUpdate: info => {
        renderSlotBoxes('cam-progress-slots', 'cam-slot', info.totalFrames, info.lockedFrames);
      }
    });

    try {
      await camScanner.startCamera();
    } catch (e) {
      alert('Camera error: ' + e);
      startBtn.textContent = 'Start Camera';
    }
  });
}

async function bootstrapApp(): Promise<void> {
  setupTabs();
  await initDualTestbench();
  await initBuilder();
  initCameraScanner();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
