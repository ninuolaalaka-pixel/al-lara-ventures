// Load cart for checkout page
const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
document.addEventListener("DOMContentLoaded", () => {

    // --- 1. BROWSER NAVIGATION HANDLING ---
        // --- 1. BROWSER NAVIGATION HANDLING ---

    // Remember how each payment button looks when the page first loads
    const paymentButtons = ["checkout-uae-btn", "pay-with-tabby", "pay-with-tamara"]
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((btn) => ({ btn, html: btn.innerHTML }));

    // Put every payment button back to normal (original look, clickable)
    function resetPaymentButtons() {
        paymentButtons.forEach(({ btn, html }) => {
            btn.innerHTML = html;
            btn.disabled = false;
        });
    }

    window.addEventListener("pageshow", (event) => {
        // Always show normal buttons (covers the Back button from a payment page)
        resetPaymentButtons();

        const cameBack = event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2);
        if (cameBack) {
            // If the cart was cleared after a successful payment, don't show a stale checkout
            const cartNow = JSON.parse(localStorage.getItem("cart")) || [];
            if (cartNow.length === 0) {
                window.location.replace("cart.html");
                return;
            }
            if (typeof calculateFinalTotal === "function") {
                calculateFinalTotal();
            }
        }
    });

    // --- 2. SELECTORS ---
    const emirateSelect = document.getElementById("emirate-select");
    const deliverySelect = document.getElementById("delivery-type");
    const cartTotalDisplay = document.getElementById("cart-total-display");
    const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
    const vatDisplay = document.getElementById("vat-display");
    const finalTotalDisplay = document.getElementById("final-total-display");
    const checkoutUaeBtn = document.getElementById("checkout-uae-btn"); // ZIINA
    const tabbyBtn = document.getElementById("pay-with-tabby");         // TABBY

    // --- 3. INITIAL CARTs LOAD ---
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cartTotalDisplay) cartTotalDisplay.textContent = cartTotal.toFixed(2);

    // --- 4. CALCULATION LOGIC ---
    function calculateFinalTotal() {
        const emirate = emirateSelect ? emirateSelect.value : "";
        const type = deliverySelect ? deliverySelect.value : "";
        let fee = 0;

        if (emirate && type) {
            const groups = {
                groupA: ['dubai', 'sharjah', 'ajman'],
                groupB: ['uaq', 'rak', 'fujairah'],
                groupC: ['abudhabi', 'alain']
            };

            if (groups.groupA.includes(emirate)) fee = (type === 'heavy') ? 25 : 15;
            else if (groups.groupB.includes(emirate)) fee = (type === 'heavy') ? 30 : 15;
            else if (groups.groupC.includes(emirate)) fee = (type === 'heavy') ? 48 : 30;
        }

        const subtotalWithDelivery = cartTotal + fee;
        const vatAmount = subtotalWithDelivery * 0.05; 
        const finalTotal = subtotalWithDelivery + vatAmount;

        // Update UI
        if (deliveryFeeDisplay) deliveryFeeDisplay.textContent = fee.toFixed(2);
        if (vatDisplay) vatDisplay.textContent = vatAmount.toFixed(2);
        if (finalTotalDisplay) finalTotalDisplay.textContent = finalTotal.toFixed(2);
        
        return finalTotal;
    }

    // Listeners for fee changes
    if (emirateSelect) emirateSelect.addEventListener("change", calculateFinalTotal);
    if (deliverySelect) deliverySelect.addEventListener("change", calculateFinalTotal);

    // Initial run
    calculateFinalTotal();

    // Helper for customer data extraction
    function getCustomerData() {
        return {
            name: document.getElementById("customer-name")?.value,
            email: document.getElementById("customer-email")?.value,
            tel: document.getElementById("customer-tel")?.value,
            address: document.getElementById("customer-address")?.value,
            emirate: emirateSelect?.value,
            delivery_type: deliverySelect?.value,
            registered_since: localStorage.getItem("registered_since") || new Date().toISOString()
        };
    }

    // --- 5. ZIINA (PAY NOW) BUTTON ---
    if (checkoutUaeBtn) {
        checkoutUaeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const finalAmount = calculateFinalTotal();
            const customer = getCustomerData();

            if (!customer.name || !customer.tel || !customer.emirate || finalAmount <= 0) {
                window.showCustomAlert("Please fill in all fields and select delivery options.");
                return;
            }

            // UI Feedback
            checkoutUaeBtn.innerText = "Processing...";
            checkoutUaeBtn.disabled = true;

            try {
                const response = await fetch("/api/checkout-uae", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: finalAmount, cartItems, customer })
                });
                const data = await response.json();
                if (data.success) {
                    window.location.href = data.url;
                } else {
                    window.showCustomAlert("Checkout Error");
                    resetPaymentButtons();
                }
            } catch (err) {
                window.showCustomAlert("Network error.");
                resetPaymentButtons();
            
            }
        });
    }

    // --- 6. TABBY BUTTON ---
    if (tabbyBtn) {
        tabbyBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const finalTotal = calculateFinalTotal();
            const customer = getCustomerData();
            const phoneInput = customer.tel || "";

            if (!localStorage.getItem("registered_since")) {
                localStorage.setItem("registered_since", new Date().toISOString());
            }

            // Validation
            if (!customer.name || !customer.email || phoneInput.length < 9 || !customer.address || !customer.emirate) {
                window.showCustomAlert("Please fill in all fields with a valid UAE phone number.");
                return;
            }

            // UI Feedback
            tabbyBtn.innerText = "Verifying...";
            tabbyBtn.disabled = true;

            try {
                const response = await fetch("/api/tabby-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: finalTotal,
                        cartItems,
                        customer: { ...customer, phone: phoneInput } // Ensuring field name consistency
                    })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = data.url;
                } else {
                  window.showCustomAlert(data.message || "Tabby is unable to approve this purchase.");
                    resetPaymentButtons();
                }
            } catch (err) {
                console.error("Network error:", err);
                window.showCustomAlert("Connection error. Please try again.");
                resetPaymentButtons();
            }
        });
    }



const tamaraBtn = document.getElementById("pay-with-tamara");
let originalContent = tamaraBtn ? tamaraBtn.innerHTML : "";

if (tamaraBtn) {
  tamaraBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const finalTotal = calculateFinalTotal();
    const customer = {
      name: document.getElementById("customer-name").value,
      email: document.getElementById("customer-email").value,
      tel: document.getElementById("customer-tel").value,
      address: document.getElementById("customer-address").value,
      emirate: document.getElementById("emirate-select").value
    };

    if (!customer.name || !customer.email || customer.tel.length < 9) {
      window.showCustomAlert("Please fill in your details correctly.");
      return;
    }

    tamaraBtn.disabled = true;
    tamaraBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
      const res = await fetch("/api/tamara-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(finalTotal),
          cartItems: cartItems.map(item => ({
            ...item,
            price: Number(item.price),
            quantity: Number(item.quantity)
          })),
          customer
        })
      });

      const data = await res.json();

      if (data.success && data.url) {
        localStorage.setItem("tamara_order_id", data.orderId);
        window.location.href = data.url;
      } else {
        throw new Error(data.message || "Declined");
      }

    } catch (err) {
    window.showCustomAlert("Tamara is currently unavailable: " + err.message);
      resetPaymentButtons();
    }
  });
}


});