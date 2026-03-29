'use client';

import { useState, useEffect, useRef } from 'react';
import type { AppStep, PreparedPropertyData, PrepareDebugInfo } from '@/types';
import StepIndicator from '@/components/StepIndicator';
import AddressInput from '@/components/AddressInput';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import PlanningEditor from '@/components/editor/PlanningEditor';
import { useLanguage } from '@/hooks/useLanguage';
import { t as translations } from '@/lib/translations';

const BASE = process.env.__NEXT_ROUTER_BASEPATH || '';

export default function Home() {
  const { lang, setLanguage } = useLanguage();
  const tr = translations[lang];

  const [step, setStep] = useState<AppStep>('input');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<PreparedPropertyData | null>(null);
  const [debugInfo, setDebugInfo] = useState<PrepareDebugInfo | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 'loading') {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()));
      }, 200);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedMs(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  async function handleAddressSubmit(submittedAddress: string) {
    setAddress(submittedAddress);
    setError(null);
    setStep('loading');

    try {
      const res = await fetch(`${BASE}/api/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: submittedAddress }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? tr.error.default);
      }

      setProperty(data.property);
      setDebugInfo(data.debug ?? null);
      setStep('editor');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : tr.error.unknown;
      setError(message);
      setStep('error');
    }
  }

  function handleRetry() {
    setStep('input');
    setError(null);
    setProperty(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1a6bff]/15 border border-[#1a6bff]/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              TVIGILO
              <span className="text-[#1a6bff] font-normal ml-1 text-base">
                Advisor
              </span>
            </span>
          </div>

          {step !== 'input' && step !== 'error' && (
            <div className="hidden md:flex">
              <StepIndicator currentStep={step} />
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div className="flex items-center rounded-full border border-white/10 overflow-hidden text-xs font-bold">
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1.5 transition-colors ${lang === 'es' ? 'bg-[#1a6bff]/20 text-[#1a6bff]' : 'text-gray-500 hover:text-white'}`}
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-[#1a6bff]/20 text-[#1a6bff]' : 'text-gray-500 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            <a
              href="/"
              onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {tr.header.back}
            </a>
          </div>
        </div>
      </header>

      {/* ── Background glow ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(26,107,255,0.07) 0%, transparent 70%)',
        }}
      />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col pt-28 pb-16 px-4">
        {step === 'input' && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#1a6bff] bg-[#1a6bff]/10 border border-[#1a6bff]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff] animate-pulse" />
              {tr.hero.badge}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
              {tr.hero.title1}
              <br />
              <span className="text-[#1a6bff]">{tr.hero.title2}</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              {tr.hero.subtitle}
            </p>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {step === 'input' && (
            <AddressInput onSubmit={handleAddressSubmit} lang={lang} />
          )}

          {step === 'loading' && (
            <LoadingState address={address} elapsedMs={elapsedMs} />
          )}

          {step === 'editor' && property && (
            <PlanningEditor property={property} onReset={handleRetry} debugInfo={debugInfo} lang={lang} />
          )}

          {step === 'error' && (
            <ErrorState
              message={error ?? tr.error.default}
              onRetry={handleRetry}
            />
          )}
        </div>

        {step === 'input' && (
          <section className="mt-16 max-w-3xl mx-auto w-full">
            <h2 className="text-center text-sm font-semibold tracking-widest uppercase text-gray-600 mb-8">
              {tr.howItWorks.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tr.howItWorks.steps.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/5 bg-[#0d0d0d]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1a6bff]/10 border border-[#1a6bff]/15 flex items-center justify-center mb-4 text-lg font-black text-[#1a6bff]">
                    {i + 1}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-700">
        {tr.footer}
      </footer>
    </div>
  );
}
