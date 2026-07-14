// Скачивание официальных логотипов сетей АЗС.
// 1) Надёжный путь: Wikidata P154 (логотип) по Q-ID компании → имя файла на Commons.
// 2) Фоллбэк: перебор кандидатов-имён через Special:FilePath.
// Валидируем, что это настоящий SVG, и сохраняем в public/brands/<slug>.svg.
//
// Запуск: node scripts/fetch-brand-logos.mjs
//
// Внимание: логотипы — товарные знаки правообладателей. Использование допустимо
// для номинативной идентификации сети; ответственность за права — на владельце проекта.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "brands");
const UA = "benz-atlas-logo-fetch/1.0 (educational; +https://example.local)";

// slug → параметры поиска:
//   wikidata — Q-ID компании (берём P154 как кандидата),
//   search   — поисковые фразы на Commons (приоритет эмблемам/символам),
//   tokens   — слова, которые должны встречаться в имени файла (отсев мусора),
//   names    — запасные явные имена файлов.
const SOURCES = {
  lukoil: {
    wikidata: "Q329347",
    search: ["Lukoil emblem", "Lukoil symbol", "Lukoil logo"],
    tokens: ["lukoil", "лукойл"],
    names: ["Lukoil logo.svg", "LUKOIL Logo.svg"],
  },
  rosneft: {
    wikidata: "Q176089",
    search: ["Rosneft emblem", "Rosneft symbol", "Rosneft logo"],
    tokens: ["rosneft", "роснефть"],
    names: ["Rosneft logo.svg"],
  },
  gazpromneft: {
    wikidata: "Q1924338",
    search: ["Gazprom Neft emblem", "Gazprom Neft symbol", "Gazprom Neft logo", "Gazpromneft logo"],
    tokens: ["gazprom neft", "gazpromneft", "газпром"],
    names: ["Gazprom Neft logo.svg", "Gazpromneft logo.svg"],
  },
  gazprom: {
    wikidata: "Q102673",
    search: ["Gazprom emblem", "Gazprom symbol", "Gazprom logo"],
    tokens: ["gazprom", "газпром"],
    names: ["Gazprom logo.svg"],
  },
  tatneft: {
    wikidata: "Q1616858",
    search: ["Tatneft emblem", "Tatneft symbol", "Tatneft logo"],
    tokens: ["tatneft", "татнефть"],
    names: ["Tatneft.svg", "Tatneft logo.svg"],
  },
  shell: {
    wikidata: "Q110628092",
    search: ["Shell pecten", "Shell emblem", "Shell oil logo", "Shell logo"],
    tokens: ["shell", "pecten"],
    names: ["Shell logo.svg", "Pecten of Shell.svg"],
  },
  bp: {
    wikidata: "Q152057",
    search: ["BP Helios", "BP emblem", "BP logo"],
    tokens: ["bp", "helios"],
    names: ["BP Helios logo.svg", "BP logo.svg"],
  },
  teboil: {
    wikidata: "Q7692079",
    search: ["Teboil emblem", "Teboil symbol", "Teboil logo"],
    tokens: ["teboil"],
    names: ["Teboil logo.svg"],
  },
  opti: {
    wikidata: null,
    search: ["OPTI fuel logo", "Opti AZS logo"],
    tokens: ["opti", "опти"],
    names: ["Opti logo.svg", "OPTI logo.svg"],
  },
};

function filePathUrl(name) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`;
}

// Поиск файлов на Wikimedia Commons (только SVG). Возвращает имена файлов без префикса "File:".
async function commonsSearchSvg(term, limit = 8) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search" +
    `&srnamespace=6&srlimit=${limit}&srsearch=` +
    encodeURIComponent(`${term} filetype:svg`);
  try {
    const res = await fetch(api, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return [];
    const json = await res.json();
    const hits = json.query?.search ?? [];
    return hits
      .map((h) => String(h.title || "").replace(/^File:/i, ""))
      .filter((n) => /\.svg$/i.test(n));
  } catch {
    return [];
  }
}

// Соотношение сторон корневого <svg>: max/min (>=1). 1 = идеальный квадрат.
function svgWideness(svg) {
  const num = "[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?";
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) return null;
  const tag = open[0];
  let w = 0,
    h = 0;
  const vb = tag.match(
    new RegExp(`viewBox\\s*=\\s*["']\\s*${num}[ ,]+${num}[ ,]+(${num})[ ,]+(${num})\\s*["']`)
  );
  if (vb) {
    w = parseFloat(vb[1]);
    h = parseFloat(vb[2]);
  } else {
    const wm = tag.match(new RegExp(`\\bwidth\\s*=\\s*["'](${num})`));
    const hm = tag.match(new RegExp(`\\bheight\\s*=\\s*["'](${num})`));
    if (wm && hm) {
      w = parseFloat(wm[1]);
      h = parseFloat(hm[1]);
    }
  }
  if (!(w > 0 && h > 0)) return null;
  return Math.max(w, h) / Math.min(w, h);
}

