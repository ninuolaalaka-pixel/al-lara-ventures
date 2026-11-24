// =========================
//  PRICE CHECK (server side)
// =========================
// This does NOT change what is sent to Ziina, Tabby or Tamara.
// It only REFUSES an order when the prices or the total sent by the browser
// don't match this price list. Honest orders go through exactly as before.
//
// WHEN YOU ADD A PRODUCT OR CHANGE A PRICE:
//   1) update the product button on the store page (data-name / data-price)
//   2) update the PRODUCTS list below, using exactly the same name
// If the two disagree, checkout refuses the order (it never charges a wrong price).
//
// This file starts with "_" so Vercel does NOT publish it as a web address.

const PRODUCTS = {
  "Guatam Basmati Rice XXL 20KG": 140.5,
  "Sinnara Whole Long Grain Basmati Rice 20KG": 165.75,
  "PRAN Sona Masoori Rice 18KG": 45.5,
  "Super Chef Basmati Rice 35KG": 150.5,
  "Cartolli Macaroni (Elbow) 400g x 20pcs Carton": 26.5,
  "Perdix Chicken Drumsticks 900g": 12.99,
};

// Delivery fees in AED, same rules as the checkout page
const DELIVERY_GROUPS = [
  { emirates: ["dubai", "sharjah", "ajman"], standard: 15, heavy: 25 },
  { emirates: ["uaq", "rak", "fujairah"], standard: 15, heavy: 30 },
  { emirates: ["abudhabi", "alain"], standard: 30, heavy: 48 },
];

const VAT_RATE = 0.05;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 999;
const TOLERANCE = 0.006; // less than one fils of rounding difference

const fail = (message) => ({ ok: false, message });

// Same steps, in the same order, as the checkout page
function orderTotal(cartTotal, fee) {
  const subtotalWithDelivery = cartTotal + fee;
  const vat = subtotalWithDelivery * VAT_RATE;
  return Number((subtotalWithDelivery + vat).toFixed(2));
}

// Returns { ok: true } or { ok: false, message }
export function checkOrder(cartItems, customer, clientAmount) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return fail("Your cart is empty.");
  }
  if (cartItems.length > MAX_ITEMS) {
    return fail("There are too many items in your cart.");
  }

  const group = DELIVERY_GROUPS.find((g) => g.emirates.includes(customer?.emirate));
  if (!group) {
    return fail("Please select your emirate and delivery method.");
  }

  // Which delivery types are allowed? If the browser says which one, use it.
  // If it doesn't say at all (the Tamara button doesn't), accept whichever one matches the total.
  const declared = customer.delivery_type;
  let types;
  if (declared === undefined) types = ["standard", "heavy"];
  else if (declared === "standard" || declared === "heavy") types = [declared];
  else return fail("Please select your emirate and delivery method.");

  let cartTotal = 0;
  for (const raw of cartItems) {
    const name = raw?.name;
    const known = typeof name === "string" && Object.prototype.hasOwnProperty.call(PRODUCTS, name);
    if (!known) {
      return fail("One of the items in your cart is no longer available. Please clear your cart and add your items again.");
    }
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return fail("Please check the quantities in your cart.");
    }
    if (Math.abs(Number(raw.price) - PRODUCTS[name]) > 0.001) {
      console.error("PRICE MISMATCH on an item in the cart");
      return fail("Prices in your cart are out of date. Please refresh the page and try again.");
    }
    cartTotal += PRODUCTS[name] * quantity;
  }

  const shown = Number(clientAmount);
  const matches = Number.isFinite(shown) && types.some((t) => Math.abs(shown - orderTotal(cartTotal, group[t])) <= TOLERANCE);
  if (!matches) {
    console.error("PRICE MISMATCH: browser sent", clientAmount, "which matches no valid total for this cart");
    return fail("Prices in your cart are out of date. Please refresh the page and try again.");
  }

  return { ok: true };
}