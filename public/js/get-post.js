import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs, limit,
    doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const postContainer = document.getElementById("postContainer");
let currentUser = null;
let currentTab  = "mine";

// ─── TAB SWITCH ──────────────────────────────────────────────────────────────
window.switchTab = function(tab) {
    currentTab = tab;
    document.getElementById("tabMine")?.classList.toggle("active", tab === "mine");
    document.getElementById("tabPublic")?.classList.toggle("active", tab === "public");
    if (tab === "mine") {
        loadDiscover();
    } else {
        loadFollowing();
    }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // FAB
    const fabAdd     = document.getElementById("fabAdd");
    const fabProfile = document.getElementById("fabProfile");
    if (fabAdd)     fabAdd.style.display     = user ? "flex" : "none";
    if (fabProfile) fabProfile.style.display = user ? "flex" : "none";

    // Dot menu
    const dotMyBlog = document.getElementById("dotMyBlog");
    const dotNotif  = document.getElementById("dotNotif");
    if (dotMyBlog) dotMyBlog.style.display = user ? "flex" : "none";
    if (dotNotif)  dotNotif.style.display  = user ? "flex" : "none";

    // Side menu
    const menuLoginBtn    = document.getElementById("menuLoginBtn");
    const menuRegBtn      = document.getElementById("menuRegBtn");
    const menuLogoutBtn   = document.getElementById("menuLogoutBtn");
    const menuProfileLink = document.getElementById("menuProfileLink");
    const menuUserName    = document.getElementById("menuUserName");
    const menuUserEmail   = document.getElementById("menuUserEmail");
    const menuProfileImg  = document.getElementById("menuProfileImg");
    const adminLink       = document.getElementById("adminLink");

    if (user) {
        if (menuLoginBtn)    menuLoginBtn.style.display    = "none";
        if (menuRegBtn)      menuRegBtn.style.display      = "none";
        if (menuLogoutBtn)   menuLogoutBtn.style.display   = "flex";
        if (menuProfileLink) menuProfileLink.style.display = "flex";
        if (menuUserEmail)   menuUserEmail.textContent     = user.email;
        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (menuUserName)  menuUserName.textContent = data.displayName || user.email.split("@")[0];
                if (menuProfileImg && data.photoUrl) menuProfileImg.src = data.photoUrl;
                if (adminLink && data.role === "admin") adminLink.style.display = "flex";
            } else {
                if (menuUserName) menuUserName.textContent = user.email.split("@")[0];
            }
        } catch(e) {
            if (menuUserName) menuUserName.textContent = user.email.split("@")[0];
        }
    } else {
        if (menuLoginBtn)    menuLoginBtn.style.display    = "flex";
        if (menuRegBtn)      menuRegBtn.style.display      = "flex";
        if (menuLogoutBtn)   menuLogoutBtn.style.display   = "none";
        if (menuProfileLink) menuProfileLink.style.display = "none";
        if (menuUserName)    menuUserName.textContent      = window.t?.("guest") || "Guest";
    }

    // Her zaman Discover yükle (giriş yapılmış olsun olmasın)
    loadDiscover();
});

