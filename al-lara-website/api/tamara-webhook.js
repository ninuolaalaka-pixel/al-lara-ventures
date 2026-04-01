import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 1. GET THE TOKEN & SECRET
  // Tamara sends the token in the 'tamaraToken' query param
  const token = req.query.tamaraToken || req.headers['x-tamara-token'];
  const secretKey = process.env.TAMARA_SB_NOTIF_TOKEN; // The key you saved in Vercel

  // 2. HS256 VALIDATION (The "Mohamed Requirement")
  try {
    if (!token) throw new Error("No token provided");
    
    // This verifies the handshake and ensures the request is actually from Tamara
    jwt.verify(token, secretKey, { algorithms: ['HS256'] });
    console.log("AUTH SUCCESS: Tamara HS256 Token Verified.");
  } catch (err) {
    console.error("AUTH FAILED: Invalid Tamara Signature", err.message);
    // If the token is wrong, we stop here with a 401 Unauthorized
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { order_id, event_type, total_amount } = req.body;

  try {
    // 3. TRIGGER AUTOMATIC AUTHORISE & CAPTURE
    if (event_type === "order_approved") {
      console.log(`WEBHOOK: ${order_id} approved. Calling internal capture API...`);

      // This calls your 'api/tamara-capture.js' which does the Authorise + Capture flow
      const captureResponse = await fetch(`https://${req.headers.host}/api/tamara-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          order_id: order_id, 
          amount: total_amount?.amount 
        })
      });

      const captureResult = await captureResponse.json();
      console.log("INTERNAL CAPTURE CALL RESULT:", captureResult);
    }

    // Return 200 OK so Tamara knows the message was delivered
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}