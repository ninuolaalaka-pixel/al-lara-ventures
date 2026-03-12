import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_BASE_URL = "https://api.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, cartItems, customer } = req.body || {};

  // --- 1. CRITICAL PHONE FIX ---
  // Tamara UAE expects 9715... (No +, no spaces, no leading 0)
  let cleanPhone = (customer.tel || customer.phone || "").replace(/\D/g, ""); 
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "971" + cleanPhone; // No '+' sign!

  const items = (cartItems || []).map((item, index) => ({
    name: item.name,
    type: "Physical",
    reference_id: String(index + 1),
    quantity: item.quantity,
    unit_price: { amount: parseFloat(item.price), currency: "AED" },
    total_amount: { amount: parseFloat(item.price) * item.quantity, currency: "AED" },
    tax_amount: { amount: 0, currency: "AED" },
    discount_amount: { amount: 0, currency: "AED" }
  }));

  try {
    const response = await fetch(`${TAMARA_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
      },
      body: JSON.stringify({
        order_reference_id: "ALV-TAM-" + Date.now(),
        total_amount: { amount: parseFloat(amount), currency: "AED" },
        currency: "AED",        // Top-level currency
        country_code: "AE",     // Top-level country (CRITICAL)
        payment_type: "PAY_BY_INSTALMENTS", 
        items,
        consumer: {
          first_name: customer.name || "Customer",
          last_name: "-", 
          phone_number: finalPhone,
          email: customer.email,
        },
        shipping_address: {
          first_name: customer.name || "Customer",
          last_name: "-",
          line1: customer.address || "UAE Address",
          city: customer.emirate || "Dubai",
          country_code: "AE",
        },
        // Tamara often requires billing_address to match shipping
        billing_address: {
          first_name: customer.name || "Customer",
          last_name: "-",
          line1: customer.address || "UAE Address",
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
      // Log the actual error from Tamara to your Vercel console
      console.error("Tamara API Rejection:", data);
      return res.status(400).json({ 
        success: false, 
        message: data.errors ? data.errors[0].error_code : (data.message || "Tamara Error") 
      });
    }

    return res.status(200).json({ success: true, url: data.checkout_url, orderId: data.order_id });
  } catch (error) {
    console.error("Vercel Server Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}