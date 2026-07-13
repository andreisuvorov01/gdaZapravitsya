import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("na-kakoy-zapravke");
}

export default function Page() {
  return <IntentHubPage intentSlug="na-kakoy-zapravke" />;
}
