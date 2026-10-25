'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import CodeTabs from '@/components/CodeTabs';
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Cpu,
  Lock,
  ArrowRight,
  ExternalLink,
  BookOpen,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  GraduationCap,
  Building2,
  Ticket,
  KeyRound,
  Github,
  WifiOff
} from 'lucide-react';

const Simulator = dynamic(() => import('@/components/Simulator'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 glass-panel-elevated rounded-2xl flex items-center justify-center text-slate-500 font-mono text-xs">
      Loading Simulator Engine...
    </div>
  ),
});

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-dark-950 text-slate-100 bg-grid-pattern">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 overflow-hidden" id="overview">
          {/* Ambient Lighting Gradient */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-brand-cyan/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Protocol Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-850/90 border border-dark-700/80 text-xs font-medium text-slate-300 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
              <span>Open-Source Sequential Optical Data Protocol</span>
              <span className="text-slate-600">|</span>
              <span className="text-brand-cyan font-mono">v0.1.0</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
              Sequential Optical Protocol for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-teal-200 to-white">
                Signed Links &amp; Data.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              KineCode splits cryptographically signed URLs, ephemeral tokens, and payloads across rapid animated frames scannable only in sequence. A single photo captures only an unusable fragment; forwarded screenshots expire within seconds.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#simulator"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950"
              >
                <span>Try Live Simulator</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                href="/scanner"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-brand-cyan" />
                <span>Launch Web Scanner</span>
              </Link>

              <Link
                href="/docs"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-800 text-slate-400 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read Docs</span>
              </Link>
            </div>

            {/* Key Technical Metric Pills */}
            <div className="mt-16 pt-10 border-t border-dark-850/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; 1.0s</span>
                <span className="text-xs text-slate-400 mt-1">Burst Capture Time</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-brand-cyan font-mono">0</span>
                <span className="text-xs text-slate-400 mt-1">Server State Required</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; 15 KB</span>
                <span className="text-xs text-slate-400 mt-1">Lightweight Core Engine</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-brand-emerald font-mono">100%</span>
                <span className="text-xs text-slate-400 mt-1">Anti-Photo Efficacy</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SIMULATOR SECTION */}
        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" id="simulator">
          <Simulator />
        </section>

        {/* PROBLEM VS SOLUTION SECTION */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" id="how-it-works">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest font-mono text-brand-cyan font-semibold mb-3">
              The Fundamental Limitation of Static Optical Codes
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Why Static QR Codes &amp; Links Leak Instantly
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
              Whenever a static code represents access, check-in, or authorization, capturing a single photograph compromises the entire mechanism.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Failure: Static QR Code */}
            <div className="rounded-2xl glass-panel p-8 border-brand-rose/20 bg-dark-900/60 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-rose/15 border border-brand-rose/30 text-brand-rose flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Static Optical Codes</h4>
                  <span className="text-xs text-rose-400 font-medium">Vulnerable to Photos, Screenshots &amp; Replay</span>
                </div>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-brand-rose shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant screenshot leakage:</strong> One attendee takes a single picture and forwards it to messaging channels (WhatsApp, Telegram) with hundreds of recipients.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-brand-rose shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero temporal or physical verification:</strong> Remote users claim or redeem the token from kilometers away without ever seeing the physical screen.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-brand-rose shrink-0 mt-0.5" />
                  <span>
                    <strong>Stale payloads:</strong> Once projected or printed, static URLs remain valid for minutes or hours without cryptographic freshness constraints.
                  </span>
                </li>
              </ul>
            </div>

            {/* The Solution: KineCode Optical Token */}
            <div className="rounded-2xl glass-panel-elevated p-8 border-brand-cyan/30 bg-dark-900/90 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">KineCode Sequential Protocol</h4>
                  <span className="text-xs text-brand-cyan font-medium">Enforces Live Sequential Scanning</span>
                </div>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                  <span>
                    <strong>Multi-frame fragmentation:</strong> The signed payload is split across N frames. A single photo captures only a useless slice (e.g. 25%) with zero decipherable data.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                  <span>
                    <strong>Rolling nonces &amp; cycle invalidation:</strong> Every rotation rolls timestamp, cycleNonce, and XOR keystreams. Slices from different cycles cannot be stitched together.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                  <span>
                    <strong>Sub-second burst window &amp; HMAC:</strong> Scanners collect frames in uninterrupted sequence within ~1s, producing a signed token verified statelessly on your server.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE & PROTOCOL SPEC PREVIEW */}
        <section className="py-16 md:py-20 bg-dark-900/40 border-y border-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs uppercase tracking-widest font-mono text-brand-cyan font-semibold mb-3">
                Binary Framing Specification
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Engineered for High-Speed Optical Streams
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                A compact binary framing protocol designed to fit into Version 1 (21x21) standard QR codes.
              </p>
            </div>

            {/* Protocol Byte Breakdown Diagram */}
            <div className="glass-panel-elevated rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto border border-dark-700/80">
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-4 tracking-wider">
                Frame Binary Packet Layout (12 Hex Characters / 6 Bytes)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-dark-950 border border-brand-cyan/30 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Byte 0</span>
                  <span className="text-brand-cyan font-bold text-sm">Sequence & Version</span>
                  <p className="text-[10px] text-slate-400 mt-1">4-bit Version (0x02) + 4-bit Sequence Index</p>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-brand-cyan/30 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Byte 1</span>
                  <span className="text-brand-cyan font-bold text-sm">Cycle Nonce</span>
                  <p className="text-[10px] text-slate-400 mt-1">Rotates every complete cycle to prevent stitching</p>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-brand-cyan/30 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Byte 2</span>
                  <span className="text-brand-cyan font-bold text-sm">Total Frames (N)</span>
                  <p className="text-[10px] text-slate-400 mt-1">Dynamic auto-detect (4, 6, 8, 12 frames)</p>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-brand-emerald/30 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Bytes 3–5</span>
                  <span className="text-brand-emerald font-bold text-sm">Payload + CRC-8</span>
                  <p className="text-[10px] text-slate-400 mt-1">XOR-masked dynamic envelope slice & CRC check</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-dark-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Want the full cryptographic RFC spec?</span>
                <Link
                  href="/docs/protocol"
                  className="text-brand-cyan hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Read Protocol Specification
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* DEVELOPER QUICKSTART CODE TABS */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs uppercase tracking-widest font-mono text-brand-cyan font-semibold mb-3">
              Developer Experience
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Drop In With A Single Tag
            </h3>
            <p className="mt-3 text-sm text-slate-400">
              Zero complicated build steps. Native Web Components, React hooks, or Node.js verifiers.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <CodeTabs />
          </div>
        </section>

        {/* REAL-WORLD USE CASES */}
        <section className="py-16 md:py-20 bg-dark-900/30 border-t border-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs uppercase tracking-widest font-mono text-brand-cyan font-semibold mb-3">
                Broad Real-World Applicability
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Beyond Presence: Zero-Pairing Unclonable Data Transport
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                While engineered initially for attendance check-ins, KineCode solves any scenario requiring real-time visual synchrony between a display and a camera.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl glass-panel hover:border-brand-cyan/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">Proof-of-Presence</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Project on auditorium or event screens. Attendees scan in under 1 second; absentee group chat proxies and forwarded photos are completely shut down.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel hover:border-brand-cyan/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center mb-4">
                  <WifiOff className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">Air-Gapped Link Transfer</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pass one-time authenticated URLs, cryptographic seeds, or Wi-Fi configurations screen-to-camera with zero Bluetooth pairing or network handshake.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel hover:border-brand-cyan/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center mb-4">
                  <Ticket className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">Anti-Scalp Gate Access</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Defeat ticket scalping, barcode duplication, and screenshot reselling at stadium turnstiles, concerts, and secured facility checkpoints.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel hover:border-brand-cyan/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">Dynamic 2FA &amp; POS</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authorize sensitive point-of-sale operations or out-of-band approvals with a visual multi-frame challenge rather than manually typing 6-digit OTP codes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM COMMUNITY CTA */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <div className="max-w-3xl mx-auto glass-panel-elevated rounded-3xl p-8 sm:p-12 border border-dark-700/80 relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-brand-cyan/10 blur-[80px] rounded-full pointer-events-none" />

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-4">
              Ready to Secure Your Physical Space?
            </h3>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
              KineCode is completely free and open-source under the MIT license. Check out the GitHub
              repository, star the project, or dive into the full API documentation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs/quickstart"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950"
              >
                <span>Quick Start Guide</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="https://github.com/Maffioo/kinecode"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Github className="w-4 h-4" />
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-dark-850 bg-dark-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 rounded-md overflow-hidden">
              <Image src="/logo.png" alt="KineCode" fill className="object-contain" />
            </div>
            <span className="font-semibold text-slate-300">KineCode</span>
            <span>—</span>
            <span>Optical Proof-of-Presence Protocol</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-slate-300 transition-colors">
              Documentation
            </Link>
            <Link href="/scanner" className="hover:text-slate-300 transition-colors">
              Web Scanner
            </Link>
            <a
              href="https://github.com/Maffioo/kinecode"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
