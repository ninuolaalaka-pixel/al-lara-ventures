import { checkCORS, checkRateLimit } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { orderId, amount, comment } = req.body || {};

  if (!orderId || !amount) {
    return res.status(400).json({ success: false, message: "orderId and amount are required" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();
    
    // UPDATED ENDPOINT: Using the Simplified Refund path
    const response = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/simplified-refund/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        total_amount: {
          amount: parseFloat(amount).toFixed(2),
          currency: "AED" // Using AED as per your store's currency
        },
        comment: comment || "Refund processed by AL LARA VENTURES",
        // Note: simplified-refund doesn't strictly require an items array in the body
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TAMARA REFUND ERROR:", data);
      return res.status(400).json({ success: false, error: data });
    }

    // Success response should include the refund_id
    return res.status(200).json({ 
      success: true, 
      refundId: data.refund_id,
      status: data.status 
    });

  } catch (error) {
    console.error("REFUND SERVER ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}