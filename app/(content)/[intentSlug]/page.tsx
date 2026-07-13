import { notFound } from "next/navigation";
import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";
import { findSeoIntent, getDynamicSeoIntents } from "@/lib/seo-intents";

export const revalidate = 300;

export function generateStaticParams() {
  return getDynamicSeoIntents().map((i) => ({ intentSlug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ intentSlug: string }>;
}) {
  const { intentSlug } = await params;
  if (!findSeoIntent(intentSlug)) return { title: "Страница не найдена" };
  return intentHubMetadata(intentSlug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ intentSlug: string }>;
}) {
  const { intentSlug } = await params;
  if (!findSeoIntent(intentSlug)) notFound();
  return <IntentHubPage intentSlug={intentSlug} />;
}
