/**
 * Calibration script — gpt-4o vision + image_generation
 *
 * Sends the REAL satellite image to GPT-4o which can SEE it,
 * then uses the image_generation tool to produce a diagram.
 *
 * Usage:
 *   node --env-file=.env.local scripts/calibrate-openai-prompts.mjs
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) {
  console.error("Falta OPENAI_API_KEY");
  process.exit(1);
}

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const satellitePath = path.join(__dirname, "calibration-satellite.jpg");

if (!fs.existsSync(satellitePath)) {
  console.error("Falta calibration-satellite.jpg");
  process.exit(1);
}

const satBase64 = fs.readFileSync(satellitePath).toString("base64");
const satDataUrl = `data:image/jpeg;base64,${satBase64}`;

const outDir = path.join(__dirname, "calibration-output");
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(satellitePath, path.join(outDir, "00-satellite-original.jpg"));

// ─── Prompt variants ──────────────────────────────────────────────────────────

const PROMPTS = [
  {
    id: "v1-strict-trace",
    text: `I am showing you a real satellite/aerial photograph of a residential property taken from directly above.

Generate a new image that is a FAITHFUL top-down site plan diagram of this EXACT property.

Trace the outlines you see: the roof shape, the driveway, walkways, lot edges, pool, patio, fences, and any other visible structures.

Style:
- Pure black background
- Thin clean white lines for all outlines
- No fill, no shading
- Exterior only — do NOT draw interior rooms, doors, or floor plan elements
- You are looking at a ROOF from above, not inside the house
- Same proportions and positions as the photo
- Professional security site-plan quality`,
  },
  {
    id: "v2-security-plan",
    text: `This satellite photo shows a real house and property from above. Convert it into a professional security camera site plan diagram.

You must:
1. Trace the exact roof outline as seen from above
2. Trace the driveway and any paved surfaces
3. Trace the lot/property boundary
4. Trace other outdoor structures (garage, pool, shed, fence)

Output rules:
- Black background, white outlines only
- Exterior footprints ONLY — no interior floor plan
- Match the real layout exactly — same positions, proportions, shapes
- No labels, no text, no artistic additions
- Think: surveyor's site plan, not architect's floor plan`,
  },
  {
    id: "v3-minimal",
    text: `See this aerial photo of a house. Draw what you see from above as a simple line diagram.

Only trace: roof outline, driveway, yard boundary, pool or patio if present.

Black background, white lines, nothing else. Do NOT draw rooms inside — you're above the roof. Keep the same layout as the photo.`,
  },
  {
    id: "v4-cad-faithful",
    text: `You are a CAD operator. This is an aerial photograph of a residential property.

Your job: produce an accurate exterior site plan that exactly reproduces the visible layout.

Draw the roof perimeter, driveway, garage entrance, walkways, property boundaries, and any outdoor features (pool, patio, fence, shed).

Rendering:
- Solid black background (#000000)
- White stroke lines (#FFFFFF), thin and precise
- No interior details — exterior footprints only
- No fills, no gradients, no colors
- FAITHFUL reproduction — same geometry, same scale, same positions
- This will be used for security camera placement planning`,
  },
];

// ─── Run ──────────────────────────────────────────────────────────────────────

async function runVariant(variant) {
  console.log(`\n── ${variant.id} ──`);
  console.log(`  ${variant.text.slice(0, 70)}...`);
  const t0 = Date.now();

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_image", image_url: satDataUrl },
            { type: "input_text", text: variant.text },
          ],
        },
      ],
      tools: [{ type: "image_generation", quality: "high" }],
    });

    // Find the generated image in the output
    const imgCall = response.output.find(
      (item) => item.type === "image_generation_call",
    );

    if (!imgCall?.result) {
      // Maybe the model responded with text instead of generating an image
      const textOutput = response.output
        .filter((item) => item.type === "message")
        .map((item) => item.content?.map(c => c.text).join(""))
        .join("\n");
      console.log(`  ✗ No image generated. Text response: ${textOutput.slice(0, 200)}`);
      return;
    }

    const outPath = path.join(outDir, `${variant.id}.png`);
    fs.writeFileSync(outPath, Buffer.from(imgCall.result, "base64"));
    console.log(`  ✓ ${outPath} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
  }
}

console.log("Satellite:", satellitePath);
console.log(`Running ${PROMPTS.length} variants via gpt-4o + image_generation...\n`);

for (const v of PROMPTS) {
  await runVariant(v);
}

console.log(`\n✅ Done. Results in: ${outDir}/`);
fs.readdirSync(outDir).sort().forEach(f => console.log(`  ${f}`));
