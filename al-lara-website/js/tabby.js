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
     city: document.getElementById("customer-city").value,
     emirate: document.getElementById("customer-emirate").value,
     registered_since: registeredSince

    };

    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.emirate) {
      alert("Please enter your name, email, phone number, address, city and emirate before checkout.");
      return;
    }

  
    const response = await fetch("/api/tabby-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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