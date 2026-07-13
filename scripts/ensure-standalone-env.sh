#!/usr/bin/env bash
# Копирует .env в standalone и предупреждает, если DATABASE_URL не настроен.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ОШИБКА: нет файла .env в $(pwd)" >&2
  exit 1
fi

if ! grep -qE '^DATABASE_URL=postgresql://' .env; then
  echo "WARN: в .env нет строки DATABASE_URL=postgresql://… — сайт в демо-режиме" >&2
elif grep -qE 'YOUR-PASSWORD|user:password|your-password|example\.com' .env; then
  echo "WARN: DATABASE_URL похож на заглушку из .env.example — замените на реальный пароль" >&2
else
  DB_HOST="$(grep '^DATABASE_URL=' .env | sed -E 's|^DATABASE_URL=postgresql://[^@]+@([^:/]+).*|\1|')"
  echo "==> DATABASE_URL настроен (хост: ${DB_HOST})"
fi

mkdir -p .next/standalone
cp -f .env .next/standalone/.env
echo "==> .env скопирован в .next/standalone/.env"
