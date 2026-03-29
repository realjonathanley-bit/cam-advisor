/**
 * components/editor/canvasRenderer.ts
 *
 * Pure drawing functions for the planning canvas.
 * No React, no side effects — all inputs are plain values.
 *
 * Icon design goals: small, flat, modern, immediately legible at 18 px.
 */

import type { PlacedCamera } from '@/types';
import { toRad } from '@/utils/helpers';
import { COLORS } from '@/lib/constants';

// ─── Interaction constants ────────────────────────────────────────────────────

export const CAMERA_HIT_RADIUS        = 12;
export const ROTATE_HANDLE_HIT_RADIUS = 9;
export const ROTATE_HANDLE_DIST       = 24;

// ─── Hit testing ──────────────────────────────────────────────────────────────

export function hitTestCamera(cameras: PlacedCamera[], x: number, y: number): string | null {
  for (let i = cameras.length - 1; i >= 0; i--) {
    if (Math.hypot(x - cameras[i].x, y - cameras[i].y) <= CAMERA_HIT_RADIUS) return cameras[i].id;
  }
  return null;
}

export function getRotateHandlePos(cam: PlacedCamera): { x: number; y: number } {
  const a = toRad(cam.rotation);
  return { x: cam.x + Math.cos(a) * ROTATE_HANDLE_DIST, y: cam.y + Math.sin(a) * ROTATE_HANDLE_DIST };
}

export function hitTestRotateHandle(cam: PlacedCamera, x: number, y: number): boolean {
  const h = getRotateHandlePos(cam);
  return Math.hypot(x - h.x, y - h.y) <= ROTATE_HANDLE_HIT_RADIUS;
}

// ─── FOV cone ─────────────────────────────────────────────────────────────────

export function drawFOVCone(ctx: CanvasRenderingContext2D, cam: PlacedCamera): void {
  const start = toRad(cam.rotation - cam.fovAngle / 2);
  const end   = toRad(cam.rotation + cam.fovAngle / 2);

  ctx.save();

  const grad = ctx.createRadialGradient(cam.x, cam.y, 0, cam.x, cam.y, cam.fovLength);
  grad.addColorStop(0,    'rgba(26,107,255,0.20)');
  grad.addColorStop(0.55, 'rgba(26,107,255,0.09)');
  grad.addColorStop(1,    'rgba(26,107,255,0.015)');

  ctx.beginPath();
  ctx.moveTo(cam.x, cam.y);
  ctx.arc(cam.x, cam.y, cam.fovLength, start, end);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge lines
  ctx.strokeStyle = 'rgba(26,107,255,0.42)';
  ctx.lineWidth   = 0.75;
  ctx.beginPath();
  ctx.moveTo(cam.x, cam.y);
  ctx.lineTo(cam.x + Math.cos(start) * cam.fovLength, cam.y + Math.sin(start) * cam.fovLength);
  ctx.moveTo(cam.x, cam.y);
  ctx.lineTo(cam.x + Math.cos(end)   * cam.fovLength, cam.y + Math.sin(end)   * cam.fovLength);
  ctx.stroke();

  // Far arc
  ctx.strokeStyle = 'rgba(26,107,255,0.18)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, cam.fovLength, start, end);
  ctx.stroke();

  ctx.restore();
}

// ─── Camera icon — flat, minimal, ~18 px ──────────────────────────────────────

export function drawCameraIcon(
  ctx: CanvasRenderingContext2D,
  cam: PlacedCamera,
  isSelected: boolean,
  isHovered: boolean,
): void {
  // Hover ring
  if (isHovered && !isSelected) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, CAMERA_HIT_RADIUS + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  if (isSelected) { ctx.shadowColor = COLORS.blue; ctx.shadowBlur = 10; }

  ctx.translate(cam.x, cam.y);
  ctx.rotate(toRad(cam.rotation));
  cam.type === 'camera' ? drawCam(ctx, isSelected) : drawDoorbell(ctx, isSelected);
  ctx.restore();

  if (isSelected) drawSelectionOverlay(ctx, cam);
  drawLabel(ctx, cam, isSelected);
}

