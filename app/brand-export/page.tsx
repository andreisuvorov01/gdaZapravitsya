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
        Где<span className="text-brand-fuel">Заправиться.рф</span>
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
      {/* Аватар для соцсетей */}
      <section
        id="export-avatar"
        className="mb-8 flex items-center justify-center overflow-hidden bg-[#0A0D1F]"
        style={{ width: 1024, height: 1024 }}
      >
        <BrandMark pixelSize={400} />
      </section>

      {/* Квадрат для постов */}
      <section
        id="export-post"
        className="mb-8 flex flex-col items-center justify-center gap-14 overflow-hidden bg-[#0A0D1F]"
        style={{ width: 1080, height: 1080 }}
      >
        <BrandMark pixelSize={400} />
        <BrandWordmark titlePx={64} taglinePx={20} className="text-center" />
      </section>

      {/* Широкая обложка */}
      <section
        id="export-banner"
        className="relative mb-8 flex items-center overflow-hidden bg-[#0A0D1F]"
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

      {/* Open Graph превью (1200×628) — под точный размер, без обрезки кропом */}
      <section
        id="export-og"
        className="relative mb-8 flex items-center overflow-hidden bg-[#0A0D1F]"
        style={{ width: 1200, height: 628 }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0) 70%)",
          }}
          aria-hidden
        />
        <div className="relative flex w-full items-center px-16">
          <div className="flex items-center gap-6">
            <BrandMark pixelSize={150} />
            <BrandWordmark titlePx={42} taglinePx={13} />
          </div>
        </div>
      </section>
    </main>
  );
}
