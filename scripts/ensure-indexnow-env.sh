#!/usr/bin/env bash
# Добавляет или обновляет INDEXNOW_KEY в .env на сервере (из env INDEXNOW_KEY).
set -euo pipefail

KEY="${INDEXNOW_KEY:-}"
if [ -z "$KEY" ]; then
  echo "INDEXNOW_KEY не задан — пропуск"
  exit 0
fi

ENV_FILE="${1:-.env}"
touch "$ENV_FILE"

if grep -q '^INDEXNOW_KEY=' "$ENV_FILE"; then
  sed -i "s/^INDEXNOW_KEY=.*/INDEXNOW_KEY=${KEY}/" "$ENV_FILE"
else
  printf '\nINDEXNOW_KEY=%s\n' "$KEY" >> "$ENV_FILE"
fi

echo "INDEXNOW_KEY обновлён в $ENV_FILE"
