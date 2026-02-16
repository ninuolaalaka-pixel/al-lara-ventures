import { checkCORS, checkRateLimit, checkBot } from "./_security";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (!(await checkRateLimit(req, res))) return;
  if (!(await checkBot(req, res))) return;
  if (req.method === "GET") {
    return res.status(200).json({ success: true, orders: [] });
  }

  if (req.method === "POST") {
    const { order } = req.body || {};

    if (!order) {
      return res.status(400).json({ error: "Missing order data" });
    }

    //orders
  await resend.emails.send({
  from: "AL LARA VENTURES <onboarding@resend.dev>",
  to: "yourgmail@gmail.com",
  subject: "New Contact Message",
  html: 
  <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6; padding: 20px;">
  
  <h2 style="font-weight: 600; margin-bottom: 10px;">New Order</h2>
  <p style="margin-top: 0; opacity: 0.7;">A new order has been placed on AL LARA.</p>

  <h3 style="margin-top: 25px; font-weight: 600;">Customer</h3>
  <p><strong>Name:</strong> ${order.customer.name}</p>
  <p><strong>Email:</strong> ${order.customer.email}</p>
  <p><strong>Phone:</strong> ${order.customer.phone}</p>
  <p><strong>Address:</strong> ${order.customer.address}</p>

  <h3 style="margin-top: 25px; font-weight: 600;">Order Summary</h3>
  <p><strong>Order ID:</strong> ${order.id}</p>
  <p><strong>Date:</strong> ${order.date}</p>

  <h3 style="margin-top: 25px; font-weight: 600;">Items</h3>
  <div style="margin-left: 10px;">
    ${order.items
      .map(
        (item) => `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600;">${item.name}</div>
          <div style="opacity: 0.7;">Qty: ${item.quantity}</div>
          <div style="opacity: 0.7;">Price: ${item.price}</div>
        </div>
      `
      )
      .join("")}
  </div>


  <h3 style="margin-top: 25px; font-weight: 600;">Totals</h3>
  <p><strong>Subtotal:</strong> ${order.subtotal}</p>
  <p><strong>Delivery Fee:</strong> ${order.deliveryFee}</p>
  <p><strong>Total:</strong> ${order.total}</p>

  <h3 style="margin-top: 25px; font-weight: 600;">Notes</h3>
  <p>${order.notes || "No notes provided."}</p>

</div>
 });
    console.log("New order:", order);

    return res.status(200).json({ success: true, message: "Order saved" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}