// ─── DISCOVER: 3 public post + CTA ───────────────────────────────────────────
async function loadDiscover() {
    if (!postContainer) return;
    postContainer.innerHTML = "";

    try {
        const q = query(
            collection(db, "posts"),
            where("isPublic", "==", true),
            orderBy("createdAt", "desc"),
            limit(3)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            const label = document.createElement("p");
            label.style.cssText = "font-family:'Josefin Sans',sans-serif;font-size:0.82rem;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 16px;width:100%;padding:0 4px;";
            label.textContent = window.t?.("recentFromCommunity") || "Recent from the community";
            postContainer.appendChild(label);

            snap.forEach((docSnap) => {
                postContainer.innerHTML += buildPostHTML(docSnap.data(), docSnap.id, false);
            });
        }

        // CTA Kutusu — her zaman göster
        const cta = document.createElement("div");
        cta.style.cssText = "width:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:18px;padding:36px 28px;text-align:center;margin-top:24px;color:#fff;";

        if (currentUser) {
            // Giriş yapmış: Add sayfasına gönder
            cta.innerHTML = `
                <i class="fa-solid fa-pen-nib" style="font-size:2.8rem;margin-bottom:16px;display:block;opacity:0.9;color:#a78bfa;"></i>
                <h3 style="font-family:'Pacifico',cursive;font-size:1.5rem;margin-bottom:10px;">${window.t?.("createYourStory")||"Create Your Story!"}</h3>
                <p style="font-family:'Josefin Sans',sans-serif;font-size:0.9rem;opacity:0.8;margin-bottom:24px;line-height:1.7;max-width:400px;margin-left:auto;margin-right:auto;">
                    ${window.t?.("shareYourExperience")||"Share your paranormal experience, mysterious encounter or unexplained event with the world."}
                </p>
                <a href="pages/add.html"
                   style="display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:#4f46e5;color:#fff;border-radius:12px;font-family:'Josefin Sans',sans-serif;font-size:0.95rem;font-weight:600;text-decoration:none;transition:background 0.2s;"
                   onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">
                    <i class="fa-solid fa-plus"></i> ${window.t?.("writeAPost")||"Write a Post"}
                </a>
            `;
        } else {
            // Giriş yapmamış: Login/Register'a gönder
            cta.innerHTML = `
                <i class="fa-solid fa-pen-nib" style="font-size:2.8rem;margin-bottom:16px;display:block;opacity:0.9;color:#a78bfa;"></i>
                <h3 style="font-family:'Pacifico',cursive;font-size:1.5rem;margin-bottom:10px;">${window.t?.("shareYourStory")||"Share Your Story!"}</h3>
                <p style="font-family:'Josefin Sans',sans-serif;font-size:0.9rem;opacity:0.8;margin-bottom:24px;line-height:1.7;max-width:400px;margin-left:auto;margin-right:auto;">
                    ${window.t?.("joinBiblog")||"Have something paranormal, mysterious or unexplained to share? Join BIBlog and write your first post."}
                </p>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <a href="pages/register.html"
                       style="display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background:#4f46e5;color:#fff;border-radius:12px;font-family:'Josefin Sans',sans-serif;font-size:0.9rem;font-weight:600;text-decoration:none;">
                        <i class="fa-solid fa-user-plus"></i> ${window.t?.("registerFree")||"Register Free"}
                    </a>
                    <a href="pages/login.html"
                       style="display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background:rgba(255,255,255,0.1);color:#fff;border-radius:12px;font-family:'Josefin Sans',sans-serif;font-size:0.9rem;text-decoration:none;border:1px solid rgba(255,255,255,0.2);">
                        <i class="fa-solid fa-right-to-bracket"></i> ${window.t?.("logIn")||"Log In"}
                    </a>
                </div>
            `;
        }

        postContainer.appendChild(cta);

        if (typeof window.setupModal === "function") window.setupModal();

    } catch(e) {
        console.error("Discover error:", e);
        postContainer.innerHTML = "<p style='text-align:center;padding:40px;color:#888;'>Failed to load posts.</p>";
    }
}

