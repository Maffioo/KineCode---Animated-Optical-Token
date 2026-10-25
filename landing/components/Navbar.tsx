'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Copy, Check, Github, ExternalLink, QrCode, BookOpen, Layers, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm i kinecode');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dark-800/80 bg-dark-950/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 group-hover:border-brand-cyan/40 transition-colors">
              <Image
                src="/logo.png"
                alt="KineCode Logo"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-white group-hover:text-brand-cyan transition-colors">
                KineCode
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
                v0.1.0
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link
              href="/#overview"
              className="hover:text-white transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/#simulator"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
              Live Simulator
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-white transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/docs"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              Docs
            </Link>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Quick copy command */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700/70 text-xs font-mono text-slate-300 transition-colors"
            title="Click to copy installation command"
          >
            <span className="text-slate-500">$</span>
            <span>npm i kinecode</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-brand-emerald" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            )}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/Maffioo/kinecode"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700/70 text-xs font-medium text-slate-200 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>

          {/* Single Web Scanner CTA */}
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-cyan text-dark-950 hover:bg-cyan-300 text-xs font-semibold shadow-sm transition-all shadow-cyan-950"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Web Scanner</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-dark-800 bg-dark-900/95 backdrop-blur-2xl px-4 py-4 space-y-3">
          <Link
            href="/#overview"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-200 hover:text-brand-cyan"
          >
            Overview
          </Link>
          <Link
            href="/#simulator"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-200 hover:text-brand-cyan"
          >
            Live Simulator
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-200 hover:text-brand-cyan"
          >
            How It Works
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-200 hover:text-brand-cyan"
          >
            Documentation
          </Link>
          <Link
            href="/scanner"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-brand-cyan font-medium"
          >
            Web Scanner
          </Link>
          <div className="pt-2 border-t border-dark-800 flex items-center justify-between">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-xs font-mono text-slate-400 py-1"
            >
              <span>npm i kinecode</span>
              {copied ? <Check className="w-3.5 h-3.5 text-brand-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href="https://github.com/Maffioo/kinecode"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
