'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Hash, ArrowRight, CornerDownLeft, Sparkles, BookOpen, Cpu, Shield, Code2, Zap } from 'lucide-react';

export interface SearchEntry {
  title: string;
  category: string;
  href: string;
  keywords: string[];
  description: string;
}

const SEARCH_INDEX: SearchEntry[] = [
  // Overview
  {
    title: 'Introduction to KineCode',
    category: 'Overview',
    href: '/docs',
    keywords: ['intro', 'problem', 'presence', 'proof-of-presence', 'attendance', 'lecture', 'static qr failure'],
    description: 'Learn why static QR codes fail and how KineCode solves physical presence through optical frame loops.',
  },
  {
    title: 'N-Frame Slicing & Cyclic Masking',
    category: 'Overview',
    href: '/docs#how-it-solves',
    keywords: ['slicing', 'fragmentation', 'cyclic nonce', 'sub-second', 'freshness', 'burst'],
    description: 'The three coordinated defenses preventing photo sharing and cross-cycle stitching.',
  },
  {
    title: 'Repository Structure & Monorepo',
    category: 'Overview',
    href: '/docs#repository-structure',
    keywords: ['monorepo', 'packages', 'web', 'landing', 'mobile', 'architecture'],
    description: 'Overview of packages/kinecode, landing, web studio, and mobile Expo app.',
  },

  // Getting Started / Quickstart
  {
    title: 'Quick Start Guide',
    category: 'Getting Started',
    href: '/docs/quickstart',
    keywords: ['getting started', 'install', 'npm', 'cdn', 'quickstart', 'tutorial'],
    description: 'Install KineCode and deploy your first presenter screen and backend verifier in under 5 minutes.',
  },
  {
    title: 'Installing the Package (npm / ESM CDN)',
    category: 'Getting Started',
    href: '/docs/quickstart#install',
    keywords: ['npm install', 'pnpm', 'yarn', 'bun', 'jsdelivr', 'cdn', 'esm'],
    description: 'Installation instructions for package managers or direct browser ESM script tags.',
  },
  {
    title: 'Presenter Screen Setup (<kine-code>)',
    category: 'Getting Started',
    href: '/docs/quickstart#presenter',
    keywords: ['presenter', 'projector', 'html', 'web component', 'kine-code', 'fps', 'frames'],
    description: 'How to mount the rotating optical token on presenter displays and auditorium screens.',
  },
  {
    title: 'Attendee Scanner Integration (Web & Mobile)',
    category: 'Getting Started',
    href: '/docs/quickstart#scanner',
    keywords: ['scanner', 'camera', 'attendee', 'videoElement', 'onValidScan', 'onProgress'],
    description: 'Configuring the camera feed and capture listener in browser apps.',
  },
  {
    title: 'Stateless Server Verification (verifySignedUrl)',
    category: 'Getting Started',
    href: '/docs/quickstart#verification',
    keywords: ['verify', 'backend', 'server', 'verifySignedUrl', 'hmac', 'stateless', 'checkin'],
    description: 'Synchronous zero-state cryptographic verification on your check-in endpoint.',
  },

  // Protocol Specification
  {
    title: 'Binary Framing & Envelopes',
    category: 'Protocol Spec',
    href: '/docs/protocol',
    keywords: ['binary', 'framing', 'v1', 'qr version 1', '21x21', '6 bytes', 'packet'],
    description: 'Mathematical layout of the 6-byte frames fitting inside Version 1 standard QR codes.',
  },
  {
    title: 'Frame Binary Layout & Bit Offsets',
    category: 'Protocol Spec',
    href: '/docs/protocol#frame-layout',
    keywords: ['header', 'cycle nonce', 'payload slice', 'crc8', 'byte offset', 'polynomial 0x07'],
    description: 'Exact breakdown of Byte 0 through Byte 5 in each transmitted frame.',
  },
  {
    title: 'Dynamic Binary Envelope Structure',
    category: 'Protocol Spec',
    href: '/docs/protocol#dynamic-envelope',
    keywords: ['envelope', 'session-id', 'timestamp', 'signature', 'hmac-sha256', 'target url'],
    description: 'The underlying payload structure sliced across cyclic frames.',
  },
  {
    title: 'Deterministic Cyclic XOR Masking',
    category: 'Protocol Spec',
    href: '/docs/protocol#xor-masking',
    keywords: ['xor', 'mask', 'keystream', 'keystream seed', 'entropy', 'anti-comparison'],
    description: 'Per-cycle XOR keystream formula preventing plaintext leakage and frame comparison.',
  },

  // API Reference
  {
    title: 'API Reference — Core SDK & Web Components',
    category: 'API Reference',
    href: '/docs/api',
    keywords: ['api', 'sdk', 'types', 'typescript', 'options', 'reference'],
    description: 'Complete TypeScript definitions, props, callbacks, and parameters for all KineCode modules.',
  },
  {
    title: 'Generator & <kine-code> Component',
    category: 'API Reference',
    href: '/docs/api#kine-code',
    keywords: ['generator', 'kine-code', 'url', 'frames', 'fps', 'max-age', 'session-id', 'secret-key', 'size'],
    description: 'Presenter options, reactive attributes, lifecycle methods, and event bindings.',
  },
  {
    title: 'Scanner & <kine-scanner> Component',
    category: 'API Reference',
    href: '/docs/api#kine-scanner',
    keywords: ['scanner', 'kine-scanner', 'overlayCanvas', 'onValidScan', 'onProgress', 'homography'],
    description: 'Camera scanner options, reticle guidance, and burst lock parameters.',
  },
  {
    title: 'AntiStream & Moiré Detector (AntiStreamDetector)',
    category: 'API Reference',
    href: '/docs/api#antistream',
    keywords: ['antistream', 'antistreamdetector', 'moire', 'screen detection', 'rebroadcast', 'stream replay'],
    description: 'Optical frequency and pixel raster detector to prevent scanning screens of screens.',
  },
  {
    title: 'verifySignedUrl(signedUrl, options)',
    category: 'API Reference',
    href: '/docs/api#verifySignedUrl',
    keywords: ['verifysignedurl', 'verificationresult', 'secretKey', 'maxAgeSec', 'signatureValid', 'error'],
    description: 'Stateless verification API specification and return schema.',
  },
  {
    title: 'FrameCollector (Headless Engine)',
    category: 'API Reference',
    href: '/docs/api#framecollector',
    keywords: ['framecollector', 'headless', 'react native', 'expo', 'flutter', 'state machine'],
    description: 'Headless collector state machine for custom mobile and native camera engines.',
  },

  // Security
  {
    title: 'Threat Model & Security Analysis',
    category: 'Security',
    href: '/docs/security',
    keywords: ['security', 'threat model', 'attacks', 'mitigations', 'proof of presence'],
    description: 'Formal attack vector analysis and defense guarantees against optical fraud.',
  },
  {
    title: 'Attack 1: Instant Photo Forwarding Mitigation',
    category: 'Security',
    href: '/docs/security#attack-1',
    keywords: ['photo forwarding', 'whatsapp', 'telegram', 'proxy attendance', 'fragmentation'],
    description: 'Why a forwarded camera photo yields 0 bytes of usable plaintext.',
  },
  {
    title: 'Attack 2: Cross-Cycle Frame Stitching Defense',
    category: 'Security',
    href: '/docs/security#attack-2',
    keywords: ['cross-cycle', 'stitching', 'cycle nonce', 'xor mask', 'nonce mismatch'],
    description: 'How cycle nonces and dynamic XOR masks prevent combining frames across time.',
  },
  {
    title: 'Attack 3: Video Recording Replay Defense',
    category: 'Security',
    href: '/docs/security#attack-3',
    keywords: ['video replay', 'recording', 'screen capture', 'max-age', 'sub-second', 'freshness'],
    description: 'Defeating video forwarding via sub-second max-age expiry and moiré detection.',
  },
  {
    title: 'Clock Synchronization & Drift Tolerances',
    category: 'Security',
    href: '/docs/security#clock-sync',
    keywords: ['clock sync', 'ntp', 'epoch', 'clock skew', 'time drift', 'timestamp'],
    description: 'How KineCode handles UTC synchronization and configurable skew margins.',
  },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: BookOpen,
  'Getting Started': Zap,
  'Protocol Spec': Cpu,
  'API Reference': Code2,
  Security: Shield,
};

