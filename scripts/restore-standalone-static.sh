#!/usr/bin/env bash
# Быстрое восстановление CSS/JS на проде, если деплой оборвался после next build.
# Запуск на сервере из корня репозитория:
#   bash scripts/restore-standalone-static.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .next/static ]; then
  echo "ОШИБКА: нет .next/static — сначала нужен успешный npm run build" >&2
  exit 1
fi

node scripts/copy-standalone-assets.mjs
pm2 startOrRestart ecosystem.config.js

echo "==> готово: static скопирована в standalone, pm2 перезапущен"
