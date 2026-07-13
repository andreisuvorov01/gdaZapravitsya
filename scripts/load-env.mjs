// Загрузка переменных из .env в process.env (без dotenv).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  try {
    const env = readFileSync(join(root, ".env"), "utf8");
    for (const line of env.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env может отсутствовать */
  }
}

export function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Не задана переменная ${name} в .env`);
  return v;
}

// Побочный эффект при самом импорте модуля, а не только при явном вызове
// loadEnv() из тела скрипта: ESM-импорты хойстятся и выполняются раньше
// тела импортирующего файла, поэтому модули вроде scripts/lib/gdebenz-http.mjs
// (у которых PROXY_POOL и т.п. — константы верхнего уровня, читающие
// process.env при загрузке модуля) успевают проинициализироваться из .env
// ДО того, как явный `loadEnv()` в теле скрипта вообще выполнится — .env
// значения в таком случае молча терялись. loadEnv() идемпотентна (не
// перезаписывает уже заданные process.env), так что двойной вызов безопасен.
loadEnv();
