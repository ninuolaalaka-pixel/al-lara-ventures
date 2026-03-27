import { checkCORS } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { orderId, amount } = req.body || {};

  if (!orderId || orderId === "{order_id}") {
    console.error("CAPTURE ERROR: Invalid orderId received.");
    return res.status(400).json({ success: false, message: "Invalid orderId" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();

    // 1. AUTHORISE the order first (Acknowledges the Webhook)
    await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    });

    // 2. CAPTURE the payment (Using the Body-style request to avoid URL errors)
    const captureRes = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        total_amount: {
          amount: amount ? parseFloat(amount).toFixed(2) : "0.00", 
          currency: "AED"
        },
        shipping_info: {
          shipping_company: "Allara Ventures Delivery",
          tracking_number: `ALV-${Date.now()}` 
        }
      })
    });

    const captureData = await captureRes.json();

    if (captureRes.ok) {
      console.log(`MONEY CAPTURED: Order ${orderId} is finalized.`);
      return res.status(200).json({ success: true, status: captureData.status });
    } else {
      console.error("CAPTURE REJECTED BY TAMARA:", captureData);
      return res.status(400).json({ success: false, error: captureData });
    }

  } catch (error) {
    console.error("CAPTURE CRITICAL ERROR:", error);
    return res.status(500).json({ success: false });
  }
}