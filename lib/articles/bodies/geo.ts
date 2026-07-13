import type { ArticleBlock } from "../types";
import { p, lead, h2, ul, ol, cta, fig, mapLink, blogLink, cityLink, brandLink } from "../blocks";
import { coverSrc } from "../covers";

export const benzinVMoskve: ArticleBlock[] = [
  lead("В мегаполисе сотни АЗС — найти ", cityLink("moskva", "где есть бензин в Москве"), " проще через ", mapLink("карту"), ", чем объезжать заправки наугад."),
  h2("Быстрый старт"),
  ol(
    ["Страница ", cityLink("moskva", "АЗС Москвы"), " — список со статусами."],
    [mapLink("Карта"), " с центром на Москве — ", { href: "/?city=moskva", children: "открыть" }, "."],
    ["Фильтр «Срочно: бензин» + геолокация."],
  ),
  cta({ title: "Бензин в Москве сейчас", primaryLabel: "Карта Москвы", primaryHref: "/?city=moskva", secondaryLabel: "Страница города", secondaryHref: "/azs/moskva" }),
  h2("Где меньше очередей"),
  p("МКАД vs спальный район vs центр — зависит от дня. Смотрите отметки очереди на карте: ", blogLink("kak-izbezhat-ocheredey", "советы"), ". В спальных районах в будни днём иногда спокойнее, чем на ", blogLink("zapravki-u-dorogi", "трассе"), " или у кольца."),
  h2("Сети в Москве"),
  p(brandLink("lukoil", "Лукойл"), ", ", brandLink("rosneft", "Роснефть"), ", ", brandLink("neftmagistral", "Нефтьмагистраль"), ", ", brandLink("gazprom-neft", "Газпромнефть"), " — ", blogLink("sravnenie-setey-azs", "сравнение"), "."),
  p("Московская область: ", { href: "/regiony", children: "регионы" }, " · ", blogLink("defitsit-topliva", "дефицит"), " · ", blogLink("kogda-poyavitsya-benzin", "поставки"), "."),
];

export const azsKrasnodara: ArticleBlock[] = [
  lead("Кубань — ", cityLink("krasnodar", "Краснодар"), ", ", cityLink("sochi", "Сочи"), ", ", cityLink("novorossiysk", "Новороссийск"), ". ", mapLink("Карта"), " показывает наличие топлива по всему краю."),
  h2("Страницы городов"),
  ul(
    [cityLink("krasnodar", "Краснодар"), " — ", { href: "/azs/krasnodar", children: "список АЗС" }, "."],
    [cityLink("sochi", "Сочи"), " — курортный сезон, высокий спрос."],
    [cityLink("novorossiysk", "Новороссийск"), " — порт, ", blogLink("kogda-poyavitsya-benzin", "графики поставок"), " при дефиците."],
    [cityLink("rostov-na-donu", "Ростов-на-Дону"), " — рядом, ", { href: "/goroda", children: "все города" }, "."],
  ),
  cta({ primaryLabel: "Карта Кубани", primaryHref: "/?city=krasnodar", secondaryLabel: "Краснодар", secondaryHref: "/azs/krasnodar" }),
  h2("Поездка на море"),
  p("Запланируйте ", blogLink("marshrut-s-zapravkami", "заправки по пути"), ". Трасса ", blogLink("zapravki-na-trasse-m4", "М4"), " — основной коридор на юг."),
  p("Дизель для фургонов: ", blogLink("gde-nayti-dizel", "где найти ДТ"), "."),
];

export const zapravkiNaTrasseM4: ArticleBlock[] = [
  lead("М4 «Дон» — главная магистраль на юг. ", mapLink("Заправки на трассе"), " удобно смотреть в режиме «По пути» на карте «ГдеЗаправиться.рф»."),
  fig(coverSrc("zapravki-na-trasse-m4"), "Заправки на трассе М4 «Дон»"),
  h2("Как увидеть АЗС на М4"),
  ol(
    [mapLink("Откройте карту"), ", постройте маршрут по М4."],
    ["Режим «По пути» — АЗС в коридоре дороги."],
    ["Фильтр «Есть» + короткая ", blogLink("kak-izbezhat-ocheredey", "очередь"), "."],
  ),
  cta({ title: "Заправки по М4", primaryLabel: "Карта с маршрутом" }),
  h2("Правила безопасной поездки"),
  ul(
    ["Заправка каждые 300–400 км, не на «нуле»."],
    ["2–3 запасные точки — ", blogLink("defitsit-topliva", "при дефиците"), "."],
    ["Съезд в ", cityLink("voronezh", "Воронеж"), ", ", cityLink("krasnodar", "Краснодар"), " если на трассе «Нет»."],
  ),
  p("Придорожные АЗС на магистрали: ", blogLink("zapravki-u-dorogi", "как искать у трассы"), " · ", blogLink("benzin-v-krasnodarskom-krae", "Кубань и море"), "."),
];
