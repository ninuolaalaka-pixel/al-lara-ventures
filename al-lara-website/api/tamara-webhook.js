import jwt from 'jsonwebtoken';

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.query.tamaraToken;
  const secretKey = process.env.TAMARA_SB_NOTIF_TOKEN;

  try {
    if (!token) throw new Error("No token provided");
    jwt.verify(token, secretKey, { algorithms: ['HS256'] });
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { order_id, event_type } = req.body;
  console.log(`Webhook received: ${event_type} for order ${order_id}`);

  if (event_type === "order_approved") {
    try {
      const authoriseResponse = await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${order_id}/authorise`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
          "Content-Type": "application/json"
        }
      });

      const authoriseData = await authoriseResponse.json();

      if (!authoriseResponse.ok) {
        console.error("Authorise failed:", authoriseData);
        return res.status(400).json({ error: "Authorisation failed" });
      }

      console.log("Order authorised:", order_id);
    } catch (error) {
      console.error("Authorise error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (event_type === "order_authorised") {
    try {
      // Fetch full order details from Tamara to get amount and items
      const orderResponse = await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${order_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
          "Content-Type": "application/json"
        }
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        console.error("Failed to fetch order details:", orderData);
        return res.status(400).json({ error: "Could not retrieve order details" });
      }

      // Hand off to the capture handler with full order data
      const captureResponse = await fetch(`https://${req.headers.host}/api/tamara-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id, orderData })
      });

      const captureResult = await captureResponse.json();

      if (!captureResponse.ok) {
        console.error("Capture failed:", captureResult);
        return res.status(400).json({ error: "Capture failed" });
      }

      console.log("Order captured:", order_id);
    } catch (error) {
      console.error("Capture error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(200).json({ success: true });
}