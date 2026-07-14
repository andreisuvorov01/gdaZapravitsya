"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

interface ScrollFadeRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const EDGE_PX = 20;

/** Обёртка над горизонтально прокручиваемым рядом чипов (filter-scroll-row) —
    затемняет обрезанный край через mask-image, пока он не докручен, иначе
    на узких экранах непонятно, что часть чипсов скрыта за краем. */
export default function ScrollFadeRow({ children, className = "", ...rest }: ScrollFadeRowProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setFadeLeft(scrollLeft > 4);
      setFadeRight(scrollLeft + clientWidth < scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const mask = fadeLeft
    ? fadeRight
      ? `linear-gradient(to right, transparent, black ${EDGE_PX}px, black calc(100% - ${EDGE_PX}px), transparent)`
      : `linear-gradient(to right, transparent, black ${EDGE_PX}px)`
    : fadeRight
      ? `linear-gradient(to right, black calc(100% - ${EDGE_PX}px), transparent)`
      : undefined;

  return (
    <div
      ref={ref}
      className={className}
      style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
