import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("limity-na-benzin");
}

export default function Page() {
  return <IntentHubPage intentSlug="limity-na-benzin" />;
}
