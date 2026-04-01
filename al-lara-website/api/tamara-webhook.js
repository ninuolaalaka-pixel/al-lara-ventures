export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 1. Improved Token Validation
  /*
  const receivedToken = 
    req.headers["x-tamara-token"] || 
    req.headers["authorization"]?.replace("Bearer ", "") || 
    req.headers["authorization"];

  const expectedToken = process.env.TAMARA_SB_NOTIF_TOKEN?.trim();;

  if (!receivedToken || receivedToken.trim() !== expectedToken) {
    console.warn(`AUTH FAILED: Received [${receivedToken}], Expected [${expectedToken}]`);
    return res.status(403).json({ error: "Forbidden" });
  }
    */

  const { order_id, event_type, total_amount } = req.body;
  const validOrderId = (order_id && order_id !== "{order_id}") ? order_id : null;

  console.log(`WEBHOOK EVENT: ${event_type} | ORDER: ${validOrderId}`);

  try {
    // Only trigger capture if the order is approved
    if (event_type === "order_approved" && validOrderId) {
      const captureUrl = `https://allaraventures.com/api/tamara-capture`;
      
      await fetch(captureUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          order_id: validOrderId, // Changed to order_id to match your capture.js
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