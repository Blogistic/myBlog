// Firebase SDK modüllerini içe aktarıyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Firebase Console'dan alınan kişisel yapılandırma ayarları
const firebaseConfig = {
  apiKey: "AIzaSyDvpDoBo65WrKHa1X2LhAJqrpM2qYfFr2c",
  authDomain: "myblog-3feec.firebaseapp.com",
  projectId: "myblog-3feec",
  storageBucket: "myblog-3feec.firebasestorage.app",
  messagingSenderId: "394671149091",
  appId: "1:394671149091:web:795d734a8e2096544d2196",
  measurementId: "G-FPJ76KVTLC"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Diğer dosyalarda kullanabilmek için dışa aktar
export const db = getFirestore(app);
export const auth = getAuth(app);