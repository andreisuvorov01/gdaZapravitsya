#!/usr/bin/env node
// Скачивает self-host копию шрифтов и спрайта Protomaps
// (protomaps.github.io/basemaps-assets) в public/map-assets/ — чтобы карта
// не зависела от внешнего хоста, который может быть недоступен без VPN
// (см. docs/TILES.md, PM_GLYPHS/PM_SPRITE_LIGHT в components/MapLibreMapView.tsx).
// Суммарно ~11 МБ (4 шрифтовых семейства + светлый спрайт v4) — коммитится в git,
// в отличие от tiles/*.pmtiles, которые слишком объёмны.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_TREE_URL =
  "https://api.github.com/repos/protomaps/basemaps-assets/git/trees/main?recursive=1";
const RAW_BASE = "https://protomaps.github.io/basemaps-assets/";
const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "map-assets"
);

async function main() {
  const res = await fetch(REPO_TREE_URL);
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);
  const { tree } = await res.json();

  // Все шрифты (все fontstack'и и unicode-диапазоны — используются динамически
  // по script свойству лейбла, см. protomaps-themes-base) + только светлый
  // спрайт v4 (единственный, который использует приложение — PM_SPRITE_LIGHT).
  const wanted = tree.filter(
    (item) =>
      item.type === "blob" &&
      (item.path.startsWith("fonts/") ||
        /^sprites\/v4\/light(@2x)?\.(json|png)$/.test(item.path))
  );

  const totalMB = wanted.reduce((s, i) => s + (i.size || 0), 0) / 1024 / 1024;
  console.log(`Скачиваю ${wanted.length} файлов (~${totalMB.toFixed(1)} МБ)...`);

  let done = 0;
  let failed = 0;
  for (const item of wanted) {
    const url = RAW_BASE + item.path.split("/").map(encodeURIComponent).join("/");
    const dest = path.join(OUT_DIR, item.path);
    await mkdir(path.dirname(dest), { recursive: true });
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      await writeFile(dest, Buffer.from(await r.arrayBuffer()));
      done++;
    } catch (err) {
      failed++;
      console.error(`  ! ${item.path} -> ${err instanceof Error ? err.message : err}`);
    }
    if (done % 100 === 0) console.log(`  ${done}/${wanted.length}`);
  }
  console.log(`Готово: ${done}/${wanted.length} (ошибок: ${failed}) -> ${OUT_DIR}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
