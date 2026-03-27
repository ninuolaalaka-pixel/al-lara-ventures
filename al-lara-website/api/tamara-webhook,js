import { checkCORS } from "./_security.js";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Extracting only the necessary fields to avoid 'unused variable' warnings
  const { order_id, event_type, total_amount } = req.body;
  
  // Safety check: ensure we have a real ID and not the dashboard placeholder
  const validOrderId = (order_id && order_id !== "{order_id}") ? order_id : null;

  console.log(`WEBHOOK EVENT: ${event_type} | ORDER: ${validOrderId}`);

  try {
    if (event_type === "order_approved" && validOrderId) {
      // Call the capture API internally
      const captureUrl = `https://allaraventures.com/api/tamara-capture`;
      await fetch(captureUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: validOrderId, 
          amount: total_amount?.amount 
        })
      });
    }

    // Always return 200 so Tamara knows the message was delivered
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Handoff Error:", error);
    return res.status(500).json({ success: false });
  }
}