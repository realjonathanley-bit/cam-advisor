'use client';

import type { PlacedCamera } from '@/types';

interface EditorToolbarProps {
  cameras: PlacedCamera[];
  showFov: boolean;
  onAddCamera: (type: 'camera' | 'doorbell') => void;
  onToggleFov: () => void;
  onReset: () => void;
  onDownload: () => void;
}

export default function EditorToolbar({
  cameras,
  showFov,
  onAddCamera,
  onToggleFov,
  onReset,
  onDownload,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Add cameras */}
      <ToolButton
        onClick={() => onAddCamera('camera')}
        icon={<CameraIcon />}
        label="Cámara"
        primary
      />
      <ToolButton
        onClick={() => onAddCamera('doorbell')}
        icon={<DoorbellIcon />}
        label="Timbre"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* FOV toggle */}
      <ToolButton
        onClick={onToggleFov}
        icon={showFov ? <EyeIcon /> : <EyeOffIcon />}
        label={showFov ? 'FOV' : 'FOV'}
        active={showFov}
      />

      {/* Clear — only shown when there are cameras */}
      {cameras.length > 0 && (
        <ToolButton
          onClick={onReset}
          icon={<TrashIcon />}
          label="Limpiar"
          danger
        />
      )}

      {/* Camera count badge */}
      {cameras.length > 0 && (
        <div className="ml-1 flex items-center gap-1.5 bg-white/5 border border-white/8 px-2.5 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff]" />
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            {cameras.length} cám{cameras.length !== 1 ? '.' : '.'}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Download */}
      <button
        onClick={onDownload}
        disabled={cameras.length === 0}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg
                   bg-[#1a6bff] text-white hover:bg-[#0050e6] transition-colors
                   disabled:opacity-35 disabled:cursor-not-allowed"
      >
        <DownloadIcon />
        Descargar PNG
      </button>
    </div>
  );
}

// ─── Tool button ──────────────────────────────────────────────────────────────

function ToolButton({
  onClick,
  icon,
  label,
  primary = false,
  active = false,
  danger = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  const base = 'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors';

  const color = primary
    ? 'bg-[#1a6bff]/12 border border-[#1a6bff]/25 text-[#1a6bff] hover:bg-[#1a6bff]/20'
    : danger
      ? 'bg-white/5 border border-white/8 text-gray-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8'
      : active
        ? 'bg-[#1a6bff]/15 border border-[#1a6bff]/30 text-[#1a6bff]'
        : 'bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/10';

  return (
    <button onClick={onClick} className={`${base} ${color}`}>
      {icon}
      {label}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function DoorbellIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
