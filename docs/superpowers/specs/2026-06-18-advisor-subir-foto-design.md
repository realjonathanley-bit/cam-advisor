# Diseño: Botón "Subir foto" en Tvigilo Advisor

**Fecha:** 2026-06-18
**Repo:** `cam-advisor` (se sirve en Tvigilo bajo `/tvigiloadvisor`)
**Estado:** Aprobado, listo para plan de implementación

## Objetivo

Permitir que el usuario suba una imagen aérea/satelital propia (screenshot de
Google Earth, foto de dron, mapa) y entre al mismo editor de planeación de
cámaras que hoy se abre al buscar una dirección. El botón de subir foto debe
hacer "lo mismo que haría buscar una dirección": colocar cámaras sobre la imagen,
alternar entre la foto y la versión estilizada con IA, y descargar el plano en PNG.

## Hallazgo clave (cómo funciona el flujo actual de verdad)

Al revisar el editor a fondo, el procesamiento real es más simple de lo que
sugieren los nombres:

- En `components/editor/PlanningEditor.tsx:96-99`, la imagen que se muestra es:
  - Vista **"Satélite"** (default) → `property.originalImageDataUrl` (la imagen
    **cruda**, sin filtro).
  - Vista **"Plan"** → resultado de OpenAI, que se pide **on-demand** al endpoint
    `/api/transform-openai` (`PlanningEditor.tsx:124-147`).
- El campo `transformedImageDataUrl` (filtro Sharp que calcula `/api/prepare`)
  **no se usa para mostrar** en el editor. Es efectivamente código muerto a
  nivel visual.

Consecuencia: para igualar "lo de hoy" basta con que la foto subida sea el
`originalImageDataUrl`. El toggle "Plan" con IA seguirá funcionando porque
`/api/transform-openai` (`app/api/transform-openai/route.ts`) acepta cualquier
`satelliteDataUrl` (recorta el centro y lo manda a gpt-4o, no asume que venga de
Google). **No hace falta endpoint nuevo de servidor.**

## Enfoque elegido: preparación en el cliente (sin endpoint nuevo)

La foto se procesa en el navegador y se construye el objeto `PreparedPropertyData`
localmente; luego se entra al editor con el mismo `setProperty()` / `setStep('editor')`
que ya existe en `app/page.tsx`.

**Por qué este enfoque y no un endpoint de servidor:**
- El editor ya muestra la imagen cruda y delega el estilizado al endpoint OpenAI
  existente. No se necesita Sharp en el servidor para esta función.
- `cam-advisor` corre una versión no estándar de Next.js (ver `AGENTS.md`:
  "This is NOT the Next.js you know"). Evitar escribir una ruta API nueva con
  manejo de archivos reduce el riesgo.
- El único paso costoso (OpenAI) ya tiene rate-limiting en su endpoint
  (`transform-openai/route.ts:17`). La preparación en cliente no expone llaves ni
  hace llamadas costosas.

## Cambios concretos

### 1. Nuevo componente `components/PhotoUpload.tsx`
- Card con el mismo estilo visual que `AddressInput` (`components/ui/Card`, paleta
  `#1a6bff`, fondo oscuro).
- Zona de subida (drag & drop + click para elegir archivo) con `<input type="file"
  accept="image/*">`.
- Campo de texto **opcional**: "Dirección o nombre del cliente".
- Botón de continuar (deshabilitado hasta que haya imagen válida).
- Prop `onSubmit(property: PreparedPropertyData)` que el padre usa para entrar al
  editor.

### 2. Selector de modo en la pantalla de inicio `app/page.tsx`
- Sobre el recuadro actual, un selector de dos pestañas: **"Buscar dirección"** |
  **"Subir foto"**. Estado local `inputMode: 'address' | 'upload'`, default
  `'address'`.
- `inputMode === 'address'` → render `<AddressInput …>` (sin cambios).
- `inputMode === 'upload'` → render `<PhotoUpload onSubmit={handlePhotoSubmit} …>`.
- Nuevo handler `handlePhotoSubmit(property)` que hace `setProperty(property)` y
  `setStep('editor')` (no pasa por estado `loading` porque la preparación en
  cliente es instantánea).

### 3. Utilidad de preparación de imagen (cliente)
Función nueva (p.ej. en `utils/imageUpload.ts`):
- Lee el `File` como data URL.
- Lo carga en un `Image()` para obtener dimensiones reales.
- Si la imagen no decodifica (p.ej. HEIC no soportado por el navegador), rechaza
  con error legible.
- Redibuja en un canvas offscreen **respetando la proporción completa** (sin
  recortar), escalando para que el lado más largo no supere `MAX_UPLOAD_DIM = 640`
  px (misma escala que el satélite, para que los conos de cámara por defecto
  —definidos en píxeles en `lib/constants.ts`— salgan proporcionales). Imágenes
  más pequeñas que 640 px se dejan en su tamaño original.
