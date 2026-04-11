import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs,
    doc, getDoc, addDoc, updateDoc,
    arrayUnion, arrayRemove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const params    = new URLSearchParams(window.location.search);
const targetUid = params.get("uid");
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!targetUid) {
        document.getElementById("profileName").textContent = "User not found.";
        document.getElementById("userPostContainer").innerHTML = "<p style='text-align:center;padding:40px;color:#888;'>No user ID provided.</p>";
        return;
    }
    await loadUserProfile();
    await loadUserPosts();
    await setupButtons();
});

// ─── PROFİL YÜKLE ────────────────────────────────────────────────────────────
async function loadUserProfile() {
    try {
        const userSnap = await getDoc(doc(db, "users", targetUid));
        if (!userSnap.exists()) {
            document.getElementById("profileName").textContent = "User not found.";
            return;
        }
        const data = userSnap.data();
        document.title = `${data.displayName || "User"} - BIBlog`;
        document.getElementById("profileName").textContent = data.displayName || data.email?.split("@")[0] || "User";
        document.getElementById("bioText").textContent     = data.bio || "No bio yet.";
        if (data.photoUrl) document.getElementById("profilePhoto").src = data.photoUrl;

        const social = data.socialMedia || {};
        if (social.youtube)   setLink("ytLink", "https://youtube.com/@"    + social.youtube);
        if (social.instagram) setLink("igLink", "https://instagram.com/"   + social.instagram);
        if (social.tiktok)    setLink("ttLink", "https://tiktok.com/@"     + social.tiktok);
        if (social.linkedin)  setLink("liLink", "https://linkedin.com/in/" + social.linkedin);
    } catch (err) {
        console.error("Profile load error:", err);
        document.getElementById("profileName").textContent = "Error loading profile.";
    }
}

function setLink(id, url) {
    const el = document.getElementById(id);
    if (el) { el.href = url; el.style.display = "flex"; }
}

function setFollowBtn(btn, status) {
    // status: "follow" | "requested" | "following"
    if (status === "following") {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Following';
        btn.style.background = "#4f46e5";
        btn.style.color = "#fff";
        btn.dataset.status = "following";
    } else if (status === "requested") {
        btn.innerHTML = '<i class="fa-solid fa-clock"></i> Requested';
        btn.style.background = "#f59e0b";
        btn.style.color = "#fff";
        btn.dataset.status = "requested";
    } else {
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
        btn.style.background = "#000";
        btn.style.color = "#fff";
        btn.dataset.status = "follow";
    }
}

