import { checkCORS, checkRateLimit } from "./_security.js";
import { checkFormLimits } from "./_limits.js";
import { escapeHtml, cleanText, isValidEmail, isValidPhone } from "./_utils.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// The services on the booking form (the last one uses special hyphens, so it is written with codes)
const SERVICES = ["Standard Cleaning", "Deep Cleaning", "Move\u2011In / Move\u2011Out Cleaning"];
const normalise = (text) => text.replace(/[\u2010-\u2015\u2212]/g, "-");

// A real date written as YYYY-MM-DD, from 2 days ago (time zones) up to one year ahead
function isValidBookingDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const DAY = 24 * 60 * 60 * 1000;
  return date.getTime() >= Date.now() - 2 * DAY && date.getTime() <= Date.now() + 366 * DAY;
}

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Only accept plain text, and trim it
  const body = req.body || {};
  const name = cleanText(body.name);
  const phone = cleanText(body.phone);
  const date = cleanText(body.date);
  const requestedService = cleanText(body.service);
  const email = cleanText(body.email);
  const address = cleanText(body.address);

  if (!name || !phone || !date || !requestedService || !email || !address) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: "Invalid name" });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: "Invalid date" });
  }
  const service = SERVICES.find((s) => normalise(s) === normalise(requestedService));
  if (!service) {
    return res.status(400).json({ error: "Invalid service" });
  }
  if (address.length < 5 || address.length > 300) {
    return res.status(400).json({ error: "Invalid address" });
  }

  // Stop one visitor (or a bot) from flooding the inbox
  if (!(await checkFormLimits(req, res, "booking"))) return;

  // Customer details are NOT written to the logs
  console.log("New booking received");

  try {
    const result = await resend.emails.send({
      from: "AL LARA VENTURES <contact@allaraventures.com>",
      to: "contact@allaraventures.com",
      subject: "New Cleaning Booking",
      html: `
        <h2>New Booking Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service:</strong> ${escapeHtml(service)}</p>
        <p><strong>Date:</strong> ${escapeHtml(date)}</p>
        <p><strong>Address:</strong> ${escapeHtml(address)}</p>
      `
    });

    // The email service reports problems in the result instead of throwing
    if (result?.error) {
      console.error("Booking email was not sent:", result.error.message || result.error.name || "unknown error");
      return res.status(502).json({ error: "Booking could not be sent" });
    }
  } catch (error) {
    console.error("Booking email error:", error.message);
    return res.status(502).json({ error: "Booking could not be sent" });
  }

  return res.status(200).json({ success: true, message: "Booking received" });
}