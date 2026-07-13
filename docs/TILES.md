# Self-hosted тайлы карты (pmtiles serve)

По умолчанию карта использует внешний OpenFreeMap (`tiles.openfreemap.org`) —
работает из коробки, без ключей. Но это сторонний хост без гарантий по
географии и стабильности: первый заход просит `style.json`, потом спрайт,
шрифты и тайлы отдельными запросами к чужому домену.

Более быстрый и предсказуемый вариант — свой ZXY-тайл-сервер на том же VPS,
что и сам сайт (Beget), под тем же доменом через nginx. Тогда браузеру не
нужно ни поднимать TLS до нового хоста, ни проходить CORS — тайлы летят с
`benzryadom.ru/tiles/...` точно так же, как API или сама страница.

## Как это устроено

Два отдельных файла/источника, а не один:

- **`tiles/world.pmtiles`** — весь мир, но грубо (z0-8, ~550 МБ). Нужен, чтобы
  за пределами России карта не была пустой/серой — MapLibre сам растягивает
  (overzoom) этот грубый слой на бОльший зум, если для текущей точки нет
  ничего детальнее.
- **`tiles/russia.pmtiles`** — только территория РФ, но детально (z9-14,
  ~6.7 ГБ): дороги, здания, POI. Всё, что нужно самому приложению — детализация
  внутри РФ не нужна за её пределами, а вырезка по границе экономит на порядок
  места по сравнению с тем же зумом по всему миру.

```
build.protomaps.com/<дата>.pmtiles (~127 ГиБ, ежедневный билд планеты)
  ├─ pmtiles extract --maxzoom=8 (без --region, весь мир)  → tiles/world.pmtiles
  └─ pmtiles extract --region=RU.geojson --minzoom=9 --maxzoom=14 → tiles/russia.pmtiles
                                                         ↓
                                    pmtiles serve ./tiles --port=8081  (pm2, benzin-tiles;
                                    обслуживает ОБА файла из каталога автоматически)
                                                         ↓
                                    nginx location /tiles/ → 127.0.0.1:8081  (без CORS)
                                                         ↓
              NEXT_PUBLIC_TILES_URL=/tiles/russia/{z}/{x}/{y}.mvt        (в .env фронтенда)
              NEXT_PUBLIC_WORLD_TILES_URL=/tiles/world/{z}/{x}/{y}.mvt
```

Оба слоя используют одну и ту же схему Protomaps — стиль в
[components/MapLibreMapView.tsx](../components/MapLibreMapView.tsx) собирает
их как два `vector`-источника с общим набором слоёв (`themeLayers`), мировые —
снизу, российские — сверху. **Важно:** у второго набора слоёв обязательно
убирается собственный слой `background` (сплошная заливка без источника) —
иначе он перекрывает мировую подложку целиком, и вместо неё снова серый экран
на любом зуме. Это уже сделано в коде, но если переносите логику куда-то ещё —
не забудьте этот нюанс.

## 1. Установить CLI на VPS

```bash
# см. актуальный релиз: https://github.com/protomaps/go-pmtiles/releases
curl -L -o pmtiles.tar.gz https://github.com/protomaps/go-pmtiles/releases/latest/download/go-pmtiles_Linux_x86_64.tar.gz
tar -xzf pmtiles.tar.gz pmtiles
sudo mv pmtiles /usr/local/bin/pmtiles
pmtiles version
```

## 2. Извлечь мир + Россию из свежего дневного билда

