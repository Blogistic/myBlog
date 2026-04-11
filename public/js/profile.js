import { db, auth } from "./firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs,
    doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { validateUsername } from "./filter.js";
import { uploadToCloudinary } from "./cloudinary-upload.js";

const profilePhoto    = document.getElementById("profilePhoto");
const profileName     = document.getElementById("profileName");
const profileEmail    = document.getElementById("profileEmail");
const bioText         = document.getElementById("bioText");
const bioInput        = document.getElementById("bioInput");
const editBioBtn      = document.getElementById("editBioBtn");
const saveBioBtn      = document.getElementById("saveBioBtn");
const bioEditArea     = document.getElementById("bioEditArea");
const photoUpload     = document.getElementById("photoUpload");
const postContainer   = document.getElementById("profilePostContainer");
const nicknameInput   = document.getElementById("nicknameInput");
const saveNicknameBtn = document.getElementById("saveNicknameBtn");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "../pages/login.html"; return; }
    currentUser = user;
    profileEmail.textContent = user.email;

    const userRef  = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    console.log("User doc exists:", userSnap.exists(), userSnap.data());

    if (userSnap.exists()) {
        const data = userSnap.data();
        const name = data.displayName || user.displayName || user.email.split("@")[0];
        console.log("Display name:", name, "data:", data.displayName);
        profileName.textContent = name;
        bioText.textContent = data.bio || "";
        if (nicknameInput) nicknameInput.value = name;
        if (data.photoUrl) profilePhoto.src = data.photoUrl;

        const social = data.socialMedia || {};
        if (document.getElementById("ytInput")) document.getElementById("ytInput").value = social.youtube   || "";
        if (document.getElementById("igInput")) document.getElementById("igInput").value = social.instagram || "";
        if (document.getElementById("ttInput")) document.getElementById("ttInput").value = social.tiktok    || "";
        if (document.getElementById("liInput")) document.getElementById("liInput").value = social.linkedin  || "";

        if (social.youtube)   setSocialLink("ytLink", "https://youtube.com/@"   + social.youtube);
        if (social.instagram) setSocialLink("igLink", "https://instagram.com/"  + social.instagram);
        if (social.tiktok)    setSocialLink("ttLink", "https://tiktok.com/@"    + social.tiktok);
        if (social.linkedin)  setSocialLink("liLink", "https://linkedin.com/in/" + social.linkedin);

        const menuName = document.getElementById("menuUserName");
        const menuImg  = document.getElementById("menuProfileImg");
        if (menuName) menuName.textContent = name;
        if (menuImg && data.photoUrl) menuImg.src = data.photoUrl;
    } else {
        const name = user.displayName || user.email.split("@")[0];
        profileName.textContent = name;
        if (nicknameInput) nicknameInput.value = name;
        try {
            await setDoc(userRef, {
                displayName: name,
                email: user.email,
                photoUrl: user.photoURL || "",
                bio: "",
                role: "user",
                socialMedia: { youtube: "", instagram: "", tiktok: "", linkedin: "" },
                createdAt: Date.now()
            });
        } catch(e) {
            console.error("User doc oluşturulamadı:", e);
        }
        const menuName = document.getElementById("menuUserName");
        if (menuName) menuName.textContent = name;
    }

    loadMyPosts(user);
});

function setSocialLink(id, url) {
    const el = document.getElementById(id);
    if (el) { el.href = url; el.style.display = "flex"; }
}

// ─── NİCKNAME DEĞİŞTİR ───────────────────────────────────────────────────────
if (saveNicknameBtn) {
    saveNicknameBtn.addEventListener("click", async () => {
        const newName = nicknameInput.value.trim();
        const error = validateUsername(newName);
        if (error) { alert("⚠️ " + error); return; }
        if (!currentUser) return;
        try {
            await updateProfile(currentUser, { displayName: newName });
            await setDoc(doc(db, "users", currentUser.uid), { displayName: newName }, { merge: true });
            profileName.textContent = newName;
            const menuName = document.getElementById("menuUserName");
            if (menuName) menuName.textContent = newName;
            alert("Nickname güncellendi! ✅");
        } catch (err) { console.error(err); alert("Hata oluştu!"); }
    });
}

