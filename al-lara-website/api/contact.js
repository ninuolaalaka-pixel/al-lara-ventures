export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, tel, message } = req.body || {};

  if (!name || !email || !tel || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // For now, just log it (later we'll send email / save to DB)
  console.log("New contact message:", { name, email, tel, message });

  return res.status(200).json({ success: true, message: "Message received" });
}