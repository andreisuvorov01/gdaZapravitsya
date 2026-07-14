#!/usr/bin/env bash
# Быстрый деплой готовой standalone-сборки с GitHub Actions (без next build на VPS).
# Артефакт: deploy-standalone.tar.gz в корне репозитория (см. .github/workflows/deploy.yml).
set -euo pipefail
cd "$(dirname "$0")/.."

exec 200>.deploy.lock
if ! flock -w 600 200; then
  echo "ОШИБКА: другой деплой уже идёт (deploy.lock)" >&2
  exit 1
fi

# Зависший next build с прошлого таймаута — убиваем, иначе VPS в свопе.
pkill -f "next build" 2>/dev/null || true

echo "==> git pull (скрипты, ecosystem.config.js)"
git pull --ff-only

ARTIFACT="deploy-standalone.tar.gz"
if [ ! -f "$ARTIFACT" ]; then
  echo "ОШИБКА: нет $ARTIFACT — ожидается загрузка с CI" >&2
  exit 1
fi

STAGING="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGING"
}
trap cleanup EXIT

echo "==> распаковка $ARTIFACT"
tar xzf "$ARTIFACT" -C "$STAGING"
if [ ! -f "$STAGING/standalone/server.js" ]; then
  echo "ОШИБКА: в архиве нет standalone/server.js" >&2
  exit 1
fi
if [ ! -d "$STAGING/standalone/.next/static/css" ]; then
  echo "ОШИБКА: в архиве нет CSS (static не скопирована при сборке)" >&2
  exit 1
fi

echo "==> атомарная подмена .next/standalone"
mkdir -p .next
rm -rf .next/standalone.bak
if [ -d .next/standalone ]; then
  mv .next/standalone .next/standalone.bak
fi
if ! mv "$STAGING/standalone" .next/standalone; then
  echo "ОШИБКА: не удалось подменить standalone — откат" >&2
  if [ -d .next/standalone.bak ]; then
    rm -rf .next/standalone
    mv .next/standalone.bak .next/standalone
  fi
  exit 1
fi
rm -rf .next/standalone.bak

echo "==> .env в standalone"
bash scripts/ensure-standalone-env.sh

echo "==> nginx: путь к /_next/static"
bash scripts/fix-nginx-static.sh

echo "==> pm2: benz-atlas"
pm2 startOrRestart ecosystem.config.js
pm2 save

rm -f "$ARTIFACT"

echo "==> прогрев ISR SEO в фоне"
mkdir -p logs
nohup npm run warm:seo >> logs/warm-seo-pages.log 2>&1 < /dev/null &
disown

echo "==> деплой из артефакта завершён"
