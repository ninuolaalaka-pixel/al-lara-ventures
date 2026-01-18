export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ success: true, orders: [] });
  }

  if (req.method === "POST") {
    const { order } = req.body || {};

    if (!order) {
      return res.status(400).json({ error: "Missing order data" });
    }

    console.log("New order:", order);

    return res.status(200).json({ success: true, message: "Order saved" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}