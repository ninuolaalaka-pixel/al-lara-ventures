import { checkCORS } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  // Get ID and Amount from the Webhook's JSON body
  const orderId = req.body.orderId || req.body.order_id; 
  const rawAmount = req.body.amount || req.body.total_amount?.amount;

  if (!orderId || orderId === "{order_id}") {
    console.error("CAPTURE ERROR: No valid orderId received.");
    return res.status(400).json({ success: false, message: "Invalid orderId" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    // STEP 1: AUTHORISE - Tells Tamara you acknowledged the approval
    await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: headers,
    });

    // STEP 2: CAPTURE - Finalizes the transaction
    const captureRes = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/capture`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        order_id: orderId,
        total_amount: {
          amount: rawAmount ? parseFloat(rawAmount).toFixed(2) : "0.00", 
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
      console.log(`SUCCESS: Order ${orderId} captured.`);
      return res.status(200).json({ success: true, status: captureData.status });
    } 
    
    console.error("TAMARA REJECTION:", captureData);
    return res.status(400).json({ success: false, error: captureData });
    
  } catch (error) {
    console.error("CAPTURE SERVER ERROR:", error);
    return res.status(500).json({ success: false });
  }
}