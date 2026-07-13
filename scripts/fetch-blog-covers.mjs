// Скачивает тематические обложки статей (Unsplash, бесплатные фото).
// У каждого slug — свой уникальный photo id.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "blog", "covers");

/** slug → Unsplash photo id (все id уникальны) */
const COVERS = {
  // Core (18)
  "net-benzina-na-zapravke": "1597406778343-155e7059967b",
  "limit-na-zapravku": "1597851214120-525c4d2ceb67",
  "kak-izbezhat-ocheredey": "1449965408865-a04c4462a47a",
  "kak-polzovatsya-kartoy": "1512946909284-b54f0f012f77",
  "marshrut-s-zapravkami": "1503376780353-7ad149bc6a52",
  "defitsit-topliva": "1486262715619-67b85e443608",
  "krowdsorsing-vs-oficial": "1522071820081-009f0129c71c",
  "kak-ostavit-otchet": "1556745753-1c5bd3e4c43f",
  "gde-nayti-dizel": "1621338745877-38763ce165de",
  "ai-92-ili-ai-95": "1570125909232-e097fbef8716",
  "sravnenie-setey-azs": "1544636331-e26879cd4d9b",
  "zapravki-u-dorogi": "1558618666-fcd25c85cd64",
  "gazomotornoe-toplivo": "1558618047-3c8c76a7c324",
  "benzin-v-moskve": "1520106216145-0e30fb288c67",
  "zapravki-na-trasse-m4": "1515165562835-13043c3407d4",
  "benzryadom-vs-gdebenz": "1516321318423-f06f85e504b3",
  "kak-schitaetsya-status": "1551288049-bebda4e38f71",
  "besplatnyy-servis": "1489824904133-7f034eeb44d0",
  // SEO (17)
  "gde-benzin-segodnya": "1569335045017-87183c4c8d25",
  "karta-benzina": "1619642797253-94f777e059f8",
  "prilozhenie-gde-benzin": "1617813995866-c7b464e9c2ea",
  "gde-zapravit-i-kupit-benzin": "1568605114967-6ab92172160a",
  "nalichie-benzina-na-zapravkah": "1474486821088-9a4ca0ce1ba4",
  "pochemu-net-benzina": "1549317661-8a98f5134b35",
  "situatsiya-s-benzinom": "1523961132822-c0a673e73c4b",
  "kogda-poyavitsya-benzin": "1581092160562-40aa08e78837",
  "tseny-na-benzin-segodnya": "1601368200467-156ba017b99a",
  "benzin-ai-92-segodnya": "1707960189679-1ea1e312f63f",
  "benzin-v-ekaterinburge": "1578662296234-4af76a6849e9",
  "benzin-v-samare": "1552511407-48122579fe7d",
  "benzin-v-saratove": "1469859678047-4101a52954d0",
  "benzin-v-simferopole-i-krymu": "1544622899-62c2a50645ed",
  "benzin-v-oblasti": "1635776062126-fb7848c4f826",
  "benzin-v-novgorode": "1493238798541-2563dd890745",
  "benzin-v-krasnodarskom-krae": "1506905925346-21bda4d32df4",
  // Конверсионные (12)
  "protivorechivye-dannye-na-karte": "1470333451889-7d154ee67134",
  "izbrannoe-zapravki": "1533478325309-d3964f476513",
  "pyat-oshibok-pri-poiske-benzina": "1627662724565-3f3a5449a4e4",
  "tablo-est-karta-net": "1757728769016-3d144293a089",
  "sluhi-v-chatah-vs-karta": "1550614019-2aef894d96d6",
  "benzin-konchilsya-na-trasse": "1560955702-90724c8fe790",
  "chek-list-dalnyaya-poezdka": "1492144534655-60d38c88f881",
  "ai-95-v-manual": "1748761751275-e55a2a29e1bf",
  "podtverdit-zachem-knopka": "1556742045-028821388a3d",
  "nalichie-ochered-limit": "1449824915259-a312664f5430",
  "karta-i-zdravyy-smysl": "1423640408248-7c2467b8c187",
  "odna-set-pusto-sosednyaya-ochered": "1647131527864-2fbfe6067bbf",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(outDir, { recursive: true });

let ok = 0;
let fail = 0;

for (const [slug, photoId] of Object.entries(COVERS)) {
  const url = `https://images.unsplash.com/photo-${photoId}?w=1280&h=720&fit=crop&q=85&auto=format`;
  const dest = path.join(outDir, `${slug}.jpg`);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "benzryadom-cover-fetch/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    ok++;
    console.log(`OK  ${slug} (${Math.round(buf.length / 1024)} KB)`);
  } catch (e) {
    fail++;
    console.error(`ERR ${slug}: ${e.message}`);
  }
  await sleep(400);
}

console.log(`\nDone: ${ok} ok, ${fail} failed → ${outDir}`);
