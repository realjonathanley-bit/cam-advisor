import type { PlanType } from '@/types';

// ─── Map / Image Settings ─────────────────────────────────────────────────────

export const DEFAULT_ZOOM = 20;
export const SATELLITE_IMAGE_WIDTH = 640;
export const SATELLITE_IMAGE_HEIGHT = 640;

/** Fraction of the satellite image to keep (center crop). 1 = no crop. */
export const SATELLITE_CROP_FACTOR = 0.78;

// ─── Camera Plan Definitions ──────────────────────────────────────────────────

export const PLAN_LABELS: Record<PlanType, string> = {
  basic: 'Básica',
  medium: 'Media',
  high: 'Alta',
};

export const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  basic: '4 cámaras · Cobertura de perímetro esencial',
  medium: '5 cámaras · Cobertura de perímetro mejorada',
  high: '6 cámaras + timbre · Cobertura total del terreno',
};

export const PLAN_CAMERA_COUNTS: Record<PlanType, number> = {
  basic: 4,
  medium: 5,
  high: 7,
};

// ─── Camera Rendering ─────────────────────────────────────────────────────────

/** Semi-transparent blue used for FOV triangles */
export const FOV_FILL_COLOR = 'rgba(26, 107, 255, 0.25)';
export const FOV_STROKE_COLOR = 'rgba(26, 107, 255, 0.6)';

/** Camera icon sizes (canvas pixels) */
export const CAMERA_ICON_SIZE = 18;
export const DOORBELL_ICON_SIZE = 16;

// ─── Camera Defaults ──────────────────────────────────────────────────────────

/** Default FOV cone width in degrees for a standard camera */
export const DEFAULT_CAMERA_FOV = 90;
/** Default FOV cone length in image pixels for a standard camera */
export const DEFAULT_CAMERA_FOV_LENGTH = 130;

/** Default FOV cone width in degrees for a doorbell camera (wide angle) */
export const DEFAULT_DOORBELL_FOV = 120;
/** Default FOV cone length in image pixels for a doorbell camera (shorter range) */
export const DEFAULT_DOORBELL_FOV_LENGTH = 75;

/** Hard ceiling the FOV slider can reach */
export const MAX_FOV_ANGLE = 180;
/** Hard floor for FOV angle */
export const MIN_FOV_ANGLE = 20;

// ─── Brand Colors (matching TVIGILO) ─────────────────────────────────────────

export const COLORS = {
  blue: '#1a6bff',
  blueDark: '#0050e6',
  black: '#000000',
  surface: '#0d0d0d',
  surfaceLight: '#1a1a1a',
  border: 'rgba(255,255,255,0.1)',
  textMuted: '#8a8a8a',
} as const;

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP_NAME = 'Cam Advisor';
export const APP_TAGLINE = 'Recomendación de cámaras de seguridad para tu propiedad';
