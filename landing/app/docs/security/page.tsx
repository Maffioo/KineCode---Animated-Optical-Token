'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, Lock, Eye, Monitor } from 'lucide-react';
import DocsBreadcrumbs from '@/components/docs/DocsBreadcrumbs';
import DocsTableOfContents, { TocItem } from '@/components/docs/DocsTableOfContents';
import DocsPagination from '@/components/docs/DocsPagination';
import Callout from '@/components/docs/Callout';

const TOC: TocItem[] = [
  { id: 'threat-model', title: 'Threat Model Overview', level: 2 },
  { id: 'attack-1', title: 'Attack 1: Instant Photo Forwarding', level: 2 },
  { id: 'attack-2', title: 'Attack 2: Cross-Cycle Frame Stitching', level: 2 },
  { id: 'attack-3', title: 'Attack 3: Video Recording Replay', level: 2 },
  { id: 'attack-4', title: 'Attack 4: Live Stream Screen Rebroadcast', level: 2 },
  { id: 'app-responsibility', title: 'Application Replay Defense (Single-Use)', level: 2 },
  { id: 'key-management', title: 'Zero-Trust Key Management', level: 2 },
  { id: 'clock-sync', title: 'Clock Synchronization & Skew', level: 2 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
];

export default function SecurityThreatModelPage() {
  return (
    <div className="flex w-full justify-between">
      {/* Article Content */}
      <article className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-3xl">
        <DocsBreadcrumbs
          items={[
            { label: 'Overview' },
            { label: 'Threat Model & Security' },
          ]}
        />

        <header className="space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand-rose/10 border border-brand-rose/30 text-brand-rose font-bold">
              Security Specification
            </span>
            <span className="text-slate-500 text-xs font-mono">Formal Analysis</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Threat Model &amp; Security Analysis
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            How KineCode formally analyzes, defends against, and mitigates optical fraud, photo forwarding, stream capture, and video replay attacks.
          </p>
        </header>

        <div className="h-px bg-dark-800 my-8" />

        {/* Threat Model Overview */}
        <section id="threat-model" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Threat Model Overview
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            In physical check-in and access systems, the primary adversary is an <strong className="text-white">absent attendee</strong> colluding with an <strong className="text-white">authorized present attendee</strong>.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The present collaborator has optical access to the projected screen or terminal, while the absent peer is remote and communicating over standard social messaging channels (Telegram, WhatsApp, Discord, or live stream).
          </p>

          <Callout type="security" title="Security Goal">
            Ensure that an entity unable to continuously view the primary display in real time cannot successfully construct a valid check-in token that passes cryptographic server verification.
          </Callout>
        </section>

        {/* Attack 1 */}
        <section id="attack-1" className="space-y-4 scroll-mt-24 mt-12">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="flex items-center gap-2 text-brand-rose font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Attack 1: Instant Photo Forwarding (Proxy Attendance)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Threat:</strong> An attendee in the lecture hall photographs the projected code with their smartphone camera and sends the still picture into a class chat group.
            </p>
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-850 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-brand-emerald font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Defense Guarantee: Complete Information Incompleteness</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The payload is fragmented across <code>N</code> frames (e.g. 4 or 8). A camera photograph captures exactly 1 frame. By mathematical construction, a single frame contains only 2 bytes of the XOR-masked Dynamic Envelope. It is impossible to recover the target URL, session ID, or HMAC signature from an isolated frame.
              </p>
            </div>
          </div>
        </section>

        {/* Attack 2 */}
        <section id="attack-2" className="space-y-4 scroll-mt-24 mt-8">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="flex items-center gap-2 text-brand-rose font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Attack 2: Cross-Cycle Frame Stitching</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Threat:</strong> An attacker takes multiple photos at arbitrary intervals (e.g. Frame 0 at 10:00:00, Frame 1 at 10:00:15) and attempts to merge them together.
            </p>
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-850 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-brand-emerald font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Defense Guarantee: Cyclic Nonce Rolling &amp; Keystream Invalidation</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Every loop rolls a fresh 8-bit <code>cycleNonce</code> and recomputes the XOR keystream. Slices from cycle <code>0x4A</code> cannot be combined with slices from cycle <code>0x8F</code>. The scanner and envelope assembler discard mismatched frames immediately.
              </p>
            </div>
          </div>
        </section>

        {/* Attack 3 */}
        <section id="attack-3" className="space-y-4 scroll-mt-24 mt-8">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="flex items-center gap-2 text-brand-rose font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Attack 3: Video Recording Replay</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Threat:</strong> An attacker records a 3-second video of the screen, compresses or uploads it to a cloud drive, and forwards it to absent peers to scan off their computer monitors.
            </p>
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-850 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-brand-emerald font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Defense Guarantee: Sub-Second Freshness Window (maxAge)</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The embedded Unix timestamp is protected by the HMAC signature with a strict freshness window (default: 6 seconds). By the time video recording finishes, saves, uploads, transmits, and is scanned, the token has expired and is rejected by <code>verifySignedUrl()</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Attack 4 */}
        <section id="attack-4" className="space-y-4 scroll-mt-24 mt-8">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="flex items-center gap-2 text-brand-rose font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Attack 4: Live Stream Screen Rebroadcast &amp; Optical Piracy</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Threat:</strong> An attendee runs a low-latency live video call (e.g. Discord or FaceTime) pointing their camera at the projector screen.
            </p>
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-850 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-brand-emerald font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Defense Guarantee: AntiStream &amp; Moiré Pattern Detection</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Rebroadcasting a digital screen creates distinctive optical spatial interference (moir&eacute; patterns) and video encoding artifacts. KineCode&apos;s <code>AntiStreamDetector</code> inspects high-frequency raster harmonics to identify screen-of-screen recordings and flags rebroadcast attempts.
              </p>
            </div>
          </div>
        </section>

        {/* Application Responsibility: Replay defense */}
        <section id="app-responsibility" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-cyan" />
            <span>Application Replay Defense (Single-Use Token Enforcement)</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            <code>verifySignedUrl()</code> is a <strong>stateless cryptographic verification function</strong>: it ensures that a token has not been tampered with and was generated within the last <code>maxAge</code> seconds.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            However, within that short 6-second window, an attendee who successfully scans could theoretically copy the final <code>signedUrl</code> and paste it to a friend before it expires.
          </p>

          <Callout type="warning" title="Enforce Single-Use Tokens in Your Database">
            Your application backend must require authentication (e.g. session cookie / JWT) and record each scanned signature (<code>kc_sig</code>) in a database or Redis cache with a TTL equal to <code>maxAge</code>:
            <br />
            <code>await db.recordAttendanceOnce(&#123; userId: req.user.id, sessionId: check.sessionId, sig: req.query.kc_sig &#125;)</code>
            <br />
            If the same <code>kc_sig</code> is submitted a second time, immediately reject it.
          </Callout>
        </section>

        {/* Key Management */}
        <section id="key-management" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-emerald" />
            <span>Zero-Trust Key Management Architecture</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            KineCode utilizes symmetric HMAC-SHA256 signing for maximum speed and sub-40ms verification. Whoever holds <code>secretKey</code> can mint valid tokens.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
              <span className="text-xs font-mono text-brand-emerald font-bold">1. Attendee Scanners</span>
              <p className="text-xs text-slate-400">
                <strong>Zero Keys:</strong> Never provide <code>secretKey</code> to client browsers or attendee apps. Scanners only read optical frames and send the result to the server.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
              <span className="text-xs font-mono text-brand-cyan font-bold">2. Presenter Display</span>
              <p className="text-xs text-slate-400">
                <strong>Authenticated:</strong> Load the key only inside authenticated presenter consoles, kiosks, or have your backend push pre-computed envelopes via WebSocket.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
              <span className="text-xs font-mono text-purple-400 font-bold">3. Backend Server</span>
              <p className="text-xs text-slate-400">
                <strong>Protected Env:</strong> Stores <code>KINECODE_SECRET_KEY</code> as an environment secret and calls <code>verifySignedUrl()</code> statelessly.
              </p>
            </div>
          </div>
        </section>

        {/* Clock Sync */}
        <section id="clock-sync" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Clock Synchronization &amp; Tolerances
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            KineCode timestamps use standard Unix epoch seconds (UTC). Modern mobile smartphones and presenter machines synchronize system time automatically via NTP (Network Time Protocol) to within &plusmn;200 milliseconds.
          </p>

          <Callout type="tip" title="Tuning for High-Skew Environments">
            In environments with potential network clock drift, configure <code>maxAgeSec</code> to <code>8</code> or <code>10</code> seconds. This grants ample margin for camera capture and network transmission while maintaining impenetrable defense against social media proxy forwarding.
          </Callout>
        </section>

        {/* Navigation */}
        <section id="next-steps" className="scroll-mt-24">
          <DocsPagination
            prev={{
              title: 'SDK & Web Components API',
              category: 'API Reference',
              href: '/docs/api',
            }}
          />
        </section>
      </article>

      {/* Right Table of Contents */}
      <div className="hidden xl:block w-72 shrink-0 py-10 pl-8 pr-6 border-l border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <DocsTableOfContents items={TOC} githubEditPath="security/page.tsx" />
      </div>
    </div>
  );
}
