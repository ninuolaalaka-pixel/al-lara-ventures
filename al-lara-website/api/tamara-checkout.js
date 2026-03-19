import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  // --- PHONE CLEANING (UAE FORMAT) ---
  let cleanPhone = (customer?.tel || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "971" + cleanPhone; // e.g. 9715XXXXXXXX

  if (!cleanPhone) {
  return res.status(400).json({
    success: false,
    message: "Valid phone number is required for Tamara",
  });
}

  // 1. DEFINE ORDER REFERENCE (Fixes the ReferenceError)
  const orderRef = "ALV-" + Date.now();

  // 1. ITEMS (all amounts: rounded numbers)
  const items = (cartItems || []).map((item, index) => {
    const p = round2(item.price);
    const q = Number(item.quantity) || 1;
    const lineTotal = round2(p * q);

    return {
      name: item.name,
      description: item.name, // Added: Often mandatory on Live
      type: "Physical",
      reference_id: String(index + 1),
      quantity: q,
      unit_price: { amount: p, currency: "AED" },
      total_amount: { amount: lineTotal, currency: "AED" },
      tax_amount: { amount: 0, currency: "AED" },
      discount_amount: { amount: 0, currency: "AED" },
    };
  });

  const totalAmountNumber = round2(amount);
  const itemsSubtotal = items.reduce((sum, item) => sum + round2(item.total_amount.amount), 0);
  const adjustment = round2(totalAmountNumber - itemsSubtotal);

  if (Math.abs(adjustment) > 0.01) {
    items.push({
      name: "VAT and Delivery",
      description: "Shipping and handling fees", // Added
      type: "Physical", // Changed from Service to Physical for safety
      reference_id: "fees-01",
      quantity: 1,
      unit_price: { amount: adjustment, currency: "AED" },
      total_amount: { amount: adjustment, currency: "AED" },
      tax_amount: { amount: 0, currency: "AED" },
      discount_amount: { amount: 0, currency: "AED" },
    });
  }

  if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0 || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order amount or empty cart",
    });
  }

  console.log("DEBUG amount:", amount, Number(amount));
  console.log("DEBUG cartItems:", cartItems);
  console.log("DEBUG items:", items);

  const fullName = customer?.name || "Customer Guest";
  const firstName = fullName.split(" ")[0];
  const lastName = fullName.split(" ").slice(1).join(" ") || "Guest";

  try {
    const response = await fetch(`${TAMARA_SANDBOX_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
      },
      body: JSON.stringify({
       order_reference_id: orderRef,
       order_number: orderRef,
       total_amount: {
       amount: totalAmountNumber.toFixed(2), // "385.09" (String)
      currency: "AED",
      },

        currency: "AED",
        country_code: "AE",
        payment_type: "PAY_BY_INSTALMENTS",
        items,

        consumer: {
          first_name: firstName,
          last_name: lastName,
          phone_number: finalPhone.trim(),
          email: customer?.email || "customer@example.com",
        },

        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          region: customer?.emirate || "Dubai",
          country_code: "AE",
        },

        billing_address: {
          first_name: firstName,
          last_name: lastName,
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          region: customer?.emirate || "Dubai",
          country_code: "AE",
        },

        merchant_url: {
          success:
            "https://allaraventures.com/checkout-success.html?pg=tamara&orderId={order_id}",
          failure: "https://allaraventures.com/checkout-cancelled.html",
          cancel: "https://allaraventures.com/checkout-cancelled.html",
        },

        platform: "WEB",
        is_guest_checkout: true
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TAMARA DETAILED ERROR:", response.status, JSON.stringify(data, null, 2));
      return res.status(400).json({
        success: false,
        message: data.message || "Invalid Request",
      });
    }

    return res.status(200).json({
      success: true,
      url: data.checkout_url,
      orderId: data.order_id,
    });
  } catch (error) {
    console.error("TAMARA RAW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server connection error",
    });
  }
}
