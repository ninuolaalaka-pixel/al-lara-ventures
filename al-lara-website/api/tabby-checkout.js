import { checkCORS, checkRateLimit } from "./_security.js";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  // 1. IMPROVED PHONE CLEANING (Docs show +971 format)
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
    // --- CONSOLIDATED CHECKOUT SESSION (Covers Eligibility & Creation) ---
    // According to docs: Use this endpoint for both. 
    // Status "created" = Eligible | Status "rejected" = Ineligible
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
    console.log("TABBY API RESPONSE STATUS:", data.status);

    // --- LOGIC FROM THE DOCS ---
    // 1. Check for explicit rejection
    // 2. Check for missing web_url
    const installmentProduct = data?.configuration?.available_products?.installments?.[0];
    const checkoutUrl = installmentProduct?.web_url;
    const rejectionReason = installmentProduct?.rejection_reason;

    if (data.status === "rejected" || !checkoutUrl) {
      let userMessage = "Sorry, Tabby is unable to approve this purchase. Please use an alternative payment method.";
      
      // Bonus: Map the rejection reasons from the docs
      if (rejectionReason === "order_amount_too_high") {
        userMessage = "This purchase is above your current spending limit with Tabby. Try a smaller cart.";
      } else if (rejectionReason === "order_amount_too_low") {
        userMessage = "The purchase amount is below the minimum required to use Tabby.";
      }

      return res.status(400).json({
        success: false,
        message: userMessage,
        details: data
      });
    }

    // --- SUCCESS ---
    return res.status(200).json({ success: true, url: checkoutUrl });

  } catch (error) {
    console.error("Tabby Integration Error:", error);
    return res.status(500).json({ success: false, message: "Tabby server error. Please try again." });
  }
}