import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cartItems, customer } = req.body || {};

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Invalid cart" });
  }

  const lineItems = cartItems.map(item => ({
    price_data: {
      currency: "aed",
      product_data: {
        name: item.name
      },
      unit_amount: item.price * 100 // Stripe expects amount in cents
    },
    quantity: item.quantity
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "https://al-lara-ventures.vercel.app//checkout-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://al-lara-ventures.vercel.app//checkout-cancelled",
      customer_email: customer.email,
      metadata: {
        customerName: customer.name,
        region: "UAE"
      }
    });

    return res.status(200).json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({ error: "Stripe checkout failed" });
  }
}