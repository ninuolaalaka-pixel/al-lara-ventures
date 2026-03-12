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

  // --- ITEMS: ENSURE ALL NUMERIC FIELDS ARE REAL NUMBERS ---
  const items = (cartItems || []).map((item, index) => {
    const priceNumber = Number(item.price);
    const qtyNumber = Number(item.quantity);

    const unitPrice = Number.isFinite(priceNumber) ? priceNumber : 0;
    const totalItemAmount = Number.isFinite(priceNumber * qtyNumber)
      ? priceNumber * qtyNumber
      : 0;

    return {
      name: item.name,
      type: "Physical",
      reference_id: String(index + 1),
      quantity: qtyNumber, // number
      unit_price: { amount: unitPrice, currency: "AED" }, // number
      total_amount: { amount: totalItemAmount, currency: "AED" }, // number
      tax_amount: { amount: 0, currency: "AED" }, // number
      discount_amount: { amount: 0, currency: "AED" } // number
    };
  });

  // --- TOP-LEVEL TOTAL: MUST BE A NUMBER ---
  const totalAmountNumber = Number(amount);

  // Basic validation to avoid sending NaN / invalid payload to Tamara
  if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid total amount"
    });
  }

  for (const item of items) {
    if (
      !Number.isFinite(item.unit_price.amount) ||
      !Number.isFinite(item.total_amount.amount) ||
      !Number.isFinite(item.quantity)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid item price or quantity"
      });
    }
  }

  try {
    const response = await fetch(`${TAMARA_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
      },
      body: JSON.stringify({
        order_reference_id: "ALV-TAM-" + Date.now(),

        // MUST BE A NUMBER, NOT STRING
        total_amount: {
          amount: totalAmountNumber,
          currency: "AED"
        },

        // REQUIRED FOR UAE
        currency: "AED",
        country_code: "AE",
        locale: "en-AE",
        payment_type: "PAY_BY_INSTALMENTS",
        instalments: { count: 3 },

        items,

        consumer: {
          first_name: customer?.name || "Customer",
          last_name: "-",
          phone_number: finalPhone,
          email: customer?.email,
        },

        shipping_address: {
          first_name: customer?.name,
          last_name: "-",
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          country_code: "AE",
        },

        billing_address: {
          first_name: customer?.name,
          last_name: "-",
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          country_code: "AE",
        },

        merchant_url: {
          success: "https://allaraventures.com/checkout-success.html?pg=tamara",
          failure: "https://allaraventures.com/checkout-cancelled.html",
          cancel: "https://allaraventures.com/checkout-cancelled.html"
        },

        platform: "WEB"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TAMARA REJECTION:", data);
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
    console.error("TAMARA ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server connection error"
    });
  }
}