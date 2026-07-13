import type { ReactNode } from "react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import YandexRtbScript from "@/components/ads/YandexRtbScript";
import ContentTopAd, {
  ContentFooterAd,
} from "@/components/ads/ContentPageAds";

// Общий каркас для контентных/SEO/правовых страниц.
// ВАЖНО: карта-SPA на «/» этим лейаутом НЕ оборачивается (она вне группы (content)).
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-map text-ink">
      <YandexRtbScript />
      <a href="#content-main" className="skip-link">
        К содержимому
      </a>
      <PublicHeader />
      <ContentTopAd />
      <main id="content-main" className="flex-1">
        {children}
      </main>
      <ContentFooterAd />
      <Footer />
    </div>
  );
}
