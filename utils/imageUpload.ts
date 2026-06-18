import type { PreparedPropertyData } from '@/types';

/**
 * Longest-side cap for uploaded images (px). Matches the 640px satellite scale
 * so the default camera FOV cone length (DEFAULT_CAMERA_FOV_LENGTH = 130 px)
 * stays proportional on uploaded photos.
 */
export const MAX_UPLOAD_DIM = 640;

/** Reject files larger than this (bytes). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Browser-decodable image types we accept. */
export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type UploadErrorCode = 'type' | 'size' | 'decode';

export class UploadError extends Error {
  code: UploadErrorCode;
  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

/**
 * Scale (srcW, srcH) so the longest side is <= max, preserving aspect ratio.
 * Never upscales. Returns integer dimensions >= 1.
 *
 * Examples:
 *   computeTargetDims(4000, 3000, 640) -> { width: 640, height: 480 }
 *   computeTargetDims(1000, 2000, 640) -> { width: 320, height: 640 }
 *   computeTargetDims(500, 400, 640)   -> { width: 500, height: 400 }  (no upscale)
 */
export function computeTargetDims(
  srcW: number,
  srcH: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(srcW, srcH);
  const scale = longest > max ? max / longest : 1;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

/** Load a File into an HTMLImageElement, rejecting if the browser can't decode it. */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadError('decode', 'The browser could not decode the image.'));
    };
    img.src = url;
  });
}

/** Draw the image onto a canvas at the target size and return a PNG data URL. */
function resizeToDataUrl(
  img: HTMLImageElement,
): { dataUrl: string; width: number; height: number } {
  const { width, height } = computeTargetDims(
    img.naturalWidth,
    img.naturalHeight,
    MAX_UPLOAD_DIM,
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new UploadError('decode', 'Canvas is unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

/** Build the editor's property object from an uploaded, resized image. */
export function buildUploadedProperty(
  label: string,
  dataUrl: string,
  width: number,
  height: number,
): PreparedPropertyData {
  return {
    address: label.trim() || 'foto',
    // coordinates intentionally omitted — uploaded photos have no geolocation
    originalImageDataUrl: dataUrl,
    transformedImageDataUrl: dataUrl, // same image; not used for display
    imageWidth: width,
    imageHeight: height,
    transformProvider: 'upload',
  };
}

/** Validate, decode, resize and package an uploaded photo for the editor. */
export async function prepareUploadedPhoto(
  file: File,
  label: string,
): Promise<PreparedPropertyData> {
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
    throw new UploadError('type', 'Unsupported file type.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('size', 'File too large.');
  }
  const img = await loadImageFromFile(file);
  const { dataUrl, width, height } = resizeToDataUrl(img);
  return buildUploadedProperty(label, dataUrl, width, height);
}
