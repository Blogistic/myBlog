import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs,
    doc, getDoc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const container = document.getElementById("postContainer");
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadPublicPosts();
});

// ─── POST CARD ────────────────────────────────────────────────────────────────
function buildPostHTML(post, docId) {
    const uid      = currentUser?.uid || "";
    const likes    = post.likes    || [];
    const dislikes = post.dislikes || [];
    const saves    = post.saves    || [];
    const comments = post.comments || [];
    const isLiked    = likes.includes(uid);
    const isDisliked = dislikes.includes(uid);
    const isSaved    = saves.includes(uid);

    const authorPhoto = post.authorPhotoUrl
        ? `<img src="${post.authorPhotoUrl}" alt="profile"
               style="width:32px;height:32px;border-radius:50%;object-fit:cover;cursor:pointer;"
               onclick="goToUserProfile('${post.userId}')">`
        : `<i class="fa-solid fa-circle-user" style="font-size:32px;color:#aaa;cursor:pointer;"
              onclick="goToUserProfile('${post.userId}')"></i>`;

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
                mediaHTML = `<video src="${media[0].url}" controls style="width:100%;border-radius:8px;max-height:500px;"></video>`;
            } else {
                mediaHTML = `<img src="${media[0].url}" alt="" style="width:100%;border-radius:8px;">`;
            }
        } else {
            mediaHTML = `
                <div class="post-media-carousel" id="carousel-${docId}">
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
                <span style="display:flex;align-items:center;gap:8px;">
                    ${authorPhoto}
                    <strong style="cursor:pointer;" onclick="goToUserProfile('${post.userId}')">${post.author}</strong>
                </span>
                <span>${new Date(post.createdAt).toLocaleDateString("en-US")}</span>
            </div>
            <div class="post-reactions">
                <button class="reaction-btn like-btn ${isLiked ? 'active' : ''}" onclick="pubToggleLike('${docId}')">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
                    <span id="likes-${docId}">${likes.length}</span>
                </button>
                <button class="reaction-btn dislike-btn ${isDisliked ? 'active' : ''}" onclick="pubToggleDislike('${docId}')">
                    <i class="fa-${isDisliked ? 'solid' : 'regular'} fa-thumbs-down"></i>
                    <span id="dislikes-${docId}">${dislikes.length}</span>
                </button>
                <button class="reaction-btn save-btn ${isSaved ? 'active' : ''}" onclick="pubToggleSave('${docId}')">
                    <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i>
                    <span id="saves-${docId}">${saves.length}</span>
                </button>
                <button class="reaction-btn" onclick="pubToggleComments('${docId}')">
                    <i class="fa-regular fa-comment"></i>
                    <span>${comments.length}</span>
                </button>
            </div>
            <div class="comment-section" id="comments-${docId}" style="display:none;">
                <div class="comment-list" id="comment-list-${docId}">
                    ${comments.map(c => `<div class="comment-item"><strong>${c.author}</strong><p>${c.text}</p></div>`).join('')}
                </div>
                <div class="comment-input-area">
                    <input type="text" id="comment-input-${docId}" placeholder="Write a comment..." maxlength="300">
                    <button onclick="pubAddComment('${docId}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        </div>`;
}

// ─── LOAD PUBLIC POSTS ────────────────────────────────────────────────────────
async function loadPublicPosts() {
    try {
        const q = query(collection(db, "posts"), where("isPublic", "==", true), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        if (!container) return;
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = `<p style='text-align:center;padding:40px;'>${window.t ? window.t('noPostsYet') : 'No posts shared yet.'}</p>`;
            return;
        }
        const postsWithPhotos = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            try {
                const userSnap = await getDoc(doc(db, "users", data.userId));
                if (userSnap.exists()) data.authorPhotoUrl = userSnap.data().photoUrl || "";
            } catch(e) {}
            return { data, id: docSnap.id };
        }));
        postsWithPhotos.forEach(({ data, id }) => {
            container.innerHTML += buildPostHTML(data, id);
        });
        if (typeof window.setupModal === "function") window.setupModal();
    } catch (error) {
        console.error("Error:", error);
        if (container) container.innerHTML = "<p>Failed to load posts.</p>";
    }
}

// ─── GO TO USER PROFILE ───────────────────────────────────────────────────────
window.goToUserProfile = (userId) => {
    window.location.href = `user-profile.html?uid=${userId}`;
};

