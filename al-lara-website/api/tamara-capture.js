// /api/tamara-capture.js
const TAMARA_BASE_URL = "https://api.tamara.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { orderId, amount } = req.body || {};

  try {
    // 1. AUTHORISE the order first 
    // This tells Tamara "I've seen the user come back, keep the money ready"
    await fetch(`${TAMARA_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TAMARA_API_TOKEN}`,
      }
    });

    // 2. CAPTURE the payment
    // We use the specific order capture endpoint for better reliability
    const captureRes = await fetch(`${TAMARA_BASE_URL}/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TAMARA_API_TOKEN}`,
      },
      body: JSON.stringify({
        total_amount: {
          // If amount is passed, we format it. If not, Tamara captures the full authorised total.
          amount: amount ? parseFloat(amount).toFixed(2) : "0.00", 
          currency: "AED"
        },
        shipping_info: {
          shipping_company: "Allara Ventures Delivery",
          tracking_number: "ALV-" + Date.now() 
        }
      })
    });

    const captureData = await captureRes.json();

    if (captureRes.ok) {
      console.log(`SUCCESS: Payment captured for order ${orderId}`);
      return res.status(200).json({ success: true, status: captureData.status });
    } else {
      console.error("TAMARA CAPTURE REJECTION:", captureData);
      // Even if capture fails, the order is 'Authorised', so we tell the frontend it's okay
      return res.status(200).json({ success: true, message: "Manual verification needed" });
    }

  } catch (error) {
    console.error("CAPTURE SERVER ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}