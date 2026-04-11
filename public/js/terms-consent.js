// Terms & Privacy Consent Banner for Existing Users
(function() {
    const consentStatus = localStorage.getItem("termsConsent");
    
    if (consentStatus === "accepted") return;
    
    if (window.location.pathname.includes("register.html")) return;

    function showConsentBanner() {
        const existingBanner = document.getElementById("termsConsentBanner");
        if (existingBanner) return;

        const overlay = document.createElement("div");
        overlay.id = "termsOverlay";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); z-index: 99997;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        const banner = document.createElement("div");
        banner.id = "termsConsentBanner";
        banner.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            max-width: 500px; width: 100%; z-index: 99998;
            background: #fff; border-radius: 16px;
            padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            font-family: 'Josefin Sans', sans-serif;
            text-align: center;
        `;

        const isDark = document.body.classList.contains('dark-mode');
        if (isDark) {
            banner.style.background = "#16213e";
        }

        banner.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="width:64px;height:64px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    <i class="fa-solid fa-shield-halved" style="font-size:28px;color:#fff;"></i>
                </div>
                <h2 style="margin:0 0 8px;font-size:1.3rem;color:${isDark ? '#fff' : '#1a1a2e'};">Terms & Privacy Update</h2>
                <p style="margin:0;font-size:0.9rem;color:${isDark ? '#b0b0b0' : '#666'};line-height:1.6;">
                    We have updated our Terms of Service, Privacy Policy, and Cookie Policy. Please review and accept to continue using BIBlog.
                </p>
            </div>
            
            <div style="background:${isDark ? '#1a1a2e' : '#f8f9fa'};border-radius:12px;padding:16px;margin-bottom:20px;text-align:left;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <i class="fa-solid fa-file-contract" style="color:#4f46e5;"></i>
                    <a href="terms.html" target="_blank" style="color:#4f46e5;text-decoration:none;font-weight:600;font-size:0.9rem;">Terms of Service</a>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <i class="fa-solid fa-shield-halved" style="color:#4f46e5;"></i>
                    <a href="privacy-policy.html" target="_blank" style="color:#4f46e5;text-decoration:none;font-weight:600;font-size:0.9rem;">Privacy Policy</a>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fa-solid fa-cookie" style="color:#4f46e5;"></i>
                    <a href="cookie-policy.html" target="_blank" style="color:#4f46e5;text-decoration:none;font-weight:600;font-size:0.9rem;">Cookie Policy</a>
                </div>
            </div>
            
            <label style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;cursor:pointer;">
                <input type="checkbox" id="consentCheckbox" style="width:18px;height:18px;accent-color:#4f46e5;">
                <span style="font-size:0.85rem;color:${isDark ? '#b0b0b0' : '#555'};">I have read and accept all policies</span>
            </label>
            
            <button id="acceptTermsBtn" disabled style="
                width:100%;padding:14px;background:#9ca3af;color:#fff;border:none;border-radius:10px;
                font-family:'Josefin Sans',sans-serif;font-size:1rem;font-weight:600;cursor:not-allowed;
                transition:all 0.2s;opacity:0.7;
            ">
                Continue to BIBlog
            </button>
            <p style="margin:10px 0 0;font-size:0.75rem;color:#888;">
                You must accept to continue using the platform
            </p>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(banner);

        const checkbox = document.getElementById("consentCheckbox");
        const acceptBtn = document.getElementById("acceptTermsBtn");

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                acceptBtn.disabled = false;
                acceptBtn.style.background = "linear-gradient(135deg,#667eea,#764ba2)";
                acceptBtn.style.cursor = "pointer";
                acceptBtn.style.opacity = "1";
            } else {
                acceptBtn.disabled = true;
                acceptBtn.style.background = "#9ca3af";
                acceptBtn.style.cursor = "not-allowed";
                acceptBtn.style.opacity = "0.7";
            }
        });

        function acceptAndClose() {
            if (!checkbox.checked) return;
            
            localStorage.setItem("termsConsent", "accepted");
            localStorage.setItem("termsConsentDate", new Date().toISOString());

            // Save to Firebase - determine path based on current location
            const basePath = window.location.pathname.includes("/pages/") ? "../public/js/" : "public/js/";
            
            fetch(basePath + "firebase.js")
                .then(() => {
                    // Firebase loaded, save consent to user doc if logged in
                    const { auth, db } = window;
                    if (auth && db) {
                        auth.onAuthStateChanged((user) => {
                            if (user) {
                                import(basePath + "firebase.js").then(({ doc, setDoc }) => {
                                    setDoc(doc(db, "users", user.uid), {
                                        termsAccepted: true,
                                        termsAcceptedDate: Date.now()
                                    }, { merge: true }).catch(() => {});
                                });
                            }
                        });
                    }
                })
                .catch(() => {});

            banner.style.transform = "translate(-50%, -50%) scale(0.9)";
            banner.style.opacity = "0";
            overlay.style.opacity = "0";
            banner.style.transition = "all 0.3s ease";
            overlay.style.transition = "opacity 0.3s ease";
            setTimeout(() => {
                banner.remove();
                overlay.remove();
            }, 300);
        }

        acceptBtn.addEventListener("click", acceptAndClose);
        
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                acceptAndClose();
            }
        });
    }

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    
    if (isLoggedIn) {
        showConsentBanner();
    } else {
        setTimeout(showConsentBanner, 2000);
    }
})();
