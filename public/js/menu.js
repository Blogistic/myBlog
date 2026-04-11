const hamburgerBtn = document.getElementById("hamburgerBtn");
const sideMenu = document.getElementById("sideMenu");
const sideOverlay = document.getElementById("sideOverlay");

function openMenu() {
    sideMenu.classList.add("open");
    sideOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeMenu() {
    sideMenu.classList.remove("open");
    sideOverlay.classList.remove("open");
    document.body.style.overflow = "auto";
}

if (hamburgerBtn) hamburgerBtn.addEventListener("click", openMenu);
if (sideOverlay) sideOverlay.addEventListener("click", closeMenu);

// Add language selector to side menu footer
document.addEventListener('DOMContentLoaded', () => {
    if (sideMenu) {
        const footer = sideMenu.querySelector('.side-menu-footer');
        if (footer && !footer.querySelector('.menu-lang-select')) {
            const langContainer = document.createElement('div');
            langContainer.className = 'menu-lang-select';
            langContainer.innerHTML = `
                <div class="menu-lang-label" style="font-size:0.75rem;margin-bottom:8px;font-family:'Josefin Sans',sans-serif;">Language</div>
                <div class="menu-lang-select-btn" id="menuLangSelect">
                    <span id="menuLangSelected">🇬🇧 English</span>
                    <i class="fa-solid fa-caret-down" style="font-size:0.8rem;"></i>
                </div>
                <ul class="menu-lang-dropdown" id="menuLangDropdown">
                    <li data-lang="tr">🇹🇷 Türkçe</li>
                    <li data-lang="en">🇬🇧 English</li>
                    <li data-lang="de">🇩🇪 Deutsch</li>
                    <li data-lang="fr">🇫🇷 Français</li>
                    <li data-lang="es">🇪🇸 Español</li>
                    <li data-lang="ar">🇸🇦 العربية</li>
                </ul>
            `;
            footer.insertBefore(langContainer, footer.firstChild);
            
            const langSelect = document.getElementById("menuLangSelect");
            const langDropdown = document.getElementById("menuLangDropdown");
            
            if (langSelect && langDropdown) {
                langSelect.addEventListener("click", (e) => {
                    e.stopPropagation();
                    langDropdown.classList.toggle("open");
                });
                
                langDropdown.querySelectorAll("li").forEach(li => {
                    li.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const lang = li.dataset.lang;
                        if (lang && window.changeLanguage) {
                            window.changeLanguage(lang);
                            langDropdown.classList.remove("open");
                        }
                    });
                });
                
                document.addEventListener("click", () => {
                    langDropdown.classList.remove("open");
                });
            }
        }
    }
    
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    if (hamburgerBtn) {
        hamburgerBtn.style.display = isLoggedIn ? "flex" : "none";
    }

    const menuLoginBtn = document.getElementById("menuLoginBtn");
    const menuRegBtn = document.getElementById("menuRegBtn");
    if (menuLoginBtn) menuLoginBtn.style.display = "none";
    if (menuRegBtn) menuRegBtn.style.display = "none";
});
