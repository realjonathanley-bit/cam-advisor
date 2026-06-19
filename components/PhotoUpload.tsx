'use client';

import { useRef, useState, useEffect, DragEvent } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { PreparedPropertyData } from '@/types';
import type { Lang } from '@/hooks/useLanguage';
import { t as translations } from '@/lib/translations';
import { prepareUploadedPhoto, UploadError } from '@/utils/imageUpload';

interface PhotoUploadProps {
  onSubmit: (property: PreparedPropertyData) => void;
  lang?: Lang;
}

export default function PhotoUpload({ onSubmit, lang = 'es' }: PhotoUploadProps) {
  const tr = translations[lang].upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function errorMessage(err: unknown): string {
    if (err instanceof UploadError) {
      if (err.code === 'type') return tr.errorType;
      if (err.code === 'size') return tr.errorTooLarge;
      return tr.errorDecode;
    }
    return tr.errorDecode;
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const property = await prepareUploadedPhoto(file, label);
      onSubmit(property);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glow padding="lg" className="w-full max-w-2xl mx-auto">
      {/* Heading */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1a6bff]/10 border border-[#1a6bff]/20 flex items-center justify-center mb-4">
          <UploadIcon />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{tr.heading}</h2>
        <p className="text-gray-400 text-sm max-w-md">{tr.description}</p>
      </div>

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center text-center',
          'rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          'min-h-[200px] p-6 overflow-hidden',
          dragOver
            ? 'border-[#1a6bff]/70 bg-[#1a6bff]/5'
            : 'border-white/15 hover:border-white/30 bg-[#1a1a1a]',
        ].join(' ')}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" className="max-h-[260px] w-auto rounded-lg" />
        ) : (
          <>
            <UploadIcon />
            <p className="text-sm font-semibold text-white mt-3">{tr.dropTitle}</p>
            <p className="text-xs text-gray-600 mt-1">{tr.dropHint}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {tr.changeImage}
        </button>
      )}

      {/* Optional label */}
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={tr.labelPlaceholder}
        className="w-full mt-4 px-4 py-3 rounded-xl text-white text-sm bg-[#1a1a1a] border border-white/10 placeholder:text-gray-600 outline-none focus:border-[#1a6bff]/60"
      />

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <Button
        type="button"
        size="lg"
        fullWidth
        className="mt-4"
        disabled={!file || busy}
        loading={busy}
        onClick={handleSubmit}
      >
        {tr.submit}
      </Button>
    </Card>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
      viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