// ─── SOSYAL MEDYA KAYDET ─────────────────────────────────────────────────────
const saveSocialBtn = document.getElementById("saveSocialBtn");
if (saveSocialBtn) {
    saveSocialBtn.addEventListener("click", async () => {
        if (!currentUser) return;
        const social = {
            youtube:   document.getElementById("ytInput")?.value.trim() || "",
            instagram: document.getElementById("igInput")?.value.trim() || "",
            tiktok:    document.getElementById("ttInput")?.value.trim() || "",
            linkedin:  document.getElementById("liInput")?.value.trim() || ""
        };
        await setDoc(doc(db, "users", currentUser.uid), { socialMedia: social }, { merge: true });
        if (social.youtube)   setSocialLink("ytLink", "https://youtube.com/@"   + social.youtube);
        if (social.instagram) setSocialLink("igLink", "https://instagram.com/"  + social.instagram);
        if (social.tiktok)    setSocialLink("ttLink", "https://tiktok.com/@"    + social.tiktok);
        if (social.linkedin)  setSocialLink("liLink", "https://linkedin.com/in/" + social.linkedin);
        alert("Sosyal medya hesapları güncellendi! ✅");
    });
}

// ─── BİYOGRAFİ ───────────────────────────────────────────────────────────────
if (editBioBtn) {
    editBioBtn.addEventListener("click", () => {
        bioEditArea.style.display = "block";
        bioInput.value = bioText.textContent === "No bio yet." ? "" : bioText.textContent;
        editBioBtn.style.display = "none";
    });
}
if (saveBioBtn) {
    saveBioBtn.addEventListener("click", async () => {
        const newBio = bioInput.value.trim();
        if (!currentUser) return;
        await setDoc(doc(db, "users", currentUser.uid), { bio: newBio }, { merge: true });
        bioText.textContent       = newBio || "No bio yet.";
        bioEditArea.style.display = "none";
        editBioBtn.style.display  = "inline-block";
    });
}

// ─── FOTOĞRAF YÜKLE ──────────────────────────────────────────────────────────
if (photoUpload) {
    photoUpload.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;
        
        try {
            const result = await uploadToCloudinary(file, 'image');
            const photoUrl = result.url;
            
            profilePhoto.src = photoUrl;
            await updateProfile(currentUser, { photoURL: photoUrl });
            await setDoc(doc(db, "users", currentUser.uid), { photoUrl }, { merge: true });
            const menuImg = document.getElementById("menuProfileImg");
            if (menuImg) menuImg.src = photoUrl;
            alert("Profil fotoğrafı güncellendi! ✅");
            
        } catch (err) {
            console.error('Upload error:', err);
            alert("Fotoğraf yüklenemedi!");
        }
    });
}

// ─── GÖNDERİLERİ YÜKLE ───────────────────────────────────────────────────────
async function loadMyPosts(user) {
    try {
        const q = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        document.getElementById("statPosts").textContent = snapshot.size;
        if (!postContainer) return;
        postContainer.innerHTML = "";
        if (snapshot.empty) { postContainer.innerHTML = "<p style='text-align:center;padding:40px;'>No posts yet.</p>"; return; }
        snapshot.forEach((docSnap) => { postContainer.innerHTML += buildPostHTML(docSnap.data(), docSnap.id); });
    } catch (err) { console.error(err); }
}

async function loadLikedPosts(user) {
    try {
        const snapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
        if (!postContainer) return;
        postContainer.innerHTML = "";
        const liked = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if ((data.likes || []).includes(user.uid)) liked.push({ data, id: docSnap.id });
        });
        if (liked.length === 0) { postContainer.innerHTML = "<p style='text-align:center;padding:40px;'>No liked posts yet.</p>"; return; }
        liked.forEach(({ data, id }) => { postContainer.innerHTML += buildPostHTML(data, id); });
    } catch (err) { console.error(err); }
}

