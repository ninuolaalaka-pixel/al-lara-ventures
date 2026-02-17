export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const event = req.body;

    console.log("Tabby webhook received:", event);

    // Only handle authorized events
    if (event.status === "authorized" && event.id) {
      const paymentId = event.id;

      // 1) Verify payment status
      const verifyRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
        }
      });

      const payment = await verifyRes.json();
      console.log("Payment verification:", payment);

      // 2) Capture full amount
      if (payment.status === "AUTHORIZED") {
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
        console.log("Capture response:", captureData);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook error" });
  }
}