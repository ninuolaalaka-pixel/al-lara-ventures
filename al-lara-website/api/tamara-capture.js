import { checkCORS } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { orderId, amount } = req.body || {};

  if (!orderId) {
    return res.status(400).json({ success: false, message: "orderId is required" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();

    // 1. AUTHORISE the order
    // This acknowledges the 'approved' status from the webhook
    await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    });

    // 2. CAPTURE the payment
    // Fixed the URL variable injection to avoid '%7Border_id%7D' errors
    const captureRes = await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
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
      console.log(`SUCCESS: Payment captured for order ${orderId}`);
      return res.status(200).json({ success: true, status: captureData.status });
    } else {
      console.error("TAMARA CAPTURE REJECTION:", JSON.stringify(captureData, null, 2));
      return res.status(200).json({ success: true, message: "Authorised, pending manual capture" });
    }

  } catch (error) {
    console.error("CAPTURE SERVER ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}