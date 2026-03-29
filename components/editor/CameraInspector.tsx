'use client';

import type { PlacedCamera } from '@/types';
import { clamp } from '@/utils/helpers';
import { MAX_FOV_ANGLE, MIN_FOV_ANGLE } from '@/lib/constants';

interface CameraInspectorProps {
  camera: PlacedCamera;
  onUpdate: (patch: Partial<PlacedCamera>) => void;
  onDelete: () => void;
}

export default function CameraInspector({
  camera,
  onUpdate,
  onDelete,
}: CameraInspectorProps) {
  const isCamera = camera.type === 'camera';

  return (
    <div className="rounded-xl border border-white/10 bg-[#080c14] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#1a6bff]/12 border border-[#1a6bff]/25
                        flex items-center justify-center shrink-0">
          {isCamera ? <CameraGlyph /> : <DoorbellGlyph />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a6bff]">
            {isCamera ? 'Cámara' : 'Timbre'}
          </p>
          <p className="text-xs font-semibold text-white truncate">{camera.label}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 flex flex-col gap-4">
        {/* Label */}
        <Field label="Etiqueta">
          <input
            type="text"
            value={camera.label}
            maxLength={24}
            onChange={e => onUpdate({ label: e.target.value })}
            className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5
                       text-xs text-white placeholder-gray-600 focus:outline-none
                       focus:border-[#1a6bff]/50 transition-colors"
          />
        </Field>

        {/* Rotation */}
        <Field label="Rotación" value={`${Math.round(camera.rotation)}°`}>
          <input
            type="range" min={0} max={359}
            value={Math.round(camera.rotation)}
            onChange={e => onUpdate({ rotation: Number(e.target.value) })}
            className="w-full h-1.5 accent-[#1a6bff] cursor-pointer"
          />
        </Field>

        {/* FOV Angle */}
        <Field label="Ángulo de visión" value={`${camera.fovAngle}°`}>
          <input
            type="range" min={MIN_FOV_ANGLE} max={MAX_FOV_ANGLE}
            value={camera.fovAngle}
            onChange={e => onUpdate({ fovAngle: clamp(Number(e.target.value), MIN_FOV_ANGLE, MAX_FOV_ANGLE) })}
            className="w-full h-1.5 accent-[#1a6bff] cursor-pointer"
          />
        </Field>

        {/* FOV Length */}
        <Field label="Alcance" value={`${camera.fovLength}px`}>
          <input
            type="range" min={30} max={300}
            value={camera.fovLength}
            onChange={e => onUpdate({ fovLength: clamp(Number(e.target.value), 30, 300) })}
            className="w-full h-1.5 accent-[#1a6bff] cursor-pointer"
          />
        </Field>

        {/* Position readout */}
        <div className="rounded-lg bg-white/3 border border-white/6 px-3 py-2
                        grid grid-cols-2 gap-1 text-[10px] text-gray-600">
          <span>X: <span className="text-gray-500 font-mono">{Math.round(camera.x)}</span></span>
          <span>Y: <span className="text-gray-500 font-mono">{Math.round(camera.y)}</span></span>
        </div>
      </div>

      {/* Delete */}
      <div className="px-4 pb-4">
        <button
          onClick={onDelete}
          className="w-full text-xs font-semibold py-2 rounded-lg border border-red-500/25
                     text-red-500/70 hover:text-red-400 hover:border-red-500/50
                     hover:bg-red-500/8 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">
          {label}
        </span>
        {value && (
          <span className="text-[10px] font-semibold text-gray-400 font-mono tabular-nums">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CameraGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="#1a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function DoorbellGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="#1a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
