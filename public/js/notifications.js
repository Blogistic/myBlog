import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs,
    doc, updateDoc, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const container = document.getElementById("notifContainer");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        container.innerHTML = `<p style="text-align:center;padding:60px;color:#888;font-family:'Josefin Sans',sans-serif;">
            Please <a href="login.html" style="color:#4f46e5;">log in</a> to see your notifications.</p>`;
        return;
    }
    await loadNotifications(user);
});

async function loadNotifications(user) {
    try {
        const q = query(
            collection(db, "notifications"),
            where("toUid", "==", user.uid),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#888;font-family:'Josefin Sans',sans-serif;">
                    <i class="fa-solid fa-bell-slash" style="font-size:2.5rem;display:block;margin-bottom:16px;opacity:0.3;"></i>
                    <p>No notifications yet.</p>
                    <p style="font-size:0.85rem;margin-top:8px;">When someone likes, comments, follows or sends a follow request, it'll show here.</p>
                </div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const n      = docSnap.data();
            const isRead = n.read === true;
            const timeAgo = getTimeAgo(n.createdAt);

            const icons = {
                like:           '<i class="fa-solid fa-heart" style="color:#e0245e;"></i>',
                dislike:        '<i class="fa-solid fa-thumbs-down" style="color:#6c63ff;"></i>',
                comment:        '<i class="fa-solid fa-comment" style="color:#4f46e5;"></i>',
                follow:         '<i class="fa-solid fa-user-plus" style="color:#2ecc71;"></i>',
                follow_request: '<i class="fa-solid fa-user-clock" style="color:#f59e0b;"></i>',
                save:           '<i class="fa-solid fa-bookmark" style="color:#f59e0b;"></i>',
            };
            const icon = icons[n.type] || '<i class="fa-solid fa-bell"></i>';

            const row = document.createElement("div");
            row.style.cssText = `
                display:flex;align-items:flex-start;gap:14px;padding:16px 20px;
                border-radius:12px;margin-bottom:10px;
                background:${isRead ? '#fff' : '#f0f0ff'};
                border:1px solid ${isRead ? '#eee' : '#d0d0ff'};
                font-family:'Josefin Sans',sans-serif;
                transition:background 0.2s;
            `;

            // Follow request için kabul/reddet butonları
            const actionBtns = (n.type === "follow_request" && !n.handled) ? `
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <button onclick="acceptFollowRequest('${docSnap.id}','${n.fromUid}')"
                        style="padding:6px 14px;background:#2ecc71;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.82rem;">
                        ✓ Accept
                    </button>
                    <button onclick="declineFollowRequest('${docSnap.id}','${n.fromUid}')"
                        style="padding:6px 14px;background:#ff4d4d;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'Josefin Sans',sans-serif;font-size:0.82rem;">
                        ✗ Decline
                    </button>
                </div>` : "";

            row.innerHTML = `
                <div style="font-size:1.3rem;width:30px;text-align:center;flex-shrink:0;margin-top:2px;">${icon}</div>
                <div style="flex:1;">
                    <p style="margin:0;font-size:0.9rem;color:#222;">${n.message || "New notification"}</p>
                    <small style="color:#aaa;">${timeAgo}</small>
                    ${actionBtns}
                </div>
                ${!isRead ? '<div style="width:8px;height:8px;border-radius:50%;background:#4f46e5;flex-shrink:0;margin-top:6px;"></div>' : ''}
            `;

            // Okuma işareti
            if (n.type !== "follow_request") {
                row.style.cursor = "pointer";
                row.onclick = async () => {
                    await updateDoc(doc(db, "notifications", docSnap.id), { read: true });
                    row.style.background = "#fff";
                    row.style.border     = "1px solid #eee";
                    const dot = row.querySelector("div[style*='border-radius:50%']");
                    if (dot) dot.remove();
                };
            }

            container.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="text-align:center;padding:40px;color:#888;">Failed to load notifications.</p>`;
    }
}

// ─── FOLLOW REQUEST KABUL ────────────────────────────────────────────────────
window.acceptFollowRequest = async (notifId, fromUid) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // fromUid'nin following listesine user.uid'yi ekle
        // Add to following using arrayUnion
        const { arrayUnion: _au } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js");
        await updateDoc(doc(db, "users", fromUid), { following: _au(user.uid) });

        // Bildirimi işlenmiş olarak işaretle
        await updateDoc(doc(db, "notifications", notifId), { handled: true, read: true, result: "accepted" });

        // Kabul bildirimini karşı tarafa gönder
        await sendNotification(fromUid, user.uid, "follow", `${auth.currentUser.displayName || "Someone"} accepted your follow request.`);

        alert("Follow request accepted!");
        location.reload();
    } catch(err) {
        console.error(err);
        alert("Error accepting request.");
    }
};

// ─── FOLLOW REQUEST RED ───────────────────────────────────────────────────────
window.declineFollowRequest = async (notifId, fromUid) => {
    await updateDoc(doc(db, "notifications", notifId), { handled: true, read: true, result: "declined" });
    alert("Follow request declined.");
    location.reload();
};

// ─── BİLDİRİM GÖNDER (global) ────────────────────────────────────────────────
import { addDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

window.sendNotification = async (toUid, fromUid, type, message, postId = null) => {
    try {
        if (toUid === fromUid) return; // Kendine bildirim gönderme
        await addDoc(collection(db, "notifications"), {
            toUid, fromUid, type, message,
            postId: postId || null,
            read: false,
            handled: false,
            createdAt: Date.now()
        });
    } catch(err) { console.error("Notification error:", err); }
};

function getTimeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
