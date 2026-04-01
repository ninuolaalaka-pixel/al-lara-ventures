export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Validate Tamara token
  const tamaraToken = req.headers["authorization"]?.replace("Bearer ", "") || 
                      req.query?.tamaraToken;

  if (!tamaraToken || tamaraToken !== process.env.TAMARA_NOTIFICATION_KEY) {
    console.warn("Invalid or missing Tamara token");
    return res.status(403).json({ error: "Forbidden" });
  }

  const { order_id, event_type, total_amount } = req.body;
  const validOrderId = (order_id && order_id !== "{order_id}") ? order_id : null;

  console.log(`WEBHOOK EVENT: ${event_type} | ORDER: ${validOrderId}`);

  try {
    if (event_type === "order_approved" && validOrderId) {
      const captureUrl = `https://www.allaraventures.com/api/tamara-capture`;
      await fetch(captureUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Origin": "https://www.allaraventures.com"
        },
        body: JSON.stringify({ 
          orderId: validOrderId, 
          amount: total_amount?.amount 
        })
      });
    }
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ success: false });
  }
}