import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("chto-s-zapravkami");
}

export default function Page() {
  return <IntentHubPage intentSlug="chto-s-zapravkami" />;
}
