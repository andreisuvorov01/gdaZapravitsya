#!/usr/bin/env bash
# Починка nginx: alias /_next/static/ должен указывать на standalone/.next/static/
# (иначе HTML с :3000, а CSS — 404 с диска по старому пути).
set -euo pipefail

APP_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
CORRECT="${APP_ROOT}/.next/standalone/.next/static/"
WRONG="${APP_ROOT}/.next/static/"

if [ ! -d "$CORRECT" ]; then
  echo "ОШИБКА: нет $CORRECT — сначала деплой (deploy-from-artifact.sh)" >&2
  exit 1
fi

mapfile -t CONFIGS < <(
  grep -rl "_next/static" /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null || true
)

if [ "${#CONFIGS[@]}" -eq 0 ]; then
  echo "WARN: блок _next/static в nginx не найден — прокси на :3000, правка не нужна"
  exit 0
fi

changed=0
for f in "${CONFIGS[@]}"; do
  if grep -qF "$WRONG" "$f"; then
    sed -i "s|$(printf '%s' "$WRONG" | sed 's/[&/\|]/\\&/g')|$(printf '%s' "$CORRECT" | sed 's/[&/\|]/\\&/g')|g" "$f"
    echo "==> исправлен $f"
    changed=1
  elif grep -qF "$CORRECT" "$f"; then
    echo "==> уже верно: $f"
  else
    echo "WARN: $f — alias не совпал с ожидаемыми путями, проверьте вручную"
  fi
done

if [ "$changed" -eq 1 ]; then
  nginx -t
  systemctl reload nginx
  echo "==> nginx перезагружен"
fi

CSS_FILE="$(find "$CORRECT/css" -maxdepth 1 -name '*.css' -print -quit 2>/dev/null || true)"
if [ -n "$CSS_FILE" ]; then
  NAME="$(basename "$CSS_FILE")"
  echo "==> локально: $(curl -sSI "http://127.0.0.1:3000/_next/static/css/$NAME" | head -1)"
  echo "==> снаружи:  $(curl -sSI "https://xn----8sbaibghrm1elpm4lxb.xn--p1ai/_next/static/css/$NAME" | head -1)"
fi
