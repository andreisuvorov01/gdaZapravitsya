import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_ENTRIES, findBrandBySlug } from "@/lib/brand-slugs";
import { CITY_PRESETS } from "@/lib/cities";
import { brandHubFaq } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import FaqList from "@/components/FaqList";
import SeoJsonLd from "@/components/seo/SeoJsonLd";

// Описания сетей для SEO-копии. Для брендов без записи — общий шаблон.
const BRAND_INTRO: Record<string, string> = {
  "Лукойл":
    "«Лукойл» — одна из крупнейших сетей АЗС России с заправками практически во всех регионах. Здесь предлагают бензин АИ-92, АИ-95, АИ-100 и дизельное топливо, а также фирменное топливо ЭКТО.",
  "Роснефть":
    "«Роснефть» — федеральная сеть АЗС с широким покрытием по всей стране. На заправках доступны все основные виды бензина и дизеля, включая брендированное топливо Pulsar.",
  "Газпромнефть":
    "«Газпромнефть» — сеть современных АЗС с топливом G-Drive и стандартными марками бензина и дизеля. Представлена в большинстве крупных городов России.",
  "Татнефть":
    "«Татнефть» — сеть заправок с сильным присутствием в Татарстане и Поволжье, активно расширяющаяся по России. Предлагает бензин и дизель собственного производства.",
  "Shell":
    "Shell — международная сеть АЗС с премиальным топливом и развитой инфраструктурой. В России представлена в ряде регионов.",
  "BP":
    "BP — международная сеть заправок с топливом Ultimate и стандартными марками бензина и дизеля.",
  "Teboil":
    "Teboil — сеть АЗС, представленная преимущественно в Северо-Западном и Центральном регионах. Предлагает бензин и дизель, а также фирменные топлива.",
  "Нефтьмагистраль":
    "«Нефтьмагистраль» — сеть АЗС Московского региона с собственным производством топлива и широкой линейкой марок бензина и дизеля.",
  "ОПТИ":
    "ОПТИ — сеть АЗС «Газпромнефти» формата «у дороги» с доступными ценами на бензин и дизель вдоль трасс и в городах.",
  "EKA":
    "EKA — региональная сеть АЗС с бензином и дизельным топливом, представленная преимущественно в Центральной России.",
  "Газпром":
    "«Газпром» — сеть АЗС с бензином, дизелем и газомоторным топливом. Представлена во многих регионах России.",
  "ПТК":
    "ПТК (Петербургская топливная компания) — сеть АЗС Санкт-Петербурга и Северо-Запада с собственным топливом и широкой сетью заправок.",
};

export function generateStaticParams() {
  return BRAND_ENTRIES.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = findBrandBySlug(slug);
  if (!brand) {
    // Без суффикса — «| ГдеЗаправиться.рф» добавит шаблон title из app/layout.tsx.
    return { title: "Сеть не найдена" };
  }
  // Суффикс «| ГдеЗаправиться.рф» добавляется шаблоном из app/layout.tsx.
  const title = `АЗС ${brand.name}: где есть топливо — карта наличия`;
  const description = `Где на заправках ${brand.name} сейчас есть бензин и дизель. Народная карта наличия топлива в реальном времени, бесплатно и без регистрации.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/seti/${brand.slug}`) },
    openGraph: {
      title: `АЗС ${brand.name}: где есть топливо — ГдеЗаправиться.рф`,
      description,
      url: absoluteUrl(`/seti/${brand.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const brand = findBrandBySlug(slug);
  if (!brand) notFound();

  const intro =
    BRAND_INTRO[brand.name] ??
    `${brand.name} — сеть автозаправочных станций в России. Предлагает основные марки бензина и дизельного топлива.`;

  const otherBrands = BRAND_ENTRIES.filter((b) => b.slug !== brand.slug).slice(
    0,
    8
  );
  const cities = CITY_PRESETS.slice(0, 8);
  const faqForBrand = brandHubFaq(brand);
  const pageUrl = absoluteUrl(`/seti/${brand.slug}`);
  const pageName = `АЗС ${brand.name}: где есть топливо`;
  const description = `Где на заправках ${brand.name} сейчас есть бензин и дизель. Народная карта наличия топлива в реальном времени, бесплатно и без регистрации.`;
  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName,
    description,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: "Сети", path: "/seti" },
      { name: brand.name },
    ],
    faq: faqForBrand,
  });

  // Карта SPA может ещё не читать ?brand — но ссылку оставляем (бренд по-русски).
  const mapHref = `/?brand=${encodeURIComponent(brand.name)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SeoJsonLd data={jsonLd} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        /{" "}
        <Link href="/seti" className="hover:text-brand-fuel">
          Сети АЗС
        </Link>{" "}
        / <span className="text-ink">{brand.name}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {pageName}
      </h1>

      <p className="seo-page-lead mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        {intro}
      </p>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        На народной карте «ГдеЗаправиться.рф» вы можете посмотреть, на каких заправках{" "}
        {brand.name} прямо сейчас есть бензин и дизель. Статусы обновляют сами
        автомобилисты, поэтому актуальное наличие лучше уточнять на самой АЗС.
      </p>

      <div className="mt-6">
        <Link
          href={mapHref}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-6 py-3 text-base font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту
        </Link>
      </div>

      {/* Перелинковка: города */}
      <section className="mt-12" aria-label="Города">
        <h2 className="text-xl font-bold text-ink">
          {brand.name} по городам России
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Посмотрите наличие топлива на заправках в крупных городах:
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={`/seti/${brand.slug}/${c.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/goroda"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все города →
          </Link>
        </div>
      </section>

      {/* Перелинковка: другие сети */}
      <section className="mt-10" aria-label="Другие сети">
        <h2 className="text-xl font-bold text-ink">Другие сети АЗС</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/seti/${b.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {b.name}
            </Link>
          ))}
          <Link
            href="/seti"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все сети →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={faqForBrand} />
        </div>
      </section>
    </div>
  );
}
