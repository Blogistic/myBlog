import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, getDocs, doc, getDoc, setDoc, updateDoc,
    deleteDoc, query, orderBy, where, addDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let currentAdmin = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "../pages/login.html"; return; }
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "admin") {
        alert("Access denied."); window.location.href = "../index.html"; return;
    }
    currentAdmin = user;
    loadStats(); loadUsers(); loadPosts(); loadFollowRequests();
});

// ─── STATS ───────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const users = await getDocs(collection(db, "users"));
        const posts = await getDocs(collection(db, "posts"));
        const pubPosts = posts.docs.filter(d => d.data().isPublic).length;
        const banned   = users.docs.filter(d => d.data().banned).length;
        const admins   = users.docs.filter(d => d.data().role === "admin").length;
        const stats = document.getElementById("adminStats");
        if (stats) stats.innerHTML = `
            <div class="stat-card"><i class="fa-solid fa-users"></i><strong>${users.size}</strong><span>${window.t?.("totalUsers")||"Total Users"}</span></div>
            <div class="stat-card"><i class="fa-solid fa-file-lines"></i><strong>${posts.size}</strong><span>${window.t?.("totalPosts")||"Total Posts"}</span></div>
            <div class="stat-card"><i class="fa-solid fa-globe"></i><strong>${pubPosts}</strong><span>${window.t?.("publicPosts")||"Public Posts"}</span></div>
            <div class="stat-card" style="color:#dc2626;"><i class="fa-solid fa-ban"></i><strong>${banned}</strong><span>${window.t?.("banned")||"Banned"}</span></div>
            <div class="stat-card" style="color:#f59e0b;"><i class="fa-solid fa-shield-halved"></i><strong>${admins}</strong><span>${window.t?.("admins")||"Admins"}</span></div>`;
    } catch(e) { console.error(e); }
}

// ─── USERS ───────────────────────────────────────────────────────────────────
async function loadUsers() {
    const container = document.getElementById("userList");
    if (!container) return;
    container.innerHTML = "<p style='padding:20px;text-align:center;color:#888;'>Loading...</p>";
    const snapshot = await getDocs(collection(db, "users"));
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uid  = docSnap.id;
        const isBanned = data.banned === true;
        const isAdmin  = data.role === "admin";
        const row = document.createElement("div");
        row.className = "admin-row"; row.id = `user-${uid}`;
        row.innerHTML = `
            <div class="admin-row-info">
                <img src="${data.photoUrl || '../public/img/user/user-1.jpg'}" alt=""
                     style="cursor:pointer;" onclick="window.location.href='user-profile.html?uid=${uid}'">
                <div>
                    <strong id="uname-${uid}">${data.displayName || "No name"}</strong>
                    <span>${data.email || ""}</span>
                    <span class="role-badge ${isAdmin ? 'admin' : ''}">${data.role || "user"}</span>
                    ${isBanned ? '<span class="banned-badge">BANNED</span>' : ''}
                    <small style="color:#aaa;display:block;margin-top:2px;" id="ubio-${uid}">${data.bio || ""}</small>
                </div>
            </div>
            <div class="admin-row-actions">
                <button onclick="adminEditName('${uid}')" class="role-btn" style="background:#059669;">
                    ✏️ ${window.t?.("editName")||"Edit Name"}
                </button>
                <button onclick="adminEditBio('${uid}')" class="role-btn" style="background:#7c3aed;">
                    📝 ${window.t?.("editBioAdmin")||"Edit Bio"}
                </button>
                <button onclick="toggleBan('${uid}', ${isBanned})" class="${isBanned ? 'unban-btn' : 'ban-btn'}">
                    ${isBanned ? `🔓 ${window.t?.("unban")||"Unban"}` : `🔨 ${window.t?.("ban")||"Ban"}`}
                </button>
                <button onclick="makeAdmin('${uid}', '${data.role}')" class="role-btn">
                    ${isAdmin ? `👤 ${window.t?.("makeUser")||"Make User"}` : `👑 ${window.t?.("makeAdmin")||"Make Admin"}`}
                </button>
                <button onclick="sendNotifToUser('${uid}')" class="role-btn" style="background:#0891b2;">
                    🔔 ${window.t?.("notify")||"Notify"}
                </button>
                <button onclick="deleteUser('${uid}')" class="delete-btn-admin">
                    🗑️ ${window.t?.("delete")||"Delete"}
                </button>
            </div>`;
        container.appendChild(row);
    });
}

