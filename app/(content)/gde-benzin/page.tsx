import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("gde-benzin");
}

export default function Page() {
  return <IntentHubPage intentSlug="gde-benzin" />;
}
