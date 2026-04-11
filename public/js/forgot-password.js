import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const forgotForm = document.getElementById("forgotForm");
const sendBtn    = document.getElementById("sendBtn");

if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("forgotEmail").value.trim();
        if (!email) { alert("Lütfen e-posta adresinizi girin."); return; }

        sendBtn.disabled    = true;
        sendBtn.textContent = "Gönderiliyor...";

        try {
            await sendPasswordResetEmail(auth, email);
            forgotForm.innerHTML = `
                <div style="text-align:center; padding:20px 0;">
                    <i class="fa-solid fa-circle-check" style="font-size:3rem; color:#2ecc71; margin-bottom:15px; display:block;"></i>
                    <p style="color:white; font-family:'Josefin Sans',sans-serif; font-size:1rem; line-height:1.6;">
                        <strong>${email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.<br><br>
                        E-postanızı kontrol edin ve bağlantıya tıklayarak şifrenizi sıfırlayın.
                    </p>
                    <br>
                    <a href="./login.html" style="color:orange; font-family:'Josefin Sans',sans-serif;">
                        Giriş sayfasına dön →
                    </a>
                </div>`;
        } catch (error) {
            sendBtn.disabled    = false;
            sendBtn.textContent = "Gönder";
            if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email" || error.code === "auth/invalid-credential") {
                alert("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
            } else {
                alert("Bir hata oluştu: " + error.message);
            }
        }
    });
}
