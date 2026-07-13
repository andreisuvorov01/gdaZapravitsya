// Конфиг pm2 для прод-процессов benzryadom.
// benzin-map — standalone-сборка Next.js, запуск/обновление: npm run deploy
// (см. scripts/deploy.sh). benzin-tiles — сервер тайлов карты (pmtiles serve),
// раздаёт self-hosted .pmtiles как обычный ZXY (см. docs/TILES.md); не трогается
// деплоем Next.js, перезапускается вручную при обновлении файла tiles/russia.pmtiles.
module.exports = {
  apps: [
    {
      name: "benzin-map",
      script: "server.js",
      cwd: "./.next/standalone",
      instances: 1,
      exec_mode: "fork",
      // Страховка на VPS с 2 ГБ RAM: если процесс всё же уйдёт в рост (пока
      // не разобрались до конца, что именно его драйвит), pm2 перезапустит
      // его сам, не доводя дело до swap/зависания всей машины. Это не чинит
      // причину роста — только ограничивает последствия.
      max_memory_restart: "700M",
      // Было: если после git pull забыли собрать проект (npm run build) и
      // просто дёрнули pm2 restart — server.js не существует, pm2 молча
      // уходит в бесконечный цикл перезапуска (десятки попыток, пока кто-то
      // не заметит). С этими двумя опциями pm2 сдаётся после 5 попыток за
      // 10 секунд и помечает процесс "errored" — ошибка видна сразу в
      // `pm2 status`, а не только в логах. См. .githooks/post-merge — он
      // должен предотвращать саму ситуацию, это доп. страховка на случай
      // сбоя по другой причине (например, кончилось место на диске).
      min_uptime: "10s",
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
    {
      // Бинарник pmtiles — не Node-скрипт, поэтому interpreter: "none"
      // (иначе pm2 попытается запустить его через node и упадёт).
      // Путь ниже — куда встал `pmtiles` из go-pmtiles releases; поправьте
      // под реальное расположение на сервере (`which pmtiles`).
      name: "benzin-tiles",
      script: "/usr/local/bin/pmtiles",
      args: "serve ./tiles --port=8081 --public-url=https://benzryadom.ru/tiles",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 5,
    },
  ],
};
