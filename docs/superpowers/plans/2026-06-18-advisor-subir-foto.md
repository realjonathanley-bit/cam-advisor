# Botón "Subir foto" en Tvigilo Advisor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Subir foto" tab to the Tvigilo Advisor start screen that lets the user upload their own aerial image and enter the same camera-planning editor that the address search opens today.

**Architecture:** Client-side preparation, no new server route. A new utility validates and resizes the uploaded image in the browser and builds the same `PreparedPropertyData` object the editor already consumes. A new `PhotoUpload` component renders the upload card; `app/page.tsx` gains a two-tab selector. The editor's existing "Plan" (OpenAI) toggle keeps working because `/api/transform-openai` accepts any image data URL. Two small editor tweaks: hide the lat/lng line when there are no coordinates, and label the first toggle "Foto" for uploads.

**Tech Stack:** Next.js 16 (non-standard fork), React 19, TypeScript, Tailwind v4, HTML5 Canvas. No test runner in the repo.

## Global Constraints

- **No new server endpoint.** Reuse the existing `/api/transform-openai` for the "Plan" view. (The cam-advisor Next.js is a non-standard fork — see `AGENTS.md` — so avoid writing new API routes.)
- **Do not break the address flow** (`AddressInput`, `/api/prepare`, geocoding, satellite).
- `MAX_UPLOAD_DIM = 640` px (longest side cap — matches the satellite scale so the default camera FOV cone length `DEFAULT_CAMERA_FOV_LENGTH = 130` px stays proportional).
- `MAX_UPLOAD_BYTES = 15 * 1024 * 1024` (15 MB file cap).
- Accept only `image/jpeg`, `image/png`, `image/webp`. Unsupported/undecodable (e.g. HEIC) → friendly error, no conversion.
- Brand color `#1a6bff`; dark surfaces `#0d0d0d` / `#1a1a1a`; reuse `components/ui/Card` and `components/ui/Button`.
- Every user-facing string must exist in both `es` and `en` in `lib/translations.ts`.
- Dev server runs on port **3001** with `basePath: '/tvigiloadvisor'`, so the local URL is `http://localhost:3001/tvigiloadvisor`.
- **No test framework exists** (package.json scripts are `dev`, `build`, `lint`). Verification per task = `npx tsc --noEmit` (typecheck) + `npm run lint`, and end-to-end browser dogfood in the final task. Keep `tsc` green after every task.

---

### Task 1: Data model + editor made upload-ready (types, translations, editor guards)

This task makes `coordinates` optional and adds the strings + editor guards so the editor tolerates an upload-sourced property. No upload UI yet; the address flow is unchanged. Done together so `tsc` stays green (making `coordinates` optional without the editor guard would break the build).

**Files:**
- Modify: `types/index.ts:164` (the `coordinates` field of `PreparedPropertyData`)
- Modify: `lib/translations.ts` (add `editor.photo` and a new `upload` namespace, both `es` and `en`)
- Modify: `components/editor/PlanningEditor.tsx:359-362` (guard coords line) and `:375-379` (toggle label)

**Interfaces:**
- Produces: `PreparedPropertyData.coordinates?` is now optional (`coordinates?: Coordinates`). Later tasks build an upload property that omits it.
- Produces: translation keys `translations[lang].editor.photo` (string) and `translations[lang].upload` object with keys `tabAddress, tabUpload, heading, description, dropTitle, dropHint, labelPlaceholder, submit, changeImage, errorType, errorTooLarge, errorDecode`.

- [ ] **Step 1: Make `coordinates` optional in the prepared-property type**

In `types/index.ts`, inside `interface PreparedPropertyData`, change the coordinates line from:

```ts
  coordinates: Coordinates;
```

to:

```ts
  /** Present for address-sourced properties; absent for uploaded photos */
  coordinates?: Coordinates;
```

- [ ] **Step 2: Add the `photo` label to the editor translations**

In `lib/translations.ts`, in the `es.editor` object add after the `satellite` line (`:34`):

```ts
      photo: 'Foto',
```

In `en.editor` add after its `satellite` line (`:100`):

```ts
      photo: 'Photo',
```

- [ ] **Step 3: Add the `upload` namespace to translations**

In `lib/translations.ts`, in the `es` object, add a new top-level namespace (e.g. right after the `input: { … },` block, before `howItWorks`):

