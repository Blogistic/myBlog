// Sayfa yüklenince kaydedilmiş temayı uygula
document.addEventListener('DOMContentLoaded', () => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) enableDark();

    // Toggle switch ayarlar sayfasında
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;

    // Topbar dark mode butonu
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.innerHTML = isDark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        btn.addEventListener('click', toggleDark);
    }

    if (toggle) {
        toggle.addEventListener('change', toggleDark);
    }
});

function enableDark() {
    document.body.classList.add('dark-mode');
}

function disableDark() {
    document.body.classList.remove('dark-mode');
}

function toggleDark() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        disableDark();
        localStorage.setItem('darkMode', 'false');
    } else {
        enableDark();
        localStorage.setItem('darkMode', 'true');
    }

    // İkon güncelle
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.innerHTML = document.body.classList.contains('dark-mode')
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
    }

    // Toggle güncelle
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = document.body.classList.contains('dark-mode');
}

// Global erişim
window.toggleDark = toggleDark;