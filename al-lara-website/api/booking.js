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

  const { name, phone, date, service, email, address  } = req.body || {};

  if (!name || !phone || !date || !service || !email || !address ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  console.log("New booking:", { name, phone, date, service, email, address });

  //booking
await resend.emails.send({
  from: "AL LARA VENTURES <contact@allaraventures.com>",
  to: "contact@allaraventures.com",
  subject: "New Cleaning Booking",
  html: `
    <h2>New Booking Request</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Service:</strong> ${service}</p>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Address:</strong> ${address}</p>
  `
});

  return res.status(200).json({ success: true, message: "Booking received" });
}