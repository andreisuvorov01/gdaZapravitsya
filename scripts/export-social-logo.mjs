// Экспорт логотипов для соцсетей: скриншот реальных React-компонентов
// со страницы /brand-export (пиксель-в-пиксель как на сайте).
//
// Требуется: npm run dev
// Запуск: node scripts/export-social-logo.mjs

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOCIAL = join(ROOT, "public", "social");
const ICONS = join(ROOT, "public", "icons");
const EXPORT_URL = "http://localhost:3000/brand-export";

async function waitServer(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(EXPORT_URL);
      if (r.ok) return;
    } catch {
      /* dev ещё не поднялся */
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error("Сначала запустите npm run dev, затем: node scripts/export-social-logo.mjs");
}

async function loadPlaywright() {
  return import("playwright");
}

async function main() {
  await mkdir(SOCIAL, { recursive: true });
  await mkdir(ICONS, { recursive: true });

  console.log("Жду dev-сервер…");
  await waitServer();

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(EXPORT_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const shots = [
    ["#export-avatar", "avatar-1024.png"],
    ["#export-post", "post-square-1080.png"],
    ["#export-banner", "banner-vk-1590x400.png"],
    ["#export-tg-cover", "cover-tg-1280x720.png"],
  ];

  for (const [selector, name] of shots) {
    const path = join(SOCIAL, name);
    await page.locator(selector).screenshot({ path, type: "png" });
    console.log(`✓ public/social/${name}`);
  }

  await browser.close();

  const avatarPath = join(SOCIAL, "avatar-1024.png");
  for (const [name, size] of [
    ["avatar-512.png", 512],
    ["avatar-192.png", 192],
  ]) {
    await sharp(avatarPath).resize(size, size).png({ compressionLevel: 9 }).toFile(join(SOCIAL, name));
    console.log(`✓ public/social/${name}`);
  }

  await sharp(join(SOCIAL, "banner-vk-1590x400.png"))
    .resize(1200, 628, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(join(SOCIAL, "banner-vk-1200x628.png"));
  console.log("✓ public/social/banner-vk-1200x628.png");

  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
  ]) {
    await sharp(avatarPath).resize(size, size).png({ compressionLevel: 9 }).toFile(join(ICONS, name));
    console.log(`✓ public/icons/${name}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
