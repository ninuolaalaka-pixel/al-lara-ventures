import { checkCORS } from "./_security.js";

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (!checkCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const body = req.body || {};

  // Resolve orderId from all possible sources:
  // 1. Internal webhook call: { orderId, amount }
  // 2. Tamara dashboard direct call: { order_id, ... }
  // 3. URL query param fallback: ?orderId=xxx
  const orderId =
    body.orderId ||
    body.order_id ||
    req.query?.orderId ||
    req.query?.order_id ||
    null;

  // Resolve amount from all possible sources
  const rawAmount =
    body.amount ||
    body.total_amount?.amount ||
    null;

  if (!orderId || orderId === "{order_id}") {
    console.error("CAPTURE ERROR: No valid orderId received. Body was:", JSON.stringify(body));
    return res.status(400).json({ success: false, message: "Invalid orderId" });
  }

  try {
    const token = process.env.TAMARA_API_SANDBOX_TOKEN.trim();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    // STEP 1: AUTHORISE
    const authoriseRes = await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${orderId}/authorise`, {
      method: "POST",
      headers,
    });

    if (!authoriseRes.ok) {
      const authoriseData = await authoriseRes.json();
      console.error("AUTHORISE FAILED:", authoriseData);
      // Don't hard-stop here — Tamara may already have authorised it
      // if this is a dashboard-triggered capture. Log and continue.
    }

    // STEP 2: CAPTURE
    const captureRes = await fetch(`${TAMARA_SANDBOX_BASE_URL}/payments/capture`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        total_amount: {
          amount: rawAmount ? parseFloat(rawAmount).toFixed(2) : undefined,
          currency: "AED",
        },
        shipping_info: {
          shipping_company: "Allara Ventures Delivery",
          tracking_number: `ALV-${Date.now()}`,
        },
      }),
    });

    const captureData = await captureRes.json();

    if (captureRes.ok) {
      console.log(`SUCCESS: Order ${orderId} captured.`);
      return res.status(200).json({ success: true, status: captureData.status });
    }

    console.error("TAMARA CAPTURE REJECTION:", captureData);
    return res.status(400).json({ success: false, error: captureData });

  } catch (error) {
    console.error("CAPTURE SERVER ERROR:", error);
    return res.status(500).json({ success: false });
  }
}