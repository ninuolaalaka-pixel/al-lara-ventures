// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// 1. Tabby Snippet Logic (Point 1 & 5.c)
function updateTabbySnippet(amount) {
  const snippetId = 'tabby-cart-snippet';
  const snippetElement = document.getElementById(snippetId);
  if (!snippetElement) return;

  // 1. Update the data attribute first
  snippetElement.setAttribute("data-tabby-amount", amount.toFixed(2));

  // 2. Use ONLY refresh if it's available (This prevents disappearing)
  if (window.TabbyPromo && typeof window.TabbyPromo.refresh === 'function') {
      window.TabbyPromo.refresh();
  } 
  // 3. Fallback: Only use the constructor if it's the very first load
  else if (window.TabbyPromo && typeof TabbyPromo === 'function') {
    try {
      new TabbyPromo({
        selector: '#' + snippetId,
        currency: 'AED',
        price: amount.toFixed(2),
        installmentsCount: 4,
        lang: 'en',
        source: 'cart',
        publicKey: window._tabbyPublicKey || "pk_test_019c445e-ce8a-936c-9575-c76f91bed644",
        merchantCode: 'ALVIF'
      });
    } catch (err) {
      console.error("Tabby error:", err);
    }
  }
}

// 2. Global Update Total
function updateTotal() {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalElement = document.getElementById("cart-total");
  if (totalElement) totalElement.textContent = total.toFixed(2);

  updateTabbySnippet(total);
  updateCartCount();
}

// 3. UI Helpers
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.textContent = count;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// 4. ADD TO CART LOGIC (Was missing from your last paste!)
document.querySelectorAll(".add-to-cart").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.name;
    const price = parseFloat(button.dataset.price);

    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    saveCart();
    updateCartCount();
    // Show custom toast instead of alert
const toast = document.getElementById("toast");
toast.textContent = name + " added to cart!";
toast.className = "show";
setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
  });
});

