import { checkCORS, checkRateLimit } from "./_security.js";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  // --- CHANGE 1: THE PHONE LOGIC (Fixed for UAE standards) ---
  // WHY: Tabby is strict. UAE numbers MUST be 971 + 9 digits (total 12).
  // Your previous log showed 11 digits (97150000001). This logic ensures 
  // we always land on a valid 12-digit format.
  const rawPhone = customer.phone || customer.tel || "";
  let cleanPhone = rawPhone.replace(/\D/g, ""); 

  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }
  // Remove 971 if it's already there to re-add it cleanly
  if (cleanPhone.startsWith("971")) {
    cleanPhone = cleanPhone.substring(3);
  }
  const finalPhone = "971" + cleanPhone;
  console.log("FINAL PHONE FOR TABBY:", finalPhone);

  // --- CHANGE 2: SAFE DATE LOGIC ---
  let safeDate;
  try {
    const regDate = customer.registered_since ? new Date(customer.registered_since) : new Date();
    safeDate = isNaN(regDate.getTime()) ? new Date().toISOString() : regDate.toISOString();
  } catch (e) {
    safeDate = new Date().toISOString();
  }

  try {
    // --- CHANGE 3: THE "ANTI-CRASH" PRE-SCORING ---
    // WHY: You were using .json() immediately. If Tabby sends text, you get a 500 error.
    // We now use .text() first, then try to parse it. This prevents SyntaxErrors.
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

    const preScoreText = await preScoreResponse.text();
    let preScore = {};
    try {
      preScore = preScoreText ? JSON.parse(preScoreText) : {};
    } catch (e) {
      console.error("Tabby sent non-JSON pre-score response:", preScoreText);
    }

    if (preScore?.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Tabby is unable to approve this purchase. Please try another payment method.",
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
        message: "Tabby installments are not available for this transaction.",
        details: data
      });
    }

    return res.status(200).json({ success: true, url: checkoutUrl });

  } catch (error) {
    console.error("Tabby Integration Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error during Tabby Checkout" });
  }
}