/**
 * Post-verification calibration — real satellite image as input.
 *
 * Path 1: gpt-4o via Responses API (vision + image_generation)
 * Path 2: gpt-image-1 via images.edit (image reference)
 * Path 3: gpt-image-1 via images.generate (text-only baseline)
 *
 * Each result saved with: original, output, prompt, API path.
 *
 * Usage:
 *   node --env-file=.env.local scripts/calibrate-verified.mjs
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const satellitePath = path.join(__dirname, "calibration-satellite.jpg");
const satBase64 = fs.readFileSync(satellitePath).toString("base64");
const satDataUrl = `data:image/jpeg;base64,${satBase64}`;

const outDir = path.join(__dirname, "calibration-verified");
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(satellitePath, path.join(outDir, "00-satellite-original.jpg"));

const PROMPT = `Transform this satellite image into a faithful top-down exterior property diagram.

Critical requirements:
- preserve the real exterior layout of the property
- preserve the real house footprint and orientation
- preserve the driveway location and shape
- preserve the visible lot boundaries as much as possible
- preserve the relationship between house, driveway, yard, and surrounding edges

Visual style:
- black background
- thin white clean lines
- minimal premium security-planning style
- simplified exterior geometry
- top-down site-plan aesthetic
- no textures, grass detail, shadows, or photo noise

Do NOT:
- create an interior floor plan
- invent rooms, doors, or interior walls
- redesign the building
- change the footprint
- add artistic architectural flourishes
- create a generic house drawing unrelated to the image

The output must look like a simplified exterior site plan derived from the real property, not a fictional blueprint.

Negative constraints:
- no interior floor plan
- no room layout
- no door swing symbols
- no indoor walls
- no fictional architecture
- no perspective view
- no sketchbook style
- no hand-drawn style
- no extra buildings
- no layout changes`;

function saveManifest(id, apiPath, prompt, elapsed) {
  const manifest = { id, apiPath, prompt, elapsed, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(outDir, `${id}-manifest.json`), JSON.stringify(manifest, null, 2));
}

// ─── Path 1: Responses API — gpt-4o with satellite image input ────────────────

async function path1_responsesAPI() {
  const id = "path1-responses-gpt4o";
  console.log(`\n═══ PATH 1: Responses API (gpt-4o + vision + image_generation) ═══`);
  const t0 = Date.now();
  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_image", image_url: satDataUrl },
            { type: "input_text", text: PROMPT },
          ],
        },
      ],
      tools: [{ type: "image_generation", quality: "high" }],
    });

    const imgCall = response.output.find(o => o.type === "image_generation_call");
    if (imgCall?.result) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.from(imgCall.result, "base64"));
      saveManifest(id, "responses.create(gpt-4o) + input_image + image_generation tool", PROMPT, elapsed + "s");
      console.log(`  ✓ Saved ${id}.png (${elapsed}s)`);
      return true;
    }

    const texts = response.output
      .filter(o => o.type === "message")
      .flatMap(o => o.content?.filter(c => c.type === "output_text").map(c => c.text) ?? []);
    console.log(`  ✗ No image. Text: ${texts.join(" ").slice(0, 200)}`);
  } catch (err) {
    console.log(`  ✗ ${err.message.slice(0, 200)}`);
  }
  saveManifest(id, "responses.create(gpt-4o) — FAILED", PROMPT, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  return false;
}

// ─── Path 2: Images API edit — gpt-image-1 with satellite as reference ────────

async function path2_imagesEdit() {
  const id = "path2-edit-gpt-image-1";
  console.log(`\n═══ PATH 2: Images API edit (gpt-image-1 + satellite reference) ═══`);
  const t0 = Date.now();
  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: fs.createReadStream(satellitePath),
      prompt: PROMPT,
      n: 1,
      size: "1024x1024",
    });

    const b64 = response.data[0]?.b64_json;
    const url = response.data[0]?.url;

    if (b64) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.from(b64, "base64"));
      saveManifest(id, "images.edit(gpt-image-1) + satellite image", PROMPT, elapsed + "s");
      console.log(`  ✓ Saved ${id}.png (${elapsed}s)`);
      return true;
    } else if (url) {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
      saveManifest(id, "images.edit(gpt-image-1) + satellite image (url)", PROMPT, elapsed + "s");
      console.log(`  ✓ Saved ${id}.png from URL (${elapsed}s)`);
      return true;
    }
    console.log(`  ✗ No image returned`);
  } catch (err) {
    console.log(`  ✗ ${err.message.slice(0, 200)}`);
  }
  saveManifest(id, "images.edit(gpt-image-1) — FAILED", PROMPT, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  return false;
}

// ─── Path 3: Images API generate — gpt-image-1 text-only baseline ─────────────

async function path3_textOnly() {
  const id = "path3-generate-textonly";
  console.log(`\n═══ PATH 3: Images API generate (gpt-image-1 text-only baseline) ═══`);
  const t0 = Date.now();
  try {
    const textPrompt = PROMPT + `\n\n[Property description: Single-story residential home in Cape Coral, Florida. Rectangular lot. House has an L-shaped or rectangular roof footprint. Driveway on one side leading to garage. Backyard with open grass. Street runs along the bottom of the property. Neighboring houses on both sides.]`;

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: textPrompt,
      n: 1,
      size: "1024x1024",
    });

    const b64 = response.data[0]?.b64_json;
    if (b64) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.from(b64, "base64"));
      saveManifest(id, "images.generate(gpt-image-1) text-only", textPrompt, elapsed + "s");
      console.log(`  ✓ Saved ${id}.png (${elapsed}s)`);
      return true;
    }
    console.log(`  ✗ No image returned`);
  } catch (err) {
    console.log(`  ✗ ${err.message.slice(0, 200)}`);
  }
  saveManifest(id, "images.generate(gpt-image-1) — FAILED", PROMPT, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  return false;
}

// ─── Run all paths ────────────────────────────────────────────────────────────

console.log("Satellite:", satellitePath);
console.log("Output:", outDir);
console.log("Running 3 calibration paths...");

const r1 = await path1_responsesAPI();
const r2 = await path2_imagesEdit();
const r3 = await path3_textOnly();

console.log(`\n════════════════════════════════════════════`);
console.log(`RESULTS:`);
console.log(`  Path 1 (Responses API + image input): ${r1 ? "✓ SUCCESS" : "✗ FAILED"}`);
console.log(`  Path 2 (Images edit + image input):   ${r2 ? "✓ SUCCESS" : "✗ FAILED"}`);
console.log(`  Path 3 (Text-only baseline):          ${r3 ? "✓ SUCCESS" : "✗ FAILED"}`);
console.log(`\nFiles in ${outDir}/:`);
fs.readdirSync(outDir).sort().forEach(f => console.log(`  ${f}`));