async function loadSavedPosts(user) {
    try {
        const snapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
        if (!postContainer) return;
        postContainer.innerHTML = "";
        const saved = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if ((data.saves || []).includes(user.uid)) saved.push({ data, id: docSnap.id });
        });
        if (saved.length === 0) { postContainer.innerHTML = "<p style='text-align:center;padding:40px;'>No saved posts yet.</p>"; return; }
        saved.forEach(({ data, id }) => { postContainer.innerHTML += buildPostHTML(data, id); });
    } catch (err) { console.error(err); }
}

function buildPostHTML(post, docId) {
    const uid      = currentUser?.uid || "";
    const likes    = post.likes    || [];
    const dislikes = post.dislikes || [];
    const saves    = post.saves    || [];
    const comments = post.comments || [];
    const isLiked    = likes.includes(uid);
    const isDisliked = dislikes.includes(uid);
    const isSaved    = saves.includes(uid);

    // Build media gallery
    let mediaHTML = '';
    let media = post.media || [];
    
    // Backward compatibility: convert old imageUrl to media array
    if (media.length === 0 && post.imageUrl) {
        media = [{ url: post.imageUrl, type: 'image' }];
    }

    if (media.length > 0) {
        if (media.length === 1) {
            if (media[0].type === 'video') {
                mediaHTML = `<div class="post-media-container" style="position:relative;" onmouseenter="showPostOverlay('${docId}')" onmouseleave="hidePostOverlay('${docId}')">
                    <video src="${media[0].url}" controls style="width:100%;border-radius:8px;max-height:500px;"></video>
                    <div class="post-media-overlay" id="overlay-${docId}" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:16px;opacity:0;transition:opacity 0.3s,transform 0.3s;background:rgba(0,0,0,0.4);border-radius:8px;">
                        <button onclick="event.stopPropagation();editPost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-pen" style="color:#4f46e5;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileSharePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-share-nodes" style="color:#10b981;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileDeletePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-trash" style="color:#ef4444;font-size:1.1rem;"></i>
                        </button>
                    </div>
                </div>`;
            } else {
                mediaHTML = `<div class="post-media-container" style="position:relative;" onmouseenter="showPostOverlay('${docId}')" onmouseleave="hidePostOverlay('${docId}')">
                    <img src="${media[0].url}" alt="" style="width:100%;border-radius:8px;">
                    <div class="post-media-overlay" id="overlay-${docId}" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:16px;opacity:0;transition:opacity 0.3s,transform 0.3s;background:rgba(0,0,0,0.4);border-radius:8px;">
                        <button onclick="event.stopPropagation();editPost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-pen" style="color:#4f46e5;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileSharePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-share-nodes" style="color:#10b981;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileDeletePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-trash" style="color:#ef4444;font-size:1.1rem;"></i>
                        </button>
                    </div>
                </div>`;
            }
        } else {
            mediaHTML = `
                <div class="post-media-carousel" id="carousel-${docId}" onmouseenter="showPostOverlay('${docId}')" onmouseleave="hidePostOverlay('${docId}')">
                    <div class="carousel-track" id="track-${docId}">
                        ${media.map((m, i) => `
                            <div class="carousel-slide" data-index="${i}" style="display:${i === 0 ? 'block' : 'none'};">
                                ${m.type === 'video' 
                                    ? `<video src="${m.url}" controls style="width:100%;border-radius:8px;max-height:500px;"></video>`
                                    : `<img src="${m.url}" alt="" style="width:100%;border-radius:8px;">`
                                }
                            </div>
                        `).join('')}
                    </div>
                    <div class="post-media-overlay" id="overlay-${docId}" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:16px;opacity:0;transition:opacity 0.3s,transform 0.3s;background:rgba(0,0,0,0.4);border-radius:8px;z-index:10;pointer-events:none;">
                        <button onclick="event.stopPropagation();editPost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-pen" style="color:#4f46e5;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileSharePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-share-nodes" style="color:#10b981;font-size:1.1rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation();profileDeletePost('${docId}')" style="background:#fff;border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.3s,background 0.2s;">
                            <i class="fa-solid fa-trash" style="color:#ef4444;font-size:1.1rem;"></i>
                        </button>
                    </div>
                    ${media.length > 1 ? `
                        <button class="carousel-btn carousel-prev" onclick="moveCarousel('${docId}', -1)">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button class="carousel-btn carousel-next" onclick="moveCarousel('${docId}', 1)">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                        <div class="carousel-indicators">
                            ${media.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide('${docId}', ${i})"></span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    return `
        <div class="post target active" id="post-${docId}">
            ${mediaHTML}
            <h1>${post.title}</h1>
            <p>${post.content}</p>
            <div class="authorAndDate">
                <span>${post.author}</span>
                <span>${new Date(post.createdAt).toLocaleDateString("en-US")}</span>
            </div>
            <div class="post-reactions">
                <button class="reaction-btn like-btn ${isLiked ? 'active' : ''}" onclick="profileToggleLike('${docId}')">
                    <i class="fa-solid fa-heart" style="opacity:${isLiked ? '1' : '0.3'}"></i>
                    <span id="p-likes-${docId}">${likes.length}</span>
                </button>
                <button class="reaction-btn dislike-btn ${isDisliked ? 'active' : ''}" onclick="profileToggleDislike('${docId}')">
                    <i class="fa-solid fa-thumbs-down" style="opacity:${isDisliked ? '1' : '0.3'}"></i>
                    <span id="p-dislikes-${docId}">${dislikes.length}</span>
                </button>
                <button class="reaction-btn save-btn ${isSaved ? 'active' : ''}" onclick="profileToggleSave('${docId}')">
                    <i class="fa-solid fa-bookmark" style="opacity:${isSaved ? '1' : '0.3'}"></i>
                    <span id="p-saves-${docId}">${saves.length}</span>
                </button>
                <button class="reaction-btn" onclick="profileToggleComments('${docId}')">
                    <i class="fa-solid fa-comment" style="opacity:0.3"></i>
                    <span>${comments.length}</span>
                </button>
            </div>
            <div class="comment-section" id="p-comments-${docId}" style="display:none;">
                <div class="comment-list" id="p-comment-list-${docId}">
                    ${comments.map(c => `<div class="comment-item"><strong>${c.author}</strong><p>${c.text}</p></div>`).join('')}
                </div>
                <div class="comment-input-area">
                    <input type="text" id="p-comment-input-${docId}" placeholder="Write a comment..." maxlength="300">
                    <button onclick="profileAddComment('${docId}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        </div>`;
}

window.profileToggleLike = async (id) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const data = snap.data();
    const likes = data.likes || [], dislikes = data.dislikes || [];
    const likeIcon    = document.querySelector(`#post-${id} .like-btn i`);
    const dislikeIcon = document.querySelector(`#post-${id} .dislike-btn i`);
    if (likes.includes(uid)) {
        await updateDoc(ref, { likes: arrayRemove(uid) });
        document.getElementById(`p-likes-${id}`).textContent = likes.length - 1;
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        likeIcon.style.opacity = "0.3";
    } else {
        await updateDoc(ref, { likes: arrayUnion(uid), dislikes: arrayRemove(uid) });
        document.getElementById(`p-likes-${id}`).textContent    = likes.length + 1;
        document.getElementById(`p-dislikes-${id}`).textContent = Math.max(0, dislikes.length - 1);
        document.querySelector(`#post-${id} .like-btn`).classList.add("active");
        likeIcon.style.opacity = "1";
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        dislikeIcon.style.opacity = "0.3";
    }
};

window.profileToggleDislike = async (id) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const data = snap.data();
    const likes = data.likes || [], dislikes = data.dislikes || [];
    const likeIcon    = document.querySelector(`#post-${id} .like-btn i`);
    const dislikeIcon = document.querySelector(`#post-${id} .dislike-btn i`);
    if (dislikes.includes(uid)) {
        await updateDoc(ref, { dislikes: arrayRemove(uid) });
        document.getElementById(`p-dislikes-${id}`).textContent = dislikes.length - 1;
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        dislikeIcon.style.opacity = "0.3";
    } else {
        await updateDoc(ref, { dislikes: arrayUnion(uid), likes: arrayRemove(uid) });
        document.getElementById(`p-dislikes-${id}`).textContent = dislikes.length + 1;
        document.getElementById(`p-likes-${id}`).textContent    = Math.max(0, likes.length - 1);
        document.querySelector(`#post-${id} .dislike-btn`).classList.add("active");
        dislikeIcon.style.opacity = "1";
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        likeIcon.style.opacity = "0.3";
    }
};

window.profileToggleSave = async (id) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const saves = snap.data().saves || [];
    const saveIcon = document.querySelector(`#post-${id} .save-btn i`);
    if (saves.includes(uid)) {
        await updateDoc(ref, { saves: arrayRemove(uid) });
        document.getElementById(`p-saves-${id}`).textContent = saves.length - 1;
        document.querySelector(`#post-${id} .save-btn`).classList.remove("active");
        saveIcon.style.opacity = "0.3";
    } else {
        await updateDoc(ref, { saves: arrayUnion(uid) });
        document.getElementById(`p-saves-${id}`).textContent = saves.length + 1;
        document.querySelector(`#post-${id} .save-btn`).classList.add("active");
        saveIcon.style.opacity = "1";
    }
};

