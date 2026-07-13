"use client";

import { useState } from "react";
import { resolveBrandBadge, brandLogoUrl } from "@/lib/brand-logos";

interface BrandBadgeProps {
  brand: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}

// Узнаваемый бейдж сети АЗС: реальный логотип на подложке, иначе — монограмма.
export default function BrandBadge({
  brand,
  name,
  size = 44,
  className = "",
}: BrandBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const b = resolveBrandBadge(brand, name);
  const logo = brandLogoUrl(b);

  const fontSize = b.label.length >= 4 ? size * 0.3 : size * 0.42;
  const monogram = (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold leading-none shadow-md ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size, background: b.bg, color: b.fg, fontSize }}
      aria-hidden
      title={brand || name}
    >
      {b.label}
    </span>
  );

  if (logo && !imgError) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-white/10 ${className}`}
        style={{
          width: size,
          height: size,
          background: b.darkBg ? "#0b0b0b" : "#ffffff",
          padding: size * 0.12,
        }}
        title={brand || name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={brand || name}
          className="h-full w-full object-contain"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  return monogram;
}