```ts
    upload: {
      tabAddress: 'Buscar dirección',
      tabUpload: 'Subir foto',
      heading: 'Sube una foto aérea',
      description: 'Sube una imagen aérea de la propiedad (Google Earth, dron o un mapa) y diseña tu plan de cámaras.',
      dropTitle: 'Arrastra una imagen aquí',
      dropHint: 'o haz clic para elegir un archivo · JPG o PNG',
      labelPlaceholder: 'Dirección o nombre del cliente (opcional)',
      submit: 'Abrir editor',
      changeImage: 'Cambiar imagen',
      errorType: 'El archivo debe ser una imagen JPG o PNG.',
      errorTooLarge: 'La imagen es demasiado grande (máx. 15 MB).',
      errorDecode: 'No se pudo leer la imagen. Usa un archivo JPG o PNG.',
    },
```

In the `en` object, add the matching namespace in the same position:

```ts
    upload: {
      tabAddress: 'Search address',
      tabUpload: 'Upload photo',
      heading: 'Upload an aerial photo',
      description: 'Upload an aerial image of the property (Google Earth, drone or a map) and design your camera plan.',
      dropTitle: 'Drag an image here',
      dropHint: 'or click to choose a file · JPG or PNG',
      labelPlaceholder: 'Address or customer name (optional)',
      submit: 'Open editor',
      changeImage: 'Change image',
      errorType: 'The file must be a JPG or PNG image.',
      errorTooLarge: 'The image is too large (max 15 MB).',
      errorDecode: 'Could not read the image. Use a JPG or PNG file.',
    },
```

- [ ] **Step 4: Guard the coordinates line in the editor**

In `components/editor/PlanningEditor.tsx`, replace the coordinates paragraph (currently lines 359-362):

```tsx
          <p className="text-[11px] text-gray-700 mt-0.5 font-mono">
            {property.coordinates.lat.toFixed(5)},&nbsp;
            {property.coordinates.lng.toFixed(5)}
          </p>
```

with a guarded version:

```tsx
          {property.coordinates && (
            <p className="text-[11px] text-gray-700 mt-0.5 font-mono">
              {property.coordinates.lat.toFixed(5)},&nbsp;
              {property.coordinates.lng.toFixed(5)}
            </p>
          )}
```

- [ ] **Step 5: Label the first toggle "Foto" for uploads**

In `components/editor/PlanningEditor.tsx`, in the first `<BgToggleBtn>` (the satellite one, around lines 375-379), change the `label` prop from:

```tsx
          label={tr.satellite}
```

to:

```tsx
          label={property.transformProvider === 'upload' ? tr.photo : tr.satellite}
```

- [ ] **Step 6: Typecheck and lint**

Run: `cd "/Users/jonathanley/prueba 001/cam-advisor" && npx tsc --noEmit && npm run lint`
Expected: no type errors, no lint errors. (The address flow still supplies `coordinates`, so nothing regresses.)

- [ ] **Step 7: Commit**

```bash
cd "/Users/jonathanley/prueba 001/cam-advisor"
git add types/index.ts lib/translations.ts components/editor/PlanningEditor.tsx
git commit -m "feat(advisor): make editor tolerate upload-sourced properties"
```

---

### Task 2: Image upload utility (`utils/imageUpload.ts`)

Pure + browser helpers that validate, decode, resize and package an uploaded image into a `PreparedPropertyData`.

**Files:**
- Create: `utils/imageUpload.ts`

**Interfaces:**
- Consumes: `PreparedPropertyData` from `@/types` (with optional `coordinates` from Task 1).
- Produces:
  - `MAX_UPLOAD_DIM: number`, `MAX_UPLOAD_BYTES: number`, `ACCEPTED_UPLOAD_TYPES: string[]`
  - `class UploadError extends Error { code: 'type' | 'size' | 'decode' }`
  - `computeTargetDims(srcW: number, srcH: number, max: number): { width: number; height: number }` — pure
  - `buildUploadedProperty(label: string, dataUrl: string, width: number, height: number): PreparedPropertyData`
  - `prepareUploadedPhoto(file: File, label: string): Promise<PreparedPropertyData>`

- [ ] **Step 1: Create the utility file**

Create `utils/imageUpload.ts` with this exact content:

```ts
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
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd "/Users/jonathanley/prueba 001/cam-advisor" && npx tsc --noEmit && npm run lint`
Expected: no errors. (Confirms the property object shape matches `PreparedPropertyData` with `coordinates` omitted — only valid because Task 1 made it optional.)

- [ ] **Step 3: Sanity-check the pure resize math**

Eyeball `computeTargetDims` against the three documented examples in the file's JSDoc. They must hold:
- `(4000, 3000, 640)` → `{640, 480}`
- `(1000, 2000, 640)` → `{320, 640}`
- `(500, 400, 640)` → `{500, 400}` (no upscale)

(No test runner exists; behavior is verified end-to-end in Task 4.)

- [ ] **Step 4: Commit**