window.profileToggleComments = (id) => {
    const s = document.getElementById(`p-comments-${id}`);
    s.style.display = s.style.display === "none" ? "block" : "none";
};

window.profileAddComment = async (id) => {
    if (!currentUser) return;
    const input = document.getElementById(`p-comment-input-${id}`);
    const text  = input.value.trim();
    if (!text) return;
    const comment = { author: currentUser.displayName || currentUser.email.split("@")[0], text, createdAt: Date.now() };
    await updateDoc(doc(db, "posts", id), { comments: arrayUnion(comment) });
    document.getElementById(`p-comment-list-${id}`).innerHTML += `<div class="comment-item"><strong>${comment.author}</strong><p>${comment.text}</p></div>`;
    input.value = "";
};

window.switchProfileTab = function(tab) {
    document.querySelectorAll(".profile-tab").forEach(t => t.classList.remove("active"));
    event.target.closest(".profile-tab").classList.add("active");
    if (tab === "posts") loadMyPosts(currentUser);
    if (tab === "liked") loadLikedPosts(currentUser);
    if (tab === "saved") loadSavedPosts(currentUser);
};

window.showPostOverlay = (docId) => {
    const overlay = document.getElementById('overlay-' + docId);
    if (overlay) {
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        const buttons = overlay.querySelectorAll('button');
        buttons.forEach((btn, i) => {
            setTimeout(() => { btn.style.transform = 'translateY(0)'; }, i * 50);
        });
    }
};

window.hidePostOverlay = (docId) => {
    const overlay = document.getElementById('overlay-' + docId);
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        const buttons = overlay.querySelectorAll('button');
        buttons.forEach(btn => { btn.style.transform = 'translateY(10px)'; });
    }
};

window.editPost = (id) => {
    window.location.href = 'edit-post.html?id=' + id;
};

window.profileSharePost = async (id) => {
    try { 
        await updateDoc(doc(db, "posts", id), { isPublic: true }); 
        alert("Post shared to public!"); 
    } catch(e) { 
        alert("Failed to share."); 
    }
};

window.profileDeletePost = async (id) => {
    if (confirm("Are you sure you want to delete this post?")) {
        try { 
            await deleteDoc(doc(db, "posts", id)); 
            window.location.reload(); 
        } catch(e) { 
            alert("Failed to delete."); 
        }
    }
};
