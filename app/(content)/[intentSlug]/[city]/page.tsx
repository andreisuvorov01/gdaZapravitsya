import { notFound } from "next/navigation";
import IntentCityPage, { intentCityMetadata } from "@/components/seo/IntentCityPage";
import { PRIORITY_CITY_PRESETS } from "@/lib/cities";
import { findSeoIntent, getDynamicSeoIntents } from "@/lib/seo-intents";

export const revalidate = 300;

export function generateStaticParams() {
  return getDynamicSeoIntents().flatMap((intent) =>
    PRIORITY_CITY_PRESETS.map((c) => ({ intentSlug: intent.slug, city: c.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ intentSlug: string; city: string }>;
}) {
  const { intentSlug, city } = await params;
  if (!findSeoIntent(intentSlug)) return { title: "Страница не найдена" };
  return intentCityMetadata(intentSlug, city);
}

export default async function Page({
  params,
}: {
  params: Promise<{ intentSlug: string; city: string }>;
}) {
  const { intentSlug, city } = await params;
  if (!findSeoIntent(intentSlug)) notFound();
  return <IntentCityPage intentSlug={intentSlug} citySlug={city} />;
}
