export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, date, service, email, address  } = req.body || {};

  if (!name || !phone || !date || !service || !email || !address ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  console.log("New booking:", { name, phone, date, service, email, address });

  return res.status(200).json({ success: true, message: "Booking received" });
}