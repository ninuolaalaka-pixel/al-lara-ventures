// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// 1. Unified Tabby Update (Handles Point 1 & 5.c of Mariia's feedback)
function updateTabbySnippet(amount) {
  const snippet = document.getElementById("tabby-cart-snippet");
  if (!snippet) return;

  // Set the amount with 2 decimal places as a string
  snippet.setAttribute("data-tabby-amount", amount.toFixed(2));

  // Use a small interval to ensure Tabby is ready before calling refresh
  let attempts = 0;
  const maxAttempts = 10;
  const waitForTabby = setInterval(() => {
    attempts++;
    if (window.TabbyPromo) {
      // Try refresh first, then render as backup
      if (typeof window.TabbyPromo.refresh === "function") {
        window.TabbyPromo.refresh();
        clearInterval(waitForTabby);
      } else if (typeof window.TabbyPromo.render === "function") {
        window.TabbyPromo.render();
        clearInterval(waitForTabby);
      }
    }
    if (attempts >= maxAttempts) clearInterval(waitForTabby);
  }, 200);
}

// 2. Update Total and trigger Tabby (This keeps the price dynamic)
function updateTotal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const totalElement = document.getElementById("cart-total");
  if (totalElement) totalElement.textContent = total.toFixed(2);

  // This satisfy's Point 1: Snippet updates when price changes
  updateTabbySnippet(total);
}

// 3. UI Helper functions
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.textContent = count;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

// 4. Rendering logic
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

// Quantity buttons
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
const checkoutUaeBtn = document.getElementById("checkout-uae-btn");

if (checkoutUaeBtn) {
  checkoutUaeBtn.addEventListener("click", async function (event) {
    event.preventDefault();// STOP PAGE REFRESH
    try {
      const nameInput = document.getElementById("customer-name").value;
     const emailInput = document.getElementById("customer-email").value;
      const telInput = document.getElementById("customer-tel").value;
  
      
      const response = await fetch("/api/checkout-uae", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          customer: {
             email: emailInput,
            name: nameInput,
            tel: telInput
          },
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.url; // redirect to Ziina checkout
      } else {
        alert("Checkout error.");
      }
    } catch (err) {
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