- Devuelve `{ dataUrl, width, height }`.
- Construye:
  ```ts
  const property: PreparedPropertyData = {
    address: label?.trim() || 'foto',
    coordinates: undefined,            // ver cambio en types
    originalImageDataUrl: dataUrl,
    transformedImageDataUrl: dataUrl,  // mismo (no se usa para mostrar)
    imageWidth: width,
    imageHeight: height,
    transformProvider: 'upload',
  };
  ```

### 4. Tipos `types/index.ts`
- En `PreparedPropertyData`, hacer `coordinates` **opcional**:
  `coordinates?: Coordinates`. (Hoy es obligatorio; el flujo de dirección lo
  seguirá llenando.)

### 5. Editor `components/editor/PlanningEditor.tsx` (dos retoques)
- **Ocultar coordenadas cuando no existan:** la línea de
  `PlanningEditor.tsx:359-362` que imprime `coordinates.lat/lng` debe renderizarse
  solo si `property.coordinates` está definido. Evita "0.00000, 0.00000".
- **Etiqueta del toggle:** agregar una cadena de traducción nueva `tr.photo`
  ("Foto"/"Photo"). El editor elige la etiqueta de la primera pestaña con
  `property.transformProvider === 'upload' ? tr.photo : tr.satellite`. La pestaña
  "Plan" no cambia.

### 6. Traducciones `lib/translations.ts`
- Agregar cadenas ES/EN para: título/descr del modo subir foto, las dos pestañas
  del selector, placeholder del campo opcional, errores de validación, y el rótulo
  "Foto".

## Flujo de datos

```
Pantalla inicio (modo "Subir foto")
        ↓ usuario elige/arrastra imagen + (opcional) escribe nombre
PhotoUpload.tsx → utils/imageUpload.ts
        ↓ valida + redimensiona (proporción completa, lado largo ≤ MAX_UPLOAD_DIM)
construye PreparedPropertyData (coordinates: undefined, provider: 'upload')
        ↓ onSubmit(property)
app/page.tsx handlePhotoSubmit → setProperty + setStep('editor')
        ↓
PlanningEditor (sin cambios de fondo):
  ├─ vista "Foto"  → muestra originalImageDataUrl (la foto subida)
  ├─ vista "Plan"  → POST /api/transform-openai { satelliteDataUrl: foto } → IA
  ├─ coloca cámaras / timbres, gira, ajusta alcance
  └─ descarga → plan-camaras-{label|foto}.png
```

## Validaciones y manejo de errores

- **Tipo:** aceptar solo `image/*`. Si el navegador no puede decodificar la imagen
  (HEIC de iPhone es el caso típico), mostrar error claro pidiendo JPG o PNG.
- **Tamaño de archivo:** límite máximo (p.ej. 15 MB) con mensaje claro.
- **Sin imagen:** botón de continuar deshabilitado.
- El campo de nombre es opcional; vacío → archivo `plan-camaras-foto.png`.

## Decisiones tomadas (con el usuario)

| Tema | Decisión |
|------|----------|
| Tipo de foto | Vista aérea / satelital (la sube el usuario) |
| Estilizado | Reusar el toggle existente Foto/Plan (IA on-demand) |
| Etiqueta/nombre | Campo opcional; alimenta el nombre del PNG |
| Encuadre | Mostrar la foto completa (sin recortar) |
| Arquitectura | Preparación en cliente, sin endpoint nuevo |

## Lo que NO cambia

- El editor de cámaras (colocar, mover, girar, FOV, descarga).
- El flujo de buscar dirección (`AddressInput`, `/api/prepare`, geocoding,
  satélite).
- El servidor (`/api/transform-openai` se reutiliza tal cual, sin tocarlo).

## Testing

- Subir JPG/PNG aéreo de proporciones variadas (cuadrada, horizontal, vertical) y
  verificar que entra al editor sin recortes y los conos por defecto se ven
  proporcionales.
- Verificar que el toggle "Plan" estiliza la foto subida vía OpenAI.
- Verificar descarga con y sin nombre.
- Verificar que la línea de coordenadas no aparece en planos de foto subida.
- Verificar que el flujo de buscar dirección sigue intacto (no regresiones).
- Caso de error: archivo no-imagen / HEIC no decodificable / archivo enorme.

## Riesgos y limitaciones conocidas

- **HEIC de iPhone:** algunos navegadores no decodifican HEIC en `<img>`. Se cubre
  con un error legible que pide JPG/PNG (no se hace conversión en esta versión).
- **Vista "Plan" en fotos no cuadradas:** el resultado de OpenAI viene cuadrado
  (640×640, ver `services/transformImage.ts:126`) y se dibuja en un lienzo con la
  proporción de la foto, por lo que puede verse algo estirado en la vista "Plan".
  La vista "Foto" (la principal) sale perfecta. Aceptable para esta versión.
- **Next.js no estándar:** no se escribe ruta API nueva, lo que reduce este riesgo;
  los cambios son de cliente (componentes React) y tipos.
