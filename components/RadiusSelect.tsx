"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEAR_RADIUS_OPTIONS_KM } from "@/lib/useNearRadius";
import { CheckIcon, ChevronDownIcon } from "./Icons";

interface RadiusSelectProps {
  value: number;
  onChange: (km: number) => void;
  className?: string;
}

/** Радиус поиска — компактный дропдаун справа в строке сортировки, оформлен
    в стиле остальных всплывающих панелей сайта (см. HeaderMenu.tsx: тот же
    glass-dock + overlay-pop-in). Меню рендерится порталом в body с
    position: fixed и координатами из getBoundingClientRect — иначе оно
    упирается в overflow: hidden родительских листов (.nearby-sheet,
    .station-sheet-aside и т.п.) вместо того, чтобы всплывать поверх них. */
export default function RadiusSelect({ value, onChange, className = "" }: RadiusSelectProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (km: number) => {
    onChange(km);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Радиус поиска"
        className={`radius-dropdown__trigger shrink-0 ${className}`}
      >
        {value} км
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={menuRef}
            className="radius-dropdown__menu glass-dock overlay-pop-in"
            role="listbox"
            style={{ top: coords.top, right: coords.right }}
          >
            {NEAR_RADIUS_OPTIONS_KM.map((km) => (
              <li key={km} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === km}
                  onClick={() => pick(km)}
                  className={`radius-dropdown__option ${
                    value === km ? "radius-dropdown__option--active" : ""
                  }`}
                >
                  {km} км
                  {value === km && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}