Свежую ссылку на билд смотрите на [maps.protomaps.com/builds](https://maps.protomaps.com/builds)
(файл вида `https://build.protomaps.com/<YYYYMMDD>.pmtiles`).

Граница России уже есть в репозитории — тот же полигон, которым
`scripts/sync-gdebenz.mjs` отсекает станции по границе РФ, включая корректный
разрез по антимеридиану (Чукотка):
`scripts/data/russia-adm0-simplified.geojson`.

```bash
mkdir -p tiles
SRC=https://build.protomaps.com/<YYYYMMDD>.pmtiles

# Мир целиком, грубо (z0-8) — единственный слой, видимый за пределами РФ.
pmtiles extract "$SRC" tiles/world.pmtiles --maxzoom=8

# Россия, детально (z9-14). --minzoom=9 экономит место (не дублирует z0-8,
# который уже есть в world.pmtiles).
pmtiles extract "$SRC" tiles/russia.pmtiles \
  --region=scripts/data/russia-adm0-simplified.geojson \
  --minzoom=9 --maxzoom=14
```

> **Источник рвёт соединение на середине.** `build.protomaps.com` регулярно
> обрывает передачу (TLS timeout / connection reset) на многогигабайтных
> extract'ах — это не баг команды, а нестабильность самого хоста. Решение —
> просто повторять попытку (без `--resume`, CLI не умеет докачивать): удалить
> недокачанный файл и запустить ту же команду заново. `tiles/russia.pmtiles`
> (самый тяжёлый кусок) на практике требовал 2-4 попытки.
>
> Если retry вручную надоедает — оберните в bash-цикл с проверкой
> `pmtiles verify` после каждой попытки:
> ```bash
> until pmtiles extract "$SRC" tiles/russia.pmtiles --region=scripts/data/russia-adm0-simplified.geojson --minzoom=9 --maxzoom=14 \
>   && pmtiles verify tiles/russia.pmtiles; do
>   rm -f tiles/russia.pmtiles; sleep 5
> done
> ```

> **z15.** Сам источник поддерживает максимум z15 (`pmtiles show <url>` →
> `max zoom: 15`), но на практике extract именно z15 для всей России
> (~6 ГБ) оказался самым ненадёжным куском — на этом хосте не удавалось
> докачать несмотря на десятки попыток и часовые таймауты. z14 (то, что
> описано выше) уже покрывает всё, что реально использует приложение:
> кластеризация станций включается на zoom ~13
> (`CLUSTER_MAX_ZOOM` в `MapLibreMapView.tsx`), z15 добавил бы только подписи
> названий на самых мелких переулках. Не критично — можно не гнаться за z15.

> **Обновление билда.** OSM меняется не так быстро, чтобы гонять полный
> extract ежедневно — раз в 1–4 недели достаточно. `world.pmtiles` можно
> обновлять реже (границы/береговая линия почти не меняются). После
> обновления: `pm2 restart benzin-tiles`.

> **Извлекали не на самом VPS?** Тогда оба файла (`tiles/world.pmtiles`,
> `tiles/russia.pmtiles`) нужно перенести на сервер (`scp`/`rsync`/панель
> хостинга) в каталог `./tiles` рядом с `ecosystem.config.js`, прежде чем
> переходить к шагу 3.

## 3. Запустить pmtiles serve через pm2

Уже добавлено в `ecosystem.config.js` (процесс `benzin-tiles`) — обслуживает
весь каталог `tiles/`, оба файла становятся отдельными тайлсетами автоматически
(`world` и `russia` — по именам файлов). Проверьте, что путь к бинарнику в
`script` совпадает с `which pmtiles` на сервере, и порт `8081` свободен, затем:

```bash
pm2 startOrRestart ecosystem.config.js
pm2 logs benzin-tiles   # убедиться, что поднялся без ошибок
```

## 4. Прописать nginx

Добавьте в конфиг сайта (там же, где проксируется Next.js на `:3000`):

```nginx
location /tiles/ {
    proxy_pass http://127.0.0.1:8081/;
    proxy_set_header Host $host;
    proxy_cache_valid 200 7d;   # тайлы почти статичны — можно кэшировать в самом nginx
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Включить в приложении

В `.env` на сервере:

```
NEXT_PUBLIC_TILES_URL=/tiles/russia/{z}/{x}/{y}.mvt
NEXT_PUBLIC_TILES_MAXZOOM=14
NEXT_PUBLIC_WORLD_TILES_URL=/tiles/world/{z}/{x}/{y}.mvt
```

Это `NEXT_PUBLIC_*` — переменные, встраиваемые в сборку, простого рестарта
`pm2 restart benzin-map` недостаточно, нужен `npm run build` (см.
`scripts/deploy.sh`, `npm run deploy` сделает это автоматически).

## 6. Шрифты и спрайт — тоже self-host

Тайлы — не единственный внешний ресурс в стиле карты: подписи (`glyphs`) и
иконки (`sprite`) по умолчанию тянутся с `protomaps.github.io`. Это отдельный
хост, который тоже может быть недоступен без VPN — и тогда self-host тайлов
не спасает: MapLibre-события `"load"`/`"idle"`, на которые опирается
рантайм-фолбэк (см. ниже), ждут в том числе загрузку спрайта, так что
зависший `protomaps.github.io` без VPN тоже уводит карту в фолбэк на
OpenFreeMap — который без VPN недоступен точно так же (инцидент 2026-07-11).

Решение — раздавать шрифты и спрайт со своего домена, как и сами тайлы:

```bash
npm run map-assets   # scripts/fetch-map-assets.mjs — качает ~11 МБ в public/map-assets/
```

Файлы коммитятся в git (в отличие от `tiles/*.pmtiles` — это на 3 порядка
меньше) и уезжают на сервер обычным деплоем/`git pull`, без отдельного шага
на VPS и без правок nginx: `output: "standalone"` копирует весь `public/`
(см. `scripts/copy-standalone-assets.mjs`), так что `/map-assets/...`
раздаётся самим Next.js так же, как любой другой файл из `public/`.

`PM_GLYPHS`/`PM_SPRITE_LIGHT` в `MapLibreMapView.tsx` уже указывают на
`/map-assets/...` — обновлять их не нужно, только не забыть выполнить
`npm run map-assets` до деплоя (или после, если `public/map-assets/` ещё не
закоммичен).

## Проверка

- `curl -I https://benzryadom.ru/tiles/russia/9/281/163.mvt` и
  `curl -I https://benzryadom.ru/tiles/world/2/2/1.mvt` — должны вернуть
  `200`/`204` без ошибок nginx.
- DevTools → Network на боевом сайте: запросы тайлов должны идти на
  `benzryadom.ru/tiles/...` (не на `tiles.openfreemap.org` или сторонний бакет),
  без отдельного TLS-рукопожатия перед ними.
- Отдалите карту за пределы России (Европа, Азия, Америка) — должна быть
  видна грубая, но нормальная карта (материки/страны/подписи), а не серый
  фон. Если серо — проверьте, что в `MapLibreMapView.tsx` из второго набора
  слоёв (`layers`) действительно отфильтрован `id === "background"` (см. выше).
- Если что-то пошло не так на этапе настройки — просто не задавайте
  `NEXT_PUBLIC_TILES_URL`, приложение соберётся на `NEXT_PUBLIC_PMTILES_URL`,
  а если и его нет — на OpenFreeMap.
- Есть и рантайм-фолбэк на случай, если self-host сломается уже после
  деплоя (как в инциденте 2026-07-10 — файлы на сервере не докачались,
  `nginx` не проксировал `/tiles/`): если тайлы своих источников
  (`protomaps`/`protomaps_world`) не догрузятся за 6 секунд или у них ≥3
  ошибок, `MapLibreMapView` сам переключается на OpenFreeMap прямо в
  браузере пользователя — без пересборки и без вмешательства с вашей
  стороны. Это отслеживается по `"sourcedata"`/`isSourceLoaded` именно
  своих источников, а не по общим `"load"`/`"idle"` карты — те ждут ещё и
  спрайт/шрифты, и раньше зависший без VPN `protomaps.github.io` (см. шаг 6
  выше) мог ложно считаться зависшим self-host. Дальше 5 минут (в рамках
  той же вкладки/сессии, `sessionStorage`) self-host не пробуется заново,
  чтобы не долбить лежащий сервер, а следующая загрузка страницы уже за
  пределами cooldown снова попробует self-host — если вы тем временем
  починили сервер, он подхватится сам, без релиза. Реализация —
  `SELF_HOST_FALLBACK_KEY`/`fallbackToOpenFreeMap` в
  [components/MapLibreMapView.tsx](../components/MapLibreMapView.tsx).
