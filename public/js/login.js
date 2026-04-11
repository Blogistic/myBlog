import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', () => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
        document.getElementById("loginEmail").value = savedEmail;
        document.getElementById("rememberMe").checked = true;
    }
});

const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email      = document.getElementById("loginEmail").value;
    const password   = document.getElementById("loginPassword").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        if (rememberMe) {
            localStorage.setItem("rememberedEmail", email);
        } else {
            localStorage.removeItem("rememberedEmail");
        }

        // Eski kullanıcılar için Firestore kaydı yoksa otomatik oluştur
        const userRef  = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            const name = user.displayName || user.email.split("@")[0];
            await setDoc(userRef, {
                displayName: name,
                email: user.email,
                photoUrl: user.photoURL || "",
                bio: "",
                role: "user",
                socialMedia: { youtube: "", instagram: "", tiktok: "", linkedin: "" },
                createdAt: Date.now()
            });
        }

        alert("Hoş geldin! Giriş başarılı. 🛸");
        window.location.href = "../index.html";
    } catch (error) {
        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password" ||
            error.code === "auth/user-not-found"
        ) {
            alert("E-Posta veya şifre yanlış. Lütfen doğrusunu girip tekrar deneyiniz.");
        } else {
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
        }
    }
});
