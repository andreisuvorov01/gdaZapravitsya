import { copyFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "blog", "covers");

const SLUGS = [
  "net-benzina-na-zapravke", "limit-na-zapravku", "kak-izbezhat-ocheredey",
  "kak-polzovatsya-kartoy", "marshrut-s-zapravkami", "defitsit-topliva",
  "krowdsorsing-vs-oficial", "kak-ostavit-otchet", "gde-nayti-dizel",
  "ai-92-ili-ai-95", "sravnenie-setey-azs", "zapravki-u-dorogi",
  "gazomotornoe-toplivo", "benzin-v-moskve", "zapravki-na-trasse-m4",
  "benzryadom-vs-gdebenz", "kak-schitaetsya-status", "besplatnyy-servis",
  "gde-benzin-segodnya", "karta-benzina", "prilozhenie-gde-benzin",
  "gde-zapravit-i-kupit-benzin", "nalichie-benzina-na-zapravkah",
  "pochemu-net-benzina", "situatsiya-s-benzinom", "kogda-poyavitsya-benzin",
  "tseny-na-benzin-segodnya", "benzin-ai-92-segodnya", "benzin-v-ekaterinburge",
  "benzin-v-samare", "benzin-v-saratove", "benzin-v-simferopole-i-krymu",
  "benzin-v-oblasti", "benzin-v-novgorode", "benzin-v-krasnodarskom-krae",
  "protivorechivye-dannye-na-karte", "izbrannoe-zapravki",
  "pyat-oshibok-pri-poiske-benzina", "tablo-est-karta-net",
  "sluhi-v-chatah-vs-karta", "benzin-konchilsya-na-trasse",
  "chek-list-dalnyaya-poezdka", "ai-95-v-manual", "podtverdit-zachem-knopka",
  "nalichie-ochered-limit", "karta-i-zdravyy-smysl",
  "odna-set-pusto-sosednyaya-ochered",
];

/** Переименования: новый slug ← донор (старый файл) */
const ALIASES = {
  "gde-benzin-segodnya": "gde-est-benzin-seychas",
};

async function fileHash(filePath) {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPicsum(slug) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(slug)}/1280/720`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const files = (await readdir(outDir)).filter((f) => f.endsWith(".jpg"));
const bySlug = new Map(files.map((f) => [f.replace(/\.jpg$/, ""), path.join(outDir, f)]));

// Уникальные доноры по хешу (не дублировать одно фото на разные slug)
const usedHashes = new Set();
const donorPool = [];

for (const file of files) {
  const full = path.join(outDir, file);
  const hash = await fileHash(full);
  if (!usedHashes.has(hash)) {
    usedHashes.add(hash);
    donorPool.push(full);
  }
}

for (const slug of SLUGS) {
  const dest = path.join(outDir, `${slug}.jpg`);
  try {
    await stat(dest);
    const h = await fileHash(dest);
    usedHashes.add(h);
    console.log(`OK  ${slug} (exists)`);
    continue;
  } catch {
    /* missing */
  }

  const alias = ALIASES[slug];
  if (alias && bySlug.has(alias)) {
    await copyFile(bySlug.get(alias), dest);
    usedHashes.add(await fileHash(dest));
    console.log(`COPY ${slug} ← ${alias}`);
    continue;
  }

  const donor = donorPool.find(async () => false);
  // Найти донор с уникальным хешем, ещё не назначенный активному slug
  let picked = null;
  for (const d of donorPool) {
    const h = await fileHash(d);
    const base = path.basename(d, ".jpg");
    if (SLUGS.includes(base)) continue;
    if (usedHashes.has(h)) continue;
    picked = d;
    usedHashes.add(h);
    break;
  }

  if (picked) {
    await copyFile(picked, dest);
    console.log(`COPY ${slug} ← ${path.basename(picked)}`);
    continue;
  }

  try {
    const buf = await fetchPicsum(slug);
    await writeFile(dest, buf);
    usedHashes.add(createHash("sha256").update(buf).digest("hex"));
    console.log(`FETCH ${slug} (picsum)`);
  } catch (e) {
    console.error(`ERR ${slug}: ${e.message}`);
  }
  await sleep(300);
}

// Проверка уникальности среди активных slug
const hashes = new Map();
for (const slug of SLUGS) {
  const dest = path.join(outDir, `${slug}.jpg`);
  try {
    const h = await fileHash(dest);
    if (hashes.has(h)) {
      console.warn(`DUPLICATE: ${slug} = ${hashes.get(h)}`);
    } else {
      hashes.set(h, slug);
    }
  } catch {
    console.warn(`MISSING: ${slug}`);
  }
}
console.log(`\nUnique covers: ${hashes.size}/${SLUGS.length}`);
