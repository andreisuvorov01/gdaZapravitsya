import IntentHubPage, { intentHubMetadata } from "@/components/seo/IntentHubPage";

export function generateMetadata() {
  return intentHubMetadata("nalichie-benzina");
}

export default function Page() {
  return <IntentHubPage intentSlug="nalichie-benzina" />;
}
