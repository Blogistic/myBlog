// Sayfa yüklenince görünür elemanları hemen aktifleştir
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.target').forEach(el => {
        el.classList.add('active');
    });

    // Feed tabs orijinal konumu
    if (feedTabs) {
        feedTabsOriginalTop = feedTabs.getBoundingClientRect().top + window.scrollY;
    }
});

// ─── SCROLL ANİMASYONU ────────────────────────────────────────────────────────
// active class bir kez eklenince bir daha kaldırılmıyor
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.target').forEach(el => observer.observe(el));

// Dinamik eklenen post'ları da izle (profile sayfası için)
const postsContainer = document.getElementById('profilePostContainer') || document.getElementById('postContainer');
if (postsContainer) {
    new MutationObserver(() => {
        postsContainer.querySelectorAll('.target:not(.observed)').forEach(el => {
            el.classList.add('observed');
            observer.observe(el);
        });
    }).observe(postsContainer, { childList: true, subtree: true });
}

// ─── TOPBAR + FEED TABS AKILLI SCROLL ────────────────────────────────────────
let lastScrollY = 0;
let feedTabsOriginalTop = 0;
const topbar = document.querySelector('.topbar');
const feedTabs = document.querySelector('.feed-tabs');

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;
    const feedTabsAtTop = feedTabs && currentScrollY >= feedTabsOriginalTop - 50;

    if (scrollingDown && currentScrollY > 60) {
        if (topbar) topbar.classList.add('hidden');
        if (feedTabsAtTop && feedTabs) feedTabs.classList.add('hidden');
    } else {
        if (topbar) topbar.classList.remove('hidden');
        if (feedTabs) feedTabs.classList.remove('hidden');
    }

    lastScrollY = currentScrollY;
});
