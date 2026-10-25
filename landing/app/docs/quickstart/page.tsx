'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Code2, Server, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import DocsBreadcrumbs from '@/components/docs/DocsBreadcrumbs';
import DocsTableOfContents, { TocItem } from '@/components/docs/DocsTableOfContents';
import DocsPagination from '@/components/docs/DocsPagination';
import Callout from '@/components/docs/Callout';
import CodeBlock from '@/components/docs/CodeBlock';
import { Steps, Step } from '@/components/docs/Steps';
import TokenBuilder from '@/components/docs/TokenBuilder';

const TOC: TocItem[] = [
  { id: 'install', title: '1. Installation', level: 2 },
  { id: 'presenter', title: '2. Presenter Screen', level: 2 },
  { id: 'builder', title: 'Interactive Token Builder', level: 3 },
  { id: 'scanner', title: '3. Attendee Scanner', level: 2 },
  { id: 'verification', title: '4. Server Verification', level: 2 },
  { id: 'verification-result', title: 'Verification Result Object', level: 3 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
];

export default function QuickstartPage() {
  return (
    <div className="flex w-full justify-between">
      {/* Article Content */}
      <article className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-3xl">
        <DocsBreadcrumbs
          items={[
            { label: 'Getting Started' },
            { label: 'Quickstart' },
          ]}
        />

        <header className="space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
              5-Minute Guide
            </span>
            <span className="text-slate-500 text-xs font-mono">Zero Heavy Dependencies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Quick Start Guide
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Get KineCode deployed on your presenter screen, client scanner, and verification backend in under 5 minutes.
          </p>
        </header>

        <div className="h-px bg-dark-800 my-8" />

        {/* Steps container */}
        <Steps>
          {/* Step 1: Install */}
          <Step number={1} title="Install the Package">
            <p className="text-sm text-slate-300">
              Install the lightweight, tree-shakeable library from npm:
            </p>

            <CodeBlock
              language="bash"
              code="npm install kinecode"
            />

            <p className="text-xs text-slate-400">
              Alternatively, you can load the self-registering Web Components bundle directly from a CDN without any bundler or build step:
            </p>

            <CodeBlock
              language="html"
              fileName="index.html"
              code='<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>'
            />
          </Step>

          {/* Step 2: Presenter */}
          <Step number={2} title="Presenter Screen (Auditorium / Projector)">
            <p className="text-sm text-slate-300">
              Drop the custom Web Component <code>&lt;kine-code&gt;</code> or React component into your presentation slide, lecture app, or presenter dashboard:
            </p>

            <CodeBlock
              language="html"
              fileName="presenter.html"
              code={`<!-- Mount the self-rotating optical token element -->
<kine-code
  url="https://attendance.university.edu/api/checkin"
  frames="4"
  fps="4"
  max-age="6"
  session-id="0xCAFE1234"
  action-mode="redirect"
  size="320"
></kine-code>`}
            />

            <Callout type="tip" title="Recommended Settings for Large Auditoriums">
              For large lecture halls or distant projections, use <code>frames=&quot;4&quot;</code> and <code>fps=&quot;4&quot;</code>. This gives high-contrast V1 QR modules that smartphone cameras can resolve quickly even from row 10+.
            </Callout>

            {/* Interactive Builder */}
            <div id="builder" className="pt-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Live Code Generator &amp; Component Builder</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure your cyclic parameters below, preview the animated optical token in real time, and copy code ready for HTML, React, Vanilla JS, or Vue.
              </p>
              <TokenBuilder />
            </div>
          </Step>

          {/* Step 3: Scanner */}
          <Step number={3} title="Attendee Scanner (Web or Mobile)">
            <p className="text-sm text-slate-300">
              Instantiate the <code>Scanner</code> class with your HTML video element, or mount the <code>&lt;kine-scanner&gt;</code> custom component:
            </p>

            <CodeBlock
              language="typescript"
              fileName="scanner.ts"
              code={`import { Scanner } from 'kinecode';

const scanner = new Scanner({
  videoElement: document.getElementById('camera-feed') as HTMLVideoElement,
  overlayCanvas: document.getElementById('reticle-overlay') as HTMLCanvasElement,
  maxAge: 6,
  onProgress: (locked, total) => {
    console.log(\`Captured \${locked}/\${total} optical frames\`);
  },
  onValidScan: (result) => {
    // result contains: valid, signedUrl, targetUrl, sessionId, timestamp
    console.log('Token verified!', result.targetUrl);
    window.location.href = result.signedUrl!;
  }
});

// Request camera permission and start optical detection loop
await scanner.start();`}
            />

            <Callout type="info" title="Zero Vision Dependencies on Native Mobile">
              If building native mobile apps with React Native or Flutter, use our headless <code>FrameCollector</code> engine. Any native QR scanner (e.g. Expo Camera or MLKit) feeds decoded strings into <code>collector.pushFrame(data)</code>.
            </Callout>
          </Step>

          {/* Step 4: Server */}
          <Step number={4} title="Stateless Server Verification">
            <p className="text-sm text-slate-300">
              When the attendee arrives at your backend check-in endpoint, verify the proof-of-presence token synchronously with zero database lookups:
            </p>

            <CodeBlock
              language="typescript"
              fileName="api/checkin.ts"
              code={`import { verifySignedUrl } from 'kinecode';

export async function POST(request: Request) {
  const { signedUrl } = await request.json();

  // Cryptographically verifies HMAC signature and timestamp freshness
  const check = verifySignedUrl(signedUrl, process.env.KINECODE_SECRET_KEY!, {
    maxAge: 6, // Rejects if generated more than 6s ago
    actionMode: 'redirect'
  });

  if (!check.valid) {
    return Response.json({ success: false, reason: check.error }, { status: 401 });
  }

  // Token is verified and fresh!
  return Response.json({
    success: true,
    sessionId: check.sessionId,
    timestamp: check.timestamp,
    baseUrl: check.baseUrl
  });
}`}
            />

            <div id="verification-result" className="space-y-2 pt-2 scroll-mt-24">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                VerificationResult Object Schema:
              </h4>
              <div className="p-4 rounded-xl bg-dark-900/90 border border-dark-800 font-mono text-xs text-slate-300 space-y-1">
                <div><span className="text-brand-cyan">valid</span>: boolean</div>
                <div><span className="text-brand-cyan">baseUrl</span>: string</div>
                <div><span className="text-brand-cyan">sessionId</span>?: number</div>
                <div><span className="text-brand-cyan">timestamp</span>?: number <span className="text-slate-500">// Unix epoch seconds</span></div>
                <div><span className="text-brand-cyan">timeDiffSeconds</span>?: number</div>
                <div><span className="text-brand-cyan">cycleNonce</span>?: number</div>
                <div><span className="text-brand-cyan">signatureValid</span>?: boolean</div>
                <div><span className="text-brand-cyan">error</span>?: string</div>
              </div>
            </div>
          </Step>
        </Steps>

        {/* Navigation */}
        <section id="next-steps" className="scroll-mt-24">
          <DocsPagination
            prev={{
              title: 'Introduction & Core Concepts',
              category: 'Overview',
              href: '/docs',
            }}
            next={{
              title: 'Binary Framing & Envelopes',
              category: 'Protocol Specification',
              href: '/docs/protocol',
            }}
          />
        </section>
      </article>

      {/* Right Table of Contents */}
      <div className="hidden xl:block w-72 shrink-0 py-10 pl-8 pr-6 border-l border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <DocsTableOfContents items={TOC} githubEditPath="quickstart/page.tsx" />
      </div>
    </div>
  );
}
