import { checkCORS, checkRateLimit } from "./_security.js";
const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, cartItems, customer } = req.body || {};

  // --- 1. DYNAMIC DATE (DD-MM-YYYY) ---
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  // --- 2. PHONE CLEANING ---
  let cleanPhone = (customer?.tel || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith("971")) cleanPhone = cleanPhone.substring(3);
  const finalPhone = "971" + cleanPhone;

  if (!cleanPhone) {
    return res.status(400).json({ success: false, message: "Valid phone number is required" });
  }

  const orderRef = "ALV-" + Date.now();

  // --- 3. ITEMS (String amounts for unit/total) ---
  const items = (cartItems || []).map((item, index) => {
    const p = round2(item.price);
    const q = Number(item.quantity) || 1;
    const lineTotal = round2(p * q);

    return {
      reference_id: String(index + 1),
      type: "Digital",
      name: item.name,
      sku: item.sku || `ITEM-${index + 1}`,
      quantity: q,
      unit_price: { amount: p.toFixed(2), currency: "AED" },
      total_amount: { amount: lineTotal.toFixed(2), currency: "AED" },
      tax_amount: { amount: "0.00", currency: "AED" },
      discount_amount: { amount: "0.00", currency: "AED" }
    };
  });

  const totalAmountNumber = round2(amount);
  const itemsSubtotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount.amount), 0);
  const adjustment = round2(totalAmountNumber - itemsSubtotal);

  if (Math.abs(adjustment) > 0.01) {
    items.push({
      reference_id: "shipping-01",
      type: "Digital",
      name: "Shipping & Handling",
      sku: "SHIPPING-FEE",
      quantity: 1,
      unit_price: { amount: adjustment.toFixed(2), currency: "AED" },
      total_amount: { amount: adjustment.toFixed(2), currency: "AED" },
      tax_amount: { amount: "0.00", currency: "AED" },
      discount_amount: { amount: "0.00", currency: "AED" }
    });
  }

  const fullName = customer?.name || "Customer Guest";
  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ") || "Guest";

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
          amount: totalAmountNumber, // NUMBER per Mohamed
          currency: "AED"
        },
        description: "Order from Allara Ventures",
        country_code: "AE",
        payment_type: "PAY_BY_INSTALMENTS",
        instalments: null,
        locale: "en_US",
        items: items,

        // --- ROOT BLOCKS FROM EXAMPLE ---
        discount: {
          name: "No Discount",
          amount: { amount: "0.00", currency: "AED" }
        },
        tax_amount: { amount: "0.00", currency: "AED" },
        shipping_amount: { amount: "0.00", currency: "AED" },

        consumer: {
          first_name: firstName,
          last_name: lastName,
          phone_number: finalPhone,
          email: customer?.email || "customer@example.com"
        },

        billing_address: {
          first_name: firstName,
          last_name: lastName,
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          region: customer?.emirate || "Dubai",
          country_code: "AE",
          phone_number: finalPhone
        },

        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          line1: customer?.address || "UAE Street",
          city: customer?.emirate || "Dubai",
          region: customer?.emirate || "Dubai",
          country_code: "AE",
          phone_number: finalPhone
        },

        merchant_url: {
          success: "https://allaraventures.com/checkout-success.html?pg=tamara&orderId={order_id}",
          failure: "https://allaraventures.com/checkout-cancelled.html",
          cancel: "https://allaraventures.com/checkout-cancelled.html",
          notification: "https://allaraventures.com/api/tamara-webhook"
        },

        // --- MATCHING MOHAMED'S PLATFORM EXACTLY ---
        platform: "Magento", 
        is_mobile: false,
        is_guest_checkout: true,

        risk_assessment: {
          customer_age: 25,
          customer_nationality: "AE",
          is_premium_customer: false,
          is_existing_customer: false,
          is_guest_user: true,
          is_phone_verified: true,
          total_order_count: 0,
          account_creation_date: formattedDate
        },

        additional_data: {
          delivery_method: "home delivery"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TAMARA DETAILED ERROR:", response.status, JSON.stringify(data, null, 2));
      return res.status(400).json({ 
        success: false, 
        message: data.message || "Invalid Request",
        errors: data.errors || [] 
      });
    }

    return res.status(200).json({ success: true, url: data.checkout_url, orderId: data.order_id });
  } catch (error) {
    console.error("TAMARA RAW ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}