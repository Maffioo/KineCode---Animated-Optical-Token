'use client';

import React from 'react';

export interface ParamItem {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: React.ReactNode;
}

interface ParamTableProps {
  params: ParamItem[];
  title?: string;
}

export default function ParamTable({ params, title }: ParamTableProps) {
  return (
    <div className="my-6 rounded-2xl border border-dark-800 bg-dark-950/80 overflow-hidden shadow-xl backdrop-blur-md">
      {title && (
        <div className="px-4 py-3 bg-dark-900/80 border-b border-dark-800 font-mono text-xs font-semibold text-slate-300">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-dark-900/90 border-b border-dark-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4">Parameter</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Default</th>
              <th className="py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-850/80 text-slate-300">
            {params.map((item) => (
              <tr key={item.name} className="hover:bg-dark-900/40 transition-colors">
                <td className="py-3 px-4 align-top">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <code className="text-brand-cyan font-mono font-semibold text-xs bg-brand-cyan/10 px-1.5 py-0.5 rounded border border-brand-cyan/20">
                      {item.name}
                    </code>
                    {item.required && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-rose bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 font-bold">
                        required
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 align-top font-mono text-xs text-purple-300">
                  <code>{item.type}</code>
                </td>
                <td className="py-3 px-4 align-top font-mono text-xs text-slate-400">
                  {item.default ? (
                    <span className="bg-dark-850 px-1.5 py-0.5 rounded text-slate-300 border border-dark-750">
                      {item.default}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-3 px-4 align-top text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
