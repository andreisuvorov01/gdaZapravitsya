"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CityPreset } from "@/lib/cities";

interface GorodaIndexProps {
  cities: CityPreset[];
}

function groupByLetter(cities: CityPreset[]): Map<string, CityPreset[]> {
  const map = new Map<string, CityPreset[]>();
  for (const city of cities) {
    const letter = city.name.charAt(0).toUpperCase();
    const bucket = map.get(letter);
    if (bucket) bucket.push(city);
    else map.set(letter, [city]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b, "ru")));
}

export default function GorodaIndex({ cities }: GorodaIndexProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.replace(/-/g, " ").includes(q)
    );
  }, [cities, query]);

  const groups = useMemo(() => groupByLetter(filtered), [filtered]);
  const letters = [...groups.keys()];

  return (
    <div>
      <div className="goroda-toolbar sticky top-0 z-20 -mx-4 border-b border-white/10 bg-surface-map/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <label htmlFor="goroda-search" className="sr-only">
          Поиск города
        </label>
        <input
          id="goroda-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти город…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-fuel/50 focus:outline-none focus:ring-2 focus:ring-brand-fuel/30"
        />

        {!query && letters.length > 1 && (
          <nav
            aria-label="По алфавиту"
            className="goroda-alpha no-scrollbar mt-3 flex gap-1 overflow-x-auto pb-0.5"
          >
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#goroda-${letter}`}
                className="goroda-alpha__link"
              >
                {letter}
              </a>
            ))}
          </nav>
        )}
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        {filtered.length} {filtered.length === 1 ? "город" : filtered.length < 5 ? "города" : "городов"}
        {query ? ` по запросу «${query}»` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/10 bg-surface/40 p-6 text-sm text-ink-muted">
          Город не найден.{" "}
          <Link href="/" className="text-brand-fuel underline">
            Откройте карту
          </Link>{" "}
          и найдите АЗС по геолокации или адресу.
        </p>
      ) : query ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/azs/${city.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-surface/60 px-5 py-4 transition hover:border-brand-fuel/40 hover:bg-surface-raised"
              >
                <span className="text-lg font-semibold text-ink">{city.name}</span>
                <span className="text-sm text-ink-muted transition group-hover:text-brand-fuel">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 space-y-10">
          {letters.map((letter) => {
            const list = groups.get(letter)!;
            return (
              <section
                key={letter}
                id={`goroda-${letter}`}
                aria-labelledby={`goroda-heading-${letter}`}
                className="scroll-mt-36"
              >
                <h2
                  id={`goroda-heading-${letter}`}
                  className="mb-4 font-display text-2xl font-bold text-brand-fuel"
                >
                  {letter}
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={`/azs/${city.slug}`}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-surface/60 px-5 py-4 transition hover:border-brand-fuel/40 hover:bg-surface-raised"
                      >
                        <span className="font-semibold text-ink">{city.name}</span>
                        <span className="text-sm text-ink-muted transition group-hover:text-brand-fuel">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
