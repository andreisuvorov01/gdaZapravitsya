"use client";

import { memo } from "react";
import { STATUS_HEX, STATUS_LABELS, type FuelStatus } from "@/lib/types";
import { STATUS_GLYPH } from "./StatusBadge";

const ITEMS: { key: FuelStatus; short: string }[] = [
  { key: "yes", short: "Есть" },
  { key: "low", short: "Мало" },
  { key: "no", short: "Нет" },
  { key: "unknown", short: "?" },
];

/**
 * Горизонтальная легенда статусов — слева внизу, не мешает зуму справа.
 * Без пропов, поэтому memo() полностью убирает лишние ре-рендеры от
 * AppShell (poll раз в 20с, пан карты, смена фильтров и т.д. — легенда
 * ни от чего из этого не зависит).
 */
function Legend() {
  return (
    <div
      className="map-legend"
      aria-label="Легенда статусов заправок"
    >
      <div className="map-legend__track map-legend--paper glass-dock">
        {ITEMS.map(({ key, short }) => (
          <span
            key={key}
            className="map-legend__item"
            title={STATUS_LABELS[key]}
            aria-label={STATUS_LABELS[key]}
          >
            <span
              className="map-legend__dot"
              style={{
                background: STATUS_HEX[key],
                boxShadow: `0 0 6px ${STATUS_HEX[key]}55`,
              }}
              aria-hidden
            >
              {STATUS_GLYPH[key]}
            </span>
            <span className="map-legend__label">{short}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(Legend);
