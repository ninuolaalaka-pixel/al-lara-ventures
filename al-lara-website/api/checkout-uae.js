

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

  // Calculate total amount in fils (AED * 100)
  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity * 100;
  }, 0);

  try {
    const response = await fetch("https://api.ziina.com/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZIINA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: totalAmount,
        currency: "AED",
        description: `Order from ${customer.name}`,

        // ⭐ CUSTOM REDIRECTS (your pages)
        success_redirect_url: "https://al-lara-ventures.vercel.app/checkout-success",
        cancel_redirect_url: "https://al-lara-ventures.vercel.app/checkout-cancelled",

        metadata: {
          customerEmail: customer.email,
          customerName: customer.name,
          region: "UAE"
        }
      })
    });

    const data = await response.json();

    if (!data.payment_url) {
      return res.status(500).json({ error: "Ziina checkout failed" });
    }

    return res.status(200).json({
      success: true,
      url: data.payment_url
    });

  } catch (error) {
    console.error("Ziina error:", error);
    return res.status(500).json({ error: "Ziina checkout failed" });
  }
}