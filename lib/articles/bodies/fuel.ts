import type { ArticleBlock } from "../types";
import { p, lead, h2, ul, ol, cta, fig, quote, mapLink, blogLink, cityLink, brandLink } from "../blocks";
import { coverSrc } from "../covers";

export const gdeNaytiDizel: ArticleBlock[] = [
  lead("Дизель (ДТ, «солярка») при дефиците заканчивается не одновременно с бензином. На ", mapLink("карте ГдеЗаправиться.рф"), " можно отфильтровать заправки именно с дизелем."),
  h2("Как включить фильтр по дизелю"),
  ol(
    [mapLink("Откройте карту"), "."],
    ["В фильтрах топлива выберите «ДТ»."],
    ["Смотрите зелёные маркеры — есть дизель."],
  ),
  cta({ title: "Где найти дизель сейчас", primaryLabel: "Карта с фильтром ДТ" }),
  h2("Где чаще есть солярка"),
  ul(
    ["Трассы и ", blogLink("zapravki-u-dorogi", "придорожные АЗС"), " — большие резервуары."],
    ["Сети ", brandLink("lukoil", "Лукойл"), ", ", brandLink("rosneft", "Роснефть"), ", ", brandLink("gazprom-neft", "Газпромнефть"), "."],
    ["При дефиците — отдельные рейсы бензовоза, см. ", blogLink("kogda-poyavitsya-benzin", "график поставок"), "."],
  ),
  p("Общий алгоритм: ", blogLink("gde-benzin-segodnya", "где есть топливо"), " · ", blogLink("defitsit-topliva", "дефицит"), "."),
];

export const ai92IliAi95: ArticleBlock[] = [
  lead("Нужен АИ-95, а на заправке только 92? На ", mapLink("карте"), " фильтруйте конкретную марку и не тратьте время на неподходящие АЗС."),
  h2("Какой бензин заливать"),
  p("Ориентируйтесь на рекомендацию производителя в manual — это минимальная октановая марка. АИ-92 дешевле, АИ-95 и АИ-98 — для турбо и высоких нагрузок."),
  h2("Поиск марки на карте"),
  ol(
    [mapLink("Откройте карту"), "."],
    ["Фильтр: АИ-92, АИ-95, АИ-98 или АИ-100."],
    ["Статус «Есть» + нужная марка в отчётах."],
  ),
  cta({ secondaryLabel: "Сравнение сетей", secondaryHref: "/blog/sravnenie-setey-azs" }),
  p("Дизель отдельно: ", blogLink("gde-nayti-dizel", "где найти ДТ"), ". При ", blogLink("limit-na-zapravku", "лимите"), " — уточняйте объём."),
];

export const sravnenieSeteyAzs: ArticleBlock[] = [
  lead("Лукойл, Роснефть, Газпромнефть — у кого «", mapLink("есть бензин"), "»? Универсального ответа нет: смотрите конкретные АЗС на карте, а не бренд в целом."),
  h2("Крупнейшие сети"),
  ul(
    [brandLink("lukoil", "Лукойл"), " — широкое покрытие, страница ", { href: "/seti/lukoil", children: "АЗС Лукойл" }, "."],
    [brandLink("rosneft", "Роснефть"), " — федеральная сеть, ", { href: "/seti/rosneft", children: "карта Роснефти" }, "."],
    [brandLink("gazprom-neft", "Газпромнефть"), ", ", brandLink("tatneft", "Татнефть"), ", ", brandLink("shell", "Shell"), "."],
    [brandLink("opti", "ОПТИ"), " — ", blogLink("zapravki-u-dorogi", "у дороги"), "."],
  ),
  h2("Как сравнивать на практике"),
  p("На ", mapLink(), " включите фильтр сети и статус «Есть». Сравните 3–4 ближайшие точки по очереди и свежести отчётов."),
  cta({ primaryLabel: "Карта по сетям", secondaryLabel: "Все сети", secondaryHref: "/seti" }),
  p("Города: ", cityLink("moskva", "Москва"), ", ", cityLink("krasnodar", "Краснодар"), " · ", blogLink("krowdsorsing-vs-oficial", "краудсорсинг vs официальные данные"), "."),
];

export const zapravkiUDorogi: ArticleBlock[] = [
  lead("Заправки «у дороги» — ", brandLink("opti", "ОПТИ"), ", магистральные ", brandLink("lukoil", "Лукойл"), " и др. Удобны на ", blogLink("marshrut-s-zapravkami", "маршруте"), ", но при дефиците — первые в очереди."),
  fig(coverSrc("zapravki-u-dorogi"), "Придорожная АЗС у федеральной трассы"),
  h2("Как найти на карте"),
  ol(
    [mapLink("Откройте карту"), " и режим «По пути»."],
    ["Фильтр сети: ОПТИ, или страница ", { href: "/seti/opti", children: "АЗС ОПТИ" }, "."],
    ["Смотрите очередь — ", blogLink("kak-izbezhat-ocheredey", "как избежать"), "."],
  ),
  cta({ title: "АЗС вдоль маршрута", primaryLabel: "Карта" }),
  p("Трассы: ", blogLink("zapravki-na-trasse-m4", "М4 «Дон»"), " · ", { href: "/regiony", children: "регионы" }, "."),
];

export const gazomotornoeToplivo: ArticleBlock[] = [
  lead("Владельцам ГБО важно знать, ", mapLink("где заправиться газом"), ". На карте «ГдеЗаправиться.рф» есть фильтр «Газ» (СУГ/КПГ)."),
  h2("Поиск АЗС с газом"),
  ol(
    [mapLink("Откройте карту"), "."],
    ["Фильтр топлива → «Газ»."],
    ["Сеть ", brandLink("gazprom", "Газпром"), " — частый оператор, см. ", { href: "/seti/gazprom", children: "страницу сети" }, "."],
  ),
  cta({ primaryLabel: "Карта с газом" }),
  p("Бензин и дизель отдельно: ", blogLink("ai-92-ili-ai-95", "марки бензина"), ", ", blogLink("gde-nayti-dizel", "дизель"), ". ", blogLink("sravnenie-setey-azs", "Сети АЗС"), "."),
  quote("Дефицит газа и бензина не связан — проверяйте статусы отдельно. ", mapLink(), "."),
];
