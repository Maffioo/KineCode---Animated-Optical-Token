'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Settings2,
  Code2,
  Layers,
  Globe,
  Clock,
  ShieldCheck,
  Eye,
  Key,
} from 'lucide-react';
import { Generator, fromHex, generateKeyPair, type ActionMode, type VisualSkinType } from 'kinecode';

type FrameworkTab = 'html' | 'react' | 'vanilla' | 'vue' | 'output';

export default function TokenBuilder() {
  // Form State
  const [url, setUrl] = useState<string>('https://attendance.example.com/checkin?room=302');
  const [frames, setFrames] = useState<number>(4);
  const [fps, setFps] = useState<number>(4);
  const [maxAge, setMaxAge] = useState<number>(6);
  const [actionMode, setActionMode] = useState<ActionMode>('redirect');
  const [skin, setSkin] = useState<VisualSkinType>('fluid-wave');
  const [sessionId, setSessionId] = useState<string>('0xCAFE1234');
  const [secretKey, setSecretKey] = useState<string>(
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'
  );
  const [rotateEveryCycle, setRotateEveryCycle] = useState<boolean>(true);

  // Runtime State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const generatorRef = useRef<Generator | null>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [cycleNonce, setCycleNonce] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<FrameworkTab>('html');
  const [copied, setCopied] = useState<boolean>(false);

  // Cycle time in seconds
  const cycleSeconds = (frames / fps).toFixed(1);

  // Initialize and update live Generator
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      if (generatorRef.current) {
        generatorRef.current.stop();
      }

      const sessionNum = sessionId.startsWith('0x')
        ? parseInt(sessionId, 16)
        : parseInt(sessionId, 10) || 0xcafe1234;

      const keyBytes = secretKey.length >= 16 ? fromHex(secretKey) : undefined;

      const gen = new Generator({
        canvas: canvasRef.current,
        url,
        frames,
        fps,
        maxAge,
        actionMode,
        rotateEveryCycle,
        sessionId: sessionNum,
        secretKey: keyBytes,
        skin,
        size: 260,
      });

      generatorRef.current = gen;
      gen.start();

      const timer = setInterval(() => {
        if (generatorRef.current) {
          setCurrentFrameIdx(generatorRef.current.getCurrentFrameIndex());
          setCycleNonce(generatorRef.current.getCycleNonce());
        }
      }, 100);

      return () => {
        clearInterval(timer);
        gen.stop();
      };
    } catch (e) {
      console.error('Failed to run TokenBuilder generator:', e);
    }
  }, [url, frames, fps, maxAge, actionMode, skin, sessionId, secretKey, rotateEveryCycle]);

  // Handle Random Key Generation
  const handleGenerateKey = async () => {
    try {
      const pair = await generateKeyPair();
      setSecretKey(pair.privateKeyHex);
    } catch {
      // Fallback pseudo-random 32 bytes hex
      const array = new Uint8Array(32);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
        const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
        setSecretKey(hex);
      }
    }
  };

  // Reroll cycle nonce & refresh
  const handleRerollNonce = () => {
    if (generatorRef.current) {
      generatorRef.current.refreshPayloadSync();
      setCycleNonce(generatorRef.current.getCycleNonce());
    }
  };

  // Generate code snippets
  const getCodeSnippet = (): string => {
    switch (activeTab) {
      case 'html':
        return `<!-- 1. Load KineCode Web Components Bundle (Zero-config) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>

<!-- 2. Self-animating, hardware-accelerated optical token -->
<kine-code
  url="${url}"
  frames="${frames}"
  fps="${fps}"
  max-age="${maxAge}"
  action-mode="${actionMode}"
  session-id="${sessionId}"
  skin="${skin}"
  rotate-every-cycle="${rotateEveryCycle}"
  size="320"
></kine-code>`;

      case 'react':
        return `'use client';

import React, { useEffect, useRef } from 'react';
import { Generator } from 'kinecode';

export function KineCodePresenter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const generator = new Generator({
      canvas: canvasRef.current,
      url: '${url}',
      frames: ${frames},
      fps: ${fps},
      maxAge: ${maxAge},
      actionMode: '${actionMode}',
      sessionId: '${sessionId}',
      skin: '${skin}',
      rotateEveryCycle: ${rotateEveryCycle},
      size: 320,
    });

    generator.start();

    return () => {
      generator.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-dark-900 rounded-2xl border border-dark-800">
      <canvas ref={canvasRef} width={320} height={320} className="rounded-xl shadow-2xl" />
      <span className="mt-3 text-xs font-mono text-slate-400">
        Active KineCode (${frames} Frames • ${fps} FPS)
      </span>
    </div>
  );
}`;

      case 'vanilla':
        return `import { Generator } from 'kinecode';

// Select an existing HTML5 canvas element
const canvas = document.getElementById('kinecode-canvas') as HTMLCanvasElement;

const generator = new Generator({
  canvas,
  url: '${url}',
  frames: ${frames},
  fps: ${fps},
  maxAge: ${maxAge},
  actionMode: '${actionMode}',
  sessionId: '${sessionId}',
  skin: '${skin}',
  rotateEveryCycle: ${rotateEveryCycle},
  size: 320,
});

// Start cyclic optical transmission
generator.start();

// Lifecycle methods available:
// generator.stop();
// generator.refreshPayloadSync();
// const signedUrl = generator.getSignedUrl();`;

      case 'vue':
        return `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Generator } from 'kinecode';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let generator: Generator | null = null;

onMounted(() => {
  if (!canvasRef.value) return;

  generator = new Generator({
    canvas: canvasRef.value,
    url: '${url}',
    frames: ${frames},
    fps: ${fps},
    maxAge: ${maxAge},
    actionMode: '${actionMode}',
    sessionId: '${sessionId}',
    skin: '${skin}',
    rotateEveryCycle: ${rotateEveryCycle},
    size: 320,
  });

  generator.start();
});

onUnmounted(() => {
  generator?.stop();
});
</script>

<template>
  <div class="kinecode-container">
    <canvas ref="canvasRef" width={320} height={320} />
  </div>
</template>`;

      case 'output':
        if (actionMode === 'redirect') {
          return `// 1. Mobile Camera Scanner captures all ${frames} frames (~${cycleSeconds}s).
// 2. Client verifies Ed25519 / HMAC signature & timestamp freshness (<= ${maxAge}s).
// 3. User is securely redirected to the unlocked signed destination:

${url}${url.includes('?') ? '&' : '?'}kc_session=${sessionId}&kc_ts=${Math.floor(
            Date.now() / 1000
          )}&kc_nonce=0x${cycleNonce.toString(16).padStart(2, '0').toUpperCase()}&kc_sig=9a3f8c...`;
        } else if (actionMode === 'webhook') {
          return `// Webhook Receiver dispatched automatically via POST to: ${url}
{
  "event": "proof_of_presence_verified",
  "sessionId": "${sessionId}",
  "timestamp": ${Math.floor(Date.now() / 1000)},
  "cycleNonce": "0x${cycleNonce.toString(16).padStart(2, '0').toUpperCase()}",
  "totalFrames": ${frames},
  "maxAge": ${maxAge},
  "signature": "9a3f8cb1d24e5f60...",
  "status": "APPROVED"
}`;
        } else {
          return `// Post-Handshake Action: 'both'
// 1. Scanner immediately sends background POST webhook with attendance payload.
// 2. Simultaneously opens unlocked signed URL in mobile browser:

Destination: ${url}`;
        }
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getCodeSnippet());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy snippet:', err);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-dark-750 bg-dark-900/95 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Builder Header */}
      <div className="px-6 py-4 border-b border-dark-800 bg-dark-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive Token Builder</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 uppercase">
                Ready to Copy
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Customize parameters in real time and copy copy-pasteable snippets for your framework.
            </p>
          </div>
        </div>

        <button
          onClick={handleRerollNonce}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
          title="Reroll Cycle Nonce"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-cyan" />
          <span>Reroll Cycle</span>
        </button>
      </div>

      {/* Main Grid: Controls Left + Preview & Output Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-dark-800">
        {/* Left Column: Configuration Controls (7 cols) */}
        <div className="lg:col-span-7 p-6 space-y-5">
          {/* 1. Destination URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-cyan" />
              <span>1. Destination URL / Attendance Endpoint / Webhook</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-750 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-cyan transition-colors"
              placeholder="https://attendance.example.com/checkin"
            />
            <p className="text-[11px] text-slate-500">
              Fragmented and XOR-masked: scanners only unlock this URL after capturing all frames.
            </p>
          </div>

          {/* 2. Cyclic Frames Count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-cyan" />
                <span>2. Cyclic Frames (Security vs Scan Speed)</span>
              </label>
              <span className="text-[11px] font-mono text-brand-cyan">
                Cycle: ~{cycleSeconds}s
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { count: 4, label: 'Fast' },
                { count: 6, label: 'Balanced' },
                { count: 8, label: 'Secure' },
                { count: 12, label: 'Max' },
              ].map((item) => {
                const isActive = frames === item.count;
                const time = (item.count / fps).toFixed(1);
                return (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setFrames(item.count)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all ${
                      isActive
                        ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold shadow-sm shadow-cyan-950/40'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-slate-200 hover:border-dark-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.count} Frames</div>
                    <div className="text-[10px] opacity-75 font-mono">
                      ~{time}s {item.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Action Mode & Visual Skin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-cyan" />
                <span>3. Post-Handshake Action</span>
              </label>
              <select
                value={actionMode}
                onChange={(e) => setActionMode(e.target.value as ActionMode)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan transition-colors"
              >
                <option value="redirect">Redirect (Open Signed URL)</option>
                <option value="webhook">Webhook POST (Background API)</option>
                <option value="both">Both (Webhook + Redirect)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                <span>4. Ambient Skin</span>
              </label>
              <select
                value={skin}
                onChange={(e) => setSkin(e.target.value as VisualSkinType)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan transition-colors"
              >
                <option value="fluid-wave">Fluid Wave (Recommended)</option>
                <option value="radial-equalizer">Radial Equalizer</option>
                <option value="sonar-ripple">Sonar Ripple</option>
                <option value="none">None (Clean Minimalist)</option>
              </select>
            </div>
          </div>

          {/* 4. Frame Rate (FPS) & Max Age Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                <span>5. Frame Rate (FPS)</span>
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value, 10) || 4)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan transition-colors"
              >
                <option value="2">2 FPS (500ms/frame - Relaxed)</option>
                <option value="4">4 FPS (250ms/frame - Standard)</option>
                <option value="6">6 FPS (166ms/frame - Fast)</option>
                <option value="8">8 FPS (125ms/frame - Pro)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                <span>6. Expiration (Anti-Video)</span>
              </label>
              <select
                value={maxAge}
                onChange={(e) => setMaxAge(parseInt(e.target.value, 10) || 6)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan transition-colors"
              >
                <option value="4">4 Seconds (Strict)</option>
                <option value="6">6 Seconds (Recommended)</option>
                <option value="10">10 Seconds (Tolerant)</option>
                <option value="20">20 Seconds (Extended)</option>
              </select>
            </div>
          </div>

          {/* 5. Session ID & Secret Key */}
          <div className="space-y-3 pt-2 border-t border-dark-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Session ID</label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-750 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-cyan"
                  placeholder="0xCAFE1234"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span>Secret Key (HMAC / Ed25519)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="text-[10px] text-brand-cyan hover:underline font-mono"
                  >
                    Random Key
                  </button>
                </div>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-750 text-xs font-mono text-slate-300 truncate focus:outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            {/* Checkbox: Rotate every cycle */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={rotateEveryCycle}
                onChange={(e) => setRotateEveryCycle(e.target.checked)}
                className="rounded bg-dark-800 border-dark-700 text-brand-cyan focus:ring-brand-cyan/20 accent-brand-cyan w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-300">
                Regenerate fresh XOR Nonce every cycle (Anti-Photo Replay)
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Live Animated Preview & Export Code Tabs (5 cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-5 bg-dark-950/40">
          {/* Live Preview Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Live Optical Preview</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                Frame {currentFrameIdx + 1}/{frames} • Nonce: 0x
                {cycleNonce.toString(16).padStart(2, '0').toUpperCase()}
              </span>
            </div>

            {/* Animated Canvas */}
            <div className="relative aspect-square max-w-[260px] mx-auto w-full bg-black rounded-2xl overflow-hidden border border-dark-700 flex items-center justify-center shadow-xl">
              <canvas ref={canvasRef} width={260} height={260} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Export Snippet Tabs */}
          <div className="space-y-2 pt-2 border-t border-dark-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Export Code</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-cyan text-dark-950 hover:bg-brand-cyan/90 font-bold text-xs transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Framework Selector Tabs */}
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-dark-850 border border-dark-800 text-[11px] font-mono">
              {[
                { id: 'html', label: 'HTML / CDN' },
                { id: 'react', label: 'React / Next' },
                { id: 'vanilla', label: 'Vanilla JS/TS' },
                { id: 'vue', label: 'Vue 3' },
                { id: 'output', label: 'Scanner Output' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as FrameworkTab)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Output Area */}
            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 select-all whitespace-pre-wrap">
                {getCodeSnippet()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
