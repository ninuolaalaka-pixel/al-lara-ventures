const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { order_id, orderData } = req.body;

  if (!order_id || !orderData) {
    return res.status(400).json({ error: "order_id and orderData required" });
  }

  const totalAmount = orderData.total_amount;
  const shippingAddress = orderData.shipping_address;

  // Build items array from order data
  const items = (orderData.items || []).map(item => ({
    name: item.name,
    quantity: item.quantity,
    reference_id: item.reference_id,
    sku: item.sku,
    unit_price: item.unit_price,
    tax_amount: item.tax_amount || { amount: "0.00", currency: "AED" },
    discount_amount: item.discount_amount || { amount: "0.00", currency: "AED" },
    total_amount: item.total_amount,
    type: item.type || "Digital"
  }));

  try {
    const captureResponse = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id,
        total_amount: totalAmount,
        shipping_info: {
          shipped_at: new Date().toISOString(),
          shipping_company: "Standard Delivery",
          tracking_number: `TRK-${order_id.substring(0, 8)}`,
          recipient_name: `${shippingAddress?.first_name || ""} ${shippingAddress?.last_name || ""}`.trim(),
          recipient_address: shippingAddress || {}
        },
        items
      })
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("Capture failed:", captureData);
      return res.status(400).json({ error: captureData });
    }

    return res.status(200).json({ success: true, capture_id: captureData.capture_id });

  } catch (error) {
    console.error("Capture error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}