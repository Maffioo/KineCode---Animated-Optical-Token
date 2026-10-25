'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface PageLink {
  title: string;
  href: string;
  category?: string;
}

interface DocsPaginationProps {
  prev?: PageLink;
  next?: PageLink;
}

export default function DocsPagination({ prev, next }: DocsPaginationProps) {
  if (!prev && !next) return null;

  return (
    <div className="mt-16 pt-8 border-t border-dark-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={prev.href}
          className="group p-4 sm:p-5 rounded-2xl border border-dark-800 hover:border-brand-cyan/40 bg-dark-900/60 hover:bg-dark-900 transition-all flex flex-col items-start gap-1 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-500 group-hover:text-brand-cyan transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Previous</span>
            {prev.category && <span className="text-slate-600">• {prev.category}</span>}
          </div>
          <span className="text-sm sm:text-base font-bold text-white group-hover:text-brand-cyan transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next && (
        <Link
          href={next.href}
          className="group p-4 sm:p-5 rounded-2xl border border-dark-800 hover:border-brand-cyan/40 bg-dark-900/60 hover:bg-dark-900 transition-all flex flex-col items-end gap-1 text-right sm:col-start-2"
        >
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-500 group-hover:text-brand-cyan transition-colors">
            <span>Next</span>
            {next.category && <span className="text-slate-600">• {next.category}</span>}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
          <span className="text-sm sm:text-base font-bold text-white group-hover:text-brand-cyan transition-colors">
            {next.title}
          </span>
        </Link>
      )}
    </div>
  );
}
