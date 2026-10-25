'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Cpu, Lock, CheckCircle2, AlertTriangle, Layers, Terminal } from 'lucide-react';
import DocsBreadcrumbs from '@/components/docs/DocsBreadcrumbs';
import DocsTableOfContents, { TocItem } from '@/components/docs/DocsTableOfContents';
import DocsPagination from '@/components/docs/DocsPagination';
import Callout from '@/components/docs/Callout';
import CodeBlock from '@/components/docs/CodeBlock';
import ParamTable from '@/components/docs/ParamTable';

const TOC: TocItem[] = [
  { id: 'v1-constraint', title: '1. The Version 1 QR Constraint', level: 2 },
  { id: 'frame-layout', title: '2. Frame Binary Layout (6 Bytes)', level: 2 },
  { id: 'dynamic-envelope', title: '3. Dynamic Binary Envelope', level: 2 },
  { id: 'xor-masking', title: '4. Deterministic Cycle Masking', level: 2 },
  { id: 'crc8-spec', title: '5. CRC-8 Integrity Specification', level: 2 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
];

export default function ProtocolSpecPage() {
  return (
    <div className="flex w-full justify-between">
      {/* Article Content */}
      <article className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-3xl">
        <DocsBreadcrumbs
          items={[
            { label: 'Protocol Specification' },
            { label: 'Binary Framing & Envelopes' },
          ]}
        />

        <header className="space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
              Protocol Specification
            </span>
            <span className="text-slate-500 text-xs font-mono">Protocol v2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Binary Framing &amp; Envelopes
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            The low-level mathematical and binary encoding specifications of KineCode. Designed specifically to fit inside Version 1 (21&times;21 modules) standard QR codes for sub-40ms camera decoding.
          </p>
        </header>

        <div className="h-px bg-dark-800 my-8" />

        {/* 1. V1 QR Constraint */}
        <section id="v1-constraint" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            1. The Version 1 QR Constraint
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Most dynamic QR systems encode lengthy URLs (e.g. 80&ndash;120 characters), which forces the barcode into Version 6 to Version 10 QR codes (41&times;41 to 57&times;57 modules). Higher version codes have densely packed tiny pixels that blur during camera motion or at distances greater than 2 meters.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            KineCode imposes a hard architectural constraint: <strong className="text-white">every animated frame MUST fit within a standard Version 1 QR Code (21&times;21 modules) with Error Correction Level M.</strong>
          </p>

          <Callout type="tip" title="Why 21x21 Modules Matter">
            A 21&times;21 module QR code with Level M error correction can encode up to 14 Alphanumeric characters or 17 Numeric characters. KineCode transmits exactly 12 uppercase hexadecimal characters (6 binary bytes), ensuring massive, crisp finder patterns that mobile vision pipelines lock onto almost instantaneously.
          </Callout>
        </section>

        {/* 2. Frame Binary Layout */}
        <section id="frame-layout" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            2. Frame Binary Layout (6 Bytes)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Each individual frame emitted by the presenter encodes a 12-character hex payload representing 6 binary bytes:
          </p>

          <div className="border border-dark-800 rounded-xl overflow-hidden text-xs font-mono">
            <table className="w-full text-left">
              <thead className="bg-dark-900 border-b border-dark-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-4">Byte Offset</th>
                  <th className="py-2.5 px-4">Field Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-850 bg-dark-950 text-slate-200">
                <tr>
                  <td className="py-2.5 px-4 text-brand-cyan">Byte 0</td>
                  <td className="py-2.5 px-4 font-semibold">Header</td>
                  <td className="py-2.5 px-4 text-purple-300">uint8</td>
                  <td className="py-2.5 px-4">
                    Bits 7..4: Protocol Version (<code>0x2</code>). Bits 3..0: Frame Index (<code>0..N-1</code>).
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-brand-cyan">Byte 1</td>
                  <td className="py-2.5 px-4 font-semibold">Cycle Nonce</td>
                  <td className="py-2.5 px-4 text-purple-300">uint8</td>
                  <td className="py-2.5 px-4">
                    Random 8-bit nonce generated at the start of each cyclic rotation.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-brand-cyan">Byte 2</td>
                  <td className="py-2.5 px-4 font-semibold">Total Frames</td>
                  <td className="py-2.5 px-4 text-purple-300">uint8</td>
                  <td className="py-2.5 px-4">
                    Total cyclic frames <code>N</code> (e.g. <code>4</code>, <code>6</code>, <code>8</code>, or <code>12</code>).
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-brand-emerald">Bytes 3..4</td>
                  <td className="py-2.5 px-4 font-semibold">Payload Slice</td>
                  <td className="py-2.5 px-4 text-purple-300">uint8[2]</td>
                  <td className="py-2.5 px-4">
                    2 bytes of the XOR-masked Dynamic Binary Envelope for this frame slot.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-brand-cyan">Byte 5</td>
                  <td className="py-2.5 px-4 font-semibold">CRC-8</td>
                  <td className="py-2.5 px-4 text-purple-300">uint8</td>
                  <td className="py-2.5 px-4">
                    CRC-8 checksum computed across Bytes 0..4 (polynomial <code>0x07</code>).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Dynamic Binary Envelope */}
        <section id="dynamic-envelope" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            3. Dynamic Binary Envelope
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The target check-in URL, timestamp, session ID, and HMAC signature are packed into a continuous byte sequence known as the <strong className="text-white">Dynamic Envelope</strong>. Slices of this envelope are distributed across the N frames:
          </p>

          <CodeBlock
            language="text"
            fileName="envelope-structure.txt"
            code={`[0x00]              Version & Action Mode (1 byte)
[0x01..0x04]        32-bit Big-Endian Session ID (4 bytes)
[0x05..0x08]        32-bit Big-Endian Unix Timestamp (seconds) (4 bytes)
[0x09]              Max Age in seconds (1 byte)
[0x0A..0x10]        Truncated HMAC-SHA256 Signature (7 bytes)
[0x11]              Target URL Byte Length L (1 byte)
[0x12..0x12+L-1]    Target URL UTF-8 Bytes (L bytes)
[0x12+L]            Envelope Checksum CRC-8 (1 byte)`}
          />

          <Callout type="security" title="Cryptographic Signature Scope">
            The 7-byte truncated HMAC-SHA256 signature is calculated over: <code>[SessionID (4B) | Timestamp (4B) | MaxAge (1B) | TargetURL (LB)]</code>. If an attacker tampers with the target URL or timestamp in transit, the signature check fails immediately.
          </Callout>
        </section>

        {/* 4. Deterministic Cycle Masking */}
        <section id="xor-masking" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            4. Deterministic Cycle Masking
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            If the target URL is static, raw envelope bytes would repeat across cycles, allowing adversaries to compare frames across multiple rotations.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            To prevent statistical frame comparison and ensure 0 plaintext leakage, each byte is XOR-masked using a cycle-derived keystream:
          </p>

          <CodeBlock
            language="typescript"
            fileName="masking.ts"
            code={`export function computeCycleMaskByte(cycleNonce: number, byteIndex: number): number {
  return computeCRC8([
    cycleNonce & 0xff,
    (byteIndex >> 8) & 0xff,
    byteIndex & 0xff,
    0xa5 // Domain separator constant
  ]);
}`}
          />

          <p className="text-xs text-slate-400 leading-relaxed">
            Because the <code>cycleNonce</code> changes with every loop, every rotation emits completely distinct QR bit patterns, even when projecting the identical URL.
          </p>
        </section>

        {/* 5. CRC-8 Integrity */}
        <section id="crc8-spec" className="space-y-4 scroll-mt-24 mt-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            5. CRC-8 Integrity Specification
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To guard against optical scan noise or partial camera bit flips before cryptographic signature evaluation, KineCode applies a fast CRC-8 check using the ATM polynomial:
          </p>

          <div className="p-4 rounded-xl bg-dark-900/90 border border-dark-800 font-mono text-xs text-slate-300 space-y-1">
            <div><span className="text-slate-500">Polynomial:</span> <code>0x07 (x^8 + x^2 + x + 1)</code></div>
            <div><span className="text-slate-500">Initial Value:</span> <code>0x00</code></div>
            <div><span className="text-slate-500">Final XOR:</span> <code>0x00</code></div>
          </div>
        </section>

        {/* Navigation */}
        <section id="next-steps" className="scroll-mt-24">
          <DocsPagination
            prev={{
              title: 'Quick Start Guide',
              category: 'Getting Started',
              href: '/docs/quickstart',
            }}
            next={{
              title: 'SDK & Web Components API',
              category: 'API Reference',
              href: '/docs/api',
            }}
          />
        </section>
      </article>

      {/* Right Table of Contents */}
      <div className="hidden xl:block w-72 shrink-0 py-10 pl-8 pr-6 border-l border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <DocsTableOfContents items={TOC} githubEditPath="protocol/page.tsx" />
      </div>
    </div>
  );
}
