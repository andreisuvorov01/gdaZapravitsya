import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("karta-zapravok");
}

export default function Page() {
  return <IntentHubPage intentSlug="karta-zapravok" />;
}
