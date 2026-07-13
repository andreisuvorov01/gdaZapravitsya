#!/usr/bin/env bash
# Обновление и перезапуск этого сайта на сервере: git pull -> build -> pm2.
# Идемпотентен: одинаково подходит для первого запуска и для обновлений.
# Запуск: npm run deploy (или напрямую bash scripts/deploy.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

# Лок на весь деплой: без него два параллельных вызова (напр. push двух
# коммитов подряд запускает deploy.yml дважды, или ручной `npm run deploy`
# по SSH накладывается на уже идущий CI-деплой) одновременно гоняют `next
# build` на одной машине — а VPS тут всего 2 ГБ RAM, которые уже делят между
# собой pmtiles serve (13 ГБ тайлов), nginx и живой процесс Next.js (см.
# lib/data.ts). Два одновременных билда параллельно уводят её в своп и вешают
# обе сборки без единой ошибки в логе — именно так это выглядело в Actions.
# concurrency в deploy.yml/setup-indexnow.yml уже не даёт двум ПРОГОНАМ Actions
# стартовать параллельно, но не защищает от ручного запуска в обход — flock
# ловит и этот случай.
exec 200>.deploy.lock
if ! flock -w 1800 200; then
  echo "ОШИБКА: не удалось получить лок деплоя за 30 минут — похоже, где-то" >&2
  echo "завис предыдущий запуск scripts/deploy.sh. Проверьте: ps aux | grep -E 'next build|deploy.sh'" >&2
  exit 1
fi

echo "==> git pull"
git pull --ff-only

echo "==> npm ci (fallback: npm install при рассинхроне lock-файла Linux/Windows)"
if ! npm ci --no-audit --no-fund; then
  echo "npm ci failed — npm install"
  npm install --no-audit --no-fund
fi

# next build пересоздаёт .next/standalone и стирает .next/static внутри него.
# Пока билд идёт 10–20 мин, pm2 продолжает отдавать страницы — без бэкапа CSS 404.
STATIC_BACKUP=".deploy-static-backup"
echo "==> бэкап живой static (чтобы CSS не отваливался на время next build)"
rm -rf "$STATIC_BACKUP"
mkdir -p "$STATIC_BACKUP"
if [ -d .next/standalone/.next/static ]; then
  cp -a .next/standalone/.next/static "$STATIC_BACKUP/static"
fi
if [ -d .next/standalone/public ]; then
  cp -a .next/standalone/public "$STATIC_BACKUP/public"
fi

restore_live_static() {
  if [ ! -d "$STATIC_BACKUP/static" ]; then
    return
  fi
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static
  cp -a "$STATIC_BACKUP/static" .next/standalone/.next/static
  if [ -d "$STATIC_BACKUP/public" ]; then
    rm -rf .next/standalone/public
    cp -a "$STATIC_BACKUP/public" .next/standalone/public
  fi
}

BUILD_WATCH_PID=""
if [ -d "$STATIC_BACKUP/static" ]; then
  (
    while true; do
      if [ ! -d .next/standalone/.next/static/css ] 2>/dev/null; then
        restore_live_static
      fi
      sleep 2
    done
  ) &
  BUILD_WATCH_PID=$!
fi

cleanup_build_watch() {
  if [ -n "${BUILD_WATCH_PID:-}" ]; then
    kill "$BUILD_WATCH_PID" 2>/dev/null || true
    wait "$BUILD_WATCH_PID" 2>/dev/null || true
  fi
}
trap cleanup_build_watch EXIT

echo "==> next build"
if ! npm run build; then
  echo "ОШИБКА: next build упал — восстанавливаем прежнюю static для pm2" >&2
  restore_live_static
  exit 1
fi

cleanup_build_watch
trap - EXIT

echo "==> копируем статику в standalone-бандл (дублируем postbuild на случай ручного build)"
if ! node scripts/copy-standalone-assets.mjs; then
  echo "ОШИБКА: copy-standalone-assets — откатываем static из бэкапа" >&2
  restore_live_static
  exit 1
fi

if [ ! -d .next/standalone/.next/static/css ]; then
  echo "ОШИБКА: в standalone нет CSS после копирования" >&2
  restore_live_static
  exit 1
fi

rm -rf "$STATIC_BACKUP"

echo "==> кладём .env в standalone-бандл"
cp -f .env .next/standalone/.env

echo "==> перезапуск через pm2 (без даунтайма, если процесс уже запущен)"
# startOrRestart читает имя процесса из ecosystem.config.js — стартует, если
# ещё не запущен (первый деплой), иначе перезапускает. pm2 restart <имя>
# ломался бы, если имя тут разойдётся с ecosystem.config.js (так уже было).
pm2 startOrRestart ecosystem.config.js
pm2 save

echo "==> прогрев ISR-кэша остальных SEO-страниц в фоне (не блокирует деплой)"
# На билде статически генерируются только топ-города (PRIORITY_CITY_PRESETS в
# lib/cities.ts) — иначе next build на ~14k страниц упирается в таймаут SSH-сессии
# деплоя. Длинный хвост городов рендерится по первому запросу (ISR), этот шаг
# просто заранее обходит их GET-запросами, чтобы кэш прогрелся без ожидания
# реальных посетителей. Логи — в logs/warm-seo-pages.log.
mkdir -p logs
nohup npm run warm:seo >> logs/warm-seo-pages.log 2>&1 < /dev/null &
disown
