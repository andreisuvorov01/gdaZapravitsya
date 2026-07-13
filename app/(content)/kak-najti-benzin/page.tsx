import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("kak-najti-benzin");
}

export default function Page() {
  return <IntentHubPage intentSlug="kak-najti-benzin" />;
}
