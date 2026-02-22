document.addEventListener("DOMContentLoaded", () => {
    const emirateSelect = document.getElementById("emirate-select");
    const deliverySelect = document.getElementById("delivery-type");
    const cartTotalDisplay = document.getElementById("cart-total-display");
    const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
    const finalTotalDisplay = document.getElementById("final-total-display");

    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalDisplay.textContent = cartTotal.toFixed(2);

    function calculateFinalTotal() {
        const emirate = emirateSelect.value;
        const type = deliverySelect.value;
        let fee = 0;

        if (emirate && type) {
            const groups = {
                groupA: ['dubai', 'sharjah', 'ajman'],
                groupB: ['uaq', 'rak', 'fujairah'],
                groupC: ['abudhabi', 'alain']
            };

            // LOGIC: The fee is BASED on the choice, not added together.
            if (groups.groupA.includes(emirate)) {
                fee = (type === 'heavy') ? 25 : 10;
            } else if (groups.groupB.includes(emirate)) {
                fee = (type === 'heavy') ? 30 : 15;
            } else if (groups.groupC.includes(emirate)) {
                fee = (type === 'heavy') ? 48 : 30;
            }
        }

        const finalTotal = cartTotal + fee;
        deliveryFeeDisplay.textContent = fee.toFixed(2);
        finalTotalDisplay.textContent = finalTotal.toFixed(2);
        return finalTotal;
    }

    emirateSelect.addEventListener("change", calculateFinalTotal);
    deliverySelect.addEventListener("change", calculateFinalTotal);

    document.getElementById("pay-with-tabby").addEventListener("click", async () => {
        const finalAmount = calculateFinalTotal();
        
        const customer = {
            name: document.getElementById("customer-name").value,
            email: document.getElementById("customer-email").value,
            phone: document.getElementById("customer-tel").value,
            address: document.getElementById("customer-address").value,
            emirate: emirateSelect.value,
            registered_since: localStorage.getItem("registered_since") || new Date().toISOString().split('T')[0]
        };

        if (!customer.name || !customer.phone || !customer.emirate || !deliverySelect.value || finalAmount <= 0) {
            alert("Please complete all fields, including delivery type.");
            return;
        }

        const response = await fetch("/api/tabby-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: finalAmount, cartItems, customer })
        });

        const data = await response.json();
        if (data.success) window.location.href = data.url;
        else alert("Tabby Error: " + (data.message || "Session failed"));
    });
});