// Extra protection for the forms that send YOU an email (contact and booking).
// It limits how often one visitor can use a form, and how many emails a form can send per day in total,
// so nobody can flood your inbox or use up your email quota.
// This file starts with "_" so Vercel does NOT publish it as a web address.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// You can change these two numbers
const PER_VISITOR_PER_HOUR = 5; // submissions from one visitor (IP address) per form
const DAILY_CAP = 40;           // emails per day, per form, from everybody together

const perVisitor = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(PER_VISITOR_PER_HOUR, "1 h"),
  prefix: "ratelimit:forms",
});

export async function checkFormLimits(req, res, formName) {
  const ip = (req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();

  try {
    const { success } = await perVisitor.limit(`${formName}:${ip}`);
    if (!success) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return false;
    }

    const day = new Date().toISOString().slice(0, 10);
    const key = `forms:${formName}:${day}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60 * 60 * 26);

    if (count > DAILY_CAP) {
      console.error(`DAILY CAP REACHED for the ${formName} form`);
      res.status(429).json({ error: "We are receiving a lot of messages right now. Please call or WhatsApp us instead." });
      return false;
    }
    return true;
  } catch (error) {
    // Redis is down: log it, but don't block real customers
    console.error("Form limit check failed, allowing request:", error.message);
    return true;
  }
}