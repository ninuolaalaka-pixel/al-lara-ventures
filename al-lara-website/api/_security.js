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
export const allowedOrigin = "https://www.allaraventures.com";

// CORS check
export function checkCORS(req, res) {
  const origin = req.headers.origin;
  if (origin !== allowedOrigin) {
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

// Bot protection (Turnstile)
export async function checkBot(req, res) {
  const token = req.body["cf-turnstile-response"];
  if (!token) {
    res.status(403).json({ error: "Missing bot token" });
    return false;
  }

  const verify = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  const outcome = await verify.json();

  if (!outcome.success) {
    res.status(403).json({ error: "Bot verification failed" });
    return false;
  }

  return true;
}