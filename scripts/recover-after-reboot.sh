#!/usr/bin/env bash
# После hard reset / 502: поднять pm2 и сайт без полного next build.
# Запуск на сервере: bash scripts/recover-after-reboot.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> снимаем зависший deploy.lock (если остался после kill)"
rm -f .deploy.lock
pkill -f "next build" 2>/dev/null || true

echo "==> git pull"
git pull --ff-only

echo "==> pm2 resurrect (если был pm2 save)"
pm2 resurrect 2>/dev/null || true

if [ -f deploy-standalone.tar.gz ]; then
  echo "==> найден артефакт CI — деплой из tarball"
  bash scripts/deploy-from-artifact.sh
  exit 0
fi

if [ -f .next/standalone/server.js ] && [ -d .next/standalone/.next/static/css ]; then
  echo "==> поднимаем существующий standalone"
  cp -f .env .next/standalone/.env
  pm2 startOrRestart ecosystem.config.js
  pm2 save
  echo "==> готово — проверьте https://xn----8sbaibghrm1elpm4lxb.xn--p1ai"
  exit 0
fi

if [ -d .next/static/css ]; then
  echo "==> восстановление static из .next/static"
  bash scripts/restore-standalone-static.sh
  exit 0
fi

echo "ОШИБКА: нет готовой сборки на диске." >&2
echo "Запустите Deploy в GitHub Actions или: bash scripts/deploy.sh" >&2
exit 1
