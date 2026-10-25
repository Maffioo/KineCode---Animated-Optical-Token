'use client';

import React from 'react';

export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 relative border-l-2 border-dark-800 ml-4 sm:ml-5 pl-6 sm:pl-8 space-y-10">
      {children}
    </div>
  );
}

export function Step({
  number,
  title,
  children,
}: {
  number: number | string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      {/* Number Badge */}
      <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-dark-900 border-2 border-brand-cyan/60 text-brand-cyan flex items-center justify-center font-mono font-bold text-xs shadow-md shadow-cyan-950/40 group-hover:border-brand-cyan group-hover:scale-105 transition-all">
        {number}
      </div>

      <div className="space-y-3 pt-0.5">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h3>
        <div className="text-sm text-slate-300 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
