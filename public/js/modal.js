const modal = document.getElementById("postModal");
const closeBtn = document.querySelector(".close-btn");
let currentModalCarouselIndex = 0;
let currentModalMedia = [];

window.setupModal = function() {
    const posts = document.querySelectorAll('.post.target');

    posts.forEach(post => {
        post.onclick = (e) => {
            if (
                e.target.closest('.post-actions') ||
                e.target.closest('.post-reactions') ||
                e.target.closest('.comment-section') ||
                e.target.closest('.comment-input-area') ||
                e.target.closest('.reaction-btn') ||
                e.target.closest('.carousel-btn') ||
                e.target.closest('.carousel-dot')
            ) return;

            const titleEl  = post.querySelector('h1');
            const textEl   = post.querySelector('p');
            const metaEl   = post.querySelector('.authorAndDate');
            const carousel = post.querySelector('.post-media-carousel');

            if (!titleEl || !modal) return;

            document.getElementById("modalTitle").innerText   = titleEl.innerText;
            document.getElementById("modalFullText").innerText = textEl ? textEl.innerText : '';
            document.getElementById("modalMeta").innerHTML    = metaEl ? metaEl.innerHTML : '';

            const mediaContainer = document.getElementById("modalMediaContainer");
            mediaContainer.innerHTML = '';
            currentModalMedia = [];

            if (carousel) {
                const slides = carousel.querySelectorAll('.carousel-slide');
                
                slides.forEach((slide, i) => {
                    const img = slide.querySelector('img');
                    const video = slide.querySelector('video');
                    if (img) currentModalMedia.push({ type: 'image', url: img.src });
                    else if (video) currentModalMedia.push({ type: 'video', url: video.src });
                });
            } else {
                const allImages = post.querySelectorAll('img');
                const allVideos = post.querySelectorAll('video');
                
                allImages.forEach(img => {
                    if (img.src && !img.closest('.authorAndDate') && img.width > 100) {
                        currentModalMedia.push({ type: 'image', url: img.src });
                    }
                });
                allVideos.forEach(video => {
                    if (video.src) {
                        currentModalMedia.push({ type: 'video', url: video.src });
                    }
                });
            }

            if (currentModalMedia.length > 0) {
                if (currentModalMedia.length === 1) {
                    if (currentModalMedia[0].type === 'video') {
                        mediaContainer.innerHTML = `<video src="${currentModalMedia[0].url}" controls class="modal-media-single"></video>`;
                    } else {
                        mediaContainer.innerHTML = `<img src="${currentModalMedia[0].url}" alt="" class="modal-media-single">`;
                    }
                } else {
                    currentModalCarouselIndex = 0;
                    mediaContainer.innerHTML = `
                        <div class="modal-carousel">
                            <div id="modalCarouselTrack">
                                ${currentModalMedia.map((m, i) => `
                                    <div class="modal-carousel-slide" data-index="${i}" style="display:${i === 0 ? 'block' : 'none'};">
                                        ${m.type === 'video' 
                                            ? `<video src="${m.url}" controls class="modal-media-single"></video>`
                                            : `<img src="${m.url}" alt="" class="modal-media-single">`
                                        }
                                    </div>
                                `).join('')}
                            </div>
                            <button class="modal-carousel-btn modal-prev" onclick="modalMoveCarousel(-1)">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <button class="modal-carousel-btn modal-next" onclick="modalMoveCarousel(1)">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>
                            <div class="modal-carousel-indicators">
                                ${currentModalMedia.map((_, i) => `<span class="modal-dot ${i === 0 ? 'active' : ''}" onclick="modalGoToSlide(${i})"></span>`).join('')}
                            </div>
                        </div>
                    `;
                }
            }

            modal.style.display       = "block";
            document.body.style.overflow = "hidden";
        };
    });
};

window.modalMoveCarousel = (direction) => {
    const slides = document.querySelectorAll('.modal-carousel-slide');
    if (slides.length === 0) return;
    
    slides[currentModalCarouselIndex].style.display = 'none';
    currentModalCarouselIndex += direction;
    if (currentModalCarouselIndex < 0) currentModalCarouselIndex = slides.length - 1;
    if (currentModalCarouselIndex >= slides.length) currentModalCarouselIndex = 0;
    slides[currentModalCarouselIndex].style.display = 'block';
    
    document.querySelectorAll('.modal-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentModalCarouselIndex);
    });
};

window.modalGoToSlide = (index) => {
    const slides = document.querySelectorAll('.modal-carousel-slide');
    if (!slides[index]) return;
    slides[currentModalCarouselIndex].style.display = 'none';
    currentModalCarouselIndex = index;
    slides[currentModalCarouselIndex].style.display = 'block';
    document.querySelectorAll('.modal-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentModalCarouselIndex);
    });
};

if (closeBtn) {
    closeBtn.onclick = () => {
        modal.style.display       = "none";
        document.body.style.overflow = "auto";
    };
}

window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display       = "none";
        document.body.style.overflow = "auto";
    }
};
