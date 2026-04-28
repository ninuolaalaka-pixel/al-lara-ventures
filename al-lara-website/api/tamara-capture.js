// api/tamara-capture-handler.js
const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { order_id, total_amount } = req.body;
  
  if (!order_id || !total_amount) {
    return res.status(400).json({ error: "order_id and total_amount required" });
  }

  try {
    // ✅ CORRECT: Use the Capture endpoint (NOT authorise)
    const captureResponse = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: order_id,
        total_amount: {
          amount: total_amount,
          currency: "AED"
        }
      })
    });

    const captureData = await captureResponse.json();
    
    if (captureResponse.ok) {
      console.log(`✅ Order ${order_id} captured successfully`);
      return res.status(200).json({ success: true, capture_id: captureData.capture_id });
    } else {
      console.error(`❌ Capture failed:`, captureData);
      return res.status(400).json({ error: captureData });
    }
    
  } catch (error) {
    console.error("❌ Capture error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}