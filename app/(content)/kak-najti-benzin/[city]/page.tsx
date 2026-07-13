import IntentCityPage, { intentCityMetadata } from "@/components/seo/IntentCityPage";
import { PRIORITY_CITY_PRESETS } from "@/lib/cities";

export const revalidate = 300;

export function generateStaticParams() {
  return PRIORITY_CITY_PRESETS.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return intentCityMetadata("kak-najti-benzin", city);
}

export default async function Page({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <IntentCityPage intentSlug="kak-najti-benzin" citySlug={city} />;
}
