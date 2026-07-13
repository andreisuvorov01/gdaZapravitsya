import { Suspense } from "react";
import YandexRtbAd from "./YandexRtbAd";

/** Верхний баннер на контентных страницах. */
export default function ContentTopAd() {
  return (
    <Suspense fallback={null}>
      <YandexRtbAd slot="top" className="content-top-ad" />
    </Suspense>
  );
}

/** Блок внутри статьи / SEO-страницы города. */
export function ContentInarticleAd({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <YandexRtbAd slot="inarticle" className={className} />
    </Suspense>
  );
}

/** Блок перед футером. */
export function ContentFooterAd() {
  return (
    <Suspense fallback={null}>
      <YandexRtbAd slot="footer" className="content-footer-ad" />
    </Suspense>
  );
}
