// =========================
//  SECURITY & RATE LIMITING
// =========================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiter: 5 requests per minute per IP
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(5, "1 m"),
});

// Allowed domain
export const allowedOrigin = ["https://www.allaraventures.com", "https://allaraventures.com"];

// CORS check
export function checkCORS(req, res) {
  const origin = req.headers.origin;
  if (!allowedOrigin.includes(origin)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// Rate limit check
export async function checkRateLimit(req, res) {
  const ip = req.headers["x-forwarded-for"] || "unknown";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    res.status(429).json({ error: "Too many requests" });
    return false;
  }
  return true;
}
