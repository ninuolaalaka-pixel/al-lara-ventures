/// --- ANIMATIONS CONFIGURATION ---
// We inject these once so the fade-in and slide-up effects work everywhere
if (!document.getElementById('global-ui-styles')) {
    const style = document.createElement('style');
    style.id = 'global-ui-styles';
    style.innerHTML = `
        @keyframes alertFadeIn {
            from { opacity: 0; transform: scale(0.9) translateY(-20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes toastFadeUp {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;
    document.head.appendChild(style);
}

// --- PREMIUM CUSTOM ALERT (Center Notice) ---
window.showCustomAlert = function(message, _type = 'error') {
    const existing = document.getElementById('custom-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(13, 82, 17, 0.7); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Poppins', sans-serif;
    `;

    const card = document.createElement('div');
    // Updated style: White background with green border/text
    card.style = `
        background: #ffffff; padding: 35px; border-radius: 24px; max-width: 420px;
        width: 90%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        border-top: 6px solid #2e7d32; 
        animation: alertFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    card.innerHTML = `
        <h3 style="margin-top:0; color:#2e7d32; font-size: 24px; font-weight: 700;">Notice</h3>
        <p style="color: #2e7d32; line-height:1.6; font-size: 16px; margin-bottom: 25px; font-weight: 500;">${message}</p>
        <button id="close-alert" style="
            background: #2e7d32; color: #fff; border: none; padding: 14px 40px;
            border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;
        ">Understood</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('close-alert').onclick = () => {
        overlay.style.opacity = "0";
        overlay.style.transition = "0.3s";
        setTimeout(() => overlay.remove(), 300);
    };
};

// --- GLOBAL TOAST (Bottom Notification) ---
window.showToast = function(message) {
    const existing = document.getElementById("global-toast");
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = "global-toast";
    // Updated style: White background, green border, green text
    toast.style = `
        background-color: #ffffff; color: #2e7d32; text-align: center; 
        border-radius: 12px; padding: 16px 24px; position: fixed; z-index: 10001; 
        left: 50%; bottom: 30px; transform: translateX(-50%); 
        font-family: 'Poppins', sans-serif; font-weight: 600;
        box-shadow: 0 10px 30px rgba(13, 82, 17, 0.7); 
        border: 2px solid #2e7d32;
        animation: toastFadeUp 0.5s ease-out;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => { 
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.5s ease";
        setTimeout(() => { if(toast) toast.remove(); }, 500);
    }, 3000);
};