// ─── POSTLARI YÜKLE ──────────────────────────────────────────────────────────
async function loadUserPosts() {
    const container = document.getElementById("userPostContainer");
    try {
        const q = query(
            collection(db, "posts"),
            where("userId", "==", targetUid),
            where("isPublic", "==", true),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        document.getElementById("statPosts").textContent = snapshot.size;
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = "<p style='text-align:center;padding:40px;color:#888;'>No public posts yet.</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            let media = post.media || [];
            
            // Backward compatibility
            if (media.length === 0 && post.imageUrl) {
                media = [{ url: post.imageUrl, type: 'image' }];
            }
            
            let mediaHTML = '';
            
            if (media.length > 0) {
                if (media.length === 1) {
                    if (media[0].type === 'video') {
                        mediaHTML = `<video src="${media[0].url}" controls style="width:100%;border-radius:8px;max-height:500px;"></video>`;
                    } else {
                        mediaHTML = `<img src="${media[0].url}" alt="" style="width:100%;border-radius:8px;">`;
                    }
                } else {
                    mediaHTML = `<div class="post-media-carousel" style="position:relative;">
                        ${media.map((m, i) => `
                            <div style="display:${i === 0 ? 'block' : 'none'};">
                                ${m.type === 'video' 
                                    ? `<video src="${m.url}" controls style="width:100%;border-radius:8px;"></video>`
                                    : `<img src="${m.url}" alt="" style="width:100%;border-radius:8px;">`
                                }
                            </div>
                        `).join('')}
                    </div>`;
                }
            }
            
            container.innerHTML += `
                <div class="post target active">
                    ${mediaHTML}
                    <h1>${post.title}</h1>
                    <p>${post.content}</p>
                    <div class="authorAndDate">
                        <span>${post.author}</span>
                        <span>${new Date(post.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error("Posts load error:", err);
        container.innerHTML = "<p style='text-align:center;padding:40px;color:#888;'>Failed to load posts.</p>";
    }
}

// ─── BUTONLAR ────────────────────────────────────────────────────────────────
async function setupButtons() {
    const followBtn  = document.getElementById("followBtn");
    const messageBtn = document.getElementById("messageBtn");

    // Kendi profilindeyse butonları gizle
    if (currentUser && currentUser.uid === targetUid) {
        if (followBtn)  followBtn.style.display  = "none";
        if (messageBtn) messageBtn.style.display = "none";
        return;
    }

    // Giriş yapılmamışsa butonları gizle
    if (!currentUser) {
        if (followBtn)  followBtn.style.display  = "none";
        if (messageBtn) messageBtn.style.display = "none";
        return;
    }

    // Hedef kullanıcının privacy ayarını kontrol et
    const targetSnap  = await getDoc(doc(db, "users", targetUid));
    const targetData  = targetSnap.exists() ? targetSnap.data() : {};
    const requiresApproval = targetData.followPrivacy === true;

    // Mevcut follow durumunu kontrol et
    if (followBtn) {
        try {
            const mySnap    = await getDoc(doc(db, "users", currentUser.uid));
            const myData    = mySnap.exists() ? mySnap.data() : {};
            const following = myData.following || [];
            const requested = myData.followRequests || [];

            if (following.includes(targetUid)) {
                setFollowBtn(followBtn, "following");
            } else if (requested.includes(targetUid)) {
                setFollowBtn(followBtn, "requested");
            } else {
                setFollowBtn(followBtn, "follow");
            }
        } catch(e) { setFollowBtn(followBtn, "follow"); }

        followBtn.addEventListener("click", async () => {
            const status = followBtn.dataset.status;
            const myRef  = doc(db, "users", currentUser.uid);
            const mySnap = await getDoc(myRef);
            const myData = mySnap.exists() ? mySnap.data() : {};

            if (status === "following") {
                // Takibi bırak
                await updateDoc(myRef, { following: arrayRemove(targetUid) });
                setFollowBtn(followBtn, "follow");

            } else if (status === "requested") {
                // İsteği geri çek
                await updateDoc(myRef, { followRequests: arrayRemove(targetUid) });
                // Bildirimi sil (basit hali)
                setFollowBtn(followBtn, "follow");
                alert("Follow request cancelled.");

            } else {
                // Follow et
                if (requiresApproval) {
                    // İstek gönder
                    await updateDoc(myRef, { followRequests: arrayUnion(targetUid) });

                    // Karşı tarafa bildirim gönder
                    const myName = currentUser.displayName || currentUser.email.split("@")[0];
                    await addDoc(collection(db, "notifications"), {
                        toUid: targetUid,
                        fromUid: currentUser.uid,
                        type: "follow_request",
                        message: `${myName} wants to follow you.`,
                        read: false,
                        handled: false,
                        createdAt: Date.now()
                    });
                    setFollowBtn(followBtn, "requested");
                    alert("Follow request sent!");
                } else {
                    // Direkt takip et
                    await updateDoc(myRef, { following: arrayUnion(targetUid) });

                    // Bildirim gönder
                    const myName = currentUser.displayName || currentUser.email.split("@")[0];
                    await addDoc(collection(db, "notifications"), {
                        toUid: targetUid,
                        fromUid: currentUser.uid,
                        type: "follow",
                        message: `${myName} started following you.`,
                        read: false,
                        handled: false,
                        createdAt: Date.now()
                    });
                    setFollowBtn(followBtn, "following");
                }
            }
        });
    }

    // ─── MESAJ BUTONU ────────────────────────────────────────────────────────
    if (messageBtn) {
        messageBtn.addEventListener("click", async () => {
            const q        = query(collection(db, "conversations"), where("members", "array-contains", currentUser.uid));
            const snapshot = await getDocs(q);
            let existingId = null;
            snapshot.forEach((docSnap) => {
                if (docSnap.data().members.includes(targetUid)) existingId = docSnap.id;
            });

            if (existingId) {
                window.location.href = `messages.html?conv=${existingId}`;
                return;
            }

            const convRef = await addDoc(collection(db, "conversations"), {
                members: [currentUser.uid, targetUid],
                lastMessage: "",
                lastAt: serverTimestamp()
            });
            window.location.href = `messages.html?conv=${convRef.id}`;
        });
    }
}
