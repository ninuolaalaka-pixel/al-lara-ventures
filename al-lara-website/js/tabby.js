document.addEventListener("DOMContentLoaded", () => {
  const tabbyBtn = document.getElementById("pay-with-tabby");

  if (!tabbyBtn) {
    console.log("Tabby button not found");
    return;
  }

  tabbyBtn.addEventListener("click", async () => {

    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    const customer = {
      name: document.getElementById("customer-name").value,
      email: document.getElementById("customer-email").value
    };

    if (!customer.name || !customer.email) {
      alert("Please enter your name and email before checkout.");
      return;
    }

    const response = await fetch("/api/tabby-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItems, customer })
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