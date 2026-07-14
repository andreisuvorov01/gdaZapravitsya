/** Состояние разрешения геолокации через Permissions API (там, где он есть). */
export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function queryGeoPermission(): Promise<GeoPermissionState> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state as GeoPermissionState;
  } catch {
    return "unsupported";
  }
}
