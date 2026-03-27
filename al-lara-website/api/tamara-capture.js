import { checkCORS } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  // FIX: Look for BOTH versions of the ID key to be safe
  const orderId = req.body.orderId || req.body.order_id; 
  const amount = req.body.amount || req.body.total_amount?.amount;

  // CRITICAL: Stop the execution if the ID is missing or is just a placeholder string
  if (!orderId || orderId === "{order_id}") {
    console.error("CAPTURE BLOCKED: orderId was missing from the request body.", req.body);
    return res.status(400).json({ success: false, message: "Invalid orderId" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();

    // 1. AUTHORISE - Confirms you received the 'approved' signal
    await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    });

    // 2. CAPTURE - Using the POST body method (this is the most stable version)
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
      console.log(`MONEY CAPTURED: ${orderId} is finished.`);
      return res.status(200).json({ success: true, status: captureData.status });
    } else {
      console.error("TAMARA REJECTION:", JSON.stringify(captureData, null, 2));
      return res.status(400).json({ success: false, error: captureData });
    }

  } catch (error) {
    console.error("CAPTURE SERVER ERROR:", error);
    return res.status(500).json({ success: false });
  }
}