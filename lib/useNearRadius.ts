"use client";

import { useEffect, useState } from "react";

export const NEAR_RADIUS_OPTIONS_KM = [3, 5, 10, 20, 50] as const;
export const NEAR_RADIUS_DEFAULT_KM = 10;
const STORAGE_KEY = "nearRadiusKm";

/** Радиус поиска для режима "Рядом" в мобильном MobileNearbySheet,
    персистится в localStorage. */
export function useNearRadius() {
  const [radiusKm, setRadiusKmState] = useState<number>(NEAR_RADIUS_DEFAULT_KM);

  useEffect(() => {
    const raw = Number(localStorage.getItem(STORAGE_KEY));
    if (NEAR_RADIUS_OPTIONS_KM.includes(raw as (typeof NEAR_RADIUS_OPTIONS_KM)[number])) {
      setRadiusKmState(raw);
    }
  }, []);

  const setRadiusKm = (km: number) => {
    setRadiusKmState(km);
    try {
      localStorage.setItem(STORAGE_KEY, String(km));
    } catch {
      /* приватный режим — тихо игнорируем */
    }
  };

  return [radiusKm, setRadiusKm] as const;
}
