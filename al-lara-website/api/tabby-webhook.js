export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const event = req.body;

    console.log("🔔 Tabby webhook received:", event);

    // Only handle "authorized" events (lowercase)
    if (event.status === "authorized" && event.id) {
      const paymentId = event.id;

      console.log("🔍 Verifying payment:", paymentId);

      // 1) Retrieve payment details
      const verifyRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
        }
      });

      const payment = await verifyRes.json();
      console.log("📄 Payment verification result:", payment);

      // 2) Check if payment is AUTHORIZED (uppercase)
      if (payment.status === "AUTHORIZED") {
        console.log("💰 Payment authorized. Capturing...");

        const captureRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}/captures`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
          },
          body: JSON.stringify({
            amount: payment.amount
          })
        });

        const captureData = await captureRes.json();
        console.log("✅ Capture response:", captureData);
      } else {
        console.log("⚠️ Payment NOT authorized. Status:", payment.status);
      }
    }

    res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ error: "Webhook error" });
  }
}