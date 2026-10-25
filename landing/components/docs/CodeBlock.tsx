'use client';

import React, { useState } from 'react';
import { Copy, Check, FileCode2, Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({
  code,
  language = 'typescript',
  fileName,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-6 rounded-2xl border border-dark-800 bg-dark-950/95 overflow-hidden shadow-xl backdrop-blur-md group">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900/90 border-b border-dark-800 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-mono">
          {fileName ? (
            <>
              <FileCode2 className="w-3.5 h-3.5 text-brand-cyan" />
              <span className="text-slate-200 font-medium">{fileName}</span>
            </>
          ) : (
            <>
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                {language}
              </span>
            </>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700/80 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-brand-emerald" />
              <span className="text-brand-emerald font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 sm:p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-200">
        {showLineNumbers ? (
          <table className="w-full text-left border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-dark-900/50">
                  <td className="pr-4 select-none text-slate-600 text-right w-8 text-[11px] align-top">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
