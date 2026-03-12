import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_BASE_URL = "https://api.tamara.co";
// Inside your Vercel Function

// Now you just use those variables in your fetch request!
export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, cartItems, customer } = req.body || {};

  // Phone cleaning for +971
  let cleanPhone = (customer.phone || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "+971" + cleanPhone;

  const items = cartItems.map((item, index) => ({
    name: item.name,
    type: "Physical",
    reference_id: String(index + 1),
    quantity: item.quantity,
    unit_price: { amount: item.price, currency: "AED" },
    total_amount: { amount: item.price * item.quantity, currency: "AED" },
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
        total_amount: { amount, currency: "AED" },
        items,
        consumer: {
          first_name: customer.name || "Customer",
          last_name: ".",
          phone_number: finalPhone,
          email: customer.email,
        },
        shipping_address: {
          first_name: customer.name,
          last_name: ".",
          line1: customer.address,
          city: customer.emirate,
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
    if (!response.ok) throw new Error(data.message || "Tamara Error");

    return res.status(200).json({ success: true, url: data.checkout_url, orderId: data.order_id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}