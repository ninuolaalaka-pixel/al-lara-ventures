import { checkCORS, checkRateLimit } from "./_security.js";

export default async function handler(req, res) {

  console.log("RAW BODY:", req.body);

  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

  
  const rawPhone = customer.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const finalPhone = cleanPhone.startsWith("971")
    ? cleanPhone
    : "971" + cleanPhone.replace(/^0+/, "");

 // PRE-SCORING CHECK
const preScoreResponse = await fetch("https://api.tabby.ai/api/v2/pre-scores", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY_TEST}`,
  },
  body: JSON.stringify({
    phone: finalPhone,
    amount: amount.toFixed(2),
    currency: "AED"
  })
});

// Check if the response is actually JSON before parsing
/*
const preScoreText = await preScoreResponse.text(); 
let preScore;
try {
    preScore = JSON.parse(preScoreText);
} catch (e) {
    console.error("Tabby sent non-JSON response:", preScoreText);
    return res.status(500).json({ error: "Tabby Pre-score API error", details: preScoreText });
}

if (preScore?.status === "rejected") {
  return res.status(400).json({
    success: false,
    message: "Tabby pre-scoring rejected this customer.",
    details: preScore
  });
}//
*/

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
  amount: amount.toFixed(2),
  currency: "AED",
  description: `Order from ${customer.name}`,
  lang: "en",

  shipping_address: {
    address: customer.address || "",
    city: customer.emirate || "",
    subdivision: customer.emirate || "", // CHANGED FROM emirates
    zip: "00000",
    country: "AE"
  },

  buyer: {
    email: customer.email,
    phone: finalPhone,
    name: customer.name
  },

  buyer_history: {
    loyalty_level: 0,
    registered_since: new Date(customer.registered_since).toISOString()
  },

  order_history: [],

  order: {
    reference_id: "ORDER-" + Date.now(),
    items: cartItems.map(item => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: String(item.price.toFixed(2)),
      category: "Groceries"
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
    console.log("TABBY RESPONSE:", JSON.stringify(data, null, 2));

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