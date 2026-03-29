/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts degrees to radians.
 */
export function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalizes an angle to the range [0, 360).
 */
export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Converts a percentage (0–100) to a pixel value given the total dimension.
 */
export function pctToPx(pct: number, dimension: number): number {
  return (pct / 100) * dimension;
}

/**
 * Converts a pixel value to a percentage (0–100) given the total dimension.
 */
export function pxToPct(px: number, dimension: number): number {
  return (px / dimension) * 100;
}

/**
 * Generates a simple unique id string.
 */
export function uid(prefix = 'cam'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Converts a base64 data URL to a Blob for download.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Triggers a PNG download from a data URL.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const blob = dataUrlToBlob(dataUrl);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Formats an address string for use as a filename.
 */
export function addressToFilename(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
