import { STATUS_HEX, type FuelStatus } from "@/lib/types";

export interface ClusterCounts {
  yes: number;
  low: number;
  no: number;
  unknown: number;
}

const SEGMENT_ORDER: FuelStatus[] = ["yes", "low", "no", "unknown"];

/** Повторяет радиус кластера из GL-выражения ["step", point_count, 17, 10, 21, 50, 27]. */
export function radiusForCluster(total: number): number {
  if (total < 10) return 17;
  if (total < 50) return 21;
  return 27;
}

function strokeWidthForRadius(r: number): number {
  if (r <= 17) return 3;
  if (r <= 21) return 3.5;
  return 4;
}

/** Статус с наибольшим числом станций в кластере — цвет внешнего кольца. */
function dominantStatus(counts: ClusterCounts): FuelStatus | null {
  let best: FuelStatus | null = null;
  let bestCount = 0;
  for (const status of SEGMENT_ORDER) {
    if (counts[status] > bestCount) {
      bestCount = counts[status];
      best = status;
    }
  }
  return best;
}

/**
 * Строит DOM-узел кластера: тёмная "монета" со счётчиком и тонким кольцом
 * цвета преобладающего статуса в группе (вместо полного доната по всем
 * статусам — на плотной карте несколько десятков таких кружков читаются
 * быстрее одним цветовым сигналом, чем разбивкой по сегментам).
 */
export function buildClusterMarkerEl(
  counts: ClusterCounts,
  total: number,
  label: string
): HTMLDivElement {
  const outerR = radiusForCluster(total);
  const strokeWidth = strokeWidthForRadius(outerR);
  const size = outerR * 2;

  const root = document.createElement("div");
  root.className = "azs-cluster";
  root.style.width = `${size}px`;
  root.style.height = `${size}px`;
  const withFuel = counts.yes + counts.low;
  root.title = `${total} заправок · ${withFuel} с топливом`;

  const status = dominantStatus(counts);
  const ringColor = status ? STATUS_HEX[status] : "#90A4AE";
  root.style.setProperty("--ring", ringColor);
  root.style.setProperty("--ring-w", `${strokeWidth}px`);

  const countEl = document.createElement("span");
  countEl.className = "azs-cluster__count";
  countEl.textContent = label;
  root.appendChild(countEl);

  return root;
}