/** Bullet camera — flat, compact */
function drawCam(ctx: CanvasRenderingContext2D, sel: boolean): void {
  // Body
  ctx.fillStyle = sel ? COLORS.blue : '#fff';
  ctx.beginPath();
  ctx.roundRect(-7, -4.5, 12, 9, 2.5);
  ctx.fill();

  // Lens ring
  ctx.fillStyle = sel ? '#001860' : '#161616';
  ctx.beginPath();
  ctx.arc(6.5, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Lens glass
  ctx.fillStyle = sel ? '#003ab8' : '#262640';
  ctx.beginPath();
  ctx.arc(6.5, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Glint
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.arc(5.4, -1.3, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

/** Doorbell — slim pill + dot */
function drawDoorbell(ctx: CanvasRenderingContext2D, sel: boolean): void {
  ctx.fillStyle = sel ? COLORS.blue : '#f0f0f0';
  ctx.beginPath();
  ctx.roundRect(-4, -8, 8, 16, 4);
  ctx.fill();

  ctx.fillStyle = sel ? 'rgba(0,20,80,0.80)' : COLORS.blue;
  ctx.beginPath();
  ctx.arc(0, 1.5, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Selection ring + handle ──────────────────────────────────────────────────

function drawSelectionOverlay(ctx: CanvasRenderingContext2D, cam: PlacedCamera): void {
  const handle = getRotateHandlePos(cam);

  ctx.save();

  // Dashed ring
  ctx.strokeStyle = COLORS.blue;
  ctx.lineWidth   = 1.2;
  ctx.globalAlpha = 0.75;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, CAMERA_HIT_RADIUS + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Line to handle
  ctx.strokeStyle = 'rgba(26,107,255,0.30)';
  ctx.lineWidth   = 0.75;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(cam.x, cam.y);
  ctx.lineTo(handle.x, handle.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Handle dot
  ctx.fillStyle   = COLORS.blue;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth   = 1.2;
  ctx.shadowColor = COLORS.blue;
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.arc(handle.x, handle.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.restore();
}

// ─── Label ────────────────────────────────────────────────────────────────────

function drawLabel(ctx: CanvasRenderingContext2D, cam: PlacedCamera, sel: boolean): void {
  if (!cam.label) return;
  const text = cam.label.toUpperCase();

  ctx.save();
  ctx.font      = '600 10px ui-monospace, "SF Mono", monospace';
  ctx.textAlign = 'center';

  const tw = ctx.measureText(text).width;
  const lx = cam.x;
  const ly = cam.y + CAMERA_HIT_RADIUS + 12;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - 4, ly - 8, tw + 8, 11, 2.5);
  ctx.fill();

  ctx.fillStyle = sel ? COLORS.blue : 'rgba(255,255,255,0.58)';
  ctx.fillText(text, lx, ly);
  ctx.restore();
}

// ─── Full scene render ────────────────────────────────────────────────────────

/**
 * Render the full scene.
 *
 * `logicalW`/`logicalH` are the image-space dimensions (e.g. 640×640).
 * The caller must set `ctx.setTransform(scale, 0, 0, scale, 0, 0)` before
 * calling this so that all drawing happens in logical space while the actual
 * canvas backing store is `logicalW*scale × logicalH*scale` pixels.
 */
export function renderCanvas(
  ctx:        CanvasRenderingContext2D,
  image:      HTMLImageElement | null,
  cameras:    PlacedCamera[],
  selectedId: string | null,
  hoveredId:  string | null,
  showFov:    boolean,
  logicalW:   number,
  logicalH:   number,
): void {
  ctx.clearRect(0, 0, logicalW, logicalH);

  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, 0, 0, logicalW, logicalH);
  } else {
    ctx.fillStyle = '#06090f';
    ctx.fillRect(0, 0, logicalW, logicalH);
  }

  if (showFov) {
    for (const cam of cameras) drawFOVCone(ctx, cam);
  }

  for (const cam of cameras) {
    if (cam.id !== selectedId) drawCameraIcon(ctx, cam, false, cam.id === hoveredId);
  }
  for (const cam of cameras) {
    if (cam.id === selectedId) drawCameraIcon(ctx, cam, true, false);
  }
}
