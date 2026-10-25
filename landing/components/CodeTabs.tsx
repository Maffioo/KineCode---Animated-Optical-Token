'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, Server, Smartphone } from 'lucide-react';

interface TabItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  language: string;
  code: string;
  description: string;
}

const TABS: TabItem[] = [
  {
    id: 'presenter',
    name: 'Presenter Screen',
    icon: Code2,
    language: 'html',
    description: 'Mount the animated rotating optical token on your classroom projector or screen.',
    code: `<!-- 1. Include KineCode via CDN or npm bundle -->
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>

<!-- 2. Place the self-rotating optical token element -->
<kine-code
  url="https://attendance.university.edu/checkin?lecture=cs101"
  frames="4"
  fps="4"
  max-age="6"
  session-id="0xCAFE1234"
  action-mode="redirect"
  size="320"
></kine-code>`,
  },
  {
    id: 'scanner',
    name: 'Web Scanner',
    icon: Terminal,
    language: 'typescript',
    description: 'Capture the burst of frames using the user camera and reconstruct the envelope in sub-seconds.',
    code: `import { Scanner } from 'kinecode';

const scanner = new Scanner({
  videoElement: document.getElementById('camera') as HTMLVideoElement,
  overlayCanvas: document.getElementById('overlay') as HTMLCanvasElement,
  maxAge: 6,
  onProgress: (locked, total) => {
    console.log(\`Captured \${locked}/\${total} frames\`);
  },
  onValidScan: (result) => {
    console.log('Proof-of-Presence verified!', result.targetUrl);
    // Automatically redirect or trigger check-in
    window.location.href = result.signedUrl!;
  }
});

await scanner.start();`,
  },
  {
    id: 'server',
    name: 'Server Verification',
    icon: Server,
    language: 'typescript',
    description: 'Verify HMAC signatures and timestamp freshness in your backend without state or database roundtrips.',
    code: `import { verifySignedUrl } from 'kinecode';

// Express, Next.js or Node.js endpoint
export async function POST(req: Request) {
  const { signedUrl } = await req.json();

  // 1-line cryptographic verification
  const check = verifySignedUrl(signedUrl, process.env.KINECODE_SECRET_KEY!, {
    maxAge: 6, // Rejects if signedUrl was generated > 6s ago
    actionMode: 'redirect'
  });

  if (!check.valid) {
    return Response.json({ error: check.error }, { status: 401 });
  }

  // Verified authentic scan in the physical presence window!
  return Response.json({
    status: 'verified',
    sessionId: check.sessionId,
    timestamp: check.timestamp,
    baseUrl: check.baseUrl
  });
}`,
  },
  {
    id: 'mobile',
    name: 'React Native / Expo',
    icon: Smartphone,
    language: 'typescript',
    description: 'Headless FrameCollector for native iOS and Android apps with zero external vision dependencies.',
    code: `import { FrameCollector } from 'kinecode';
import { CameraView } from 'expo-camera';

const collector = new FrameCollector({ maxAge: 6 });

function onBarcodeScanned({ data }: { data: string }) {
  const step = collector.pushFrame(data);

  if (step.status === 'collecting') {
    updateHudSlots(step.lockedIndices, step.totalFrames);
  }

  if (step.status === 'verified') {
    // Verified presence!
    triggerHapticSuccess();
    openCheckIn(step.result.signedUrl);
  }
}`,
  },
];

export default function CodeTabs() {
  const [activeTab, setActiveTab] = useState<string>('presenter');
  const [copied, setCopied] = useState<boolean>(false);

  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl glass-panel-elevated border border-dark-700/80 overflow-hidden shadow-2xl">
      {/* Tab navigation */}
      <div className="flex items-center justify-between border-b border-dark-800 bg-dark-900/90 px-4 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCopied(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-brand-cyan text-brand-cyan bg-dark-850'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-dark-850/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs font-mono text-slate-300 transition-colors"
          title="Copy snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-brand-emerald" />
              <span className="text-brand-emerald">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Description Header */}
      <div className="px-6 py-3 bg-dark-850/40 border-b border-dark-800 text-xs text-slate-400 font-sans">
        {current.description}
      </div>

      {/* Code Area */}
      <div className="p-6 bg-dark-950/95 overflow-x-auto">
        <pre className="font-mono text-xs sm:text-sm text-slate-200 leading-relaxed">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
}
