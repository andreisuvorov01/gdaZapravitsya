// Генерирует app/(content)/{intent}/page.tsx и [city]/page.tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const intents = [
  "gde-benzin",
  "gde-zapravitsya",
  "na-kakoy-zapravke",
  "ocheredi-na-azs",
  "limity-na-benzin",
  "chto-s-zapravkami",
  "nalichie-benzina",
  "kak-najti-benzin",
  "benzin-segodnya",
  "karta-zapravok",
  "karta-benzina",
];

const hubPage = (slug) => `import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("${slug}");
}

export default function Page() {
  return <IntentHubPage intentSlug="${slug}" />;
}
`;

const cityPage = (slug) => `import IntentCityPage, { intentCityMetadata } from "@/components/seo/IntentCityPage";
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
  return intentCityMetadata("${slug}", city);
}

export default async function Page({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <IntentCityPage intentSlug="${slug}" citySlug={city} />;
}
`;

for (const slug of intents) {
  const dir = join(root, "app", "(content)", slug);
  const cityDir = join(dir, "[city]");
  mkdirSync(cityDir, { recursive: true });
  writeFileSync(join(dir, "page.tsx"), hubPage(slug));
  writeFileSync(join(cityDir, "page.tsx"), cityPage(slug));
  console.log("✓", slug);
}
