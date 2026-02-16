import { checkCORS, checkRateLimit, checkBot} from "./_security.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (!(await checkBot(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, tel, message } = req.body || {};

  if (!name || !email || !tel || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // For now, just log it (later we'll send email / save to DB)
  console.log("New contact message:", { name, email, tel, message });

  //contact
await resend.emails.send({
  from: "AL LARA VENTURES <contact@allaraventures.com>",
  to: "contact@allaraventures.com",
  subject: "New Contact Message",
  html: `
    <h2>New Contact Message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${tel}</p>
    <p><strong>Message:</strong><br>${message}</p>
  `
});

  return res.status(200).json({ success: true, message: "Message received" });
}