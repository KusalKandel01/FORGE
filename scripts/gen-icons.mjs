import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const svgPath = path.resolve("src/app/icon.svg");
const svgBuffer = readFileSync(svgPath);
const outDir = path.resolve("public/icons");
mkdirSync(outDir, { recursive: true });

const sizes = [192, 512, 180];

for (const size of sizes) {
  await sharp(svgBuffer, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  console.log(`wrote public/icons/icon-${size}.png`);
}
