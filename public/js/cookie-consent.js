// Cookie Consent Banner — GDPR & AdSense Compliant
(function() {
    if (localStorage.getItem("cookieConsent") === "accepted") return;
    
    const overlay = document.createElement("div");
    overlay.id = "cookieOverlay";
    const isDark = document.body.classList.contains('dark-mode');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)'}; z-index: 99998;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
    `;
    
    const banner = document.createElement("div");
    banner.id = "cookieBanner";
    banner.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        max-width: 520px; width: 100%; z-index: 99999;
        background: ${isDark ? '#16213e' : '#fff'}; color: ${isDark ? '#e0e0e0' : '#333'}; 
        border-radius: 16px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        font-family: 'Josefin Sans', sans-serif;
        border: 1px solid ${isDark ? '#2a2a4a' : 'transparent'};
    `;
    
    banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:24px;">🍪</span>
            </div>
            <div>
                <h3 style="margin:0;font-size:1.1rem;color:#1a1a2e;">Cookie Consent</h3>
                <p style="margin:4px 0 0;font-size:0.8rem;color:#666;">We value your privacy</p>
            </div>
        </div>
        
        <p style="margin:0 0 16px;font-size:0.9rem;color:#444;line-height:1.6;">
            We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more by reading our policies below.
        </p>
        
        <div style="background:#f8f9fa;border-radius:10px;padding:14px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i class="fa-solid fa-shield-halved" style="color:#4f46e5;"></i>
                <strong style="font-size:0.85rem;color:#1a1a2e;">Your Privacy Matters</strong>
            </div>
            <p style="margin:0;font-size:0.82rem;color:#555;line-height:1.5;">
                We collect data to improve your experience. This includes cookies for analytics and personalized ads. You can opt out at any time.
            </p>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            <a href="pages/privacy-policy.html" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f0f0ff;border-radius:8px;text-decoration:none;color:#4f46e5;font-size:0.85rem;">
                <i class="fa-solid fa-lock"></i> Privacy Policy
                <i class="fa-solid fa-arrow-right" style="margin-left:auto;"></i>
            </a>
            <a href="pages/cookie-policy.html" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f0f0ff;border-radius:8px;text-decoration:none;color:#4f46e5;font-size:0.85rem;">
                <i class="fa-solid fa-cookie"></i> Cookie Policy
                <i class="fa-solid fa-arrow-right" style="margin-left:auto;"></i>
            </a>
            <a href="pages/terms.html" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f0f0ff;border-radius:8px;text-decoration:none;color:#4f46e5;font-size:0.85rem;">
                <i class="fa-solid fa-file-contract"></i> Terms of Service
                <i class="fa-solid fa-arrow-right" style="margin-left:auto;"></i>
            </a>
        </div>
        
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="cookieDecline" style="flex:1;min-width:120px;padding:12px 16px;background:#fff;color:#666;border:1px solid #ddd;border-radius:10px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.9rem;font-weight:500;transition:all 0.2s;">
                Decline Non-Essential
            </button>
            <button id="cookieAccept" style="flex:1;min-width:120px;padding:12px 16px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.9rem;font-weight:600;transition:all 0.2s;box-shadow:0 4px 12px rgba(102,126,234,0.3);">
                Accept All
            </button>
        </div>
        
        <p style="margin:12px 0 0;font-size:0.75rem;color:#888;text-align:center;">
            By continuing to browse, you agree to our 
            <a href="pages/terms.html" style="color:#4f46e5;">Terms</a> and 
            <a href="pages/privacy-policy.html" style="color:#4f46e5;">Privacy Policy</a>.
        </p>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(banner);
    
    // Close on overlay click (except buttons)
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            acceptCookies();
        }
    });
    
    function acceptCookies() {
        localStorage.setItem("cookieConsent", "accepted");
        localStorage.setItem("cookieConsentDate", new Date().toISOString());
        closeBanner();
    }
    
    function closeBanner() {
        banner.style.transform = "translate(-50%, 100%)";
        banner.style.transition = "transform 0.3s ease";
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.3s ease";
        setTimeout(() => {
            banner.remove();
            overlay.remove();
        }, 300);
    }
    
    document.getElementById("cookieAccept").onclick = acceptCookies;
    
    document.getElementById("cookieDecline").onclick = () => {
        localStorage.setItem("cookieConsent", "declined");
        localStorage.setItem("cookieConsentDate", new Date().toISOString());
        closeBanner();
    };
    
    // Button hover effects
    const acceptBtn = document.getElementById("cookieAccept");
    const declineBtn = document.getElementById("cookieDecline");
    
    acceptBtn.addEventListener("mouseenter", () => {
        acceptBtn.style.transform = "translateY(-2px)";
        acceptBtn.style.boxShadow = "0 6px 16px rgba(102,126,234,0.4)";
    });
    acceptBtn.addEventListener("mouseleave", () => {
        acceptBtn.style.transform = "translateY(0)";
        acceptBtn.style.boxShadow = "0 4px 12px rgba(102,126,234,0.3)";
    });
    
    declineBtn.addEventListener("mouseenter", () => {
        declineBtn.style.background = "#f5f5f5";
    });
    declineBtn.addEventListener("mouseleave", () => {
        declineBtn.style.background = "#fff";
    });
})();
