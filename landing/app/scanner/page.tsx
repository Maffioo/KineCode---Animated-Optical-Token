'use client';

import dynamic from 'next/dynamic';

const WebScanner = dynamic(() => import('@/components/WebScanner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] bg-dark-950 flex flex-col items-center justify-center text-slate-400 gap-3">
      <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono">Initializing Camera Hardware...</span>
    </div>
  ),
});

export default function ScannerPage() {
  return <WebScanner />;
}
