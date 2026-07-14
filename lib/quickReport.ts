import { getClientId } from "./clientId";
import { submitOrQueueReport } from "./reportQueue";
import type { FuelStatus, FuelType, QueueLevel } from "./types";

/** Быстрый отчёт «есть / мало / нет» без полной формы. Сетевой сбой не
    считается ошибкой — отчёт уходит в офлайн-очередь (см. lib/reportQueue.ts). */
export async function submitQuickReport(
  stationId: string,
  status: Extract<FuelStatus, "yes" | "low" | "no">,
  price?: number,
  fuelType: FuelType = "АИ-92",
  queue: QueueLevel = "none"
): Promise<{ queued: boolean }> {
  const hasPrice = status !== "no" && typeof price === "number" && price > 0;
  return submitOrQueueReport(
    {
      station_id: stationId,
      status,
      fuel_types: hasPrice ? [fuelType] : [],
      queue: status === "no" ? "none" : queue,
      prices: hasPrice ? { [fuelType]: price } : undefined,
      website: "",
    },
    getClientId()
  );
}