// ─── FOLLOWING TAB ────────────────────────────────────────────────────────────
async function loadFollowing() {
    if (!postContainer) return;
    if (!currentUser) {
        postContainer.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#888;">
                <i class="fa-solid fa-user-group" style="font-size:3rem;margin-bottom:16px;display:block;opacity:0.3;"></i>
                <p style="font-family:'Josefin Sans',sans-serif;">${window.t?.("loginToSeeFollowing")||"Log in to see people you follow."}</p>
                <a href="pages/login.html" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#000;color:#fff;border-radius:10px;font-family:'Josefin Sans',sans-serif;font-size:0.85rem;text-decoration:none;">
                    ${window.t?.("logIn")||"Log In"}
                </a>
            </div>`;
        return;
    }

    postContainer.innerHTML = "<p style='text-align:center;padding:20px;color:#888;font-family:\"Josefin Sans\",sans-serif;'>Loading...</p>";

    try {
        const mySnap = await getDoc(doc(db, "users", currentUser.uid));
        const followingList = mySnap.exists() ? (mySnap.data().following || []) : [];
        postContainer.innerHTML = "";

        if (followingList.length === 0) {
            postContainer.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#888;">
                    <i class="fa-solid fa-user-group" style="font-size:3rem;margin-bottom:16px;display:block;opacity:0.3;"></i>
                    <p style="font-family:'Josefin Sans',sans-serif;">${window.t?.("notFollowing")||"You're not following anyone yet."}</p>
                    <a href="pages/explore.html" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#000;color:#fff;border-radius:10px;font-family:'Josefin Sans',sans-serif;font-size:0.85rem;text-decoration:none;">
                        <i class="fa-solid fa-compass"></i> ${window.t?.("explorePeople")||"Explore People"}
                    </a>
                </div>`;
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display:flex;flex-wrap:wrap;gap:20px;width:100%;padding:10px 0;";

        for (const uid of followingList) {
            const uSnap = await getDoc(doc(db, "users", uid));
            if (!uSnap.exists()) continue;
            wrapper.appendChild(buildUserCard({ uid, ...uSnap.data() }));
        }
        postContainer.appendChild(wrapper);
    } catch(e) { console.error(e); }
}

// ─── USER CARD ────────────────────────────────────────────────────────────────
function buildUserCard(u) {
    const photo = u.photoUrl
        ? `<img src="${u.photoUrl}" alt="" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #eee;">`
        : `<div style="width:70px;height:70px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user" style="font-size:2rem;color:#bbb;"></i></div>`;

    const social = u.socialMedia || {};
    const sl = [
        social.youtube   ? `<a href="https://youtube.com/@${social.youtube}" target="_blank" style="color:#ff0000;font-size:1.1rem;"><i class="fa-brands fa-youtube"></i></a>` : "",
        social.instagram ? `<a href="https://instagram.com/${social.instagram}" target="_blank" style="color:#e1306c;font-size:1.1rem;"><i class="fa-brands fa-instagram"></i></a>` : "",
        social.tiktok    ? `<a href="https://tiktok.com/@${social.tiktok}" target="_blank" style="color:#333;font-size:1.1rem;"><i class="fa-brands fa-tiktok"></i></a>` : "",
        social.linkedin  ? `<a href="https://linkedin.com/in/${social.linkedin}" target="_blank" style="color:#0077b5;font-size:1.1rem;"><i class="fa-brands fa-linkedin"></i></a>` : "",
    ].filter(Boolean).join("");

    const card = document.createElement("div");
    card.style.cssText = "background:#fff;border:1px solid #eee;border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px;width:200px;transition:transform 0.2s;box-shadow 0.2s;";
    card.onmouseenter = () => { card.style.transform = "translateY(-4px)"; card.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)"; };
    card.onmouseleave = () => { card.style.transform = "translateY(0)"; card.style.boxShadow = "none"; };
    card.innerHTML = `
        <div onclick="window.location.href='pages/user-profile.html?uid=${u.uid}'" style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;cursor:pointer;">
            ${photo}
            <strong style="font-family:'Josefin Sans',sans-serif;font-size:0.95rem;text-align:center;">${u.displayName || (window.t?.("user")||"User")}</strong>
            <p style="font-size:0.8rem;color:#888;text-align:center;margin:0;font-style:italic;line-height:1.4;">${u.bio ? u.bio.slice(0,60)+(u.bio.length>60?"...":"") : (window.t?.("noBio")||"No bio yet.")}</p>
            ${sl ? `<div style="display:flex;gap:8px;">${sl}</div>` : ""}
        </div>
        <div style="display:flex;gap:8px;width:100%;margin-top:4px;">
            <button id="fc-${u.uid}" onclick="event.stopPropagation();toggleFollowCard('${u.uid}',this)"
                style="flex:1;padding:8px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.82rem;">
                <i class="fa-solid fa-check"></i> ${window.t?.("following_btn")||"Following"}
            </button>
            <button onclick="event.stopPropagation();startConversation('${u.uid}')"
                style="flex:1;padding:8px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.82rem;">
                <i class="fa-solid fa-envelope"></i>
            </button>
        </div>`;
    return card;
}