export default function DocsSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent, or toggle
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = query.trim() === ''
    ? SEARCH_INDEX.slice(0, 8)
    : SEARCH_INDEX.filter((entry) => {
        const q = query.toLowerCase();
        return (
          entry.title.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.keywords.some((k) => k.toLowerCase().includes(q))
        );
      });

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-dark-750 bg-dark-900/95 shadow-2xl shadow-cyan-950/30 overflow-hidden z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-800 bg-dark-950/60">
          <Search className="w-5 h-5 text-brand-cyan shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search docs, APIs, specs, security (e.g. verifySignedUrl, HMAC, CRC8)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-dark-850 border border-dark-700 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 space-y-2">
              <p>No results found for &ldquo;<span className="text-slate-300 font-semibold">{query}</span>&rdquo;</p>
              <p className="text-xs text-slate-600">
                Try searching for <span className="text-brand-cyan">maxAge</span>, <span className="text-brand-cyan">kine-code</span>, <span className="text-brand-cyan">HMAC</span>, or <span className="text-brand-cyan">threat model</span>.
              </p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = CATEGORY_ICONS[item.category] || Hash;
              return (
                <div
                  key={`${item.href}-${index}`}
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-cyan/15 border border-brand-cyan/30 text-white'
                      : 'hover:bg-dark-850/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-brand-cyan text-dark-950 font-bold'
                          : 'bg-dark-850 text-slate-400 border border-dark-750'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                          {item.category}
                        </span>
                        <span className="text-slate-600">•</span>
                        <h4 className="text-sm font-semibold truncate text-white">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <CornerDownLeft className="w-4 h-4 text-brand-cyan" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-dark-950/80 border-t border-dark-800 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-850 border border-dark-700 rounded text-slate-400">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-dark-850 border border-dark-700 rounded text-slate-400">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-850 border border-dark-700 rounded text-slate-400">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-850 border border-dark-700 rounded text-slate-400">esc</kbd>
              Close
            </span>
          </div>
          <span className="text-brand-cyan font-sans text-xs">KineCode Search</span>
        </div>
      </div>
    </div>
  );
}
