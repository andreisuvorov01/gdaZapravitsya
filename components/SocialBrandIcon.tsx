// Глифы Telegram и VK рисуются как currentColor-путь; у MAX — готовый цветной значок.

import type { SVGProps } from "react";

export type SocialBrand = "telegram" | "vk" | "max";

interface SocialBrandIconProps extends SVGProps<SVGSVGElement> {
  brand: SocialBrand;
}

const GLYPH: Record<Exclude<SocialBrand, "max">, string> = {
  // Самолётик Telegram.
  telegram:
    "M21.94 4.64a1.4 1.4 0 0 0-1.45-.22L3.4 11.07c-.98.38-.95 1.78.04 2.12l4.3 1.47 1.66 5.05c.2.62.99.81 1.46.36l2.37-2.27 4.2 3.1c.55.4 1.34.11 1.5-.56l3.06-14.2a1.4 1.4 0 0 0-.55-1.5ZM9.7 14.13l8.06-5.06c.16-.1.33.12.19.25l-6.62 6.02c-.24.22-.39.52-.43.84l-.22 1.92-.98-3.97Z",
  // Стилизованные буквы VK — лучше читаются на 17–18px, чем квадратный логотип.
  vk: "M13.2 17c-5 0-8.2-3.5-8.3-9.2h2.5c.1 4.2 2 6 3.5 6.4V7.8h2.4v3.6c1.4-.2 2.9-1.8 3.4-3.6h2.4c-.4 2.2-1.9 3.8-3 4.5 1.1.5 2.8 1.9 3.5 4.7h-2.7c-.5-1.7-1.8-3-3.6-3.2V17h-.5Z",
};

export default function SocialBrandIcon({
  brand,
  className = "h-[18px] w-[18px]",
  ...props
}: SocialBrandIconProps) {
  if (brand === "max") {
    // Официальный цветной значок MAX — не перекрашивается через currentColor.
    return (
      <img
        src="/social/max-colored.svg"
        alt=""
        aria-hidden
        className={`block shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={`block shrink-0 ${className}`}
      {...props}
    >
      <path d={GLYPH[brand]} />
    </svg>
  );
}
