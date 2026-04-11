import { db, auth } from "./firebase.js";
import { containsBadWord } from "./filter.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs, addDoc,
    doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let currentUser = null;
let activeConvId = null;
let unsubscribe = null;
let currentOtherUid = null;

// ─── EMOJİ PİCKER ─────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    const emojiBtn = document.getElementById("emojiBtn");
    const emojiPicker = document.getElementById("emojiPicker");
    if (emojiBtn && emojiPicker) {
        emojiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            emojiPicker.classList.toggle("open");
        });
        document.addEventListener("click", () => {
            emojiPicker.classList.remove("open");
        });
    }
});

window.insertEmoji = (emoji) => {
    const input = document.getElementById("msgInput");
    if (input) {
        input.value += emoji;
        input.focus();
    }
    document.getElementById("emojiPicker")?.classList.remove("open");
};

// ─── TIMESTAMP HELPERS ────────────────────────────────────────────────────────
function getTimestampMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts === 'number') return ts;
    return 0;
}

function getTimeStringShort(ts) {
    if (!ts) return "";
    const ms = getTimestampMs(ts);
    if (!ms) return "";
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;
    loadConversations();
});

// ─── KONUŞMALARI YÜKLE ───────────────────────────────────────────────────────
async function loadConversations() {
    const list = document.getElementById("convList");
    if (!list) return;
    if (!currentUser) {
        console.log("No user, waiting...");
        return;
    }
    
    list.innerHTML = "<p style='padding:20px;color:#888;font-size:0.85rem;'>Yükleniyor...</p>";

    console.log("Loading conversations for user:", currentUser.uid);
    
    const q = query(
        collection(db, "conversations"),
        where("members", "array-contains", currentUser.uid)
    );
    
    let snapshot;
    try {
        snapshot = await getDocs(q);
        console.log("Conversations found:", snapshot.size);
        snapshot.forEach(d => console.log("Conv:", d.id, d.data()));
    } catch(e) {
        console.error("Error loading conversations:", e);
        list.innerHTML = "<p style='padding:20px;color:#e53935;font-size:0.85rem;'>Yükleme hatası. Firestore index gerekebilir.</p>";
        return;
    }

    list.innerHTML = "";
    if (snapshot.empty) {
        list.innerHTML = "<p style='padding:20px;color:#888;font-size:0.85rem;'>Henüz mesajın yok. Bir profilden 'Message' butonuna tıklayarak sohbet başlat.</p>";
        return;
    }

    const convs = [];
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const otherId = data.members.find(m => m !== currentUser.uid);
        let other = { displayName: "Unknown", photoUrl: "" };
        let isOnline = false;
        
        try {
            const otherSnap = await getDoc(doc(db, "users", otherId));
            if (otherSnap.exists()) {
                other = otherSnap.data();
                if (other.lastSeen) {
                    const lastSeen = other.lastSeen.toDate ? other.lastSeen.toDate() : new Date(other.lastSeen);
                    isOnline = (Date.now() - lastSeen.getTime()) < 60000;
                }
            }
        } catch(e) {}
        
        convs.push({ 
            id: docSnap.id, 
            other, 
            otherId,
            lastMsg: data.lastMessage || "", 
            lastAt: getTimestampMs(data.lastAt),
            isOnline
        });
    }

    convs.sort((a, b) => b.lastAt - a.lastAt);

    convs.forEach(({ id, other, otherId, lastMsg, lastAt, isOnline }) => {
        const div = document.createElement("div");
        div.className = "conv-item";
        div.id = "conv-" + id;
        div.onclick = () => openConversation(id, other, otherId);
        
        const time = lastAt ? new Date(lastAt).toLocaleDateString() : "";
        const msgPreview = lastMsg ? (lastMsg.length > 35 ? lastMsg.slice(0, 35) + "..." : lastMsg) : "Mesaj yok";
        
        div.innerHTML = `
            <div class="conv-avatar">
                <img src="${other.photoUrl || '../public/img/user/user-1.jpg'}" alt="">
                <span class="online-dot ${isOnline ? 'active' : ''}"></span>
            </div>
            <div class="conv-info">
                <strong>${other.displayName || "User"}</strong>
                <span>${msgPreview}</span>
            </div>
            ${time ? `<span class="conv-time">${time}</span>` : ''}`;
        list.appendChild(div);
    });
}

