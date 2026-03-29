'use client';

/**
 * Temporary developer debug panel.
 * Shows live config values so they can be verified visually.
 * Remove this component once values are confirmed.
 */

import { useState } from 'react';
import type { PrepareDebugInfo } from '@/types';
import {
  CAMERA_ICON_SIZE,
  DOORBELL_ICON_SIZE,
  MAX_FOV_ANGLE,
  MIN_FOV_ANGLE,
  SATELLITE_CROP_FACTOR,
  DEFAULT_ZOOM,
} from '@/lib/constants';
import { CAMERA_HIT_RADIUS, ROTATE_HANDLE_DIST } from './canvasRenderer';

interface DevPanelProps {
  debugInfo: PrepareDebugInfo;
}

export default function DevPanel({ debugInfo }: DevPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 right-3 z-[999] bg-[#0a0e18] border border-[#1a6bff]/30
                   text-[10px] text-[#1a6bff] font-mono px-2.5 py-1.5 rounded-lg
                   hover:bg-[#1a6bff]/10 transition-colors"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[999] w-64 rounded-xl bg-[#0a0e18]/95
                    border border-[#1a6bff]/25 backdrop-blur-sm shadow-2xl shadow-black/50
                    text-[10px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="text-[#1a6bff] font-bold tracking-wider uppercase text-[9px]">
          Dev Debug
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-600 hover:text-white transition-colors leading-none"
        >
          &times;
        </button>
      </div>

      {/* Values */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        <Row
          label="Autocomplete"
          value={debugInfo.autocompleteEnabled ? 'Places API active' : 'Places API disabled'}
          ok={debugInfo.autocompleteEnabled}
        />

        <Divider />

        <Row label="Zoom (server)" value={String(debugInfo.zoom)} />
        <Row label="Zoom (const default)" value={String(DEFAULT_ZOOM)} />
        <Row
          label="Crop factor (server)"
          value={debugInfo.cropFactor.toFixed(2)}
        />
        <Row
          label="Crop factor (const)"
          value={SATELLITE_CROP_FACTOR.toFixed(2)}
        />

        <Divider />

        <Row label="Camera icon size" value={`${CAMERA_ICON_SIZE} px`} />
        <Row label="Doorbell icon size" value={`${DOORBELL_ICON_SIZE} px`} />
        <Row label="Hit radius" value={`${CAMERA_HIT_RADIUS} px`} />
        <Row label="Rotate handle dist" value={`${ROTATE_HANDLE_DIST} px`} />

        <Divider />

        <Row label="FOV range" value={`${MIN_FOV_ANGLE}°–${MAX_FOV_ANGLE}°`} />
        <Row label="Transform provider" value={debugInfo.transformProvider} />
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-600 truncate">{label}</span>
      <span
        className={
          ok === true
            ? 'text-green-400 shrink-0'
            : ok === false
              ? 'text-yellow-500 shrink-0'
              : 'text-gray-300 shrink-0'
        }
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/5 my-0.5" />;
}
