import { checkCORS, checkRateLimit} from "./_security.js";
export default async function handler(req, res) {
    if (!checkCORS(req, res)) return;
    if (!(await checkRateLimit(req, res))) return;
    
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, customerName, customerEmail, message } = req.body || {};

  if (!amount || !customerName) {
    return res.status(400).json({ error: "Missing amount or customerName" });
  }

  try {
    const response = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZIINA_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // AED → fils
        currency_code: "AED",
        message: message || `Booking for ${customerName}`,
        success_url: "https://www.allaraventures.com/checkout-success.html",
        cancel_url: "https://www.allaraventures.com/checkout-cancelled.html",
        metadata: {
          customerName,
          customerEmail
        }
      })
    });

    const data = await response.json();
    console.log("ZIINA CREATE LINK RESPONSE:", JSON.stringify(data, null, 2));

    const url =
      data.redirect_url ||
      data.embedded_url ||
      data.payment_url ||
      data.checkout_url ||
      data.hosted_payment_url ||
      (data.links && data.links.payment_url);

    if (!url) {
      return res.status(500).json({ error: "Ziina checkout failed", details: data });
    }

    return res.status(200).json({ success: true, url });

  } catch (err) {
    console.error("Ziina error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}