// Экспорт расширенного SEO-ядра для импорта в Topvisor (по одному запросу на строку).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data");
const outTxt = join(outDir, "topvisor-keywords.txt");
const outJson = join(outDir, "topvisor-keywords.json");

const keywords = JSON.parse(
  execSync(
    'npx --yes tsx -e "import { buildExpandedKeywordCore } from \'./lib/seo-keywords.ts\'; console.log(JSON.stringify(buildExpandedKeywordCore()));"',
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  ).trim()
);

mkdirSync(outDir, { recursive: true });
writeFileSync(outTxt, keywords.join("\n") + "\n", "utf8");
writeFileSync(outJson, JSON.stringify(keywords, null, 2) + "\n", "utf8");
console.log(`Экспортировано ${keywords.length} запросов → data/topvisor-keywords.txt`);
