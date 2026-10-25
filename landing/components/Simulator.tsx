'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Monitor,
  Camera,
  ArrowRight
} from 'lucide-react';
import { Generator } from 'kinecode';
import QRCode from 'qrcode';

export default function Simulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const generatorRef = useRef<Generator | null>(null);

  // Presenter settings
  const [framesCount, setFramesCount] = useState<number>(4);
  const [fps, setFps] = useState<number>(4);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [targetUrl] = useState<string>('https://kinecode.dev/verify?room=101');
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [sessionIdHex] = useState<string>('0xCAFE1234');
  const [cycleNonce, setCycleNonce] = useState<number>(0x3a);

  // QR Code pointing to /scanner on the current host
  const [scannerQrDataUrl, setScannerQrDataUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kinecode.dev';
    const scannerUrl = `${origin}/scanner`;

    QRCode.toDataURL(scannerUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#07080B',
        light: '#FFFFFF',
      },
    })
      .then(setScannerQrDataUrl)
      .catch((err) => console.error('Failed to generate scanner QR:', err));
  }, []);

  // Initialize and run KineCode Generator
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      if (generatorRef.current) {
        generatorRef.current.stop();
      }

      const gen = new Generator({
        canvas: canvasRef.current,
        url: targetUrl,
        frames: framesCount,
        fps: fps,
        maxAge: 8,
        actionMode: 'redirect',
        sessionId: 0xcafe1234,
        size: 260,
      });

      generatorRef.current = gen;
      if (isRunning) {
        gen.start();
      }

      // Interval to update UI with generator internal state
      const timer = setInterval(() => {
        if (generatorRef.current) {
          const idx = generatorRef.current.getCurrentFrameIndex();
          setCurrentFrameIdx(idx);
          setCycleNonce(generatorRef.current.getCycleNonce());
        }
      }, 100);

      return () => {
        clearInterval(timer);
        gen.stop();
      };
    } catch (e) {
      console.error('Failed to init generator:', e);
    }
  }, [framesCount, fps, isRunning, targetUrl]);

  const handleTogglePlay = () => {
    if (!generatorRef.current) return;
    if (isRunning) {
      generatorRef.current.stop();
      setIsRunning(false);
    } else {
      generatorRef.current.start();
      setIsRunning(true);
    }
  };

  const handleResetPresenter = () => {
    if (generatorRef.current) {
      generatorRef.current.stop();
      generatorRef.current.start();
      setIsRunning(true);
    }
  };

  return (
    <div className="w-full rounded-2xl glass-panel-elevated p-6 lg:p-8 border border-dark-700/80 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-dark-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider font-mono text-brand-cyan font-semibold">
              Live Hardware & Protocol Sandbox
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Dual-Screen Optical Verification Sandbox
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Presenter projects rotating frames. Attendees scan from their phone with sub-second burst capture.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs font-medium text-slate-200 transition-colors"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-brand-emerald" />}
            {isRunning ? 'Pause Loop' : 'Resume Loop'}
          </button>
          <button
            onClick={handleResetPresenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs font-medium text-slate-200 transition-colors"
            title="Reset Presenter Loop"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Grid: Presenter Screen vs Attendee Phone Handoff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Side: Presenter Screen (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-dark-900/90 border border-dark-800 p-6">
          <div>
            <div className="w-full flex items-center justify-between pb-4 border-b border-dark-800/80 mb-5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Monitor className="w-4 h-4 text-brand-cyan" />
                <span>Presenter Screen (Projector / TV)</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 bg-dark-800 px-2 py-0.5 rounded">
                Frame {currentFrameIdx + 1} / {framesCount}
              </span>
            </div>

            {/* Canvas container */}
            <div className="relative p-3 rounded-2xl bg-white shadow-2xl flex items-center justify-center max-w-[280px] mx-auto">
              <canvas
                ref={canvasRef}
                width={260}
                height={260}
                className="rounded-xl block"
              />
            </div>

            {/* Presenter Diagnostics Strip */}
            <div className="w-full mt-6 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-dark-850/80 border border-dark-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500">Session ID</span>
                <span className="font-mono font-medium text-slate-200">{sessionIdHex}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-850/80 border border-dark-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500">Cycle Nonce</span>
                <span className="font-mono font-medium text-brand-cyan">0x{cycleNonce.toString(16).toUpperCase()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-850/80 border border-dark-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500">Speed</span>
                <span className="font-mono font-medium text-slate-200">{fps} Hz</span>
              </div>
            </div>
          </div>

          {/* Parameter Sliders */}
          <div className="w-full mt-5 pt-4 border-t border-dark-800/80 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex justify-between">
                <span>Frame Count (N)</span>
                <span className="text-white font-mono">{framesCount} frames</span>
              </label>
              <div className="flex gap-1.5">
                {[4, 6, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFramesCount(n)}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      framesCount === n
                        ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                        : 'bg-dark-800 border-dark-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex justify-between">
                <span>Speed (FPS)</span>
                <span className="text-white font-mono">{fps} FPS</span>
              </label>
              <div className="flex gap-1.5">
                {[2, 4, 6].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setFps(speed)}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      fps === speed
                        ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                        : 'bg-dark-800 border-dark-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Attendee Camera (Mobile / Web Scanner) */}
        <div className="lg:col-span-6 flex flex-col justify-between items-center rounded-xl bg-dark-900/90 border border-dark-800 p-6 text-center">
          <div className="w-full flex items-center justify-between pb-4 border-b border-dark-800/80 mb-5 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Smartphone className="w-4 h-4 text-brand-emerald" />
              <span>Attendee Camera (Mobile / Web Scanner)</span>
            </div>
            <span className="font-mono text-[10px] uppercase text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/25 px-2 py-0.5 rounded-full">
              Live Test
            </span>
          </div>

          {/* QR Code and Instructions */}
          <div className="flex flex-col items-center justify-center my-auto py-2 space-y-4">
            <div className="p-3 bg-white rounded-2xl shadow-2xl border border-white/20 transition-transform hover:scale-105 duration-200">
              {scannerQrDataUrl ? (
                <img
                  src={scannerQrDataUrl}
                  alt="Scan this QR code with your phone to open the scanner"
                  className="w-44 h-44 rounded-lg block"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>

            <div className="max-w-xs space-y-1.5">
              <h4 className="text-sm font-bold text-white tracking-tight">
                Scan with your phone to test the scanner
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan the QR code above with your smartphone camera to instantly launch the Web Scanner, then point it at the animated optical code on the left.
              </p>
            </div>
          </div>

          {/* Bottom Button to launch Web Scanner */}
          <div className="w-full pt-5 border-t border-dark-800/80 mt-5">
            <Link
              href="/scanner"
              className="w-full py-3.5 px-4 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/40"
            >
              <Camera className="w-4 h-4" />
              <span>Open Web Scanner / Use Webcam</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
