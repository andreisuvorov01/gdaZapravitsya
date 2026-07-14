import Script from "next/script";
import { YANDEX_METRIKA_ID } from "@/lib/legal";

/** Счётчик Яндекс.Метрики — загружается сразу, без ожидания клика по баннеру cookie (152-ФЗ не требует предварительного opt-in на аналитику). */
export default function YandexMetrika() {
  const id = YANDEX_METRIKA_ID;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) { return; }
  }
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${id}', 'ym');

ym(${id}, 'init', {
  ssr: true,
  defer: true,
  webvisor: true,
  clickmap: true,
  ecommerce: "dataLayer",
  trackLinks: true,
  accurateTrackBounce: true,
  trackHash: true,
});

ym(${id}, 'hit', window.location.href, { referrer: document.referrer });
        `}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
