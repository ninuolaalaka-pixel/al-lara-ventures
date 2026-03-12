import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_BASE_URL = "https://api.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, cartItems, customer } = req.body || {};

  // --- PHONE CLEANING (UAE FORMAT REQUIRED BY TAMARA) ---
  let cleanPhone = (customer.tel || "").replace(/\D/g, "");
if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
const finalPhone = "971" + cleanPhone; // Changed from +971 to 971

  // --- ITEMS (ALL NUMBERS MUST BE REAL NUMBERS, NOT STRINGS) ---
  const items = cartItems.map((item, index) => {
  const unitPrice = parseFloat(item.price).toFixed(2);
  const totalItemAmount = (parseFloat(item.price) * Number(item.quantity)).toFixed(2);
  
  return {
    name: item.name,
    type: "Physical",
    reference_id: String(index + 1),
    quantity: Number(item.quantity),
    unit_price: { amount: unitPrice, currency: "AED" },
    total_amount: { amount: totalItemAmount, currency: "AED" },
    tax_amount: { amount: "0.00", currency: "AED" },
    discount_amount: { amount: "0.00", currency: "AED" }
  };
});


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
        amount: parseFloat(amount).toFixed(2), // Ensure string "351.75"
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
          first_name: customer.name || "Customer",
          last_name: "-",
          phone_number: finalPhone,
          email: customer.email,
        },

        shipping_address: {
          first_name: customer.name,
          last_name: "-",
          line1: customer.address || "UAE Street",
          city: customer.emirate || "Dubai",
          country_code: "AE",
        },

        billing_address: {
          first_name: customer.name,
          last_name: "-",
          line1: customer.address || "UAE Street",
          city: customer.emirate || "Dubai",
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
    return res.status(500).json({
      success: false,
      message: "Server connection error"
    });
  }
}