```bash
cd "/Users/jonathanley/prueba 001/cam-advisor"
git add utils/imageUpload.ts
git commit -m "feat(advisor): add client-side image upload utility"
```

---

### Task 3: Upload card component (`components/PhotoUpload.tsx`)

**Files:**
- Create: `components/PhotoUpload.tsx`

**Interfaces:**
- Consumes: `prepareUploadedPhoto`, `UploadError` from `@/utils/imageUpload`; `Card`, `Button`; `translations[lang].upload`; `PreparedPropertyData`; `Lang` from `@/hooks/useLanguage`.
- Produces: `export default function PhotoUpload(props: { onSubmit: (property: PreparedPropertyData) => void; lang?: Lang })`.

- [ ] **Step 1: Create the component**

Create `components/PhotoUpload.tsx` with this exact content:

```tsx
'use client';

import { useRef, useState, DragEvent } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { PreparedPropertyData } from '@/types';
import type { Lang } from '@/hooks/useLanguage';
import { t as translations } from '@/lib/translations';
import { prepareUploadedPhoto, UploadError } from '@/utils/imageUpload';

interface PhotoUploadProps {
  onSubmit: (property: PreparedPropertyData) => void;
  lang?: Lang;
}

export default function PhotoUpload({ onSubmit, lang = 'es' }: PhotoUploadProps) {
  const tr = translations[lang].upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function pickFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function errorMessage(err: unknown): string {
    if (err instanceof UploadError) {
      if (err.code === 'type') return tr.errorType;
      if (err.code === 'size') return tr.errorTooLarge;
      return tr.errorDecode;
    }
    return tr.errorDecode;
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const property = await prepareUploadedPhoto(file, label);
      onSubmit(property);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card glow padding="lg" className="w-full max-w-2xl mx-auto">
      {/* Heading */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1a6bff]/10 border border-[#1a6bff]/20 flex items-center justify-center mb-4">
          <UploadIcon />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{tr.heading}</h2>
        <p className="text-gray-400 text-sm max-w-md">{tr.description}</p>
      </div>

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center text-center',
          'rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          'min-h-[200px] p-6 overflow-hidden',
          dragOver
            ? 'border-[#1a6bff]/70 bg-[#1a6bff]/5'
            : 'border-white/15 hover:border-white/30 bg-[#1a1a1a]',
        ].join(' ')}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" className="max-h-[260px] w-auto rounded-lg" />
        ) : (
          <>
            <UploadIcon />
            <p className="text-sm font-semibold text-white mt-3">{tr.dropTitle}</p>
            <p className="text-xs text-gray-600 mt-1">{tr.dropHint}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {tr.changeImage}
        </button>
      )}

      {/* Optional label */}
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={tr.labelPlaceholder}
        className="w-full mt-4 px-4 py-3 rounded-xl text-white text-sm bg-[#1a1a1a] border border-white/10 placeholder:text-gray-600 outline-none focus:border-[#1a6bff]/60"
      />

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <Button
        type="button"
        size="lg"
        fullWidth
        className="mt-4"
        disabled={!file || busy}
        loading={busy}
        onClick={handleSubmit}
      >
        {tr.submit}
      </Button>
    </Card>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
      viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd "/Users/jonathanley/prueba 001/cam-advisor" && npx tsc --noEmit && npm run lint`
Expected: no errors. (The `<img>` eslint rule is suppressed inline; the component is not yet mounted anywhere, so no runtime check here.)

- [ ] **Step 3: Commit**

```bash
cd "/Users/jonathanley/prueba 001/cam-advisor"
git add components/PhotoUpload.tsx
git commit -m "feat(advisor): add PhotoUpload card component"
```

---

### Task 4: Wire the tab selector into the start screen + dogfood (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx` (add import, `inputMode` state, `handlePhotoSubmit`, replace the input-step render)

**Interfaces:**
- Consumes: `PhotoUpload` (Task 3), `PreparedPropertyData` (already imported in `page.tsx`), `translations[lang].upload` (Task 1).

- [ ] **Step 1: Import the PhotoUpload component**

In `app/page.tsx`, add to the imports (after the `AddressInput` import, line 6):

```tsx
import PhotoUpload from '@/components/PhotoUpload';
```

- [ ] **Step 2: Add the `inputMode` state**

In `app/page.tsx`, after the `step` state (line 19), add:

```tsx
  const [inputMode, setInputMode] = useState<'address' | 'upload'>('address');
```

- [ ] **Step 3: Add the photo submit handler**

In `app/page.tsx`, right after `handleAddressSubmit` (after its closing brace at line 76), add:

```tsx
  function handlePhotoSubmit(uploaded: PreparedPropertyData) {
    setAddress(uploaded.address);
    setError(null);
    setProperty(uploaded);
    setDebugInfo(null);
    setStep('editor');
  }
```

