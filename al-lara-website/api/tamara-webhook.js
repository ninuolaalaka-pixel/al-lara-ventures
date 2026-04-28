import jwt from 'jsonwebtoken';

const TAMARA_SANDBOX_BASE_URL = "https://api-sandbox.tamara.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // STEP 1: Validate HS256 token (You got this part RIGHT ✅)
  const token = req.query.tamaraToken;
  const secretKey = process.env.TAMARA_SB_NOTIF_TOKEN;
  
  try {
    if (!token) throw new Error("No token provided");
    jwt.verify(token, secretKey, { algorithms: ['HS256'] });
    console.log("✅ Token verified");
  } catch (err) {
    console.error("❌ Invalid signature:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { order_id, event_type } = req.body;

  // STEP 2: Handle order_approved event
  if (event_type === "order_approved") {
    console.log(`📦 Order ${order_id} approved. Calling Authorise API...`);
    
    try {
      // ✅ CORRECT: Call ONLY the Authorise API first
      const authoriseResponse = await fetch(`${TAMARA_SANDBOX_BASE_URL}/orders/${order_id}/authorisation`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.TAMARA_API_SANDBOX_TOKEN.trim()}`,
          "Content-Type": "application/json"
        }
      });

      const authoriseData = await authoriseResponse.json();
      
      if (authoriseResponse.ok) {
        console.log(`✅ Order ${order_id} authorised successfully`);
        // Tamara will now send you an "order_authorised" webhook
      } else {
        console.error(`❌ Authorise failed:`, authoriseData);
        return res.status(400).json({ error: "Authorisation failed" });
      }
      
    } catch (error) {
      console.error("❌ Authorise error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // STEP 3: Handle order_authorised event (NEW webhook you'll receive)
  // STEP 3: Handle order_authorised event - NOW CALLING CAPTURE ✅
if (event_type === "order_authorised") {
  console.log(`💰 Order ${order_id} authorised. Calling Capture API...`);
  
  try {
    // Get the total amount from the webhook payload
    const amount = req.body.total_amount?.amount || req.body.amount;
    
    // 
    const captureResponse = await fetch(`https://${req.headers.host}/api/tamara-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        order_id: order_id, 
        total_amount: amount 
      })
    });

    const captureResult = await captureResponse.json();
    
    if (captureResponse.ok) {
      console.log(`FULL FLOW COMPLETE: Order ${order_id} captured!`);
    } else {
      console.error(`Capture failed for order ${order_id}:`, captureResult);
    }
    
  } catch (error) {
    console.error("Capture error:", error);
  }
}

  return res.status(200).json({ success: true });
}