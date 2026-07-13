"use client";

import Link from "next/link";
import { useEffect } from "react";
import BrandLogo from "@/components/BrandLogo";

/** Ошибка в сегменте приложения — с возможностью повторить. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <BrandLogo size="sm" href="/" showTagline={false} />
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-xl font-bold text-white">
          Что-то пошло не так
        </h1>
        <p className="text-sm text-ink-muted">
          Не удалось загрузить страницу. Попробуйте обновить или вернитесь на карту.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[44px] rounded-xl bg-brand-fuel px-5 text-sm font-semibold text-ink-dark transition-colors hover:bg-brand-fuelDim"
        >
          Повторить
        </button>
        <Link
          href="/"
          className="min-h-[44px] rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          На карту
        </Link>
      </div>
    </div>
  );
}
