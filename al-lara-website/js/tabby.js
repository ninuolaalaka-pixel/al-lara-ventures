document.addEventListener("DOMContentLoaded", () => {
  const tabbyBtn = document.getElementById("pay-with-tabby");

  if (!tabbyBtn) {
    console.log("Tabby button not found");
    return;
  }

  tabbyBtn.addEventListener("click", async () => {

    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
if (!localStorage.getItem("registered_since")) {
  localStorage.setItem("registered_since", new Date().toISOString().split("T")[0]);
}


const registeredSince = localStorage.getItem("registered_since");

    const customer = {
      name: document.getElementById("customer-name").value,
      email: document.getElementById("customer-email").value,
      phone: document.getElementById("customer-tel").value,
      address: document.getElementById("customer-address").value,
     emirate: document.getElementById("emirate-select").value,
     delivery_type: document.getElementById("delivery-type").value,
     registered_since: registeredSince

    };

    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.emirate || !customer.delivery_type) {
      alert("Please enter your name, email, phone number, address, emirate and delivery type before checkout.");
      return;
    }

    const cartTotal = parseFloat(document.getElementById("cart-total-display").textContent);
    const deliveryFee = parseFloat(document.getElementById("delivery-fee-display").textContent);
    const finalTotal = cartTotal + deliveryFee;

  
    const response = await fetch("/api/tabby-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: finalTotal,
        cartItems,
        customer
      })
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.url;
    } else {
      alert("Tabby checkout failed.");
      console.log(data);
    }
  });
});