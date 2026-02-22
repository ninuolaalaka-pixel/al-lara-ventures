document.addEventListener("DOMContentLoaded", () => {
    // 1. Selectors
    const emirateSelect = document.getElementById("emirate-select");
    const deliverySelect = document.getElementById("delivery-type");
    const cartTotalDisplay = document.getElementById("cart-total-display");
    const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
    const vatDisplay = document.getElementById("vat-display");
    const finalTotalDisplay = document.getElementById("final-total-display");
    const checkoutUaeBtn = document.getElementById("checkout-uae-btn");
    const tabbyBtn = document.getElementById("pay-with-tabby");

    // 2. Initial Cart Load
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cartTotalDisplay) cartTotalDisplay.textContent = cartTotal.toFixed(2);

    // 3. Logic for Fees & VAT
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

            if (groups.groupA.includes(emirate)) fee = (type === 'heavy') ? 25 : 10;
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

    // --- 4. THE MISSING LISTENERS (This fixes your issue) ---
    if (emirateSelect) {
        emirateSelect.addEventListener("change", calculateFinalTotal);
    }
    if (deliverySelect) {
        deliverySelect.addEventListener("change", calculateFinalTotal);
    }

    // Run math once immediately on load to show subtotal
    calculateFinalTotal();

    // 5. Helper to get customer data
    function getCustomerData() {
        return {
            name: document.getElementById("customer-name").value,
            email: document.getElementById("customer-email").value,
            tel: document.getElementById("customer-tel").value,
            address: document.getElementById("customer-address").value,
            emirate: emirateSelect.value,
            delivery_type: deliverySelect.value,
            registered_since: localStorage.getItem("registered_since") || new Date().toISOString()
        };
    }

    // --- ZIINA (PAY NOW) BUTTON ---
    if (checkoutUaeBtn) {
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
                    body: JSON.stringify({ amount: finalAmount, cartItems, customer })
                });
                const data = await response.json();
                if (data.success) window.location.href = data.url;
                else alert("Checkout Error");
            } catch (err) {
                alert("Network error.");
            }
        });
    }

    // --- TABBY BUTTON ---
    if (tabbyBtn) {
        tabbyBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const finalAmount = calculateFinalTotal();
            const customer = getCustomerData();

            if (!customer.name || !customer.tel || !customer.emirate) {
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
        });
    }
});