document.addEventListener("DOMContentLoaded", () => {
    // Selectors
    const emirateSelect = document.getElementById("emirate-select");
    const deliverySelect = document.getElementById("delivery-type");
    const cartTotalDisplay = document.getElementById("cart-total-display");
    const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
    const finalTotalDisplay = document.getElementById("final-total-display");
    const checkoutUaeBtn = document.getElementById("checkout-uae-btn");
    const tabbyBtn = document.getElementById("pay-with-tabby");

    // 1. Initial Cart Load
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cartTotalDisplay) cartTotalDisplay.textContent = cartTotal.toFixed(2);

    // 2. Logic for Fees (Selection-based, not cumulative)
    function calculateFinalTotal() {
        const emirate = emirateSelect ? emirateSelect.value : "";
        const type = deliverySelect ? deliverySelect.value : "";
        let fee = 0;

        if (emirate && type) {
            const groups = {
                groupA: ['dubai', 'sharjah', 'ajman'],
                groupB: ['uaq', 'rak', 'fujairah'],
                groupC: ['abudhabi',  'alain']
            };

            if (groups.groupA.includes(emirate)) fee = (type === 'heavy') ? 25 : 10;
            else if (groups.groupB.includes(emirate)) fee = (type === 'heavy') ? 30 : 15;
            else if (groups.groupC.includes(emirate)) fee = (type === 'heavy') ? 48 : 30;
        }

        const finalTotal = cartTotal + fee;
        if (deliveryFeeDisplay) deliveryFeeDisplay.textContent = fee.toFixed(2);
        if (finalTotalDisplay) finalTotalDisplay.textContent = finalTotal.toFixed(2);
        return finalTotal;
    }

    if (emirateSelect) emirateSelect.addEventListener("change", calculateFinalTotal);
    if (deliverySelect) deliverySelect.addEventListener("change", calculateFinalTotal);

    // 3. Helper to get customer data
    function getCustomerData() {
        return {
            name: document.getElementById("customer-name").value,
            email: document.getElementById("customer-email").value,
            tel: document.getElementById("customer-tel").value,
            address: document.getElementById("customer-address").value,
            emirate: emirateSelect.value,
            delivery_type: deliverySelect.value,
            registered_since: localStorage.getItem("registered_since") || new Date().toISOString().split('T')[0]
        };
    }

    // --- ZIINA (PAY NOW) BUTTON ---
    if (checkoutUaeBtn) {
        console.log("Ziina button found and linked."); // Check your browser console for this!
        checkoutUaeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const finalAmount = calculateFinalTotal();
            const customer = getCustomerData();

            if (!customer.name || !customer.tel || !customer.emirate || finalAmount <= 0) {
                alert("Please fill in all fields and select delivery options.");
                return;
            }

            try {
                const response = await fetch("/api/checkout-uae", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: finalAmount,
                        cartItems: cartItems,
                        customer: customer
                    })
                });
                const data = await response.json();
                if (data.success) window.location.href = data.url;
                else alert("Ziina Error: " + (data.details?.message || "Checkout failed"));
            } catch (err) {
                alert("Network error. Check connection.");
            }
        });
    }

    // --- TABBY BUTTON ---
    if (tabbyBtn) {
        tabbyBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const finalAmount = calculateFinalTotal();
            const customer = getCustomerData();

            if (!customer.name || !customer.tel || !customer.emirate || finalAmount <= 0) {
                alert("Please fill in all fields.");
                return;
            }

            const response = await fetch("/api/tabby-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: finalAmount, cartItems, customer })
            });
            const data = await response.json();
            if (data.success) window.location.href = data.url;
            else alert("Tabby Error: " + data.message);
        });
    }
});