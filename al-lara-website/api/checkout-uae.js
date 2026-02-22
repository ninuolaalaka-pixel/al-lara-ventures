import { checkCORS, checkRateLimit} from "./_security.js";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // We now pull 'amount' directly, which includes the delivery fee from the frontend
  const { amount, cartItems, customer } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid total amount" });
  }

  // Convert AED to Fils for Ziina (e.g., 15.50 AED -> 1550 Fils)
  const totalAmountInFils = Math.round(amount * 100);

  console.log("ZIINA CHARGE AMOUNT (Fils):", totalAmountInFils);

  try {
    const response = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZIINA_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: totalAmountInFils,
        currency_code: "AED",
        message: `AL LARA Order: ${customer.name}`,
        success_url: "https://www.allaraventures.com/checkout-success.html",
        cancel_url: "https://www.allaraventures.com/checkout-cancelled.html",
        metadata: {
          customerEmail: customer.email,
          customerName: customer.name,
          customerPhone: customer.tel,
          shippingAddress: customer.address,
          emirate: customer.emirate
        }
      })
    });

    const data = await response.json();
    const url = data.redirect_url || data.payment_url || (data.links && data.links.payment_url);

    if (!url) {
      return res.status(500).json({ error: "Ziina session failed", details: data });
    }

    return res.status(200).json({ success: true, url });

  } catch (error) {
    console.error("Ziina error:", error);
    return res.status(500).json({ error: "Ziina checkout failed" });
  }
}