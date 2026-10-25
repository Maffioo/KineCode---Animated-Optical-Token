'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, Terminal, Server, Cpu, ShieldAlert } from 'lucide-react';
import DocsBreadcrumbs from '@/components/docs/DocsBreadcrumbs';
import DocsTableOfContents, { TocItem } from '@/components/docs/DocsTableOfContents';
import DocsPagination from '@/components/docs/DocsPagination';
import Callout from '@/components/docs/Callout';
import CodeBlock from '@/components/docs/CodeBlock';
import ParamTable, { ParamItem } from '@/components/docs/ParamTable';
import TokenBuilder from '@/components/docs/TokenBuilder';

const TOC: TocItem[] = [
  { id: 'kine-code', title: '1. <kine-code> & Generator', level: 2 },
  { id: 'interactive-builder', title: 'Interactive Token Builder', level: 3 },
  { id: 'generator-options', title: 'Generator Options & Props', level: 3 },
  { id: 'burst-timing', title: 'Choosing Frames × FPS', level: 3 },
  { id: 'kine-scanner', title: '2. <kine-scanner> & Scanner', level: 2 },
  { id: 'scanner-options', title: 'Scanner Options & Callbacks', level: 3 },
  { id: 'webhook-payload', title: 'Webhook JSON Payload', level: 3 },
  { id: 'antistream', title: '3. AntiStreamDetector', level: 2 },
  { id: 'verifysignedurl', title: '4. verifySignedUrl()', level: 2 },
  { id: 'framecollector', title: '5. FrameCollector (Headless Engine)', level: 2 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
];

const GENERATOR_PARAMS: ParamItem[] = [
  {
    name: 'url',
    type: 'string',
    required: true,
    description: 'Destination URL or payload split across the frames.',
  },
  {
    name: 'frames',
    type: 'number',
    default: '4 (or 8)',
    description: 'Number of cyclic frames required to unlock the token (recommended 4, 6, 8, 12).',
  },
  {
    name: 'fps',
    type: 'number',
    default: '4',
    description: 'Frame rate in Hertz. One cycle lasts (frames / fps) seconds. 4 Hz is standard.',
  },
  {
    name: 'max-age',
    type: 'number',
    default: '6',
    description: 'Token freshness window in seconds (clamped 2–120). Part of the signed message.',
  },
  {
    name: 'session-id',
    type: 'number | string',
    default: '0xCAFE1234',
    description: '32-bit Room, Session, or Event identifier (number or hex e.g. "0xCAFE1234").',
  },
  {
    name: 'action-mode',
    type: "'redirect' | 'webhook' | 'both'",
    default: "'redirect'",
    description: 'Post-scan behavior executed by compliant scanners. Part of the signed message.',
  },
  {
    name: 'secret-key',
    type: 'string | Uint8Array',
    default: 'random 32 bytes',
    description: '64-character hex HMAC key. Note: In production, load only on authenticated presenter screens.',
  },
  {
    name: 'rotateEveryCycle',
    type: 'boolean',
    default: 'true',
    description: 'Regenerates a fresh nonce, timestamp, and HMAC signature on every cycle loop.',
  },
  {
    name: 'size',
    type: 'number',
    default: '320 (web component) / 600 (Generator)',
    description: 'Canvas render dimension in pixels (width and height).',
  },
  {
    name: 'centerLogoUrl',
    type: 'string',
    description: 'Optional central logo image rendered in the center of the optical token.',
  },
  {
    name: 'showAntiStream',
    type: 'boolean',
    default: 'true',
    description: 'Draws the high-contrast anti-stream luminance ring around the QR code.',
  },
];

const SCANNER_PARAMS: ParamItem[] = [
  {
    name: 'videoElement',
    type: 'HTMLVideoElement',
    description: 'Video element providing the live camera feed (auto-created if using <kine-scanner>).',
  },
  {
    name: 'overlayCanvas',
    type: 'HTMLCanvasElement',
    description: 'Canvas used to render the reticle overlay, corner indicators, and lock HUD.',
  },
  {
    name: 'maxAge',
    type: 'number',
    default: '6',
    description: 'Maximum permitted token age in seconds. The stricter of this and the generator applies.',
  },
  {
    name: 'maxCaptureMs',
    type: 'number',
    default: 'max(3000, N × 450)',
    description: 'Burst window from first to last frame before lock slots reset.',
  },
  {
    name: 'autoRedirect',
    type: 'boolean',
    default: 'false',
    description: 'Whether to automatically navigate to signedUrl in redirect or both mode.',
  },
  {
    name: 'webhookUrl',
    type: 'string',
    description: 'Endpoint destination for the POST body in webhook or both mode.',
  },
  {
    name: 'autoStart',
    type: 'boolean',
    default: 'false',
    description: '<kine-scanner> only: automatically request camera permission and start on mount.',
  },
  {
    name: 'onProgress',
    type: '(locked: number, total: number) => void',
    description: 'Callback fired whenever an additional unique frame is locked in the current cycle.',
  },
  {
    name: 'onValidScan',
    type: '(result: VerificationResult) => void',
    description: 'Callback fired when all N frames are unlocked and cryptographic envelope is reassembled.',
  },
  {
    name: 'onGuidanceChange',
    type: '(guidance: GuidanceFeedback) => void',
    description: 'Guidance state for reticle HUD: { state: "searching" | "locking" | "too_far" | "too_close" | "tilted" }.',
  },
];

export default function ApiReferencePage() {
  return (
    <div className="flex w-full justify-between">
      {/* Article Content */}
      <article className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-3xl">
        <DocsBreadcrumbs
          items={[
            { label: 'API Reference' },
            { label: 'SDK & Components' },
          ]}
        />

        <header className="space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
              API Reference
            </span>
            <span className="text-slate-500 text-xs font-mono">TypeScript / Web Components</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            SDK &amp; Web Components API
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Full reference documentation for KineCode classes, Web Components, options, callbacks, and headless engines.
          </p>
        </header>

        <div className="h-px bg-dark-800 my-8" />

        {/* 1. Generator */}
        <section id="kine-code" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-brand-cyan" />
            <span>1. &lt;kine-code&gt; &amp; Generator</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The presenter engine animates cyclic Version 1 QR frames on an HTML <code>&lt;canvas&gt;</code> element. You can either mount the zero-dependency custom Web Component <code>&lt;kine-code&gt;</code> or instantiate the programmatic <code>Generator</code> class.
          </p>

          <CodeBlock
            language="html"
            fileName="presenter.html"
            code={`<kine-code
  url="https://attendance.acme.edu/checkin"
  frames="4"
  fps="4"
  max-age="6"
  session-id="0xCAFE1234"
  size="320"
></kine-code>`}
          />

          {/* Interactive Builder */}
          <div id="interactive-builder" className="pt-4 space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Interactive Token Builder</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
                Live Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tune parameters interactively, watch the dynamic token animate in real-time, and export production-ready code for Web Components, React, Vanilla JS, or Vue.
            </p>
            <TokenBuilder />
          </div>

          <div id="generator-options" className="scroll-mt-24">
            <ParamTable
              title="GeneratorOptions & <kine-code> Attributes"
              params={GENERATOR_PARAMS}
            />
          </div>

          {/* Burst Timing Table */}
          <div id="burst-timing" className="space-y-3 pt-6 scroll-mt-24">
            <h3 className="text-base font-bold text-white">
              Choosing Frames × FPS vs Burst Capture Window
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The scanner must lock all frames within the <strong className="text-slate-200">burst window</strong>: <code>maxCaptureMs</code> if explicitly set, otherwise <code>max(3000, frames × 450) ms</code>. A cycle duration longer than the window can never be scanned.
            </p>

            <div className="border border-dark-800 rounded-xl overflow-hidden text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-dark-900 border-b border-dark-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4">Frames</th>
                    <th className="py-2.5 px-4">Burst Window</th>
                    <th className="py-2.5 px-4">2 FPS</th>
                    <th className="py-2.5 px-4 text-brand-cyan">4 FPS (Recommended)</th>
                    <th className="py-2.5 px-4">6 FPS</th>
                    <th className="py-2.5 px-4">8 FPS</th>
                    <th className="py-2.5 px-4">Typical Use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-850 bg-dark-950 text-slate-200">
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">4</td>
                    <td className="py-2.5 px-4 text-slate-400">3.0 s</td>
                    <td className="py-2.5 px-4">2.0 s</td>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">1.0 s</td>
                    <td className="py-2.5 px-4">0.7 s</td>
                    <td className="py-2.5 px-4">0.5 s</td>
                    <td className="py-2.5 px-4 text-slate-400">Fast check-in, doors, turnstiles</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">6</td>
                    <td className="py-2.5 px-4 text-slate-400">3.0 s</td>
                    <td className="py-2.5 px-4 text-yellow-400">3.0 s ⚠️</td>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">1.5 s</td>
                    <td className="py-2.5 px-4">1.0 s</td>
                    <td className="py-2.5 px-4">0.8 s</td>
                    <td className="py-2.5 px-4 text-slate-400">Classrooms, medium tokens</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">8</td>
                    <td className="py-2.5 px-4 text-slate-400">3.6 s</td>
                    <td className="py-2.5 px-4 text-brand-rose">❌ 4.0 s</td>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">2.0 s</td>
                    <td className="py-2.5 px-4">1.3 s</td>
                    <td className="py-2.5 px-4">1.0 s</td>
                    <td className="py-2.5 px-4 text-slate-400">Exams, secure auth URLs</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">12</td>
                    <td className="py-2.5 px-4 text-slate-400">5.4 s</td>
                    <td className="py-2.5 px-4 text-brand-rose">❌ 6.0 s</td>
                    <td className="py-2.5 px-4 font-bold text-brand-cyan">3.0 s</td>
                    <td className="py-2.5 px-4">2.0 s</td>
                    <td className="py-2.5 px-4">1.5 s</td>
                    <td className="py-2.5 px-4 text-slate-400">High-density payloads, long links</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">
              ❌ = cycle duration longer than the default window. Raise the scanner&apos;s <code>maxCaptureMs</code> if you need these combinations. ⚠️ = no margin for missed camera frames.
            </p>
          </div>
        </section>

        {/* 2. Scanner */}
        <section id="kine-scanner" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-cyan" />
            <span>2. &lt;kine-scanner&gt; &amp; Scanner</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The scanner module streams video frames from the attendee camera, tracks the rotating token with reticle guidance, and reconstructs the Dynamic Envelope.
          </p>

          <CodeBlock
            language="typescript"
            fileName="scanner.ts"
            code={`import { Scanner } from 'kinecode';

const scanner = new Scanner({
  videoElement: document.getElementById('camera') as HTMLVideoElement,
  overlayCanvas: document.getElementById('overlay') as HTMLCanvasElement,
  maxAge: 6,
  onProgress: (locked, total) => {
    console.log(\`Captured \${locked}/\${total} frames\`);
  },
  onValidScan: (result) => {
    console.log('Presence confirmed:', result.targetUrl);
    window.location.href = result.signedUrl!;
  }
});

await scanner.start();`}
          />

          <div id="scanner-options" className="scroll-mt-24">
            <ParamTable
              title="ScannerOptions & Callbacks"
              params={SCANNER_PARAMS}
            />
          </div>

          {/* Webhook Payload */}
          <div id="webhook-payload" className="space-y-3 pt-6 scroll-mt-24">
            <h3 className="text-base font-bold text-white">
              Webhook Dispatch Payload Schema
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When <code>actionMode</code> is configured as <code>&apos;webhook&apos;</code> or <code>&apos;both&apos;</code>, the scanner automatically dispatches an HTTP POST request (<code>Content-Type: application/json</code>) containing the reassembled token payload:
            </p>

            <CodeBlock
              language="json"
              fileName="webhook-payload.json"
              code={`{
  "event": "proof_of_presence_verified",
  "sessionId": 3405697588,
  "sessionIdHex": "0xCAFE1234",
  "timestamp": 1729681204,
  "timeDiffSeconds": 1,
  "captureDurationMs": 1120,
  "totalFrames": 4,
  "cycleNonce": 167,
  "signature": "a9f14bc32e7810",
  "targetUrl": "https://example.com/checkin?room=302",
  "signedUrl": "https://example.com/checkin?room=302&kc_session=0xCAFE1234&kc_ts=1729681204&kc_nonce=A7&kc_sig=a9f14bc32e7810",
  "verifiedAt": "2026-10-23T19:40:05.000Z",
  "antiStreamScore": 0.82
}`}
            />

            <Callout type="security" title="Zero-Trust Client Note">
              Because client phones generate this POST payload, never blindly trust the parsed fields without running <code>verifySignedUrl()</code> on your server against <code>signedUrl</code>.
            </Callout>
          </div>
        </section>

        {/* 3. AntiStream */}
        <section id="antistream" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-rose" />
            <span>3. AntiStreamDetector</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The <code>AntiStreamDetector</code> analyzes image frames for high-frequency moir&eacute; interference patterns and screen raster lines created when an attacker films a secondary computer or TV monitor:
          </p>

          <CodeBlock
            language="typescript"
            fileName="antistream.ts"
            code={`import { AntiStreamDetector } from 'kinecode';

const detector = new AntiStreamDetector({
  threshold: 0.65 // Moiré confidence threshold
});

// Pass ImageData from video stream:
const assessment = detector.analyzeFrame(imageData);

if (assessment.isRebroadcast) {
  console.warn('Rejected: Detected secondary screen / camera rebroadcast!');
}`}
          />
        </section>

        {/* 4. verifySignedUrl */}
        <section id="verifysignedurl" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-cyan" />
            <span>4. verifySignedUrl(signedUrl, secretKey, options?)</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Stateless backend function to verify cryptographic sequential optical tokens in Node.js, Next.js, Express, Fastify, Bun, or Cloudflare Workers:
          </p>

          <CodeBlock
            language="typescript"
            fileName="server.ts"
            code={`import { verifySignedUrl } from 'kinecode';

const KEY = process.env.KINECODE_SECRET_KEY!; // 64-char hex string or Uint8Array

// In an Express / Next.js / Fastify route:
const result = verifySignedUrl(incomingSignedUrl, KEY, {
  maxAge: 6,                 // Rejects tokens older than 6 seconds (default: 6)
  actionMode: 'redirect'     // Must match generator: 'redirect' | 'webhook' | 'both'
});

if (!result.valid) {
  // Rejection reasons: 'Token expired', 'Invalid signature', 'Missing kc_session parameter', etc.
  return res.status(403).json({ error: result.error });
}

// Result fields:
// result.valid: true
// result.sessionId: number
// result.timestamp: number (epoch seconds)
// result.timeDiffSeconds: number
// result.cycleNonce: number
// result.baseUrl: string (target URL without kc_* parameters)

console.log('Verified authentic session:', result.sessionId);`}
          />

          <Callout type="warning" title="Signed Parameter Symmetry">
            The <code>maxAge</code>, <code>actionMode</code>, and original base URL are cryptographically bound to the HMAC signature. If any of these differ between the generator and the verification server, the signature check will fail.
          </Callout>
        </section>

        {/* 5. FrameCollector */}
        <section id="framecollector" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-cyan" />
            <span>5. FrameCollector (Headless Engine)</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            A pure headless state machine with zero DOM or canvas dependencies, tailored for custom native mobile apps (React Native, Flutter, Swift, Kotlin):
          </p>

          <CodeBlock
            language="typescript"
            fileName="mobileCollector.ts"
            code={`import { FrameCollector } from 'kinecode';

const collector = new FrameCollector({ maxAge: 6 });

// Feed decoded strings from native barcode scanner
const step = collector.pushFrame(scannedString, Date.now());

// step.status: 'collecting' | 'verified' | 'rejected' | 'ignored'
if (step.status === 'verified') {
  console.log('Assembled URL:', step.result.signedUrl);
}`}
          />
        </section>

        {/* Navigation */}
        <section id="next-steps" className="scroll-mt-24">
          <DocsPagination
            prev={{
              title: 'Binary Framing & Envelopes',
              category: 'Protocol Specification',
              href: '/docs/protocol',
            }}
            next={{
              title: 'Threat Model & Security',
              category: 'Overview',
              href: '/docs/security',
            }}
          />
        </section>
      </article>

      {/* Right Table of Contents */}
      <div className="hidden xl:block w-72 shrink-0 py-10 pl-8 pr-6 border-l border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <DocsTableOfContents items={TOC} githubEditPath="api/page.tsx" />
      </div>
    </div>
  );
}
