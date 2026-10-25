'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DocsSidebar from '@/components/DocsSidebar';
import DocsSearchModal from '@/components/docs/DocsSearchModal';
import { Menu, X, QrCode, Github, Search } from 'lucide-react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dark-950 text-slate-100">
      {/* Search Modal */}
      <DocsSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Top Docs Header */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-300 hover:text-white"
            aria-label="Toggle navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/10 group-hover:border-brand-cyan/40 transition-colors">
              <Image src="/logo.png" alt="KineCode" fill className="object-contain p-0.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-brand-cyan transition-colors">
                KineCode
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-dark-850 border border-dark-750 text-brand-cyan font-semibold">
                Docs
              </span>
            </div>
          </Link>
        </div>

        {/* Middle quick search pill */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-dark-900/80 hover:bg-dark-850 border border-dark-750 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-cyan transition-colors" />
              <span>Search docs, APIs, and protocol specs...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-dark-800 border border-dark-700 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Mobile search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-300"
            aria-label="Search documentation"
          >
            <Search className="w-4 h-4" />
          </button>

          <Link
            href="/scanner"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Web Scanner</span>
          </Link>

          <a
            href="https://github.com/Maffioo/kinecode"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-300 hover:text-white transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Desktop Sticky Sidebar */}
        <div className="hidden md:block w-64 shrink-0 border-r border-dark-850 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <DocsSidebar onOpenSearch={() => setSearchOpen(true)} />
        </div>

        {/* Mobile Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] h-full bg-dark-950 border-r border-dark-800 z-10">
              <DocsSidebar
                onClose={() => setMobileSidebarOpen(false)}
                onOpenSearch={() => {
                  setMobileSidebarOpen(false);
                  setSearchOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Documentation Content Area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
