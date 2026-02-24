export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const event = req.body;
    console.log("🔔 Webhook Received:", JSON.stringify(event));

    // Tabby webhooks usually send the status in the top level
    // We normalize to lowercase to handle any inconsistencies
    const eventStatus = (event.status || "").toLowerCase();
    const paymentId = event.id;

    if (!paymentId) {
      console.log("⚠️ No payment ID found in webhook body");
      return res.status(200).json({ received: true });
    }

    // --- THE CORNER CASE LOGIC ---
    // If the event says 'authorized', we must verify and capture immediately.
    if (eventStatus === "authorized") {
      console.log(`🔍 Corner Case: Verifying payment ${paymentId}...`);

      // 2. Retrieve Payment (Verification Step)
      const verifyRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
        }
      });

      const payment = await verifyRes.json();
      const verifiedStatus = (payment.status || "").toUpperCase(); // API docs show UPPERCASE

      console.log(`📄 API Status for ${paymentId}: ${verifiedStatus}`);

      // 3. Capture Request (Only for AUTHORIZED payments)
      if (verifiedStatus === "AUTHORIZED") {
        console.log("💰 Payment is AUTHORIZED. Initiating Capture...");

        const captureRes = await fetch(`https://api.tabby.ai/api/v2/payments/${paymentId}/captures`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
          },
          body: JSON.stringify({
            amount: payment.amount, // Required: Total payment amount captured
            reference_id: `CAPT-${paymentId.substring(0, 8)}-${Date.now()}` // Idempotency key
          })
        });

        const captureData = await captureRes.json();

        if (captureRes.ok) {
          console.log("✅ Capture Successful. Payment status is now CLOSED.");
          // TODO: Update your database or send order confirmation email here
        } else {
          console.error("❌ Capture Failed:", captureData);
        }
      } else if (verifiedStatus === "CLOSED") {
        console.log("ℹ️ Payment is already CLOSED. No action needed.");
      }
    }

    // Always return 200 to Tabby to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook Runtime Error:", err.message);
    // Return 200 so Tabby doesn't keep retrying a broken script
    return res.status(200).json({ error: "Webhook handled with error" });
  }
}