window.toggleFollowCard = async (targetUid, btn) => {
    if (!currentUser) { alert(window.t?.("pleaseLogin")||"Please log in!"); return; }
    const myRef  = doc(db, "users", currentUser.uid);
    const mySnap = await getDoc(myRef);
    const following = mySnap.exists() ? (mySnap.data().following || []) : [];
    if (following.includes(targetUid)) {
        await updateDoc(myRef, { following: arrayRemove(targetUid) });
        const card = btn.closest("div[style*='border-radius:16px']");
        if (card) card.remove();
        const wrapper = postContainer.querySelector("div[style*='flex-wrap']");
        if (wrapper && wrapper.children.length === 0) loadFollowing();
    } else {
        await updateDoc(myRef, { following: arrayUnion(targetUid) });
        btn.innerHTML = `<i class="fa-solid fa-check"></i> ${window.t?.("following_btn")||"Following"}`;
        btn.style.background = "#4f46e5";
    }
};

// ─── POST HTML ────────────────────────────────────────────────────────────────
function buildPostHTML(post, docId, showActions) {
    const uid      = currentUser?.uid || "";
    const likes    = post.likes    || [];
    const dislikes = post.dislikes || [];
    const saves    = post.saves    || [];
    const comments = post.comments || [];
    const isLiked    = likes.includes(uid);
    const isDisliked = dislikes.includes(uid);
    const isSaved    = saves.includes(uid);

    const actions = showActions ? `
        <div class="post-actions">
            <button class="action-btn delete-btn" onclick="deletePost('${docId}')" title="${window.t?.("delete")||"Delete"}"><i class="fa-solid fa-trash"></i></button>
            <button class="action-btn share-btn"  onclick="sharePost('${docId}')"  title="${window.t?.("share")||"Share"}"><i class="fa-solid fa-share-nodes"></i></button>
        </div>` : "";

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
        <div class="post target active" id="post-${docId}" data-title="${escapeHtml(post.title)}" data-content="${escapeHtml(post.content)}">
            ${actions}
            ${mediaHTML}
            <h1>${post.title}</h1>
            <p>${post.content}</p>
            <div class="authorAndDate">
                <span>Author: ${post.author}</span>
                <span>${new Date(post.createdAt).toLocaleDateString("en-US")}</span>
            </div>
            <div class="post-reactions">
                <button class="reaction-btn like-btn ${isLiked?'active':''}" onclick="toggleLike('${docId}')">
                    <i class="fa-${isLiked?'solid':'regular'} fa-heart"></i>
                    <span id="likes-${docId}">${likes.length}</span>
                </button>
                <button class="reaction-btn dislike-btn ${isDisliked?'active':''}" onclick="toggleDislike('${docId}')">
                    <i class="fa-${isDisliked?'solid':'regular'} fa-thumbs-down"></i>
                    <span id="dislikes-${docId}">${dislikes.length}</span>
                </button>
                <button class="reaction-btn save-btn ${isSaved?'active':''}" onclick="toggleSave('${docId}')">
                    <i class="fa-${isSaved?'solid':'regular'} fa-bookmark"></i>
                    <span id="saves-${docId}">${saves.length}</span>
                </button>
                <button class="reaction-btn" onclick="toggleComments('${docId}')">
                    <i class="fa-regular fa-comment"></i><span>${comments.length}</span>
                </button>
            </div>
            <div class="comment-section" id="comments-${docId}" style="display:none;">
                <div class="comment-list" id="comment-list-${docId}">
                    ${comments.map(c=>`<div class="comment-item"><strong>${c.author}</strong><p>${c.text}</p></div>`).join('')}
                </div>
                <div class="comment-input-area">
                    <input type="text" id="comment-input-${docId}" placeholder="${window.t?.('writeComment')||'Write a comment...'}" maxlength="300">
                    <button onclick="addComment('${docId}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        </div>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

window.togglePostTranslation = async function(docId, btn) {
    const post = document.getElementById('post-' + docId);
    if (!post) return;
    
    const titleEl = post.querySelector('h1');
    const contentEl = post.querySelector('p');
    const authorEl = post.querySelector('.authorAndDate span');
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
        if (authorEl && authorEl.textContent.includes('Author:')) promises.push(detectLanguage(authorEl.textContent.replace('Author: ', '')).then(lang => ({ el: authorEl, lang, text: authorEl.textContent })));
        
        const elements = await Promise.all(promises);
        
        const translations = await Promise.all(elements.map(e => 
            translateText(e.text, currentLang, e.lang)
        ));
        
        elements.forEach((e, i) => {
            if (e.el === titleEl) {
                e.el.textContent = translations[i];
            } else if (e.el === contentEl) {
                e.el.textContent = translations[i];
            } else if (e.el === authorEl && authorEl.textContent.includes('Author:')) {
                authorEl.textContent = 'Author: ' + translations[i];
            }
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
        script.src = 'public/js/auto-translate.js';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

// ─── REACTIONS ────────────────────────────────────────────────────────────────
window.toggleLike = async (id) => {
    if (!currentUser) { alert(window.t?.("likeLogin")||"Please log in to like!"); return; }
    const uid = currentUser.uid, ref = doc(db,"posts",id);
    const data = (await getDoc(ref)).data();
    const likes = data.likes||[], dislikes = data.dislikes||[];
    if (likes.includes(uid)) {
        await updateDoc(ref, { likes: arrayRemove(uid) });
        document.getElementById(`likes-${id}`).textContent = likes.length-1;
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .like-btn i`).className = "fa-regular fa-heart";
    } else {
        await updateDoc(ref, { likes: arrayUnion(uid), dislikes: arrayRemove(uid) });
        document.getElementById(`likes-${id}`).textContent    = likes.length+1;
        document.getElementById(`dislikes-${id}`).textContent = Math.max(0,dislikes.length-1);
        document.querySelector(`#post-${id} .like-btn`).classList.add("active");
        document.querySelector(`#post-${id} .like-btn i`).className    = "fa-solid fa-heart";
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-regular fa-thumbs-down";
    }
};

window.toggleDislike = async (id) => {
    if (!currentUser) { alert(window.t?.("likeLogin")||"Please log in!"); return; }
    const uid = currentUser.uid, ref = doc(db,"posts",id);
    const data = (await getDoc(ref)).data();
    const likes = data.likes||[], dislikes = data.dislikes||[];
    if (dislikes.includes(uid)) {
        await updateDoc(ref, { dislikes: arrayRemove(uid) });
        document.getElementById(`dislikes-${id}`).textContent = dislikes.length-1;
        document.querySelector(`#post-${id} .dislike-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-regular fa-thumbs-down";
    } else {
        await updateDoc(ref, { dislikes: arrayUnion(uid), likes: arrayRemove(uid) });
        document.getElementById(`dislikes-${id}`).textContent = dislikes.length+1;
        document.getElementById(`likes-${id}`).textContent    = Math.max(0,likes.length-1);
        document.querySelector(`#post-${id} .dislike-btn`).classList.add("active");
        document.querySelector(`#post-${id} .dislike-btn i`).className = "fa-solid fa-thumbs-down";
        document.querySelector(`#post-${id} .like-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .like-btn i`).className    = "fa-regular fa-heart";
    }
};

window.toggleSave = async (id) => {
    if (!currentUser) { alert(window.t?.("saveLogin")||"Please log in to save!"); return; }
    const uid = currentUser.uid, ref = doc(db,"posts",id);
    const saves = (await getDoc(ref)).data().saves||[];
    if (saves.includes(uid)) {
        await updateDoc(ref, { saves: arrayRemove(uid) });
        document.getElementById(`saves-${id}`).textContent = saves.length-1;
        document.querySelector(`#post-${id} .save-btn`).classList.remove("active");
        document.querySelector(`#post-${id} .save-btn i`).className = "fa-regular fa-bookmark";
    } else {
        await updateDoc(ref, { saves: arrayUnion(uid) });
        document.getElementById(`saves-${id}`).textContent = saves.length+1;
        document.querySelector(`#post-${id} .save-btn`).classList.add("active");
        document.querySelector(`#post-${id} .save-btn i`).className = "fa-solid fa-bookmark";
    }
};


// ─── KÜFÜR / PROFANITY FİLTRESİ ─────────────────────────────────────────────
const BANNED_WORDS = [
    'orospu','oç','piç','göt','amk','amına','amcık','sik','sikerim','sikeyim',
    'sikik','sikilmiş','salak','aptal','gerizekalı','geri zekalı','bok','boktan',
    'manyak','kahpe','fahişe','kaltak','şerefsiz','ibne','pezevenk','yarrak',
    'yarak','taşak','mal','dangalak','ananı','ananın','oğlum','oğlan',
    'fuck','fucking','fucker','shit','bitch','asshole','bastard','cunt','dick',
    'cock','pussy','nigger','nigga','slut','whore','retard','moron','dumbass',
    'jackass','motherfucker','bullshit'
];
function containsProfanity(text) {
    const lower = text.toLowerCase();
    return BANNED_WORDS.some(w => lower.includes(w));
}
// ─────────────────────────────────────────────────────────────────────────────
window.toggleComments = (id) => {
    const s = document.getElementById(`comments-${id}`);
    s.style.display = s.style.display === "none" ? "block" : "none";
};

window.addComment = async (id) => {
    if (!currentUser) { alert(window.t?.("commentLogin")||"Please log in to comment!"); return; }
    const input = document.getElementById(`comment-input-${id}`);
    const text  = input.value.trim(); if (!text) return;
    const snap  = await getDoc(doc(db,"users",currentUser.uid));
    const author = snap.exists() ? (snap.data().displayName||currentUser.email.split("@")[0]) : currentUser.email.split("@")[0];
    if (containsProfanity(text)) {
        alert(window.t?.("badWordDetected")||"Your comment contains inappropriate language and cannot be posted.");
        return;
    }
    const comment = { author, text, createdAt: Date.now() };
    await updateDoc(doc(db,"posts",id), { comments: arrayUnion(comment) });
    document.getElementById(`comment-list-${id}`).innerHTML += `<div class="comment-item"><strong>${comment.author}</strong><p>${comment.text}</p></div>`;
    input.value = "";
};

window.sharePost = async (id) => {
    try { await updateDoc(doc(db,"posts",id), { isPublic: true }); alert(window.t?.("shared")||"Post shared!"); window.location.reload(); }
    catch(e) { alert(window.t?.("shareFailed")||"Failed to share."); }
};

window.deletePost = async (id) => {
    if (confirm(window.t?.("deleteConfirm")||"Delete this post?")) {
        try { await deleteDoc(doc(db,"posts",id)); window.location.reload(); }
        catch(e) { alert(window.t?.("deleteFailed")||"Failed to delete."); }
    }
};