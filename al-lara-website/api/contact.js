import { checkCORS, checkRateLimit } from "./_security.js";
import { checkFormLimits } from "./_limits.js";
import { escapeHtml, escapeHtmlWithBreaks, cleanText, isValidEmail, isValidPhone } from "./_utils.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Only accept plain text, and trim it
  const body = req.body || {};
  const name = cleanText(body.name);
  const email = cleanText(body.email);
  const tel = cleanText(body.tel);
  const message = cleanText(body.message);

  if (!name || !email || !tel || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: "Invalid name" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (!isValidPhone(tel)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  if (message.length < 10 || message.length > 1000) {
    return res.status(400).json({ error: "Invalid message length" });
  }

  // Stop one visitor (or a bot) from flooding the inbox
  if (!(await checkFormLimits(req, res, "contact"))) return;

  // Customer details are NOT written to the logs
  console.log("New contact message received");

  try {
    const result = await resend.emails.send({
      from: "AL LARA VENTURES <contact@allaraventures.com>",
      to: "contact@allaraventures.com",
      subject: "New Contact Message",
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(tel)}</p>
        <p><strong>Message:</strong><br>${escapeHtmlWithBreaks(message)}</p>
      `
    });

    // The email service reports problems in the result instead of throwing
    if (result?.error) {
      console.error("Contact email was not sent:", result.error.message || result.error.name || "unknown error");
      return res.status(502).json({ error: "Message could not be sent" });
    }
  } catch (error) {
    console.error("Contact email error:", error.message);
    return res.status(502).json({ error: "Message could not be sent" });
  }

  return res.status(200).json({ success: true, message: "Message received" });
}