import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en .env.local");
  }

  console.log("Generando imagen con gpt-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "Generate a simple black background architectural diagram with thin white lines, top-down style, minimal and clean.",
    n: 1,
    size: "1024x1024",
  });

  const imageUrl = response.data[0]?.url;
  const imageB64 = response.data[0]?.b64_json;

  if (imageB64) {
    fs.writeFileSync("openai-test-output.png", Buffer.from(imageB64, "base64"));
    console.log("Imagen guardada como openai-test-output.png (base64)");
  } else if (imageUrl) {
    const res = await fetch(imageUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("openai-test-output.png", buf);
    console.log("Imagen guardada como openai-test-output.png (url)");
  } else {
    throw new Error("OpenAI no devolvió imagen.");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
