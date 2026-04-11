import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { validateUsername } from "./filter.js";

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const termsConsent = document.getElementById("termsConsent");
    if (!termsConsent.checked) {
        alert("⚠️ Please accept the Terms of Service, Privacy Policy, and Cookie Policy to continue.");
        return;
    }

    const email    = document.getElementById("regEmail").value.trim();
    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPassword").value;

    const usernameError = validateUsername(username);
    if (usernameError) { alert("⚠️ " + usernameError); return; }
    if (password.length < 6) { alert("Password must be at least 6 characters."); return; }

    const registerBtn = document.getElementById("registerBtn");

    try {
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        await updateProfile(user, { displayName: username });

        await setDoc(doc(db, "users", user.uid), {
            displayName: username,
            email: email,
            photoUrl: "",
            bio: "",
            role: "user",
            socialMedia: { youtube: "", instagram: "", tiktok: "", linkedin: "" },
            createdAt: Date.now(),
            termsAccepted: true,
            termsAcceptedDate: Date.now()
        });

        alert("Registration successful! Welcome 🛸");
        window.location.href = "../index.html";
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            alert("This email address is already in use.");
        } else if (error.code === "auth/invalid-email") {
            alert("Invalid email address.");
        } else if (error.code === "auth/weak-password") {
            alert("Password is too weak. Use at least 6 characters.");
        } else {
            alert("An error occurred: " + error.message);
        }
        registerBtn.disabled = false;
        registerBtn.textContent = "Register";
    }
});
