/**
 * Server-side verification of VK Mini App launch params.
 *
 * VK passes launch parameters (vk_user_id, vk_app_id, sign, etc.) in the query
 * string when opening a Mini App. The sign is computed as:
 *   sign = base64(hmac_sha256(secret, sorted_query_string))
 * where secret is the app's protected key from VK app settings.
 *
 * A verified signature guarantees vk_user_id is not forged —
 * it can be used as a reliable client identifier instead of/in addition to
 * localStorage clientId.
 *
 * Usage:
 *   const result = verifyVkLaunchParams(searchParams, secret);
 *   if (result.valid) { ... }
 */

import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from "crypto";

// Parameters that participate in the signature (all except sign).
const SIGN_PARAMS = [
  "vk_app_id",
  "vk_are_notifications_enabled",
  "vk_is_app_user",
  "vk_is_favorite",
  "vk_language",
  "vk_platform",
  "vk_ref",
  "vk_ts",
  "vk_user_id",
] as const;

export interface VkLaunchVerification {
  valid: boolean;
  userId: number | null;
  appId: number | null;
}

/**
 * Verify VK launch params signature.
 *
 * @param searchParams — query string (window.location.search without ?)
 *                      or URLSearchParams / Record<string, string>
 * @param secret — VK app protected key (from app settings)
 * @returns VkLaunchVerification
 */
export function verifyVkLaunchParams(
  searchParams: string | URLSearchParams | Record<string, string>,
  secret: string
): VkLaunchVerification {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams instanceof URLSearchParams
        ? searchParams
        : new URLSearchParams(
            Object.entries(searchParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
          );

  const sign = params.get("sign");
  if (!sign) return { valid: false, userId: null, appId: null };

  // Collect signature params in alphabetical key order
  const pairs: string[] = [];
  for (const key of SIGN_PARAMS) {
    const val = params.get(key);
    if (val !== null) {
      pairs.push(`${key}=${val}`);
    }
  }
  pairs.sort();

  const queryString = pairs.join("&");

  // Compute HMAC-SHA256 and compare via timing-safe comparison
  const expectedSign = computeHmacSha256(queryString, secret);

  if (!timingSafeEqual(sign, expectedSign)) {
    return { valid: false, userId: null, appId: null };
  }

  const userIdStr = params.get("vk_user_id");
  const appIdStr = params.get("vk_app_id");

  return {
    valid: true,
    userId: userIdStr ? safeParseInt(userIdStr) : null,
    appId: appIdStr ? safeParseInt(appIdStr) : null,
  };
}

/**
 * Extract launch params from request for server route.
 * Client sends them as ?vk_launch_params=... or in POST body.
 */
export function extractVkLaunchParams(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("vk_launch_params");
  if (fromQuery) return fromQuery;

  return null;
}

// --- utilities ---

function computeHmacSha256(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64");
}

/**
 * Timing-safe string comparison (does not leak length via execution time).
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    return nodeTimingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // Different length — crypto.timingSafeEqual throws
    return false;
  }
}

function safeParseInt(s: string): number | null {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
}