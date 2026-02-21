import { checkCORS, checkRateLimit } from "./_security.js";

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

  // TOTAL AMOUNT AS STRING
  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  const totalAmountStr = totalAmount.toFixed(2);

  // PRE-SCORING CHECK (REQUIRED)
  const preScore = await fetch("https://api.tabby.ai/api/v2/pre-scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
    },
    body: JSON.stringify({
      phone: finalPhone,
      amount: totalAmountStr,
      currency: "AED"
    })
  }).then(r => r.json());

  if (preScore?.status === "rejected") {
    return res.status(400).json({
      success: false,
      message: "Tabby pre-scoring rejected this customer."
    });
  }

  // CREATE CHECKOUT SESSION
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
          amount: totalAmountStr,
          currency: "AED",
          description: `Order from ${customer.name}`,
          lang: "en",

          // SHIPPING ADDRESS
          shipping_address: {
            address: customer.address || "",
            city: customer.city || "",
            zip: "00000",
            country: "AE"
          },

          //  BUYER
          buyer: {
            email: customer.email,
            phone: finalPhone,
            name: customer.name
          },

          //  BUYER HISTORY
          buyer_history: {
            loyalty_level: 0,
            registered_since: customer.registered_since
          },

          //  ORDER HISTORY
          order_history: [],

          //  ORDER DETAILS
          order: {
            reference_id: "ORDER-" + Date.now(),
            items: cartItems.map(item => ({
              title: item.name,
              quantity: item.quantity,
              unit_price: item.price.toFixed(2),
              category: item.category || "groceries"
            }))
          }
        },

        //  CORRECT MERCHANT URLS
        merchant_urls: {
          success: "https://www.allaraventures.com/checkout-success.html",
          cancel: "https://www.allaraventures.com/checkout-cancelled.html?reason=cancel",
          failure: "https://www.allaraventures.com/checkout-cancelled.html?reason=reject"
        }
      })
    });

    const data = await response.json();

    const checkoutUrl =
      data?.configuration?.available_products?.installments?.[0]?.web_url;

    if (!checkoutUrl) {
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