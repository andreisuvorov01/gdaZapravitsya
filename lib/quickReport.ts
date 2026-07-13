import { getClientId } from "./clientId";
import type { FuelStatus, FuelType, QueueLevel } from "./types";

/** Быстрый отчёт «есть / мало / нет» без полной формы. */
export async function submitQuickReport(
  stationId: string,
  status: Extract<FuelStatus, "yes" | "low" | "no">,
  price?: number,
  fuelType: FuelType = "АИ-92",
  queue: QueueLevel = "none"
): Promise<void> {
  const hasPrice = status !== "no" && typeof price === "number" && price > 0;
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": getClientId(),
    },
    body: JSON.stringify({
      station_id: stationId,
      status,
      fuel_types: hasPrice ? [fuelType] : [],
      queue: status === "no" ? "none" : queue,
      prices: hasPrice ? { [fuelType]: price } : undefined,
      website: "",
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(String(j.error ?? "Не удалось отправить"));
  }
}
