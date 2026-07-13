import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("ocheredi-na-azs");
}

export default function Page() {
  return <IntentHubPage intentSlug="ocheredi-na-azs" />;
}
