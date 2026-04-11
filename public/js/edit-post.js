import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { uploadToCloudinary } from "./cloudinary-upload.js";

const postForm = document.getElementById("editPostForm");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const newMediaPreviewContainer = document.getElementById("newMediaPreviewContainer");
const existingMediaContainer = document.getElementById("existingMediaContainer");
const loadingText = document.getElementById("loadingText");

let currentPostId = null;
let currentPostData = null;
let currentUser = null;
let existingMedia = [];
let selectedFiles = [];
const MAX_FILES = 5;

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

async function loadPost() {
    const postId = getQueryParam("id");
    if (!postId) {
        alert("Post ID not found!");
        window.location.href = "profile.html";
        return;
    }
    
    currentPostId = postId;
    currentUser = auth.currentUser;
    
    if (!currentUser) {
        alert("Please login first!");
        window.location.href = "login.html";
        return;
    }
    
    try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
            alert("Post not found!");
            window.location.href = "profile.html";
            return;
        }
        
        currentPostData = postSnap.data();
        
        if (currentPostData.userId !== currentUser.uid) {
            alert("You can only edit your own posts!");
            window.location.href = "profile.html";
            return;
        }
        
        document.getElementById("postTitle").value = currentPostData.title || "";
        document.getElementById("postContent").value = currentPostData.content || "";
        
        existingMedia = currentPostData.media || [];
        displayExistingMedia();
        
        loadingText.style.display = "none";
        postForm.style.display = "block";
        
    } catch (error) {
        console.error("Error loading post:", error);
        alert("Error loading post!");
        window.location.href = "profile.html";
    }
}

function displayExistingMedia() {
    if (!existingMediaContainer) return;
    
    existingMediaContainer.innerHTML = "";
    
    if (existingMedia.length === 0) {
        existingMediaContainer.innerHTML = '<p style="color:#888;font-size:0.9rem;">No media attached</p>';
        return;
    }
    
    existingMedia.forEach((media, index) => {
        const item = document.createElement("div");
        item.className = "media-preview-item";
        
        if (media.type === 'video') {
            const video = document.createElement("video");
            video.src = media.url;
            video.controls = true;
            video.muted = true;
            item.appendChild(video);
        } else {
            const img = document.createElement("img");
            img.src = media.url;
            item.appendChild(img);
        }
        
        const badge = document.createElement("span");
        badge.className = "media-type-badge";
        badge.innerHTML = media.type === 'video' ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-image"></i>';
        item.appendChild(badge);
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.onclick = () => removeExistingMedia(index);
        item.appendChild(removeBtn);
        
        existingMediaContainer.appendChild(item);
    });
}

function removeExistingMedia(index) {
    if (confirm("Remove this media?")) {
        existingMedia.splice(index, 1);
        displayExistingMedia();
    }
}

if (dropZone) {
    dropZone.addEventListener("click", () => {
        if (fileInput) fileInput.click();
    });
    
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });
    
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });
    
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files).filter(f => 
            f.type.startsWith("image/") || f.type.startsWith("video/")
        );
        handleFiles(files);
    });
}

if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        handleFiles(Array.from(e.target.files));
    });
}

function handleFiles(files) {
    const remaining = MAX_FILES - existingMedia.length - selectedFiles.length;
    if (remaining <= 0) {
        alert(`Maximum ${MAX_FILES} files allowed!`);
        return;
    }
    
    const filesToAdd = files.slice(0, remaining);
    selectedFiles = [...selectedFiles, ...filesToAdd];
    updateNewPreview();
}

function updateNewPreview() {
    if (!newMediaPreviewContainer) return;
    
    if (selectedFiles.length === 0) {
        newMediaPreviewContainer.style.display = "none";
        return;
    }
    
    newMediaPreviewContainer.style.display = "flex";
    newMediaPreviewContainer.innerHTML = "";
    
    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "media-preview-item";
        
        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            item.appendChild(img);
        } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.muted = true;
            item.appendChild(video);
        }
        
        const badge = document.createElement("span");
        badge.className = "media-type-badge";
        badge.innerHTML = file.type.startsWith("video/") ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-image"></i>';
        badge.style.background = "#f59e0b";
        item.appendChild(badge);
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.onclick = () => removeNewFile(index);
        item.appendChild(removeBtn);
        
        newMediaPreviewContainer.appendChild(item);
    });
}

function removeNewFile(index) {
    selectedFiles.splice(index, 1);
    updateNewPreview();
}

async function uploadFile(file) {
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const result = await uploadToCloudinary(file, resourceType);
    return { url: result.url, type: result.type };
}

if (postForm) {
    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) { 
            alert("Please login first!"); 
            window.location.href = "login.html";
            return; 
        }
        
        const title = document.getElementById("postTitle").value.trim();
        const content = document.getElementById("postContent").value.trim();
        
        if (!title || !content) {
            alert("Please fill in all fields!");
            return;
        }
        
        const submitBtn = document.getElementById("submitBtn");
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            
            const updatedMedia = [...existingMedia];
            
            for (const file of selectedFiles) {
                const media = await uploadFile(file);
                updatedMedia.push(media);
            }
            
            await updateDoc(doc(db, "posts", currentPostId), {
                title,
                content,
                media: updatedMedia,
                updatedAt: Date.now()
            });
            
            alert("Post updated successfully!");
            window.location.href = "profile.html";
            
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Error updating post: " + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        }
    });
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    loadPost();
});
