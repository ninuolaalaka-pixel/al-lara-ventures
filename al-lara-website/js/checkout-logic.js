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
            tel: document.getElementById("customer-tel").value, // Matches 'tel' in your API
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
                window.showCustomAlert("Please fill in all fields and select delivery options.");
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
                else window.showCustomAlert("Checkout Error");
            } catch (err) {
                window.showCustomAlert("Network error.");
            }
        });
    }

    // --- TABBY BUTTON ---
    // --- TABBY BUTTON ---
if (tabbyBtn) {
    tabbyBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // 1. COLLECT DATA FIRST (Fixes the "Initialization" Error)
        const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
        const phoneInput = document.getElementById("customer-tel")?.value || "";
        
        if (!localStorage.getItem("registered_since")) {
            localStorage.setItem("registered_since", new Date().toISOString());
        }

        const customer = {
            name: document.getElementById("customer-name")?.value,
            email: document.getElementById("customer-email")?.value,
            phone: phoneInput,
            address: document.getElementById("customer-address")?.value,
            emirate: document.getElementById("emirate-select")?.value,
            delivery_type: document.getElementById("delivery-type")?.value,
            registered_since: localStorage.getItem("registered_since")
        };

        // 2. VALIDATION (Now 'customer' exists, so this won't crash)
        if (!customer.name || !customer.email || phoneInput.length < 9 || !customer.address || !customer.emirate) {
            window.showCustomAlert("Please fill in all fields with a valid UAE phone number.");
            return;
        }

        // 3. CALCULATE TOTALS
        const cartTotal = parseFloat(document.getElementById("cart-total-display")?.textContent) || 0;
        const deliveryFee = parseFloat(document.getElementById("delivery-fee-display")?.textContent) || 0;
        const vatAmount = parseFloat(document.getElementById("vat-display")?.textContent) || 0; 
        const finalTotal = cartTotal + deliveryFee + vatAmount;

        // 4. SEND TO API
        try {
            const response = await fetch("/api/tabby-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: finalTotal,
                    cartItems,
                    customer
                })
            });

            const text = await response.text(); 
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Server sent non-JSON:", text);
                window.showCustomAlert("Server error. Please try again later.");
                return;
            }

            if (data.success) {
                window.location.href = data.url;
            } else {
                // If Pre-scoring rejects, this shows the alert with the blur
                window.showCustomAlert(data.message || "Tabby is unable to approve this purchase.");
            }
        } catch (err) {
            console.error("Network error:", err);
            window.showCustomAlert("Connection error. Please try again.");
        }
    });
}
});