async function fetchSvg(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/svg+xml,*/*" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!/svg/i.test(ct) && !text.includes("<svg")) return null;
  if (!text.includes("<svg") || text.length < 200) return null;
  return text;
}

// Приводит SVG к квадрату 1:1: центрирует существующее содержимое в квадратный
// viewBox (по большей стороне), убирает фиксированные width/height, чтобы лого
// масштабировался по контейнеру. Возвращает изменённый текст или исходный.
function squarifySvg(svg) {
  const num = "[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?";

  // Работаем только с КОРНЕВЫМ открывающим тегом <svg ...> — размеры читаем
  // тоже из него (иначе можно случайно поймать viewBox вложенного <marker>).
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) return svg;
  let tag = open[0];

  let minx = 0,
    miny = 0,
    w = 0,
    h = 0;

  const vb = tag.match(
    new RegExp(`viewBox\\s*=\\s*["']\\s*(${num})[ ,]+(${num})[ ,]+(${num})[ ,]+(${num})\\s*["']`)
  );
  if (vb) {
    minx = parseFloat(vb[1]);
    miny = parseFloat(vb[2]);
    w = parseFloat(vb[3]);
    h = parseFloat(vb[4]);
  } else {
    const wm = tag.match(new RegExp(`\\bwidth\\s*=\\s*["'](${num})`));
    const hm = tag.match(new RegExp(`\\bheight\\s*=\\s*["'](${num})`));
    if (wm && hm) {
      w = parseFloat(wm[1]);
      h = parseFloat(hm[1]);
    }
  }
  if (!(w > 0 && h > 0)) return svg; // не смогли определить — оставляем как есть

  const s = Math.max(w, h);
  const nx = minx - (s - w) / 2;
  const ny = miny - (s - h) / 2;
  const square = `${+nx.toFixed(3)} ${+ny.toFixed(3)} ${+s.toFixed(3)} ${+s.toFixed(3)}`;

  // viewBox
  if (/viewBox\s*=/.test(tag)) {
    tag = tag.replace(/viewBox\s*=\s*["'][^"']*["']/, `viewBox="${square}"`);
  } else {
    tag = tag.replace(/<svg\b/, `<svg viewBox="${square}"`);
  }
  // убираем фиксированные размеры
  tag = tag.replace(/\s(width|height)\s*=\s*["'][^"']*["']/g, "");
  // центрируем и вписываем
  if (/preserveAspectRatio\s*=/.test(tag)) {
    tag = tag.replace(
      /preserveAspectRatio\s*=\s*["'][^"']*["']/,
      `preserveAspectRatio="xMidYMid meet"`
    );
  } else {
    tag = tag.replace(/<svg\b/, `<svg preserveAspectRatio="xMidYMid meet"`);
  }

  return svg.replace(open[0], tag);
}

async function squarifyAll() {
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".svg"));
  const done = [];
  for (const f of files) {
    const p = join(OUT_DIR, f);
    const svg = await readFile(p, "utf8");
    const out = squarifySvg(svg);
    if (out !== svg) {
      await writeFile(p, out, "utf8");
      done.push(f);
    }
  }
  return done;
}

// Достаём имя файла логотипа (P154) из Wikidata
async function logoNameFromWikidata(qid) {
  if (!qid) return null;
  try {
    const res = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
      { headers: { "User-Agent": UA }, redirect: "follow" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const ent = json.entities?.[qid];
    const claim = ent?.claims?.P154?.[0];
    const name = claim?.mainsnak?.datavalue?.value;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const ok = [];
  const fail = [];

  // Источник истины — Wikidata P154 (кураторский официальный логотип).
  // Поиск Commons по «emblem/symbol» НЕ используем: он притягивает мусор
  // (логотип Zsh по слову "shell", знаки безопасности из СТО Газпром и т.п.),
  // а проверить содержимое картинки автоматически нельзя.
  for (const [slug, src] of Object.entries(SOURCES)) {
    let saved = false;

    const wdName = await logoNameFromWikidata(src.wikidata);
    if (wdName && /\.svg$/i.test(wdName)) {
      const svg = await fetchSvg(filePathUrl(wdName)).catch(() => null);
      if (svg) {
        await writeFile(join(OUT_DIR, `${slug}.svg`), svg, "utf8");
        ok.push(`${slug}  ←  [wikidata] ${wdName}  (${(svg.length / 1024).toFixed(1)} KB)`);
        saved = true;
      }
    }

    if (!saved) {
      for (const name of src.names ?? []) {
        const svg = await fetchSvg(filePathUrl(name)).catch(() => null);
        if (svg) {
          await writeFile(join(OUT_DIR, `${slug}.svg`), svg, "utf8");
          ok.push(`${slug}  ←  ${name}  (${(svg.length / 1024).toFixed(1)} KB)`);
          saved = true;
          break;
        }
      }
    }

    if (!saved) fail.push(slug);
  }

  console.log("\n=== Скачано (официальный логотип) ===");
  ok.forEach((l) => console.log("  ✓ " + l));
  if (fail.length) {
    console.log("\n=== Не найдено (остаётся фоллбэк-бейдж) ===");
    console.log("  ✗ " + fail.join(", "));
  }

  const squared = await squarifyAll();
  console.log("\n=== Приведено к квадрату 1:1 ===");
  console.log("  " + (squared.length ? squared.join(", ") : "нет изменений"));
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
