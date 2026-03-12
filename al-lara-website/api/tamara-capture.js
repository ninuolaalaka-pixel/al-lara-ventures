const TAMARA_BASE_URL = "https://api.tamara.co";

export default async function handler(req, res) {
  const { orderId, amount } = req.body || {};

  try {
    // 1. Authorize
    await fetch(`${TAMARA_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` 
      }
    });

    // 2. Capture
    const captureRes = await fetch(`${TAMARA_BASE_URL}/payments/capture`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` 
      },
      body: JSON.stringify({
        order_id: orderId,
        total_amount: { amount, currency: "AED" }
      })
    });

    const captureData = await captureRes.json();
    res.status(200).json({ success: true, status: captureData.status });
  } catch (error) {
    res.status(500).json({ success: false, message: "Capture failed" });
  }
}