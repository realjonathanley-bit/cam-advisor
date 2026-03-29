'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  FormEvent,
  KeyboardEvent,
} from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { AddressInputProps } from '@/types';
import type { Lang } from '@/hooks/useLanguage';
import { t as translations } from '@/lib/translations';

const BASE = process.env.__NEXT_ROUTER_BASEPATH || '';

interface Suggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export default function AddressInput({
  onSubmit,
  isLoading = false,
  error = null,
  lang = 'es',
}: AddressInputProps & { lang?: Lang }) {
  const tr = translations[lang].input;
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetching, setFetching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // ── Fetch suggestions ──────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query: string) => {
    setFetching(true);
    try {
      const res = await fetch(
        `${BASE}/api/autocomplete?input=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      const preds: Suggestion[] = data.predictions ?? [];
      setSuggestions(preds);
      setIsOpen(preds.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setFetching(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setAddress(value);
    if (validationError) setValidationError(null);

    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 280);
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  function selectSuggestion(s: Suggestion) {
    setAddress(s.description);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onSubmit(s.description);
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  // ── Manual submit ──────────────────────────────────────────────────────────

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setValidationError(tr.errorEmpty);
      return;
    }
    if (trimmed.length < 5) {
      setValidationError(tr.errorShort);
      return;
    }
    setValidationError(null);
    setIsOpen(false);
    onSubmit(trimmed);
  }

  const displayError = validationError || error;

  return (
    <Card glow padding="lg" className="w-full max-w-2xl mx-auto">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#1a6bff]/10 border border-[#1a6bff]/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
            viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {tr.heading}
        </h2>
        <p className="text-gray-400 text-sm max-w-md">
          {tr.description}
        </p>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          {/* Pin icon */}
          <div className="absolute left-4 top-[18px] pointer-events-none text-gray-600">
            <PinIcon />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
            onBlur={() => setTimeout(() => setIsOpen(false), 180)}
            placeholder={tr.placeholder}
            disabled={isLoading}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="addr-list"
            aria-activedescendant={
              activeIndex >= 0 ? `addr-opt-${activeIndex}` : undefined
            }
            className={[
              'w-full pl-12 pr-4 py-4 rounded-xl text-white text-base',
              'bg-[#1a1a1a] border transition-all duration-200',
              'placeholder:text-gray-600 outline-none',
              displayError
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-white/10 focus:border-[#1a6bff]/60 focus:shadow-[0_0_0_3px_rgba(26,107,255,0.12)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          />

          {/* Spinner while fetching */}
          {fetching && (
            <div className="absolute right-4 top-[18px]">
              <div className="w-4 h-4 rounded-full border-2 border-[#1a6bff]/40 border-t-[#1a6bff] animate-spin" />
            </div>
          )}

          {/* ── Suggestions dropdown ─────────────────────────────────────── */}
          {isOpen && suggestions.length > 0 && (
            <div
              id="addr-list"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl
                         bg-[#111111] border border-white/10
                         overflow-hidden shadow-2xl shadow-black/60 z-50"
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.placeId}
                  id={`addr-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                  className={[
                    'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                    i === activeIndex
                      ? 'bg-[#1a6bff]/10'
                      : 'hover:bg-white/[0.04]',
                    i < suggestions.length - 1
                      ? 'border-b border-white/[0.04]'
                      : '',
                  ].join(' ')}
                >
                  <div className="mt-0.5 shrink-0 text-gray-600">
                    <PinIcon small />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm text-white block truncate">
                      {s.mainText}
                    </span>
                    {s.secondaryText && (
                      <span className="text-xs text-gray-600 block truncate">
                        {s.secondaryText}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {displayError && (
          <p className="flex items-center gap-2 text-sm text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {displayError}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? tr.loading : tr.submit}
        </Button>
      </form>

      {/* ── Example chips ────────────────────────────────────────────────── */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <p className="text-xs text-gray-600 text-center mb-3">
          {tr.examples}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => handleInputChange(example)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10
                         text-gray-500 hover:text-white hover:border-white/20
                         transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

const EXAMPLES = [
  'Calle 8, Miami, FL',
  '1200 McKinney St, Houston, TX',
  '350 Fifth Ave, New York, NY',
];

function PinIcon({ small = false }: { small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