// ─── REACTIONS ────────────────────────────────────────────────────────────────
window.pubToggleLike = async (id) => {
    if (!currentUser) { alert("Please log in to like posts!"); return; }
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const data = snap.data();
    const likes = data.likes || [], dislikes = data.dislikes || [];
    if (likes.includes(uid)) {
        await updateDoc(ref, { likes: arrayRemove(uid) });
        document.getElementById(`likes-${id}`).textContent = likes.length - 1;
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .like-btn i`).className = "fa-regular fa-heart";
    } else {
        await updateDoc(ref, { likes: arrayUnion(uid), dislikes: arrayRemove(uid) });
        document.getElementById(`likes-${id}`).textContent    = likes.length + 1;
        document.getElementById(`dislikes-${id}`).textContent = Math.max(0, dislikes.length - 1);
        document.querySelector(`#post-${id} .like-btn`).classList.add("active");
        document.querySelector(`#post-${id} .like-btn i`).className    = "fa-solid fa-heart";
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-regular fa-thumbs-down";
    }
};

window.pubToggleDislike = async (id) => {
    if (!currentUser) { alert("Please log in!"); return; }
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const data = snap.data();
    const likes = data.likes || [], dislikes = data.dislikes || [];
    if (dislikes.includes(uid)) {
        await updateDoc(ref, { dislikes: arrayRemove(uid) });
        document.getElementById(`dislikes-${id}`).textContent = dislikes.length - 1;
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-regular fa-thumbs-down";
    } else {
        await updateDoc(ref, { dislikes: arrayUnion(uid), likes: arrayRemove(uid) });
        document.getElementById(`dislikes-${id}`).textContent = dislikes.length + 1;
        document.getElementById(`likes-${id}`).textContent    = Math.max(0, likes.length - 1);
        document.querySelector(`#post-${id} .dislike-btn`).classList.add("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-solid fa-thumbs-down";
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .like-btn i`).className    = "fa-regular fa-heart";
    }
};

window.pubToggleSave = async (id) => {
    if (!currentUser) { alert("Please log in to save posts!"); return; }
    const uid = currentUser.uid;
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const saves = snap.data().saves || [];
    if (saves.includes(uid)) {
        await updateDoc(ref, { saves: arrayRemove(uid) });
        document.getElementById(`saves-${id}`).textContent = saves.length - 1;
        document.querySelector(`#post-${id} .save-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .save-btn i`).className = "fa-regular fa-bookmark";
    } else {
        await updateDoc(ref, { saves: arrayUnion(uid) });
        document.getElementById(`saves-${id}`).textContent = saves.length + 1;
        document.querySelector(`#post-${id} .save-btn`).classList.add("active");
        document.querySelector(`#post-${id} .save-btn i`).className = "fa-solid fa-bookmark";
    }
};

window.pubToggleComments = (id) => {
    const s = document.getElementById(`comments-${id}`);
    s.style.display = s.style.display === "none" ? "block" : "none";
};

window.pubAddComment = async (id) => {
    if (!currentUser) { alert("Please log in to comment!"); return; }
    const input = document.getElementById(`comment-input-${id}`);
    const text  = input.value.trim();
    if (!text) return;
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const authorName = userSnap.exists() ? (userSnap.data().displayName || currentUser.email.split("@")[0]) : currentUser.email.split("@")[0];
    const comment = { author: authorName, text, createdAt: Date.now() };
    await updateDoc(doc(db, "posts", id), { comments: arrayUnion(comment) });
    document.getElementById(`comment-list-${id}`).innerHTML += `<div class="comment-item"><strong>${comment.author}</strong><p>${comment.text}</p></div>`;
    input.value = "";
};

window.pubTogglePostTranslation = async function(docId, btn) {
    const post = document.getElementById('post-' + docId);
    if (!post) return;
    
    const titleEl = post.querySelector('h1');
    const contentEl = post.querySelector('p');
    if (!contentEl) return;
    
    const currentLang = localStorage.getItem('language') || 'en';
    if (currentLang === 'en') {
        alert(window.t?.("alreadyEnglish") || "This content is already in English.");
        return;
    }
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        if (typeof translateText === 'undefined') {
            await loadAutoTranslate();
        }
        
        const promises = [];
        if (titleEl) promises.push(detectLanguage(titleEl.textContent).then(lang => ({ el: titleEl, lang, text: titleEl.textContent })));
        if (contentEl) promises.push(detectLanguage(contentEl.textContent).then(lang => ({ el: contentEl, lang, text: contentEl.textContent })));
        
        const elements = await Promise.all(promises);
        
        const translations = await Promise.all(elements.map(e => 
            translateText(e.text, currentLang, e.lang)
        ));
        
        elements.forEach((e, i) => {
            e.el.textContent = translations[i];
        });
        
        btn.innerHTML = '<i class="fa-solid fa-language"></i>';
    } catch (e) {
        console.error('Translation error:', e);
        btn.innerHTML = '<i class="fa-solid fa-language"></i>';
        alert(window.t?.("translationError") || "Translation failed. Please try again.");
    }
    
    btn.disabled = false;
};

async function loadAutoTranslate() {
    if (typeof translateText !== 'undefined') return;
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = '../public/js/auto-translate.js';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}
