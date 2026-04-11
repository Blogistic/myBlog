// Cloudinary Upload Module
// Replaces IMGBB with Cloudinary for image/video uploads

export const CLOUDINARY_CONFIG = {
    cloudName: "hellyeahmanbrother",
    uploadPreset: "BIBlog_preset"
};

export async function uploadToCloudinary(file, resourceType = 'auto') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    const typeParam = resourceType === 'video' ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${typeParam}/upload`;
    
    const res = await fetch(url, {
        method: 'POST',
        body: formData
    });
    
    if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error) {
        throw new Error(data.error.message);
    }
    
    return {
        url: data.secure_url,
        type: data.resource_type === 'video' ? 'video' : 'image',
        publicId: data.public_id
    };
}

export async function uploadMultipleToCloudinary(files) {
    const results = [];
    for (const file of files) {
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        const result = await uploadToCloudinary(file, type);
        results.push(result);
    }
    return results;
}
