'use client';

/**
 * PlanningEditor — Phase B
 *
 * Interaction model:
 *   Mouse/touch down on camera body  → select + begin move-drag
 *   Mouse/touch down on rotate handle → begin rotate-drag
 *   Mouse/touch down on empty area   → deselect
 *   Drag events escalated to window  → drag never breaks if pointer leaves canvas
 *
 * Keyboard (when canvas area is focused / no input focused):
 *   Delete / Backspace → delete selected
 *   Escape             → deselect
 *   Arrow keys         → nudge 1 px  (+ Shift → 5 px)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { PreparedPropertyData, PlacedCamera, PrepareDebugInfo } from '@/types';
import { usePlanningEditor } from '@/hooks/usePlanningEditor';
import EditorToolbar from './EditorToolbar';
import CameraInspector from './CameraInspector';
import DevPanel from './DevPanel';
import {
  renderCanvas,
  hitTestCamera,
  hitTestRotateHandle,
} from './canvasRenderer';
import { addressToFilename } from '@/utils/helpers';
import type { Lang } from '@/hooks/useLanguage';
import { t as translations } from '@/lib/translations';
import ProductRecommendations from './ProductRecommendations';

const BASE = process.env.__NEXT_ROUTER_BASEPATH || '';

interface PlanningEditorProps {
  property: PreparedPropertyData;
  onReset: () => void;
  debugInfo?: PrepareDebugInfo | null;
  lang?: Lang;
}

type DragMode = 'move' | 'rotate';
interface DragState {
  mode:       DragMode;
  cameraId:   string;
  startMouseX: number;
  startMouseY: number;
  startCamX:  number;
  startCamY:  number;
}

/** Scale factor for high-DPI downloads (independent of screen DPR). */
const EXPORT_SCALE = 3;

