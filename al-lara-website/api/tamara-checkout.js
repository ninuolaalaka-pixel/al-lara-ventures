import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_BASE_URL = "https://api.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, cartItems, customer } = req.body || {};

  // --- PHONE CLEANING (UAE FORMAT) ---
  // We keep it as a plain numeric string without "+" because Tamara accepts that,
  // and your earlier logs were about *data types*, not phone format.
  let cleanPhone = (customer?.tel || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "971" + cleanPhone; // e.g. 9715XXXXXXXX

  // 1. Format the items - Ensure amount is a STRING with 2 decimals
  const items = (cartItems || []).map((item, index) => {
    const p = parseFloat(item.price) || 0;
    const q = parseInt(item.quantity) || 1;
    return {
  name: item.name,
  type: "Physical",
  reference_id: String(index + 1),
  quantity: q,
  unit_price: { amount: p, currency: "AED" },
  total_amount: { amount: p * q, currency: "AED" },
  tax_amount: { amount: 0, currency: "AED" },
  discount_amount: { amount: 0, currency: "AED" }
};
  });

  // 2. THE RECONCILIATION (Ensures Sum of Items == Grand Total)
  const totalAmountNumber = parseFloat(amount) || 0;
  const itemsSubtotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount.amount), 0);
  const adjustment = totalAmountNumber - itemsSubtotal;

  // Add VAT/Shipping as a service item so the math is perfect
  if (adjustment > 0.01) {
    items.push({
      name: "VAT & Delivery (Included)",
      type: "Service",
      reference_id: "fees-01",
      quantity: 1,
      unit_price: { amount: adjustment.toFixed(2), currency: "AED" },
      total_amount: { amount: adjustment.toFixed(2), currency: "AED" },
      tax_amount: { amount: "0.00", currency: "AED" },
      discount_amount: { amount: "0.00", currency: "AED" }
    });
  }

  // 3. Simple Validation
  if (isNaN(totalAmountNumber) || totalAmountNumber <= 0 || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order amount or empty cart"
    });
  }

 // DEBUG LOGS — ADD HERE
  console.log("DEBUG amount:", amount, Number(amount));
  console.log("DEBUG cartItems:", cartItems);
  console.log("DEBUG items:", items);

  try {
    const response = await fetch(`${TAMARA_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
      },
      body: JSON.stringify({
        order_reference_id: "ALV-TAM-" + Date.now(),

       total_amount: {
       amount: Number(amount),
       currency: "AED"
      },


        // REQUIRED FOR UAE
        currency: "AED",
        country_code: "AE",
        payment_type: "PAY_BY_INSTALMENTS",
        items,

        // ... inside JSON.stringify({
  consumer: {
    first_name: (customer?.name || "Customer").split(' ')[0], // Tamara prefers just the first name
    last_name: (customer?.name || "Customer").split(' ').slice(1).join(' ') || "Guest", // Last name can't be just "-"
    phone_number: finalPhone || "971500000000", // Fallback if phone cleaning failed
    email: customer?.email || "customer@example.com",
  },

  shipping_address: {
    first_name: (customer?.name || "Customer").split(' ')[0],
    last_name: (customer?.name || "Customer").split(' ').slice(1).join(' ') || "Guest",
    line1: customer?.address || "UAE Street",
    city: customer?.emirate || "Dubai",
    region: customer?.emirate || "Dubai", // ADD THIS: Tamara often requires region for UAE
    country_code: "AE",
  },
// ...

        billing_address: {
          first_name: customer?.name,
          last_name: "-",
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          country_code: "AE",
        },

        merchant_url: {
          success: "https://allaraventures.com/checkout-success.html?pg=tamara&orderId={order_id}",
          failure: "https://allaraventures.com/checkout-cancelled.html",
          cancel: "https://allaraventures.com/checkout-cancelled.html"
        },

        platform: "WEB"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TAMARA DETAILED ERROR:", JSON.stringify(data, null, 2));
      return res.status(400).json({
        success: false,
        message: data.message || "Invalid Request"
      });
    }

    return res.status(200).json({
      success: true,
      url: data.checkout_url,
      orderId: data.order_id
    });

  } catch (error) {
    console.error("TAMARA DETAILED ERROR:", JSON.stringify(data, null, 2));
    return res.status(500).json({
      success: false,
      message: "Server connection error"
    });
  }
}