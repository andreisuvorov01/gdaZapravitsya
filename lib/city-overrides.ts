/** Ручные правки названий после геокодирования (slug → корректные формы). */
export const CITY_NAME_OVERRIDES: Record<
  string,
  { name: string; prepositional: string; genitive: string; lat?: number; lng?: number }
> = {
  oryol: { name: "Орёл", prepositional: "Орле", genitive: "Орла", lat: 52.968, lng: 36.07 },
  mytischi: { name: "Мытищи", prepositional: "Мытищах", genitive: "Мытищ" },
  balashiha: { name: "Балашиха", prepositional: "Балашихе", genitive: "Балашихи", lat: 55.7948, lng: 37.9479 },
  khimki: { name: "Химки", prepositional: "Химках", genitive: "Химок" },
  "veliky-novgorod": {
    name: "Великий Новгород",
    prepositional: "Великом Новгороде",
    genitive: "Великого Новгорода",
    lat: 58.5213,
    lng: 31.2755,
  },
  shahty: { name: "Шахты", prepositional: "Шахтах", genitive: "Шахт" },
  schelkovo: { name: "Щёлково", prepositional: "Щёлкове", genitive: "Щёлкова" },
  serpuhov: { name: "Серпухов", prepositional: "Серпухове", genitive: "Серпухова" },
  "orehovo-zuevo": { name: "Орехово-Зуево", prepositional: "Орехово-Зуеве", genitive: "Орехово-Зуева" },
  ramenskoe: { name: "Раменское", prepositional: "Раменском", genitive: "Раменского" },
  groznyy: { name: "Грозный", prepositional: "Грозном", genitive: "Грозного" },
  eysk: { name: "Ейск", prepositional: "Ейске", genitive: "Ейска", lat: 46.7111, lng: 38.2733 },
  prokopevsk: { name: "Прокопьевск", prepositional: "Прокопьевске", genitive: "Прокопьевска" },
  chehov: { name: "Чехов", prepositional: "Чехове", genitive: "Чехова" },
  timashevsk: { name: "Тимашёвск", prepositional: "Тимашёвске", genitive: "Тимашёвска" },
  balakhna: { name: "Балахна", prepositional: "Балахне", genitive: "Балахны" },
  vyazma: { name: "Вязьма", prepositional: "Вязьме", genitive: "Вязьмы" },
  arsenyev: { name: "Арсеньев", prepositional: "Арсеньеве", genitive: "Арсеньева" },
  pugachev: { name: "Пугачёв", prepositional: "Пугачёве", genitive: "Пугачёва" },
  "ust-labinsk": { name: "Усть-Лабинск", prepositional: "Усть-Лабинске", genitive: "Усть-Лабинска" },
  "slavyansk-na-kubani": {
    name: "Славянск-на-Кубани",
    prepositional: "Славянске-на-Кубани",
    genitive: "Славянска-на-Кубани",
  },
  "primorsko-akhtarsk": {
    name: "Приморско-Ахтарск",
    prepositional: "Приморско-Ахтарске",
    genitive: "Приморско-Ахтарска",
  },
  "kirovo-chepetsk": { name: "Кирово-Чепецк", prepositional: "Кирово-Чепецке", genitive: "Кирово-Чепецка" },
  kamenka: { name: "Каменка", prepositional: "Каменке", genitive: "Каменки" },
};
