'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Zap,
  Cpu,
  Shield,
  Code2,
  ArrowLeft,
  Search,
} from 'lucide-react';

export interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    badge?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export const DOCS_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Introduction & Core Concepts', href: '/docs', icon: BookOpen },
      { label: 'Threat Model & Security', href: '/docs/security', icon: Shield },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      { label: 'Quick Start Guide', href: '/docs/quickstart', icon: Zap },
    ],
  },
  {
    title: 'Protocol Specification',
    items: [
      { label: 'Binary Framing & Envelopes', href: '/docs/protocol', icon: Cpu },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'SDK & Web Components API', href: '/docs/api', icon: Code2 },
    ],
  },
];

export default function DocsSidebar({
  onClose,
  onOpenSearch,
}: {
  onClose?: () => void;
  onOpenSearch?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-full h-full flex flex-col justify-between py-6 px-4 bg-dark-950/90 text-sm">
      <div className="space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-brand-cyan transition-colors px-2 py-1.5 rounded-lg hover:bg-dark-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Showcase Home</span>
          </Link>
        </div>

        {/* Search trigger button */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-900/90 hover:bg-dark-850 border border-dark-750 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner group"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-cyan transition-colors" />
            <span>Search docs...</span>
          </button>
        )}

        {/* Section Groups */}
        <div className="space-y-6">
          {DOCS_SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-2">
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 px-2 font-semibold">
                {sec.title}
              </h5>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-cyan/15 text-brand-cyan font-bold border border-brand-cyan/30 shadow-sm shadow-cyan-950/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-dark-900/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && (
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-brand-cyan' : 'text-slate-500'
                            }`}
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version badge footer */}
      <div className="pt-6 border-t border-dark-850 px-2 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span>
          <span>v0.1.0 Core</span>
        </div>
        <span className="text-slate-400">MIT Open Source</span>
      </div>
    </aside>
  );
}
