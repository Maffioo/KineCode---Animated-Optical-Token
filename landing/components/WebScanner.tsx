'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Camera,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  Check,
  Lock,
  Radio
} from 'lucide-react';
import { FrameCollector, fromHex, type VerificationResult } from 'kinecode';
import jsQR from 'jsqr';

function extractDomain(rawUrl?: string): string {
  if (!rawUrl) return 'Verified Token';
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'Verified Token';
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname || trimmed;
  } catch {
    const match = /^(?:https?:\/\/)?([^/?#:]+)/i.exec(trimmed);
    return match?.[1] || trimmed;
  }
}

function normalizeOpenableUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function WebScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedTotalFrames, setDetectedTotalFrames] = useState<number | null>(null);
  const [lockedSlots, setLockedSlots] = useState<number[]>([]);
  const [hintText, setHintText] = useState<string>('Point camera at the KineCode');
  const [verifiedSession, setVerifiedSession] = useState<{
    domain: string;
    signedUrl?: string;
    targetUrl?: string;
    sessionId?: number;
    actionMode?: string;
  } | null>(null);

  const collectorRef = useRef<FrameCollector>(new FrameCollector());
  const cooldownUntilRef = useRef<number>(0);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera access failed:', err);
      setHasPermission(false);
      setErrorMessage('Camera access was denied or is not supported in this browser.');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const resetScanner = () => {
    collectorRef.current.reset();
    setDetectedTotalFrames(null);
    setLockedSlots([]);
    setVerifiedSession(null);
    setHintText('Point camera at the KineCode');
  };

  // Video scanning loop using jsQR and kinecode's FrameCollector
  useEffect(() => {
    if (!hasPermission) return;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            handleQrData(qrCode.data);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasPermission, verifiedSession]);

  const handleQrData = (data: string) => {
    const now = Date.now();
    if (now < cooldownUntilRef.current || verifiedSession) return;

    const step = collectorRef.current.pushFrame(data, now);
    if (step.status === 'ignored') return;

    if (step.totalFrames > 0 && detectedTotalFrames !== step.totalFrames) {
      setDetectedTotalFrames(step.totalFrames);
    }

    if (step.status === 'collecting') {
      if (step.isNewSlot) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(25);
        }
        setLockedSlots(step.lockedIndices);
        setHintText(`Locked — Capturing ${step.lockedFrames}/${step.totalFrames}`);
      }
      return;
    }

    if (step.status === 'rejected') {
      setLockedSlots([]);
      setHintText(
        step.result?.error?.includes('expired')
          ? 'Code expired — Please scan again'
          : 'Verification failed — Please scan again'
      );
      return;
    }

    if (step.status === 'verified' && step.result) {
      const res = step.result;
      const targetUrl = res.targetUrl;
      const signedUrl = res.signedUrl;
      const actionMode = res.actionMode;

      if (targetUrl && (actionMode === 'webhook' || actionMode === 'both')) {
        const sessionHex =
          res.sessionId !== undefined
            ? `0x${res.sessionId.toString(16).toUpperCase().padStart(8, '0')}`
            : undefined;
        fetch(normalizeOpenableUrl(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'proof_of_presence_verified',
            sessionId: res.sessionId,
            sessionIdHex: sessionHex,
            timestamp: res.timestamp,
            cycleNonce: res.cycleNonce,
            signature: res.signatureHex,
            signedUrl,
            verifiedAt: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      cooldownUntilRef.current = now + 2500;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 50, 120]);
      }

      setVerifiedSession({
        domain: extractDomain(targetUrl || signedUrl),
        signedUrl,
        targetUrl,
        sessionId: res.sessionId,
        actionMode,
      });
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Hidden offscreen canvas for computer vision image decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header matching Expo Mobile App */}
      <header className="z-30 w-full px-5 py-4 flex items-center justify-between bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white transition-colors"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-md overflow-hidden">
              <Image src="/logo.png" alt="KineCode" fill className="object-contain" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">KineCode</span>
            <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-bold">
              SCANNER
            </span>
          </div>
        </div>

        <button
          onClick={resetScanner}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </header>

      {/* Main Viewfinder Stage */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {hasPermission === false ? (
          <div className="max-w-sm mx-auto p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-rose/20 border border-brand-rose/40 text-brand-rose flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Camera Access Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage || 'KineCode uses your camera to capture high-speed animated optical tokens.'}
            </p>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-brand-cyan text-dark-950 font-bold text-xs shadow-lg hover:bg-cyan-300 transition-all"
            >
              Enable Camera Access
            </button>
          </div>
        ) : (
          <>
            {/* Live Camera Video stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark optical vignette */}
            <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

            {/* Top Guidance Pill Banner */}
            <div className="absolute top-6 left-0 right-0 z-20 flex justify-center px-4">
              <div
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-xl transition-all shadow-xl ${
                  lockedSlots.length > 0
                    ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                    : 'bg-dark-900/80 border-white/15 text-slate-200'
                }`}
              >
                {hintText}
              </div>
            </div>

            {/* Center Framing Reticle with Apple-grade corner accents */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3 shadow-2xl">
              <div className="flex justify-between">
                <span className="w-6 h-6 border-t-4 border-l-4 border-brand-cyan rounded-tl-lg"></span>
                <span className="w-6 h-6 border-t-4 border-r-4 border-brand-cyan rounded-tr-lg"></span>
              </div>
              <div className="flex justify-between">
                <span className="w-6 h-6 border-b-4 border-l-4 border-brand-cyan rounded-bl-lg"></span>
                <span className="w-6 h-6 border-b-4 border-r-4 border-brand-cyan rounded-br-lg"></span>
              </div>
            </div>

            {/* Bottom HUD Dynamic Progress Strip */}
            <div className="absolute bottom-6 left-4 right-4 z-20 max-w-md mx-auto rounded-2xl bg-dark-900/90 backdrop-blur-xl border border-white/10 p-4 space-y-2.5 shadow-2xl">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">
                  {detectedTotalFrames
                    ? `Capturing frames: ${lockedSlots.length} / ${detectedTotalFrames}`
                    : 'Ready to scan KineCode...'}
                </span>
                {detectedTotalFrames ? (
                  <span className="font-mono text-[11px] text-brand-cyan">
                    {Math.round((lockedSlots.length / detectedTotalFrames) * 100)}%
                  </span>
                ) : null}
              </div>

              {detectedTotalFrames ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Array.from({ length: detectedTotalFrames }).map((_, idx) => {
                    const isLocked = lockedSlots.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`h-2.5 rounded-full transition-all duration-150 ${
                          isLocked
                            ? 'bg-brand-cyan shadow-sm shadow-cyan-400'
                            : 'bg-dark-800 border border-dark-700'
                        }`}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      {/* Verification Modal matching Expo Mobile App */}
      {verifiedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-dark-900 border border-white/15 p-6 text-center space-y-4 shadow-2xl">
            {/* Checkmark badge */}
            <div className="w-16 h-16 rounded-full bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-white">
                Proof-of-Presence Verified
              </h3>
              <p className="text-sm font-semibold text-brand-cyan">
                {verifiedSession.domain}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-left font-mono text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Session ID:</span>
                <span className="text-slate-200">
                  {verifiedSession.sessionId !== undefined
                    ? `0x${verifiedSession.sessionId.toString(16).toUpperCase()}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Action Mode:</span>
                <span className="text-brand-emerald capitalize">
                  {verifiedSession.actionMode || 'redirect'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Envelope:</span>
                <span className="text-slate-200">HMAC-SHA256 Valid</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {verifiedSession.signedUrl && (
                <a
                  href={normalizeOpenableUrl(verifiedSession.signedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <span>Open Verified URL</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={resetScanner}
                className="w-full py-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-300 font-semibold text-sm transition-colors"
              >
                Done / Scan Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
