import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    const loginBtn        = document.getElementById("loginBtn");
    const regBtn          = document.getElementById("regBtn");
    const addBtn          = document.getElementById("addBtn");
    const logoutBtn       = document.getElementById("logoutBtn");
    const hamburgerBtn    = document.getElementById("hamburgerBtn");
    const menuProfileLink = document.getElementById("menuProfileLink");
    const menuLogoutBtn   = document.getElementById("menuLogoutBtn");
    const menuLoginBtn    = document.getElementById("menuLoginBtn");
    const menuRegBtn      = document.getElementById("menuRegBtn");
    const menuUserName    = document.getElementById("menuUserName");
    const menuUserEmail   = document.getElementById("menuUserEmail");
    const menuProfileImg  = document.getElementById("menuProfileImg");
    const adminLink       = document.getElementById("adminLink");

    if (user) {
        localStorage.setItem("isLoggedIn", "true");

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().banned === true) {
            alert("Your account has been banned.");
            await signOut(auth);
            localStorage.setItem("isLoggedIn", "false");
            return;
        }

        const data = userSnap.exists() ? userSnap.data() : {};
        const isAdmin = data.role === "admin";
        const name = data.displayName || user.displayName || user.email.split("@")[0];

        if (loginBtn)     loginBtn.style.display     = "none";
        if (regBtn)       regBtn.style.display        = "none";
        if (addBtn)       addBtn.style.display        = "inline-block";
        if (logoutBtn)    logoutBtn.style.display     = "inline-block";
        if (hamburgerBtn) hamburgerBtn.style.display  = "flex";

        if (menuLoginBtn)    menuLoginBtn.style.display    = "none";
        if (menuRegBtn)      menuRegBtn.style.display      = "none";
        if (menuLogoutBtn)   menuLogoutBtn.style.display   = "flex";
        if (menuProfileLink) menuProfileLink.style.display = "flex";

        // Admin tag — ismin yanına [ADMIN] etiketi
        if (menuUserName) {
            if (isAdmin) {
                menuUserName.innerHTML = `${name} <span style="
                    background:#f59e0b;
                    color:#fff;
                    font-size:0.65rem;
                    font-family:'Josefin Sans',sans-serif;
                    font-weight:700;
                    padding:2px 6px;
                    border-radius:4px;
                    letter-spacing:1px;
                    vertical-align:middle;
                    margin-left:4px;
                ">ADMIN</span>`;
            } else {
                menuUserName.textContent = name;
            }
        }

        if (menuUserEmail) menuUserEmail.textContent = user.email;
        if (menuProfileImg && data.photoUrl) menuProfileImg.src = data.photoUrl;

        // Admin linki göster
        if (adminLink && isAdmin) adminLink.style.display = "flex";

        // FAB butonları
        const fabAdd     = document.getElementById("fabAdd");
        const fabProfile = document.getElementById("fabProfile");
        if (fabAdd)     fabAdd.style.display     = "flex";
        if (fabProfile) fabProfile.style.display = "flex";

    } else {
        localStorage.setItem("isLoggedIn", "false");

        if (loginBtn)     loginBtn.style.display     = "inline-block";
        if (regBtn)       regBtn.style.display        = "inline-block";
        if (addBtn)       addBtn.style.display        = "none";
        if (logoutBtn)    logoutBtn.style.display     = "none";
        if (hamburgerBtn) hamburgerBtn.style.display  = "none";

        if (menuLoginBtn)    menuLoginBtn.style.display    = "none";
        if (menuRegBtn)      menuRegBtn.style.display      = "none";
        if (menuLogoutBtn)   menuLogoutBtn.style.display   = "none";
        if (menuProfileLink) menuProfileLink.style.display = "none";
        if (menuUserName)    menuUserName.textContent      = "Guest";

        const fabAdd     = document.getElementById("fabAdd");
        const fabProfile = document.getElementById("fabProfile");
        if (fabAdd)     fabAdd.style.display = "none";
        if (fabProfile) fabProfile.style.display = "none";

        if (window.location.pathname.includes("add.html")) {
            window.location.href = "../index.html";
        }
    }
});

window.logout = () => {
    if (confirm("Are you sure you want to log out?")) {
        signOut(auth).then(() => {
            localStorage.setItem("isLoggedIn", "false");
            const isInsidePages = window.location.pathname.includes("pages/");
            window.location.href = isInsidePages ? "../index.html" : "index.html";
        }).catch((error) => console.error("Logout error:", error));
    }
};
