const searchIcon = document.getElementById("searchIcon");
const searchEngine = document.getElementById("searchEngine");
const searchInput = document.getElementById("searchInput");

// 1. Arama kutusunu açma/kapama animasyonu
if (searchIcon && searchEngine) {
    searchIcon.addEventListener("click", () => {
        searchEngine.classList.toggle("active");
        if (searchEngine.classList.contains("active")) {
            searchInput.focus();
        }
    });
}

// 2. Arama İşlevi (Filtreleme)
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const searchText = e.target.value.toLowerCase(); // Küçük harfe çevir ki büyük/küçük harf fark etmesin
        const posts = document.querySelectorAll(".post.target"); // Ekrandaki tüm postları seç

        posts.forEach((post) => {
            const title = post.querySelector("h1").innerText.toLowerCase();
            const content = post.querySelector("p").innerText.toLowerCase();

            // Eğer başlıkta veya içerikte aranan kelime geçiyorsa göster, geçmiyorsa gizle
            if (title.includes(searchText) || content.includes(searchText)) {
                post.style.display = "block"; // Göster
                // Eğer scroll animasyonu kullanıyorsan 'active' sınıfını da koru
                post.classList.add("active");
            } else {
                post.style.display = "none"; // Gizle
                post.classList.remove("active");
            }
        });

        // Eğer arama sonucu hiç post kalmadıysa kullanıcıya mesaj gösterilebilir (Opsiyonel)
        const visiblePosts = document.querySelectorAll(".post.target[style='display: block;']");
        console.log(`${visiblePosts.length} sonuç bulundu.`);
    });
}