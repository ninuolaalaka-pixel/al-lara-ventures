import { checkCORS, checkRateLimit, } from "./_security.js";
export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

   const rawPhone = customer.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const finalPhone = cleanPhone.startsWith("971")
    ? cleanPhone
    : "971" + cleanPhone.replace(/^0+/, "");

  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  try {
  const response = await fetch("https://api.tabby.ai/api/v2/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
    },
    body: JSON.stringify({
      merchant_code: process.env.TABBY_MERCHANT_CODE,   

      payment: {
        amount: Number(totalAmount.toFixed(2)),
        currency: "AED",
        description: `Order from ${customer.name}`,
         lang: "en",

        buyer: {
          email: customer.email,
          phone: finalPhone,
          name: customer.name
        },

        order: {
          reference_id: "ORDER-" + Date.now(),
          items: cartItems.map(item => ({
            title: item.name,
            quantity: item.quantity,
            unit_price: Number(item.price.toFixed(2)),
            category: item.category || "general"   
          }))
        }
      },

      merchant_urls: {
        success: "https://www.allaraventures.com/checkout-success.html",
        cancel: "https://www.allaraventures.com/checkout-cancelled.html",
        failure: "https://www.allaraventures.com/checkout-cancelled.html"
      }
    })
  });

    const data = await response.json();

    const checkoutUrl =
     data?.configuration?.available_products?.installments?.[0]?.web_url;

    if (!checkoutUrl) {
        console.error("Tabby API Error Details:", data);
    return res.status(response.status).json({ 
        success: false, 
        message: "Tabby rejected the request", 
        details: data
      });
    }

    return res.status(200).json({ success: true, url: checkoutUrl });

  } catch (error) {
    console.error("Tabby error:", error);
    return res.status(500).json({ error: "Tabby checkout failed" });
  }
}