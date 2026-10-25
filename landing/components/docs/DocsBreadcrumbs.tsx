'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DocsBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function DocsBreadcrumbs({ items }: DocsBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs font-mono text-slate-400">
      <Link
        href="/"
        className="hover:text-brand-cyan transition-colors flex items-center gap-1 text-slate-500 hover:text-slate-300"
        title="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
      <Link
        href="/docs"
        className="hover:text-brand-cyan transition-colors text-slate-400"
      >
        Docs
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-brand-cyan transition-colors text-slate-400">
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-cyan font-medium">{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
