import BrandMark from "@/components/BrandMark";

/** Подпись бренда — те же шрифты и цвета, что BrandLogo. */
function BrandWordmark({
  titlePx,
  taglinePx,
  className = "",
}: {
  titlePx: number;
  taglinePx: number;
  className?: string;
}) {
  return (
    <div className={`leading-none ${className}`}>
      <p
        className="font-display font-bold tracking-tight text-white"
        style={{ fontSize: titlePx }}
      >
        бенз<span className="text-brand-fuel">рядом</span>
      </p>
      <p
        className="font-medium uppercase text-ink-muted"
        style={{
          fontSize: taglinePx,
          marginTop: taglinePx * 0.35,
          letterSpacing: "0.1em",
        }}
      >
        топливо в реальном времени
      </p>
    </div>
  );
}

/** Скрытая страница для экспорта PNG в соцсети (скриншот через Playwright). */
export default function BrandExportPage() {
  return (
    <main className="min-h-screen bg-black p-6 font-sans">
      {/* Аватар Telegram / VK */}
      <section
        id="export-avatar"
        className="mb-8 flex items-center justify-center overflow-hidden bg-[#0A0E12]"
        style={{ width: 1024, height: 1024 }}
      >
        <BrandMark pixelSize={400} />
      </section>

      {/* Квадрат для постов */}
      <section
        id="export-post"
        className="mb-8 flex flex-col items-center justify-center gap-14 overflow-hidden bg-[#0A0E12]"
        style={{ width: 1080, height: 1080 }}
      >
        <BrandMark pixelSize={400} />
        <BrandWordmark titlePx={108} taglinePx={30} className="text-center" />
      </section>

      {/* Обложка VK */}
      <section
        id="export-banner"
        className="relative mb-8 flex items-center overflow-hidden bg-[#0A0E12]"
        style={{ width: 1590, height: 400 }}
      >
        <div className="flex items-center gap-8 pl-[72px]">
          <BrandMark pixelSize={256} />
          <BrandWordmark titlePx={88} taglinePx={28} />
        </div>
        <div className="absolute right-[90px] top-[100px] text-right">
          <div className="flex justify-end gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-fuel-yes" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuel-low" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuel-no" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuel-unknown" />
          </div>
          <p className="mt-3 text-lg text-ink-muted">
            есть · мало · нет · нет данных
          </p>
        </div>
      </section>

      {/* Обложка канала Telegram — 1280×720, безопасная зона по центру */}
      <section
        id="export-tg-cover"
        className="relative mb-8 flex items-center overflow-hidden bg-[#0A0E12]"
        style={{ width: 1280, height: 720 }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(255,176,32,0.35) 0%, rgba(255,176,32,0) 70%)",
          }}
          aria-hidden
        />
        <div className="relative flex w-full items-center justify-between px-20">
          <div className="flex items-center gap-10">
            <BrandMark pixelSize={300} />
            <div>
              <BrandWordmark titlePx={72} taglinePx={24} />
              <p
                className="mt-5 max-w-md text-[22px] leading-snug text-ink-muted"
                style={{ letterSpacing: "0.02em" }}
              >
                Где есть бензин, лимиты на руки и очереди на АЗС
              </p>
              <p className="mt-4 font-medium text-brand-fuel" style={{ fontSize: 26 }}>
                t.me/BenzRyadom
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex justify-end gap-3">
              <span className="h-3 w-3 rounded-full bg-fuel-yes" />
              <span className="h-3 w-3 rounded-full bg-fuel-low" />
              <span className="h-3 w-3 rounded-full bg-fuel-no" />
              <span className="h-3 w-3 rounded-full bg-fuel-unknown" />
            </div>
            <p className="mt-3 text-base text-ink-muted">
              есть · мало · нет · нет данных
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
