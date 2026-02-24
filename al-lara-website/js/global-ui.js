// Function to show your premium custom alert
window.showCustomAlert = function(message, type = 'error') {
    // Remove existing alert if there is one
    const existing = document.getElementById('custom-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Poppins', sans-serif;
    `;

    const card = document.createElement('div');
    card.style = `
        background: #fff; padding: 30px; border-radius: 20px; max-width: 400px;
        width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        border-top: 5px solid ${type === 'error' ? '#ff4b2b' : '#2e7d32'};
    `;

    card.innerHTML = `
        <h3 style="margin-top:0; color:#1a202c;">${type === 'error' ? 'Notice' : 'Success'}</h3>
        <p style="color:#4a5568; line-height:1.6;">${message}</p>
        <button id="close-alert" style="
            background: #1a202c; color: #fff; border: none; padding: 12px 30px;
            border-radius: 10px; font-weight: 600; cursor: pointer; margin-top: 10px;
        ">Understood</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('close-alert').onclick = () => overlay.remove();
};

// Function for small, non-blocking notifications (like "Added to Cart")
window.showToast = function(message) {
    let toast = document.getElementById("global-toast");
    
    // Create it if it doesn't exist
    if (!toast) {
        toast = document.createElement('div');
        toast.id = "global-toast";
        toast.style = `
            visibility: hidden; min-width: 250px; background-color: #1a202c;
            color: #fff; text-align: center; border-radius: 10px; padding: 16px;
            position: fixed; z-index: 10001; left: 50%; bottom: 30px;
            transform: translateX(-50%); font-family: 'Poppins', sans-serif;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: 0.5s;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.visibility = "visible";
    toast.style.opacity = "1";

    setTimeout(() => { 
        toast.style.visibility = "hidden";
        toast.style.opacity = "0";
    }, 3000);
};