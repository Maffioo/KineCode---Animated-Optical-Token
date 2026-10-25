'use client';

import React from 'react';
import { Info, Sparkles, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

export type CalloutType = 'info' | 'tip' | 'warning' | 'security' | 'danger';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const CALLOUT_CONFIG: Record<
  CalloutType,
  {
    icon: React.ComponentType<{ className?: string }>;
    containerClass: string;
    iconClass: string;
    titleClass: string;
    defaultTitle: string;
  }
> = {
  info: {
    icon: Info,
    containerClass: 'bg-dark-900/80 border-brand-cyan/30 text-slate-300 shadow-cyan-950/20',
    iconClass: 'text-brand-cyan',
    titleClass: 'text-brand-cyan',
    defaultTitle: 'Note',
  },
  tip: {
    icon: Sparkles,
    containerClass: 'bg-dark-900/80 border-brand-emerald/30 text-slate-300 shadow-emerald-950/20',
    iconClass: 'text-brand-emerald',
    titleClass: 'text-brand-emerald',
    defaultTitle: 'Tip',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-dark-900/80 border-brand-amber/30 text-slate-300 shadow-amber-950/20',
    iconClass: 'text-brand-amber',
    titleClass: 'text-brand-amber',
    defaultTitle: 'Warning',
  },
  security: {
    icon: ShieldCheck,
    containerClass: 'bg-dark-900/80 border-cyan-400/40 text-slate-300 shadow-cyan-950/30',
    iconClass: 'text-brand-cyan',
    titleClass: 'text-brand-cyan',
    defaultTitle: 'Security Note',
  },
  danger: {
    icon: ShieldAlert,
    containerClass: 'bg-dark-900/80 border-brand-rose/40 text-slate-300 shadow-rose-950/30',
    iconClass: 'text-brand-rose',
    titleClass: 'text-brand-rose',
    defaultTitle: 'Caution',
  },
};

export default function Callout({
  type = 'info',
  title,
  children,
  className = '',
}: CalloutProps) {
  const config = CALLOUT_CONFIG[type] || CALLOUT_CONFIG.info;
  const Icon = config.icon;
  const displayTitle = title ?? config.defaultTitle;

  return (
    <div
      className={`my-6 rounded-2xl border p-4.5 sm:p-5 text-xs sm:text-sm leading-relaxed backdrop-blur-md shadow-lg transition-all ${config.containerClass} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-dark-950/70 border border-white/5">
          <Icon className={`w-4 h-4 ${config.iconClass}`} />
        </div>
        <div className="flex-1 space-y-1.5">
          {displayTitle && (
            <h5 className={`font-semibold tracking-tight text-xs uppercase font-mono ${config.titleClass}`}>
              {displayTitle}
            </h5>
          )}
          <div className="text-slate-300/90 leading-relaxed font-sans">{children}</div>
        </div>
      </div>
    </div>
  );
}