export default function PlanningEditor({ property, onReset, debugInfo, lang = 'es' }: PlanningEditorProps) {
  const tr = translations[lang].editor;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef  = useRef<HTMLImageElement | null>(null);

  // Screen DPR for crisp on-screen rendering
  const dpr = typeof window !== 'undefined' ? Math.ceil(window.devicePixelRatio || 1) : 2;
  const logicalW = property.imageWidth;
  const logicalH = property.imageHeight;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragState,   setDragState]   = useState<DragState | null>(null);
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);
  const [cursor,      setCursor]      = useState<string>('crosshair');

  // ── Background mode toggle ─────────────────────────────────────────────────
  type BgMode = 'satellite' | 'openai';
  const [bgMode, setBgMode]                   = useState<BgMode>('satellite');
  const [openaiDataUrl, setOpenaiDataUrl]      = useState<string | null>(null);
  const [openaiLoading, setOpenaiLoading]      = useState(false);
  const [openaiError, setOpenaiError]          = useState<string | null>(null);

  const editor = usePlanningEditor({
    imageWidth:  property.imageWidth,
    imageHeight: property.imageHeight,
  });
  const { cameras, selectedId, showFov, selectCamera, moveCamera, rotateCamera } = editor;

  // ── Stable refs (avoid stale closures in window handlers) ────────────────
  const dragRef      = useRef<DragState | null>(null);
  dragRef.current    = dragState;

  const camerasRef   = useRef<PlacedCamera[]>([]);
  camerasRef.current = cameras;

  const selectedRef  = useRef<string | null>(null);
  selectedRef.current = selectedId;

  // ── Resolve which image to show based on bgMode ─────────────────────────
  const activeImageUrl =
    bgMode === 'openai' && openaiDataUrl
      ? openaiDataUrl
      : property.originalImageDataUrl;

  // ── Load + cache images so switching between modes is instant ─────────────
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const cached = imgCacheRef.current.get(activeImageUrl);
    if (cached && cached.complete) {
      imageRef.current = cached;
      setImageLoaded(true);
      return;
    }

    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      imgCacheRef.current.set(activeImageUrl, img);
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = activeImageUrl;
    return () => { img.onload = null; };
  }, [activeImageUrl]);

  // ── Fetch OpenAI transformation on demand ─────────────────────────────────
  const requestOpenAI = useCallback(async () => {
    if (openaiLoading) return;
    if (openaiDataUrl) { setBgMode('openai'); return; } // already cached

    setOpenaiLoading(true);
    setOpenaiError(null);
    setBgMode('openai');

    try {
      const res = await fetch(`${BASE}/api/transform-openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ satelliteDataUrl: property.originalImageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al transformar.');
      setOpenaiDataUrl(data.dataUrl);
    } catch (err) {
      setOpenaiError(err instanceof Error ? err.message : 'Error desconocido.');
      setBgMode('satellite'); // fall back
    } finally {
      setOpenaiLoading(false);
    }
  }, [openaiLoading, openaiDataUrl, property.originalImageDataUrl]);

  // ── Redraw whenever state changes (HiDPI aware) ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCanvas(ctx, imageRef.current, cameras, selectedId, hoveredId, showFov, logicalW, logicalH);
  }, [cameras, selectedId, hoveredId, showFov, imageLoaded, dpr, logicalW, logicalH]);

  // ── Coordinate helper (returns logical/image-space coords, not pixel) ────
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (logicalW / rect.width),
      y: (clientY - rect.top)  * (logicalH / rect.height),
    };
  }, []);

  // ── Shared drag-update logic (called from window mousemove + touch) ───────
  const applyDrag = useCallback((clientX: number, clientY: number) => {
    const ds = dragRef.current;
    if (!ds) return;
    const { x, y } = clientToCanvas(clientX, clientY);

    if (ds.mode === 'move') {
      moveCamera(
        ds.cameraId,
        ds.startCamX + (x - ds.startMouseX),
        ds.startCamY + (y - ds.startMouseY),
      );
    } else {
      const cam = camerasRef.current.find(c => c.id === ds.cameraId);
      if (cam) {
        rotateCamera(ds.cameraId, ((Math.atan2(y - cam.y, x - cam.x) * 180 / Math.PI) + 360) % 360);
      }
    }
  }, [clientToCanvas, moveCamera, rotateCamera]);

  // ── Window-level drag listeners (active only while dragging) ─────────────
  // This is the fix for "drag breaks when pointer leaves canvas".
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent) => applyDrag(e.clientX, e.clientY);
    const onUp   = () => { setDragState(null); setCursor('crosshair'); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [dragState, applyDrag]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when typing in an input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const sel = selectedRef.current;
      if (!sel) {
        if (e.key === 'Escape') selectCamera(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        editor.deleteCamera(sel);
        return;
      }
      if (e.key === 'Escape') {
        selectCamera(null);
        return;
      }

      const step = e.shiftKey ? 5 : 1;
      const cam  = camerasRef.current.find(c => c.id === sel);
      if (!cam) return;

      if (e.key === 'ArrowLeft')  { e.preventDefault(); moveCamera(sel, cam.x - step, cam.y); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveCamera(sel, cam.x + step, cam.y); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); moveCamera(sel, cam.x, cam.y - step); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveCamera(sel, cam.x, cam.y + step); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectCamera, moveCamera, editor]);

  // ── Pointer-down logic (shared by mouse + touch) ──────────────────────────
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const { x, y } = clientToCanvas(clientX, clientY);

    // Priority 1: rotate handle of selected camera
    const sel = selectedRef.current
      ? camerasRef.current.find(c => c.id === selectedRef.current)
      : null;

    if (sel && hitTestRotateHandle(sel, x, y)) {
      setDragState({ mode: 'rotate', cameraId: sel.id,
        startMouseX: x, startMouseY: y, startCamX: sel.x, startCamY: sel.y });
      setCursor('grabbing');
      return;
    }

    // Priority 2: camera body
    const hitId = hitTestCamera(camerasRef.current, x, y);
    if (hitId) {
      const cam = camerasRef.current.find(c => c.id === hitId)!;
      selectCamera(hitId);
      setDragState({ mode: 'move', cameraId: hitId,
        startMouseX: x, startMouseY: y, startCamX: cam.x, startCamY: cam.y });
      setCursor('grabbing');
      return;
    }

    // Empty area → deselect
    selectCamera(null);
  }, [clientToCanvas, selectCamera]);

  // ── Canvas mouse handlers ─────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  }, [handlePointerDown]);

  // Hover detection — only runs when NOT dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) return; // drag handled by window listener

    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    // Check rotate handle of selected camera
    const sel = selectedRef.current
      ? camerasRef.current.find(c => c.id === selectedRef.current)
      : null;
    if (sel && hitTestRotateHandle(sel, x, y)) {
      setHoveredId(null);
      setCursor('grab');
      return;
    }

    const hit = hitTestCamera(camerasRef.current, x, y);
    setHoveredId(prev => (prev !== hit ? hit : prev));
    setCursor(hit ? 'grab' : 'crosshair');
  }, [clientToCanvas]);

  const handleMouseLeave = useCallback(() => {
    // Clear hover — but don't stop drag (window listener handles that)
    setHoveredId(null);
    if (!dragRef.current) setCursor('crosshair');
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, [handlePointerDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1 || !dragRef.current) return;
    e.preventDefault();
    applyDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, [applyDrag]);

  const handleTouchEnd = useCallback(() => {
    setDragState(null);
    setCursor('crosshair');
  }, []);

  // ── Download (render to offscreen canvas at EXPORT_SCALE for max quality) ─
  const handleDownload = useCallback(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width  = logicalW * EXPORT_SCALE;
    offscreen.height = logicalH * EXPORT_SCALE;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    renderCanvas(ctx, imageRef.current, cameras, selectedId, hoveredId, showFov, logicalW, logicalH);

    const a = document.createElement('a');
    a.href     = offscreen.toDataURL('image/png');
    a.download = `plan-camaras-${addressToFilename(property.address)}.png`;
    a.click();
  }, [property.address, cameras, selectedId, hoveredId, showFov, logicalW, logicalH]);

  const selectedCamera = cameras.find(c => c.id === selectedId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col">

      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1a6bff] mb-0.5">
            {tr.securityPlan}
          </p>
          <h2 className="text-sm font-bold text-white leading-snug">
            {property.formattedAddress ?? property.address}
          </h2>
          <p className="text-[11px] text-gray-700 mt-0.5 font-mono">
            {property.coordinates.lat.toFixed(5)},&nbsp;
            {property.coordinates.lng.toFixed(5)}
          </p>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 mt-0.5 text-[11px] font-medium text-gray-600 hover:text-white transition-colors"
        >
          {tr.newAddress}
        </button>
      </div>

      {/* Background toggle */}
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wide mr-1">{tr.view}</span>
        <BgToggleBtn
          active={bgMode === 'satellite'}
          onClick={() => setBgMode('satellite')}
          label={tr.satellite}
        />
        <BgToggleBtn
          active={bgMode === 'openai'}
          loading={openaiLoading}
          onClick={() => openaiDataUrl ? setBgMode('openai') : requestOpenAI()}
          label={tr.plan}
        />
        {openaiError && (
          <span className="text-[10px] text-red-400 ml-2 truncate max-w-xs">{openaiError}</span>
        )}
        {openaiLoading && (
          <span className="text-[10px] text-gray-500 ml-2 animate-pulse">{tr.generating}</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-3">
        <EditorToolbar
          cameras={cameras}
          showFov={showFov}
          onAddCamera={editor.addCamera}
          onToggleFov={editor.toggleFov}
          onReset={editor.reset}
          onDownload={handleDownload}
        />
      </div>

      {/* Canvas + Inspector + Recommendations */}
      <div className="flex gap-3 items-start">

        {/* Canvas column */}
        <div className="flex-1 min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-black border border-white/8 shadow-2xl shadow-black/60">
            <canvas
              ref={canvasRef}
              width={logicalW * dpr}
              height={logicalH * dpr}
              className="w-full h-auto block select-none"
              style={{ cursor, touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />

            {/* Loading overlay */}
            {(!imageLoaded || openaiLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#1a6bff] border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-600">
                    {openaiLoading ? tr.loadingOpenai : tr.loadingImage}
                  </span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {imageLoaded && cameras.length === 0 && <EmptyHint tr={tr} />}

            {/* Status strip */}
            {imageLoaded && (
              <StatusStrip property={property} cameras={cameras} tr={tr} />
            )}
          </div>

          {/* Keyboard hint */}
          <p className="mt-2 px-0.5 text-[10px] text-gray-700">
            {tr.hint}
          </p>
        </div>

        {/* Inspector panel — always reserve column to prevent canvas resize */}
        <div className="w-48 shrink-0">
          {selectedCamera && (
            <CameraInspector
              camera={selectedCamera}
              onUpdate={patch => editor.updateCamera(selectedCamera.id, patch)}
              onDelete={() => editor.deleteCamera(selectedCamera.id)}
            />
          )}
        </div>

        {/* Product recommendations */}
        <div className="hidden lg:block">
          <ProductRecommendations tr={translations[lang].recommendations} />
        </div>
      </div>

      {/* Temporary dev panel — remove once values are confirmed */}
      {/* DevPanel solo disponible en desarrollo local */}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyHint({ tr }: { tr: Record<string, string> }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3 text-center px-8">
        <div className="w-12 h-12 rounded-2xl bg-[#1a6bff]/10 border border-[#1a6bff]/20 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#1a6bff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.65 }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/55">{tr.emptyTitle}</p>
          <p className="text-xs text-gray-700 mt-1">{tr.emptyDesc}</p>
        </div>
      </div>
    </div>
  );
}

function StatusStrip({
  property,
  cameras,
  tr,
}: {
  property: PreparedPropertyData;
  cameras: PlacedCamera[];
  tr: Record<string, string>;
}) {
  return (
    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff] animate-pulse" />
        <span className="text-[10px] font-medium text-gray-400">
          {cameras.length === 0
            ? tr.noCameras
            : `${cameras.length} ${cameras.length !== 1 ? tr.elementsPlural : tr.elements}`}
        </span>
      </div>
      <div className="bg-black/75 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-[10px] text-gray-600 font-mono">
        {property.imageWidth}×{property.imageHeight}
      </div>
    </div>
  );
}

function BgToggleBtn({
  active,
  loading = false,
  onClick,
  label,
}: {
  active: boolean;
  loading?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        'text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors',
        active
          ? 'bg-[#1a6bff]/15 border-[#1a6bff]/30 text-[#1a6bff]'
          : 'bg-white/4 border-white/8 text-gray-500 hover:text-white hover:border-white/15',
        loading ? 'opacity-60 cursor-wait' : '',
      ].join(' ')}
    >
      {loading && (
        <span className="inline-block w-2.5 h-2.5 mr-1.5 rounded-full border border-current border-t-transparent animate-spin align-middle" />
      )}
      {label}
    </button>
  );
}
