import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("karta-benzina");
}

export default function Page() {
  return <IntentHubPage intentSlug="karta-benzina" />;
}