// ─── POSTS ───────────────────────────────────────────────────────────────────
async function loadPosts() {
    const container = document.getElementById("postList");
    if (!container) return;
    container.innerHTML = "<p style='padding:20px;text-align:center;color:#888;'>Loading...</p>";
    const snapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
    container.innerHTML = "";
    const searchBox = document.getElementById("postSearch");
    if (searchBox) {
        searchBox.addEventListener("input", () => {
            const q = searchBox.value.toLowerCase();
            document.querySelectorAll(".admin-post-row").forEach(r => {
                r.style.display = r.dataset.title.includes(q) || r.dataset.author.includes(q) ? "" : "none";
            });
        });
    }
    snapshot.forEach((docSnap) => {
        const data = docSnap.data(); const id = docSnap.id;
        const row = document.createElement("div");
        row.className = "admin-row admin-post-row"; row.id = `apost-${id}`;
        row.dataset.title  = (data.title  || "").toLowerCase();
        row.dataset.author = (data.author || "").toLowerCase();
        const postMedia = data.media || [];
        const thumbnailUrl = postMedia.length > 0 && postMedia[0].type !== 'video' ? postMedia[0].url : (data.imageUrl || '');
        row.innerHTML = `
            <div class="admin-row-info">
                <img src="${thumbnailUrl}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#eee;">
                <div>
                    <strong id="ptitle-${id}">${data.title}</strong>
                    <span>Author: ${data.author}</span>
                    <small id="pcontent-${id}" style="color:#888;display:block;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${data.content}</small>
                    <span>${new Date(data.createdAt).toLocaleDateString("en-US")} · ❤️ ${(data.likes||[]).length} · 💬 ${(data.comments||[]).length}</span>
                    <span style="font-size:0.75rem;">${data.isPublic ? '🌍 Public' : '🔒 Private'}</span>
                </div>
            </div>
            <div class="admin-row-actions">
                <button onclick="adminEditPostTitle('${id}')" class="role-btn" style="background:#059669;">
                    ✏️ ${window.t?.("editPostTitle")||"Edit Title"}
                </button>
                <button onclick="adminEditPostContent('${id}')" class="role-btn" style="background:#7c3aed;">
                    📝 ${window.t?.("editPostContent")||"Edit Content"}
                </button>
                <button onclick="togglePublic('${id}', ${data.isPublic})" class="role-btn">
                    ${data.isPublic ? `🔒 ${window.t?.("hide")||"Hide"}` : `🌍 ${window.t?.("publish")||"Publish"}`}
                </button>
                <button onclick="deletePost('${id}')" class="delete-btn-admin">
                    🗑️ ${window.t?.("delete")||"Delete"}
                </button>
            </div>`;
        container.appendChild(row);
    });
}

// ─── FOLLOW REQUESTS ─────────────────────────────────────────────────────────
async function loadFollowRequests() {
    const container = document.getElementById("followRequestList");
    if (!container) return;
    container.innerHTML = "<p style='padding:20px;text-align:center;color:#888;'>Loading...</p>";
    try {
        const snapshot = await getDocs(query(
            collection(db, "notifications"),
            where("type", "==", "follow_request"),
            where("handled", "==", false)
        ));
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = "<p style='padding:20px;text-align:center;color:#aaa;'>No pending follow requests.</p>";
            return;
        }
        snapshot.forEach((docSnap) => {
            const req = docSnap.data(); const reqId = docSnap.id;
            const row = document.createElement("div");
            row.className = "admin-row";
            row.innerHTML = `
                <div class="admin-row-info">
                    <div>
                        <strong>${req.message || "Follow request"}</strong>
                        <span style="font-size:0.8rem;color:#aaa;">${new Date(req.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                </div>
                <div class="admin-row-actions">
                    <button onclick="adminApproveReq('${reqId}','${req.fromUid}','${req.toUid}')" class="unban-btn">✅ ${window.t?.("approve")||"Approve"}</button>
                    <button onclick="adminRejectReq('${reqId}')" class="ban-btn">❌ ${window.t?.("reject")||"Reject"}</button>
                </div>`;
            container.appendChild(row);
        });
    } catch(e) {
        container.innerHTML = "<p style='padding:20px;text-align:center;color:#aaa;'>No follow requests yet.</p>";
    }
}

