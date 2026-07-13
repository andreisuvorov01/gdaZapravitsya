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
  return intentCityMetadata("chto-s-zapravkami", city);
}

export default async function Page({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <IntentCityPage intentSlug="chto-s-zapravkami" citySlug={city} />;
}
