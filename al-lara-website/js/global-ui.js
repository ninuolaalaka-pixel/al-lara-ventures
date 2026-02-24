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
window.showCustomAlert = function(message) {
    const existing = document.getElementById('custom-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); /* Neutral dark overlay, no green */
        backdrop-filter: blur(8px); /* Standard clean blur */
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Poppins', sans-serif;
    `;

    const card = document.createElement('div');
    card.style = `
        background: #ffffff; padding: 40px; border-radius: 24px; max-width: 450px;
        width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        border-top: 8px solid #2e7d32; /* Keeping the signature green ONLY on the border */
        animation: alertFadeIn 0.4s ease-out;
    `;

    card.innerHTML = `
        <h3 style="margin-top:0; color:#1a202c; font-size: 26px; font-weight: 700;">Notice</h3>
        <p style="color:#4a5568; line-height:1.6; font-size: 16px; margin-bottom: 30px;">${message}</p>
        <button id="close-alert" style="
            background: #2e7d32; color: #fff; border: none; padding: 14px 45px;
            border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 16px;
        ">Understood</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.getElementById('close-alert').onclick = () => overlay.remove();
};

// --- GLOBAL TOAST (Bottom Notification) ---
window.showToast = function(message) {
    const existing = document.getElementById("global-toast");
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = "global-toast";
    toast.style = `
        background: #2e7d32; 
        color: #ffffff; 
        padding: 18px 35px; 
        position: fixed; 
        z-index: 10001; 
        left: 50%; 
        bottom: 40px; 
        transform: translateX(-50%); 
        font-family: 'Poppins', sans-serif; 
        font-weight: 700; 
        font-size: 16px;
        box-shadow: 0 15px 40px rgba(32, 54, 43, 0.15); 
        border: 1px solid #2e7d32; /* The heavy green border you liked */
        border-radius: 15px;
        animation: toastSlideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => { 
        toast.style.opacity = "0";
        toast.style.transition = "all 0.5s ease";
        toast.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => { if(toast.parentNode) toast.remove(); }, 500);
    }, 3000);
};