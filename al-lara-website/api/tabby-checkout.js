import { checkCORS, checkRateLimit } from "./_security.js";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  // 1. PRODUCTION PHONE CLEANING
  const rawPhone = customer.phone || customer.tel || "";
  let cleanPhone = rawPhone.replace(/\D/g, ""); 
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "+971" + cleanPhone; 

  // 2. SAFE DATE LOGIC
  let safeDate;
  try {
    const regDate = customer.registered_since ? new Date(customer.registered_since) : new Date();
    safeDate = isNaN(regDate.getTime()) ? new Date().toISOString() : regDate.toISOString();
  } catch (e) {
    safeDate = new Date().toISOString();
  }

  try {
    // --- LIVE CHECKOUT SESSION ---
    const response = await fetch("https://api.tabby.ai/api/v2/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // UPDATED: Now using the LIVE Secret Key from Vercel
        "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        merchant_code: process.env.TABBY_MERCHANT_CODE,
        payment: {
          amount: amount.toFixed(2),
          currency: "AED",
          description: `Live Order: ${customer.name}`,
          buyer: {
            email: customer.email,
            phone: finalPhone,
            name: customer.name
          },
          buyer_history: {
            loyalty_level: 0,
            registered_since: safeDate
          },
          shipping_address: {
            address: customer.address || "",
            city: customer.emirate || "",
            subdivision: customer.emirate || "",
            zip: "00000",
            country: "AE"
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
        lang: "en",
        merchant_urls: {
          success: "https://www.allaraventures.com/checkout-success.html",
          cancel: "https://www.allaraventures.com/checkout-cancelled.html?reason=cancel",
          failure: "https://www.allaraventures.com/checkout-cancelled.html?reason=reject"
        }
      })
    });

    const data = await response.json();

    // LIVE LOGGING: Only log the status to keep logs clean/safe
    console.log("TABBY LIVE STATUS:", data.status);

    const installmentProduct = data?.configuration?.available_products?.installments?.[0];
    const checkoutUrl = installmentProduct?.web_url;
    const rejectionReason = installmentProduct?.rejection_reason;

    if (data.status === "rejected" || !checkoutUrl) {
      let userMessage = "Sorry, Tabby is unable to approve this purchase. Please use an alternative payment method.";
      
      if (rejectionReason === "order_amount_too_high") {
        userMessage = "This purchase is above your spending limit. Try a smaller cart.";
      } else if (rejectionReason === "order_amount_too_low") {
        userMessage = "The amount is below the minimum required for Tabby.";
      }

      return res.status(400).json({ success: false, message: userMessage });
    }

    return res.status(200).json({ success: true, url: checkoutUrl });

  } catch (error) {
    // SECURITY: Only log the message to avoid leaking headers
    console.error("Tabby Live Error:", error.message);
    return res.status(500).json({ success: false, message: "System error. Please try again." });
  }
}