"use client";

/** Критическая ошибка корневого layout. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <html lang="ru">
      <body className="bg-surface-map font-sans text-ink antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-white">
            Бенз-Атлас
          </p>
          <div className="max-w-md space-y-2">
            <h1 className="font-display text-xl font-bold text-white">
              Сервис временно недоступен
            </h1>
            <p className="text-sm text-ink-muted">
              Произошла ошибка. Обновите страницу или зайдите позже.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] rounded-xl bg-brand-fuel px-5 text-sm font-semibold text-ink-dark transition-colors hover:bg-brand-fuelDim"
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
