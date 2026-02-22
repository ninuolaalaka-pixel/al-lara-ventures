// Emirate groups + delivery fees
const deliveryFees = {
  groupA: { standard: 20, heavy: 35 }, // Dubai, Sharjah, Ajman
  groupB: { standard: 30, heavy: 45 }, // Abu Dhabi, Al Ain
  groupC: { standard: 25, heavy: 40 }  // UAQ, Fujairah, RAK
};

// Map emirates to groups
const emirateGroup = {
  dubai: "groupA",
  sharjah: "groupA",
  ajman: "groupA",

  abudhabi: "groupB",
  alain: "groupB",

  uaq: "groupC",
  fujairah: "groupC",
  rak: "groupC"
};

let cartTotal = 0;
let deliveryFee = 0;

// Load cart total from localStorage
const cart = JSON.parse(localStorage.getItem("cart")) || [];
cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

// Update UI
document.getElementById("cart-total-display").textContent = cartTotal.toFixed(2);

// Handle emirate + delivery type selection
function updateDeliveryFee() {
  const emirate = document.getElementById("emirate-select").value;
  const type = document.getElementById("delivery-type").value;

  if (!emirate || !type) return;

  const group = emirateGroup[emirate];
  deliveryFee = deliveryFees[group][type];

  document.getElementById("delivery-fee-display").textContent = deliveryFee.toFixed(2);
  document.getElementById("final-total-display").textContent = (cartTotal + deliveryFee).toFixed(2);
}

document.getElementById("emirate-select").addEventListener("change", updateDeliveryFee);
document.getElementById("delivery-type").addEventListener("change", updateDeliveryFee);