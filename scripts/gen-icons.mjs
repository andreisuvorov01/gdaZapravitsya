// Генератор favicon и PWA-иконок из public/brand/mark.png (только для иконок сайта).
// Запуск: npm run icons
//
// Яндекс для выдачи рекомендует SVG или 120×120 px:
// https://yandex.ru/support/webmaster/ru/search-results/favicon

import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "public", "brand", "mark.png");
const OUT_DIR = join(ROOT, "public", "icons");
const APP_DIR = join(ROOT, "app");

if (!existsSync(SOURCE)) {
  console.error("Не найден public/brand/mark.png — положите исходник логотипа.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-120.png", size: 120 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function render(size, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.12) : 0;
  const inner = size - pad * 2;
  const resized = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  if (!maskable) return resized;

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 14, b: 18, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toBuffer();
}

for (const t of targets) {
  const buf = await render(t.size);
  writeFileSync(join(OUT_DIR, t.name), buf);
  console.log(`✓ public/icons/${t.name} (${t.size}×${t.size})`);
}

const maskable = await render(512, { maskable: true });
writeFileSync(join(OUT_DIR, "icon-maskable-512.png"), maskable);
console.log("✓ public/icons/icon-maskable-512.png (512×512, maskable)");

const fav120 = await render(120);
const fav32 = await render(32);

// Корневой favicon.ico — 120 px PNG (Яндекс принимает PNG по этому пути).
writeFileSync(join(ROOT, "public", "favicon.ico"), fav120);
console.log("✓ public/favicon.ico (120×120 PNG)");

// SVG с встроенным PNG — рекомендуемый формат Яндекса для чёткой иконки в выдаче.
const favSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="ГдеЗаправиться.рф">
  <image width="120" height="120" xlink:href="data:image/png;base64,${fav120.toString("base64")}"/>
</svg>
`;
writeFileSync(join(ROOT, "public", "favicon.svg"), favSvg);
writeFileSync(join(APP_DIR, "icon.svg"), favSvg);
console.log("✓ public/favicon.svg");
console.log("✓ app/icon.svg");

writeFileSync(join(APP_DIR, "icon.png"), fav120);
writeFileSync(join(APP_DIR, "apple-icon.png"), await render(180));
writeFileSync(join(OUT_DIR, "favicon-32.png"), fav32);

console.log("✓ app/icon.png (120×120)");
console.log("✓ app/apple-icon.png");
console.log("Готово.");
