// Эвристика падежей для импортированных городов (лучше явные формы в cities.json).

export function guessCityCases(name: string): {
  prepositional: string;
  genitive: string;
} {
  const n = name.trim();
  if (!n) return { prepositional: n, genitive: n };

  // -ск, -цк, -ц
  if (/[скц]$/iu.test(n)) {
    return { prepositional: `${n}е`, genitive: `${n}а` };
  }
  // -ы / -и (Сочи, Туапсе)
  if (/[иы]$/u.test(n)) {
    return { prepositional: n, genitive: n };
  }
  // -а (Москва, Казань частично)
  if (/а$/u.test(n)) {
    if (/ьа$/u.test(n)) {
      return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}и` };
    }
    if (/ия$/u.test(n)) {
      return { prepositional: `${n.slice(0, -1)}и`, genitive: `${n.slice(0, -1)}и` };
    }
    if (/ая$/u.test(n)) {
      return { prepositional: `${n.slice(0, -2)}ой`, genitive: `${n.slice(0, -2)}ой` };
    }
    return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}ы` };
  }
  // -й (Ростов-на-Дону не сюда)
  if (/й$/u.test(n)) {
    return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}я` };
  }
  // -о
  if (/о$/u.test(n)) {
    return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}а` };
  }
  // -ь
  if (/ь$/u.test(n)) {
    return { prepositional: `${n.slice(0, -1)}и`, genitive: `${n.slice(0, -1)}и` };
  }

  return { prepositional: `${n}е`, genitive: `${n}а` };
}
