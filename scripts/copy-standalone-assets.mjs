/**
 * Next.js output: "standalone" не копирует public/ и .next/static в бандл.
 * Без этого шага HTML ссылается на /_next/static/*, а файлов на диске нет → 404,
 * страница без CSS/JS (карта «Загрузка карты…» навсегда).
 *
 * Копирование атомарное: сначала staging, проверка, потом rename — не удаляем
 * живую static до того, как новая готова (иначе CSS отваливается на деплое).
 *
 * Вызывается из postbuild и из scripts/deploy.sh.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const publicSrc = join(root, "public");

if (!existsSync(standaloneDir)) {
  console.log("copy-standalone-assets: skip — .next/standalone не найден");
  process.exit(0);
}

if (!existsSync(staticSrc)) {
  console.error("copy-standalone-assets: ОШИБКА — нет .next/static после сборки");
  process.exit(1);
}

if (!existsSync(publicSrc)) {
  console.error("copy-standalone-assets: ОШИБКА — нет public/");
  process.exit(1);
}

function countFiles(dir, sub) {
  const p = join(dir, sub);
  return existsSync(p) ? readdirSync(p).length : 0;
}

function verifyStaticTree(dir, label) {
  const cssCount = countFiles(dir, "css");
  const chunkCount = countFiles(dir, "chunks");
  if (cssCount === 0 || chunkCount === 0) {
    throw new Error(
      `${label}: пустая static (css=${cssCount}, chunks=${chunkCount})`,
    );
  }
  return { cssCount, chunkCount };
}

/** Копирует src → staging, проверяет, атомарно подменяет dest. */
function atomicReplaceDir(src, destParent, destName) {
  const dest = join(destParent, destName);
  const staging = join(destParent, `${destName}.staging`);
  const backup = join(destParent, `${destName}.backup`);

  rmSync(staging, { recursive: true, force: true });
  cpSync(src, staging, { recursive: true });
  verifyStaticTree(staging, "staging");

  rmSync(backup, { recursive: true, force: true });
  if (existsSync(dest)) {
    renameSync(dest, backup);
  }
  try {
    renameSync(staging, dest);
  } catch (err) {
    if (existsSync(backup) && !existsSync(dest)) {
      renameSync(backup, dest);
    }
    throw err;
  }
  rmSync(backup, { recursive: true, force: true });
}

function atomicReplacePublic(src, destParent, destName) {
  const dest = join(destParent, destName);
  const staging = join(destParent, `${destName}.staging`);
  const backup = join(destParent, `${destName}.backup`);

  rmSync(staging, { recursive: true, force: true });
  cpSync(src, staging, { recursive: true });

  rmSync(backup, { recursive: true, force: true });
  if (existsSync(dest)) {
    renameSync(dest, backup);
  }
  try {
    renameSync(staging, dest);
  } catch (err) {
    if (existsSync(backup) && !existsSync(dest)) {
      renameSync(backup, dest);
    }
    throw err;
  }
  rmSync(backup, { recursive: true, force: true });
}

mkdirSync(join(standaloneDir, ".next"), { recursive: true });
atomicReplaceDir(staticSrc, join(standaloneDir, ".next"), "static");
atomicReplacePublic(publicSrc, standaloneDir, "public");

const { cssCount, chunkCount } = verifyStaticTree(
  join(standaloneDir, ".next", "static"),
  "standalone",
);

console.log(
  `copy-standalone-assets: ok (css=${cssCount}, chunks=${chunkCount})`,
);
