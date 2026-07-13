import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("benzin-segodnya");
}

export default function Page() {
  return <IntentHubPage intentSlug="benzin-segodnya" />;
}
