export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

  console.log("UAE checkout request:", { cartItems, customer });

  return res.status(200).json({
    success: true,
    message: "Stripe checkout placeholder working"
  });
}