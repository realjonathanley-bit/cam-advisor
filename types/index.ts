// ─── Camera & Plan Types ──────────────────────────────────────────────────────

export type CameraType = 'standard' | 'doorbell';
export type PlanType = 'basic' | 'medium' | 'high';
export type AppStep = 'input' | 'loading' | 'editor' | 'error';

export interface Camera {
  id: string;
  /** X position as percentage of image width (0–100) */
  x: number;
  /** Y position as percentage of image height (0–100) */
  y: number;
  /** Direction the camera faces, in degrees. 0 = right, 90 = down */
  angle: number;
  /** Field of view width in degrees */
  fov: number;
  label: string;
  type: CameraType;
}

export interface CameraPlan {
  type: PlanType;
  label: string;
  description: string;
  cameraCount: number;
  cameras: Camera[];
}

// ─── Property & Result Types ──────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PropertyData {
  address: string;
  /** Formatted address returned by the geocoder */
  formattedAddress?: string;
  coordinates: Coordinates;
  /** @deprecated Kept as empty string for compatibility */
  satelliteImageUrl: string;
  /** Base64 data URL of the raw satellite image */
  satelliteImageDataUrl?: string;
  /** Base64 data URL of the processed/drawn architectural diagram */
  processedImageDataUrl?: string;
  /** Width of the satellite image in pixels */
  imageWidth: number;
  /** Height of the satellite image in pixels */
  imageHeight: number;
  /**
   * Detected house bounding box in pixels (Phase 3+).
   * Used by Phase 4 camera placement engine.
   */
  detectedHouseRect?: { x: number; y: number; w: number; h: number };
  /** Which edge the driveway faces — used by Phase 4 for camera orientation */
  drivewaySide?: 'bottom' | 'top' | 'left' | 'right';
  /** Whether house detection was confident (false = used fallback heuristics) */
  detectionConfident?: boolean;
}

export interface RecommendationResult {
  property: PropertyData;
  plans: Record<PlanType, CameraPlan>;
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface AddressInputProps {
  onSubmit: (address: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export interface RecommendationWidgetProps {
  /** Compact mode for embedding into an existing page */
  compact?: boolean;
  /** Callback when user finishes and downloads */
  onComplete?: (result: RecommendationResult) => void;
  className?: string;
}

export interface CameraCanvasProps {
  property: PropertyData;
  cameras: Camera[];
  showFov?: boolean;
  onCameraMove?: (id: string, x: number, y: number) => void;
  onCameraRotate?: (id: string, angle: number) => void;
  editable?: boolean;
}

// ─── API Payload / Response Types ────────────────────────────────────────────

export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  coordinates: Coordinates;
  formattedAddress: string;
}

export interface SatelliteRequest {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
}

export interface SatelliteResponse {
  imageDataUrl: string;
  width: number;
  height: number;
}

export interface ProcessImageRequest {
  imageDataUrl: string;
}

export interface ProcessImageResponse {
  processedImageDataUrl: string;
  width: number;
  height: number;
}

export interface RecommendationRequest {
  address: string;
}

export interface RecommendationResponse {
  result: RecommendationResult;
}

export interface ApiError {
  error: string;
  code?: string;
}

// ─── Editor Types ─────────────────────────────────────────────────────────────

/** A camera (or doorbell) placed by the user on the planning canvas. */
export interface PlacedCamera {
  id: string;
  type: 'camera' | 'doorbell';
  /** X position in image-pixel space */
  x: number;
  /** Y position in image-pixel space */
  y: number;
  /** Pointing direction in degrees. 0=right, 90=down, 270=up */
  rotation: number;
  /** Field-of-view cone width in degrees */
  fovAngle: number;
  /** Field-of-view cone length in image pixels */
  fovLength: number;
  label: string;
}

/** Property data returned by /api/prepare — used to hydrate the planning editor. */
export interface PreparedPropertyData {
  address: string;
  formattedAddress?: string;
  coordinates: Coordinates;
  /** Raw satellite image as base64 data URL */
  originalImageDataUrl: string;
  /** Stylized security-plan background as base64 data URL */
  transformedImageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Which transform provider was used ('sharp', 'openai', …) */
  transformProvider: string;
}

// ─── API types for /api/prepare ───────────────────────────────────────────────

export interface PrepareRequest {
  address: string;
}

export interface PrepareDebugInfo {
  zoom: number;
  cropFactor: number;
  transformProvider: string;
  autocompleteEnabled: boolean;
}

export interface PrepareResponse {
  property: PreparedPropertyData;
  debug?: PrepareDebugInfo;
}
