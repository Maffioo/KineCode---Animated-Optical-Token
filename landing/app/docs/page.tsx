'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Layers, Terminal, Cpu, QrCode, CheckCircle2, Lock } from 'lucide-react';
import DocsBreadcrumbs from '@/components/docs/DocsBreadcrumbs';
import DocsTableOfContents, { TocItem } from '@/components/docs/DocsTableOfContents';
import DocsPagination from '@/components/docs/DocsPagination';
import Callout from '@/components/docs/Callout';

const TOC: TocItem[] = [
  { id: 'problem', title: 'The Problem: Static QR Codes', level: 2 },
  { id: 'how-it-solves', title: 'How KineCode Solves Presence', level: 2 },
  { id: 'three-pillars', title: 'The Three Optical Defenses', level: 3 },
  { id: 'ecosystem', title: 'Repository Ecosystem', level: 2 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
];

export default function DocsOverviewPage() {
  return (
    <div className="flex w-full justify-between">
      {/* Article Content */}
      <article className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-3xl">
        <DocsBreadcrumbs items={[{ label: 'Introduction' }]} />

        <header className="space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
              Core Concept
            </span>
            <span className="text-slate-500 text-xs font-mono">v0.2.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Introduction to KineCode
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            KineCode is an open-source, client-light <strong>sequential optical data transmission protocol</strong>. It fragments signed URLs, ephemeral tokens, and structured payloads across rapid visual frames that can only be captured in sequence—preventing static photo copying, screenshot forwarding, and unauthorized link sharing.
          </p>
        </header>

        <div className="h-px bg-dark-800 my-8" />

        {/* The Fundamental Dilemma */}
        <section id="problem" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>The Problem: Static Optical Codes &amp; Links Leak Instantly</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Standard static QR codes and links suffer from an inherent security limitation:
            <strong className="text-white"> any user can capture a single smartphone photo or screenshot of the screen and forward it to hundreds of people via WhatsApp, Telegram, or Discord.</strong>
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Whether used for physical attendance, dynamic admission tickets, or ephemeral one-time authentication URLs, static codes cannot guarantee that the party redeeming the link is the one currently looking at the physical screen. Device-based mitigations like GPS geolocation and IP range checks fail due to indoors attenuation, spoofing apps, carrier NATs, and VPNs.
          </p>

          <Callout type="warning" title="Why Static Captures Fail Presence & Auth Checks">
            GPS signals penetrate poorly indoors and can be mocked with developer options. IP restrictions fail because thousands of cellular users share carrier gateway IPs. Only real-time visual synchrony guarantees that the scanner is in direct sight of the transmitter.
          </Callout>
        </section>

        {/* The KineCode Solution */}
        <section id="how-it-solves" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            The KineCode Solution: Sequential Framing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Instead of projecting a single static code, KineCode projects a continuous, high-speed, self-rotating loop of standard <strong className="text-white">Version 1 (21&times;21 module)</strong> QR codes.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            A receiver must observe the continuous animated stream with its camera to lock onto each sequential frame slot. The protocol enforces security through three coordinated defenses:
          </p>

          <div id="three-pillars" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div className="p-4 rounded-xl bg-dark-900/90 border border-dark-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center font-bold text-xs font-mono">
                01
              </div>
              <h3 className="text-sm font-bold text-white">N-Frame Slicing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The payload is fragmented across N frames (e.g. 4 or 8). A camera photo captures only 1 frame, which contains zero decryptable plaintext.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-900/90 border border-dark-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center font-bold text-xs font-mono">
                02
              </div>
              <h3 className="text-sm font-bold text-white">Cyclic Masking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every loop rolls a fresh 8-bit Cycle Nonce and XOR keystream. Slices from different rotations cannot be stitched together.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-900/90 border border-dark-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center font-bold text-xs font-mono">
                03
              </div>
              <h3 className="text-sm font-bold text-white">Sub-Second Freshness</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens expire within 6 seconds. The verification server checks an HMAC-SHA256 signature statelessly and rejects stale tokens.
              </p>
            </div>
          </div>

          <Callout type="tip" title="Ultra-Fast Optical Locking">
            By constraining each frame to Version 1 QR codes (21&times;21 modules with Alphanumeric encoding), smartphone cameras decode individual frames in under 40 milliseconds, allowing smooth 4-frame reconstruction in less than 1 second.
          </Callout>
        </section>

        {/* Monorepo Ecosystem */}
        <section id="ecosystem" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Repository Structure &amp; Ecosystem
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The KineCode codebase is structured as a zero-bloat monorepo with clean separation of concerns:
          </p>

          <div className="border border-dark-800 rounded-xl overflow-hidden text-xs font-mono">
            <div className="p-3 bg-dark-900 border-b border-dark-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              Monorepo Workspaces
            </div>
            <div className="p-4 bg-dark-950 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-dark-850">
                <span className="text-brand-cyan font-bold">packages/kinecode</span>
                <span className="text-slate-400 font-sans text-xs">Core engine: Generator, Scanner, Crypto, Framing, Web Components</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-dark-850">
                <span className="text-slate-200 font-bold">landing/</span>
                <span className="text-slate-400 font-sans text-xs">Public Next.js showcase, interactive docs & Web Scanner replica</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-200 font-bold">mobile/</span>
                <span className="text-slate-400 font-sans text-xs">Cross-platform native iOS & Android scanner app (Expo / React Native)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section id="next-steps" className="scroll-mt-24">
          <DocsPagination
            next={{
              title: 'Quick Start Guide',
              category: 'Getting Started',
              href: '/docs/quickstart',
            }}
          />
        </section>
      </article>

      {/* Right Table of Contents */}
      <div className="hidden xl:block w-72 shrink-0 py-10 pl-8 pr-6 border-l border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <DocsTableOfContents items={TOC} githubEditPath="page.tsx" />
      </div>
    </div>
  );
}
