import { db, auth } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs.com/10.10.0/firebase-firestore.js";
import { validateFields } from "./filter.js";
import { uploadToCloudinary } from "./cloudinary-upload.js";

const postForm = document.getElementById("addPostForm");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const mediaPreviewContainer = document.getElementById("mediaPreviewContainer");

let selectedFiles = [];
const MAX_FILES = 5;

// Drop zone click
if (dropZone) {
    dropZone.addEventListener("click", () => {
        if (fileInput) fileInput.click();
    });
}

// File input change
if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        handleFiles(Array.from(e.target.files));
    });
}

// Drag and drop
if (dropZone) {
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

function handleFiles(files) {
    const remaining = MAX_FILES - selectedFiles.length;
    if (remaining <= 0) {
        alert(`Maksimum ${MAX_FILES} dosya ekleyebilirsiniz!`);
        return;
    }
    
    const filesToAdd = files.slice(0, remaining);
    selectedFiles = [...selectedFiles, ...filesToAdd];
    updatePreview();
}

function updatePreview() {
    if (!mediaPreviewContainer) return;
    
    if (selectedFiles.length === 0) {
        mediaPreviewContainer.style.display = "none";
        return;
    }
    
    mediaPreviewContainer.style.display = "flex";
    mediaPreviewContainer.innerHTML = "";
    
    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "media-preview-item";
        
        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            item.appendChild(img);
            
            const badge = document.createElement("span");
            badge.className = "media-type-badge";
            badge.innerHTML = '<i class="fa-solid fa-image"></i>';
            item.appendChild(badge);
        } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.muted = true;
            item.appendChild(video);
            
            const badge = document.createElement("span");
            badge.className = "media-type-badge";
            badge.innerHTML = '<i class="fa-solid fa-video"></i>';
            item.appendChild(badge);
        }
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.onclick = () => removeFile(index);
        item.appendChild(removeBtn);
        
        mediaPreviewContainer.appendChild(item);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updatePreview();
}

async function uploadFile(file) {
    try {
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const result = await uploadToCloudinary(file, resourceType);
        return { url: result.url, type: result.type };
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

if (postForm) {
    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) { alert("Lütfen önce giriş yapın!"); return; }
        
        const title = document.getElementById("postTitle").value.trim();
        const content = document.getElementById("postContent").value.trim();
        const authorName = document.getElementById("postAuthor").value.trim();
        
        const filterError = validateFields({
            "Başlık": title,
            "İçerik": content,
            "Yazar Adı": authorName,
        });
        if (filterError) { alert("⚠️ " + filterError); return; }
        
        if (selectedFiles.length === 0) { 
            alert("Lütfen en az bir fotoğraf veya video ekleyin!"); 
            return; 
        }
        
        const submitBtn = document.getElementById("submitBtn");
        
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
            }
            
            const uploadedMedia = [];
            
            for (const file of selectedFiles) {
                const media = await uploadFile(file);
                uploadedMedia.push(media);
            }
            
            await addDoc(collection(db, "posts"), {
                title,
                content,
                author: authorName,
                media: uploadedMedia,
                userId: user.uid,
                isPublic: false,
                createdAt: Date.now(),
                likes: [],
                dislikes: [],
                saves: [],
                comments: []
            });
            
            alert("Rapor başarıyla kaydedildi! 🛸");
            window.location.href = "../index.html";
        } catch (error) {
            console.error("Hata:", error);
            alert("Bir hata oluştu: " + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Yayınla';
            }
        }
    });
}