// 5. Render Cart Items
function renderCart() {
  const cartTable = document.getElementById("cart-items");
  if (!cartTable) return;

  cartTable.innerHTML = "";
  if (cart.length === 0) {
    cartTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Your cart is empty.</td></tr>';
  }

  cart.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="padding:12px;">${item.name}</td>
      <td style="padding:12px;">AED ${item.price.toFixed(2)}</td>
      <td style="padding:12px;">
        <button class="qty-btn" data-index="${index}" data-action="minus">-</button>
        ${item.quantity}
        <button class="qty-btn" data-index="${index}" data-action="plus">+</button>
      </td>
      <td style="padding:12px;">AED ${(item.price * item.quantity).toFixed(2)}</td>
      <td style="padding:12px;">
        <button class="remove-btn" data-index="${index}">Remove</button>
      </td>
    `;
    cartTable.appendChild(row);
  });

  updateTotal();
}

// 6. Quantity/Remove Listeners
document.addEventListener("click", e => {
  if (e.target.classList.contains("qty-btn")) {
    const index = e.target.dataset.index;
    const action = e.target.dataset.action;
    if (action === "plus") cart[index].quantity++;
    if (action === "minus" && cart[index].quantity > 1) cart[index].quantity--;
    saveCart();
    renderCart();
  }
  if (e.target.classList.contains("remove-btn")) {
    const index = e.target.dataset.index;
    cart.splice(index, 1);
    saveCart();
    renderCart();
  }
});

// Run count update on all pages
updateCartCount();

// CONTACT FORM → CALL BACKEND
const sendMessaggeBtn = document.getElementById("send-messagge-btn");

if (sendMessaggeBtn) {
  sendMessaggeBtn.addEventListener("click", async function (event) {
    event.preventDefault();// STOP PAGE REFRESH
    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const telInput = document.getElementById("contact-tel");
    const messageInput = document.getElementById("contact-message");

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const tel = telInput?.value.trim();
    const message = messageInput?.value.trim();

    if (!name || !email || !tel || !message) {
      alert("Please fill in all fields.");
      return;
    }
    // VALIDATION
    if (!name || name.length < 2) {
      alert("Enter a valid full name.");
      return;
    }

    if (!/^\d{7,15}$/.test(tel)) {
      alert("Enter a valid phone number (digits only).");
      return;
    }

    if (!email.includes("@") || email.length < 5) {
      alert("Enter a valid email address.");
      return;
    }

     if (!message || message.length < 10) {
      alert("Your message must be at least 10 characters.");
      return;
    }

    if (message.length > 1000) {
      alert("Your message is too long. Max 1000 characters.");
      return;
    }


    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, tel, message })
      });

      const data = await response.json();

      if (response.ok) {
        nameInput.value = "";
        emailInput.value = "";
        telInput.value = "";
        messageInput.value = "";
      } else {
        console.error(data);
        alert("Something went wrong. Please try again later.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again later.");
    }
  });
}

// BOOKING FORM → SEND TO BACKEND
const submitBookingBtn = document.getElementById("submit-booking-btn");

if (submitBookingBtn) {
  submitBookingBtn.addEventListener("click", async function (event) {
     event.preventDefault(); // STOP PAGE REFRESH
    const name = document.getElementById("booking-name")?.value.trim();
    const phone = document.getElementById("booking-phone")?.value.trim();
    const date = document.getElementById("booking-date")?.value.trim();
    const service = document.getElementById("booking-service")?.value.trim();
    const address = document.getElementById("booking-address")?.value.trim();
    const email = document.getElementById("booking-email")?.value.trim();

    // VALIDATION
    if (!name || name.length < 2) {
      alert("Enter a valid full name.");
      return;
    }

    if (!/^\d{7,15}$/.test(phone)) {
      alert("Enter a valid phone number (digits only).");
      return;
    }

    if (!email.includes("@") || email.length < 5) {
      alert("Enter a valid email address.");
      return;
    }

    if (!date) {
      alert("Select a preferred date.");
      return;
    }

    if (!address || address.length < 5) {
      alert("Enter a valid address.");
      return;
    }


    if (!name || !phone || !date || !service || !email || !address ) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, date, service, address, email })
      });

      const data = await response.json();

      if (response.ok) {
         window.location.href = "/booking-success.html";
      } else {
        alert("Something went wrong.");
      }
    } catch (err) {
      alert("Network error.");
    }
  });
}

// UAE CHECKOUT → SEND TO BACKEND
// --- ZIINA (CARD) PAYMENT LOGIC ---
    const checkoutUaeBtn = document.getElementById("checkout-uae-btn");
    
    if (checkoutUaeBtn) {
        checkoutUaeBtn.addEventListener("click", async function (event) {
            event.preventDefault();
            
            const finalAmount = calculateFinalTotal(); // Get the total including delivery

            const customer = {
                name: document.getElementById("customer-name").value,
                email: document.getElementById("customer-email").value,
                tel: document.getElementById("customer-tel").value,
                address: document.getElementById("customer-address").value,
                emirate: document.getElementById("emirate-select").value,
                delivery_type: document.getElementById("delivery-type").value
            };

            if (!customer.name || !customer.tel || !customer.emirate || finalAmount <= 0) {
                alert("Please complete the form and select delivery options.");
                return;
            }

            try {
                const response = await fetch("/api/checkout-uae", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: finalAmount, // Send calculated total
                        cartItems: cartItems,
                        customer: customer
                    })
                });

                const data = await response.json();
                if (data.success) {
                    window.location.href = data.url;
                } else {
                    alert("Ziina checkout error.");
                }
            } catch (err) {
                console.error("Ziina Fetch Error:", err);
                alert("Network error.");
            }
        });
    }

// NIGERIA CHECKOUT → SEND TO BACKEND
const checkoutNgBtn = document.getElementById("checkout-ng-btn");

if (checkoutNgBtn) {
  checkoutNgBtn.addEventListener("click", async function () {
    try {
      const response = await fetch("/api/checkout-ng", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          customer: {}
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Nigeria checkout backend is working!");
      } else {
        alert("Checkout error.");
      }
    } catch (err) {
      alert("Network error.");
    }
  });
}


//order//
async function saveOrder(order) {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Order saved!");
    } else {
      console.log("Order save error.");
    }
  } catch (err) {
    console.log("Network error.");
  }
}

// Initialize
updateCartCount();
renderCart();