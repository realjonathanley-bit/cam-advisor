'use client';

/**
 * Phase 3 result view.
 * Shows the synthetic clean diagram as the main output.
 * Includes a side-by-side comparison panel for debugging.
 */

import { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { RecommendationResult } from '@/types';
import { PLAN_LABELS, PLAN_DESCRIPTIONS } from '@/lib/constants';

interface ResultPlaceholderProps {
  result: RecommendationResult;
  onReset: () => void;
}

const PLAN_ORDER = ['basic', 'medium', 'high'] as const;

export default function ResultPlaceholder({ result, onReset }: ResultPlaceholderProps) {
  const [showComparison, setShowComparison] = useState(false);
  const { property, plans } = result;

  const hasProcessed = Boolean(property.processedImageDataUrl);
  const hasSatellite = Boolean(property.satelliteImageDataUrl);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5">

      {/* ── Address header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1a6bff] mb-1">
            Propiedad analizada
          </p>
          <h2 className="text-lg font-bold text-white leading-snug">
            {property.formattedAddress ?? property.address}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {property.coordinates.lat.toFixed(6)},{' '}
            {property.coordinates.lng.toFixed(6)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasSatellite && hasProcessed && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? 'Ver plano' : 'Comparar'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onReset}>
            ← Nueva dirección
          </Button>
        </div>
      </div>

      {/* ── Image panel ─────────────────────────────────────────────────── */}
      {showComparison ? (
        <ComparisonView property={property} />
      ) : (
        <MainDiagramView property={property} />
      )}

      {/* ── Plan cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {PLAN_ORDER.map((planKey, i) => {
          const plan = plans[planKey];
          const isRecommended = planKey === 'medium';
          return (
            <Card
              key={planKey}
              glow={isRecommended}
              padding="md"
              className={`flex flex-col gap-2 relative ${isRecommended ? 'border-[#1a6bff]/30' : ''}`}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-[#1a6bff] text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  Recomendado
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a6bff]">
                {PLAN_LABELS[planKey]}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{plan.cameraCount}</span>
                <span className="text-xs text-gray-500">cám.</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                {PLAN_DESCRIPTIONS[planKey]}
              </p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: plan.cameraCount }).map((_, ci) => (
                  <div
                    key={ci}
                    className="h-1 flex-1 rounded-full bg-[#1a6bff]"
                    style={{ opacity: 0.35 + (ci / plan.cameraCount) * 0.65 }}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-700">
        Los planes interactivos con posicionamiento de cámaras estarán disponibles en la Fase 4.
      </p>
    </div>
  );
}

// ─── Main diagram view ────────────────────────────────────────────────────────

function MainDiagramView({ property }: { property: ResultPlaceholderProps['result']['property'] }) {
  const hasProcessed = Boolean(property.processedImageDataUrl);

  return (
    <Card padding="sm" className="overflow-hidden">
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/5">
        {hasProcessed ? (
          <>
            <Image
              src={property.processedImageDataUrl!}
              alt="Plano de seguridad"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff] animate-pulse" />
              <span className="text-xs font-medium text-white">
                Diagrama sintético · Plano de seguridad
              </span>
            </div>
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-gray-400 pointer-events-none">
              {property.imageWidth} × {property.imageHeight}
            </div>
          </>
        ) : (
          <EmptyImagePlaceholder label="Diagrama no disponible" />
        )}
      </div>
      <p className="mt-3 px-1 text-xs text-gray-700">
        Estructura detectada por análisis de densidad de bordes · Redibujado como diagrama limpio.
        Las cámaras se agregarán en la Fase 4.
      </p>
    </Card>
  );
}

// ─── Comparison view ──────────────────────────────────────────────────────────

function ComparisonView({ property }: { property: ResultPlaceholderProps['result']['property'] }) {
  return (
    <Card padding="sm" className="overflow-hidden">
      <div className="grid grid-cols-2 gap-2">
        {/* Left: satellite */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2 px-1">
            Original · Satélite
          </p>
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/5">
            {property.satelliteImageDataUrl ? (
              <Image
                src={property.satelliteImageDataUrl}
                alt="Vista satelital"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <EmptyImagePlaceholder label="No disponible" />
            )}
            <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded-full text-[10px] text-white pointer-events-none">
              Google Maps · Zoom 19
            </div>
          </div>
        </div>

        {/* Right: processed diagram */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1a6bff] mb-2 px-1">
            Procesado · Diagrama
          </p>
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-[#1a6bff]/15">
            {property.processedImageDataUrl ? (
              <Image
                src={property.processedImageDataUrl}
                alt="Diagrama de seguridad"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <EmptyImagePlaceholder label="No disponible" />
            )}
            <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded-full text-[10px] text-[#1a6bff] pointer-events-none">
              SVG redibujado
            </div>
          </div>
        </div>
      </div>

      {/* Debug metadata */}
      <div className="mt-3 px-1 grid grid-cols-2 gap-4 text-[11px] text-gray-600">
        <div>
          <span className="text-gray-500">Coordenadas:</span>{' '}
          {property.coordinates.lat.toFixed(5)}, {property.coordinates.lng.toFixed(5)}
        </div>
        <div>
          <span className="text-gray-500">Resolución:</span>{' '}
          {property.imageWidth} × {property.imageHeight} px
        </div>
      </div>
    </Card>
  );
}

// ─── Shared empty state ───────────────────────────────────────────────────────

function EmptyImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
        fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}
