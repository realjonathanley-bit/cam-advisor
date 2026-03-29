/**
 * Calibration v2 — test the refined prompt with multiple model paths.
 *
 * Path A: gpt-4o-mini via Responses API (sees the satellite image)
 * Path B: gpt-image-1 via images.generate (text-only, no image input)
 *
 * Usage:
 *   node --env-file=.env.local scripts/calibrate-v2.mjs
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const satellitePath = path.join(__dirname, "calibration-satellite.jpg");
const satBase64 = fs.readFileSync(satellitePath).toString("base64");
const satDataUrl = `data:image/jpeg;base64,${satBase64}`;

const outDir = path.join(__dirname, "calibration-output");
fs.mkdirSync(outDir, { recursive: true });

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

// ─── Path A: gpt-4o-mini with image input ─────────────────────────────────────

async function tryResponsesAPI(modelName, tag) {
  console.log(`\n── ${tag}: ${modelName} + Responses API (image input) ──`);
  const t0 = Date.now();
  try {
    const response = await openai.responses.create({
      model: modelName,
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
      const out = path.join(outDir, `${tag}.png`);
      fs.writeFileSync(out, Buffer.from(imgCall.result, "base64"));
      console.log(`  ✓ ${out} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      return true;
    }

    // Check for text response
    const texts = response.output
      .filter(o => o.type === "message")
      .flatMap(o => o.content?.filter(c => c.type === "output_text").map(c => c.text) ?? []);
    if (texts.length) console.log(`  Text response: ${texts.join(" ").slice(0, 150)}`);
    else console.log(`  ✗ No image in output`);
  } catch (err) {
    console.log(`  ✗ ${err.message.slice(0, 150)}`);
  }
  return false;
}

// ─── Path B: gpt-image-1 text-only ────────────────────────────────────────────

async function tryImageGenerate() {
  console.log(`\n── gpt-image-1 text-only (no satellite input) ──`);
  const t0 = Date.now();
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: PROMPT + "\n\n[Note: the property is a single-story residential home with an L-shaped or rectangular roof, a driveway on one side leading to a garage, a backyard, and a roughly rectangular lot. Located in a suburban neighborhood in Cape Coral, Florida.]",
      n: 1,
      size: "1024x1024",
    });

    const b64 = response.data[0]?.b64_json;
    if (b64) {
      const out = path.join(outDir, `gpt-image-1-textonly.png`);
      fs.writeFileSync(out, Buffer.from(b64, "base64"));
      console.log(`  ✓ ${out} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      return true;
    }
    console.log(`  ✗ No image returned`);
  } catch (err) {
    console.log(`  ✗ ${err.message.slice(0, 150)}`);
  }
  return false;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log("Satellite:", satellitePath);

// Try models that might work with Responses API
await tryResponsesAPI("gpt-4o-mini", "gpt4o-mini-vision");
await tryResponsesAPI("gpt-4.1-mini", "gpt41-mini-vision");
await tryResponsesAPI("gpt-4.1-nano", "gpt41-nano-vision");

// Always run text-only as baseline
await tryImageGenerate();

console.log(`\n✅ Results in: ${outDir}/`);
fs.readdirSync(outDir).sort().forEach(f => console.log(`  ${f}`));