- [ ] **Step 4: Replace the input-step render with the tabbed version**

In `app/page.tsx`, replace this block (currently lines 168-170):

```tsx
          {step === 'input' && (
            <AddressInput onSubmit={handleAddressSubmit} lang={lang} />
          )}
```

with:

```tsx
          {step === 'input' && (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
              <div className="flex justify-center">
                <div className="inline-flex rounded-full border border-white/10 overflow-hidden text-xs font-bold">
                  <button
                    onClick={() => setInputMode('address')}
                    className={`px-4 py-2 transition-colors ${inputMode === 'address' ? 'bg-[#1a6bff]/20 text-[#1a6bff]' : 'text-gray-500 hover:text-white'}`}
                  >
                    {tr.upload.tabAddress}
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`px-4 py-2 transition-colors ${inputMode === 'upload' ? 'bg-[#1a6bff]/20 text-[#1a6bff]' : 'text-gray-500 hover:text-white'}`}
                  >
                    {tr.upload.tabUpload}
                  </button>
                </div>
              </div>
              {inputMode === 'address' ? (
                <AddressInput onSubmit={handleAddressSubmit} lang={lang} />
              ) : (
                <PhotoUpload onSubmit={handlePhotoSubmit} lang={lang} />
              )}
            </div>
          )}
```

- [ ] **Step 5: Typecheck, lint, and production build**

Run: `cd "/Users/jonathanley/prueba 001/cam-advisor" && npx tsc --noEmit && npm run lint && npm run build`
Expected: all succeed.

- [ ] **Step 6: Dogfood the full flow in a browser**

Start the dev server: `cd "/Users/jonathanley/prueba 001/cam-advisor" && npm run dev` (serves at `http://localhost:3001/tvigiloadvisor`).

Using the `browse` skill (or a manual browser), verify:
1. The start screen shows two tabs: **Buscar dirección** | **Subir foto**, defaulting to "Buscar dirección" with the existing address card.
2. Click **Subir foto** → the upload card appears.
3. Upload a test aerial JPG/PNG (a screenshot of Google Maps satellite view works). The editor opens with the photo as the background, full image visible (not cropped).
4. The top-left shows the title; the lat/lng line is **absent**; the first toggle reads **Foto** (not "Satélite").
5. Add a camera — the FOV cone is a sensible size relative to the image.
6. (If `OPENAI_API_KEY` is set) Click **Plan** → the image is stylized via OpenAI.
7. Type a name in the optional field before opening the editor; download the PNG → filename is `plan-camaras-<name>.png`. With an empty field it is `plan-camaras-foto.png`.
8. Switch back to **Buscar dirección**, search a real address → the original flow still works end-to-end (lat/lng line present, toggle reads "Satelital").
9. Error cases: try a non-image file (e.g. a `.txt` renamed, or cancel) and a >15 MB image → friendly errors appear and the editor does not open.

- [ ] **Step 7: Commit**

```bash
cd "/Users/jonathanley/prueba 001/cam-advisor"
git add app/page.tsx
git commit -m "feat(advisor): add Subir foto tab to the start screen"
```

---

## Self-Review

**Spec coverage:**
- Tab selector on start screen → Task 4. ✓
- Upload card + optional label → Task 3. ✓
- Client-side validate/resize (full image, longest side ≤ 640) → Task 2. ✓
- Build `PreparedPropertyData` with `coordinates` omitted, `transformProvider: 'upload'` → Task 2 (`buildUploadedProperty`), enabled by Task 1 type change. ✓
- Editor toggle "Foto" + hidden coordinates → Task 1. ✓
- Reuse `/api/transform-openai` for "Plan" → unchanged; verified in Task 4 dogfood. ✓
- Download filename from label / default `foto` → `buildUploadedProperty` sets `address`, editor's `addressToFilename(property.address)` already produces the filename; verified in Task 4. ✓
- ES/EN strings → Task 1. ✓
- Error handling (type/size/decode incl. HEIC) → Task 2 (`UploadError`) + Task 3 (`errorMessage`). ✓
- Address flow untouched → no edits to `AddressInput`/`/api/prepare`; regression check in Task 4 step 6.9. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. ✓

**Type consistency:** `prepareUploadedPhoto(file, label)` / `buildUploadedProperty(label, dataUrl, width, height)` / `computeTargetDims(srcW, srcH, max)` / `UploadError.code` are used identically across Tasks 2–3. `transformProvider === 'upload'` matches the value set in `buildUploadedProperty` and read in the editor (Task 1). `translations[lang].upload.*` keys defined in Task 1 match those consumed in Tasks 3–4. ✓
