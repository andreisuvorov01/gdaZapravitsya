"use client";

import { buildRouteLinks } from "@/lib/navigation";
import type { StationStatus } from "@/lib/types";

/** Внешняя навигация до заправки (Яндекс, 2ГИС, Google). */
export default function RouteButtons({ station }: { station: StationStatus }) {
  const links = buildRouteLinks(station.lat, station.lng, station.name);

  return (
    <div className="route-actions">
      <p className="route-actions__title">Открыть в навигаторе</p>
      <div className="route-actions__grid">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-chip"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
