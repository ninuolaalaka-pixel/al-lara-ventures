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

  // --- CHANGE 1: ROBUST PHONE CLEANING ---
  // Why: Yaroslav reported receiving only "971". This logic ensures
  // we take the number, remove the leading 0, and append 971 correctly.
  const rawPhone = customer.phone || customer.tel || "";
  let cleanPhone = rawPhone.replace(/\D/g, ""); 
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }
  const finalPhone = cleanPhone.startsWith("971") ? cleanPhone : "971" + cleanPhone;

  // --- CHANGE 2: SAFE DATE LOGIC ---
  // Why: Prevents the "RangeError: Invalid time value" crash.
  let safeDate;
  try {
    const regDate = customer.registered_since ? new Date(customer.registered_since) : new Date();
    safeDate = isNaN(regDate.getTime()) ? new Date().toISOString() : regDate.toISOString();
  } catch (e) {
    safeDate = new Date().toISOString();
  }

  try {
    // --- CHANGE 3: ACTIVE PRE-SCORING CHECK ---
    // Why: Tabby requires "Background Pre-scoring". This checks if the user
    // is eligible BEFORE creating a session.
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

    const preScore = await preScoreResponse.json();
    
    // If Tabby rejects the pre-score, we stop here and tell the frontend.
    if (preScore?.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Tabby pre-scoring rejected this customer.",
        details: preScore
      });
    }

    // --- CREATE CHECKOUT SESSION ---
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
            subdivision: customer.emirate || "",
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
            registered_since: safeDate
          },
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
        merchant_urls: {
          success: "https://www.allaraventures.com/checkout-success.html",
          cancel: "https://www.allaraventures.com/checkout-cancelled.html?reason=cancel",
          failure: "https://www.allaraventures.com/checkout-cancelled.html?reason=reject"
        }
      })
    });

    const data = await response.json();
    const checkoutUrl = data?.configuration?.available_products?.installments?.[0]?.web_url;

    if (!checkoutUrl) {
      return res.status(400).json({
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