// ─── KONUŞMA AÇ ──────────────────────────────────────────────────────────────
async function openConversation(convId, other, otherId) {
    activeConvId = convId;
    currentOtherUid = otherId;

    document.querySelectorAll(".conv-item").forEach(el => el.classList.remove("active"));
    const item = document.getElementById("conv-" + convId);
    if (item) item.classList.add("active");

    let isOnline = false;
    try {
        const otherSnap = await getDoc(doc(db, "users", otherId));
        if (otherSnap.exists() && otherSnap.data().lastSeen) {
            const lastSeen = otherSnap.data().lastSeen.toDate ? otherSnap.data().lastSeen.toDate() : new Date(otherSnap.data().lastSeen);
            isOnline = (Date.now() - lastSeen.getTime()) < 60000;
        }
    } catch(e) {}

    const header = document.getElementById("chatHeader");
    const input = document.getElementById("msgInputArea");
    
    if (header) {
        header.innerHTML = `
        <img src="${other.photoUrl || '../public/img/user/user-1.jpg'}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
        <div id="chatUserName">
            <strong>${other.displayName || "User"}</strong>
            <div class="user-status ${isOnline ? 'online' : ''}">${isOnline ? 'Online' : 'Offline'}</div>
        </div>`;
    }
    if (input) input.style.display = "flex";

    if (unsubscribe) unsubscribe();

    const msgQ = query(
        collection(db, "conversations", convId, "messages"),
        orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(msgQ, async (snap) => {
        const box = document.getElementById("msgBox");
        if (!box) return;
        box.innerHTML = "";
        
        snap.forEach((docSnap) => {
            const m = docSnap.data();
            const mine = m.senderId === currentUser.uid;
            const time = getTimeStringShort(m.createdAt);
            
            let seenIcon = '';
            if (mine && m.seen) {
                seenIcon = '<span class="seen-indicator" title="Görüldü"></span>';
            }
            
            const div = document.createElement("div");
            div.className = "msg-bubble " + (mine ? "mine" : "theirs");
            div.dataset.msgId = docSnap.id;
            
            div.innerHTML = `
                ${mine ? `<button class="msg-more-btn" onclick="toggleMsgMenu(this, '${docSnap.id}', '${escapeForAttr(m.text)}')"><span></span><span></span><span></span></button>` : ''}
                <div class="msg-content">
                    <p>${escapeHtml(m.text)}</p>
                </div>
                <div class="msg-meta">
                    <span>${time}</span>
                    ${seenIcon}
                </div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
    
    markMessagesSeen(convId);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function escapeForAttr(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

async function markMessagesSeen(convId) {
    try {
        await setDoc(doc(db, "conversations", convId), {
            [`seenBy.${currentUser.uid}`]: serverTimestamp()
        }, { merge: true });
    } catch(e) {}
}

// ─── MESAJ GÖNDER ────────────────────────────────────────────────────────────
window.sendMessage = async () => {
    if (!activeConvId || !currentUser) return;
    const input = document.getElementById("msgInput");
    const text = input.value.trim();
    if (!text) return;

    if (containsBadWord(text)) {
        alert("⚠️ Mesajında uygunsuz içerik tespit edildi. Lütfen düzeltin.");
        return;
    }

    input.value = "";
    await addDoc(collection(db, "conversations", activeConvId, "messages"), {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        seen: false
    });
    await setDoc(doc(db, "conversations", activeConvId), {
        lastMessage: text,
        lastAt: serverTimestamp()
    }, { merge: true });
};

// ─── MESAJ DÜZENLE ───────────────────────────────────────────────────────────
window.editMessage = async (msgId, oldText) => {
    const bubble = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!bubble) return;
    
    const content = bubble.querySelector(".msg-content");
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.value = oldText;
    
    const saveBtn = document.createElement("button");
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    saveBtn.style.cssText = 'background:#4f46e5;color:#fff;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;margin-left:4px;';
    
    const cancelBtn = document.createElement("button");
    cancelBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    cancelBtn.style.cssText = 'background:#888;color:#fff;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;margin-left:4px;';
    
    const wrapper = document.createElement("div");
    wrapper.style.cssText = 'display:flex;align-items:center;';
    wrapper.appendChild(input);
    wrapper.appendChild(saveBtn);
    wrapper.appendChild(cancelBtn);
    
    content.innerHTML = '';
    content.appendChild(wrapper);
    input.focus();
    
    const save = async () => {
        const newText = input.value.trim();
        if (newText && newText !== oldText) {
            if (containsBadWord(newText)) {
                alert("⚠️ Mesajında uygunsuz içerik tespit edildi. Lütfen düzeltin.");
                return;
            }
            await updateDoc(doc(db, "conversations", activeConvId, "messages", msgId), { text: newText });
            const convSnap = await getDoc(doc(db, "conversations", activeConvId));
            if (convSnap.exists() && convSnap.data().lastMessage === oldText) {
                await setDoc(doc(db, "conversations", activeConvId), { lastMessage: newText }, { merge: true });
            }
        }
    };
    
    const cancel = () => {
        content.innerHTML = `<p>${escapeHtml(oldText)}</p>`;
    };
    
    saveBtn.onclick = save;
    cancelBtn.onclick = cancel;
    input.onkeydown = (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
    };
};

// ─── MESAJ SİL ───────────────────────────────────────────────────────────────
window.deleteMessage = async (msgId) => {
    if (!confirm("Bu mesajı silmek istediğine emin misin?")) return;
    
    await deleteDoc(doc(db, "conversations", activeConvId, "messages", msgId));
    
    const convSnap = await getDoc(doc(db, "conversations", activeConvId));
    if (convSnap.exists()) {
        const msgsSnap = await getDocs(collection(db, "conversations", activeConvId, "messages"));
        const msgs = msgsSnap.docs.map(d => d.data()).sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        await setDoc(doc(db, "conversations", activeConvId), {
            lastMessage: msgs[0]?.text || "",
            lastAt: msgs[0]?.createdAt || serverTimestamp()
        }, { merge: true });
    }
};

// Enter ile gönder
window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("msgInput");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// ─── YENİ KONUŞMA BAŞLAT ───────────────────────────────────────────────────
window.startConversation = async (targetUid) => {
    if (!currentUser) { alert("Mesaj göndermek için giriş yapın!"); return; }
    if (currentUser.uid === targetUid) return;

    const q = query(
        collection(db, "conversations"),
        where("members", "array-contains", currentUser.uid)
    );
    const snapshot = await getDocs(q);
    let existingId = null;
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.members.includes(targetUid)) existingId = docSnap.id;
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
};

// URL'den conv parametresi varsa direkt aç
window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    if (convId) {
        setTimeout(async () => {
            if (!currentUser) return;
            const convSnap = await getDoc(doc(db, "conversations", convId));
            if (!convSnap.exists()) return;
            const data = convSnap.data();
            const otherId = data.members.find(m => m !== currentUser.uid);
            const otherSnap = await getDoc(doc(db, "users", otherId));
            const other = otherSnap.exists() ? otherSnap.data() : { displayName: "User", photoUrl: "" };
            openConversation(convId, other, otherId);
        }, 1500);
    }
});

window.toggleMsgMenu = (btn, msgId, msgText) => {
    document.querySelectorAll('.msg-dropdown').forEach(d => d.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'msg-dropdown';
    dropdown.innerHTML = `
        <button onclick="editMessage('${msgId}', '${msgText.replace(/'/g, "\\'")}'); this.closest('.msg-dropdown').remove();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Düzenle
        </button>
        <button class="delete" onclick="deleteMessage('${msgId}'); this.closest('.msg-dropdown').remove();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Sil
        </button>
    `;
    btn.parentElement.appendChild(dropdown);
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
};