// ─── ADMIN EDIT ACTIONS ──────────────────────────────────────────────────────
window.adminEditName = async (uid) => {
    const current = document.getElementById(`uname-${uid}`)?.textContent || "";
    const newName = prompt("New display name:", current);
    if (!newName || newName.trim() === current) return;
    await setDoc(doc(db, "users", uid), { displayName: newName.trim() }, { merge: true });
    const el = document.getElementById(`uname-${uid}`);
    if (el) el.textContent = newName.trim();
    alert("Name updated!");
};

window.adminEditBio = async (uid) => {
    const current = document.getElementById(`ubio-${uid}`)?.textContent || "";
    const newBio = prompt("New bio:", current);
    if (newBio === null) return;
    await setDoc(doc(db, "users", uid), { bio: newBio.trim() }, { merge: true });
    const el = document.getElementById(`ubio-${uid}`);
    if (el) el.textContent = newBio.trim();
    alert("Bio updated!");
};

window.adminEditPostTitle = async (id) => {
    const current = document.getElementById(`ptitle-${id}`)?.textContent || "";
    const newTitle = prompt("New title:", current);
    if (!newTitle || newTitle.trim() === current) return;
    await updateDoc(doc(db, "posts", id), { title: newTitle.trim() });
    const el = document.getElementById(`ptitle-${id}`);
    if (el) el.textContent = newTitle.trim();
    alert("Title updated!");
};

window.adminEditPostContent = async (id) => {
    const current = document.getElementById(`pcontent-${id}`)?.textContent || "";
    const newContent = prompt("New content (first 500 chars shown):", current);
    if (newContent === null) return;
    await updateDoc(doc(db, "posts", id), { content: newContent.trim() });
    const el = document.getElementById(`pcontent-${id}`);
    if (el) el.textContent = newContent.trim();
    alert("Content updated!");
};

// ─── STANDARD ACTIONS ────────────────────────────────────────────────────────
window.toggleBan = async (uid, isBanned) => {
    if (!confirm(isBanned ? "Unban this user?" : "Ban this user?")) return;
    await setDoc(doc(db, "users", uid), { banned: !isBanned }, { merge: true });
    loadUsers();
};

window.makeAdmin = async (uid, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Make this user ${newRole}?`)) return;
    await setDoc(doc(db, "users", uid), { role: newRole }, { merge: true });
    loadUsers();
};

window.deleteUser = async (uid) => {
    if (!confirm("Delete this user? This cannot be undone!")) return;
    await deleteDoc(doc(db, "users", uid));
    document.getElementById(`user-${uid}`)?.remove();
};

window.sendNotifToUser = async (uid) => {
    const msg = prompt("Notification message:");
    if (!msg) return;
    await addDoc(collection(db, "notifications"), {
        toUid: uid, fromUid: currentAdmin.uid,
        type: "admin", message: msg, read: false, createdAt: Date.now()
    });
    alert("Notification sent!");
};

window.deletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", id));
    document.getElementById(`apost-${id}`)?.remove();
};

window.togglePublic = async (id, isPublic) => {
    await updateDoc(doc(db, "posts", id), { isPublic: !isPublic });
    loadPosts();
};

window.adminApproveReq = async (reqId, fromUid, toUid) => {
    if (!fromUid || !toUid) return;
    try {
        const { arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js");
        await updateDoc(doc(db, "users", fromUid), { following: arrayUnion(toUid) });
        await updateDoc(doc(db, "notifications", reqId), { handled: true, read: true, result: "accepted" });
        loadFollowRequests();
    } catch(e) { console.error(e); }
};

window.adminRejectReq = async (reqId) => {
    await updateDoc(doc(db, "notifications", reqId), { handled: true, read: true, result: "rejected" });
    loadFollowRequests();
};

window.refreshAll = () => { loadStats(); loadUsers(); loadPosts(); loadFollowRequests(); };
