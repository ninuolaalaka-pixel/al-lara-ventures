export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const event = req.body;
    const paymentId = event.id;
    if (!paymentId) return res.status(200).json({ received: true });

    // Normalize status for safety
    const eventStatus = (event.status || "").toLowerCase();

    if (eventStatus === "authorized") {
      // VERIFY PAYMENT
      const verifyRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY}`, // UPDATED TO LIVE
        }
      });

      const payment = await verifyRes.json();
      const verifiedStatus = (payment.status || "").toUpperCase();

      if (verifiedStatus === "AUTHORIZED") {
        // TRIGGER CAPTURE
        const captureRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}/captures`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY}`, // UPDATED TO LIVE
          },
          body: JSON.stringify({
            amount: payment.amount,
            reference_id: `CAPT-${paymentId.substring(0, 8)}`
          })
        });

        if (captureRes.ok) {
          console.log(`✅ LIVE CAPTURE SUCCESS: ${paymentId}`);
        }
      }
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return res.status(200).json({ error: "Logged" });
  }
}