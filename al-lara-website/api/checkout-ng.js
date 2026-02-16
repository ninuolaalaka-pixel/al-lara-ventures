import { checkCORS, checkRateLimit } from "./_security.js";
export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

  console.log("Nigeria checkout request:", { cartItems, customer });

  return res.status(200).json({
    success: true,
    message: "Paystack checkout placeholder working"
  });
}