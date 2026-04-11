const dateien = [
    "public/js/add-post.js",
    "public/js/admin.js",
    "public/js/auth-kontrol.js",
    "public/js/cookie-consent.js",
    "public/js/dark-mode.js",
    "public/js/filter.js",
    "public/js/firebase.js",
    "public/js/forgot-password.js",
    "public/js/get-post.js",
    "public/js/get-posts.js",
    "public/js/language.js",
    "public/js/login.js",
    "public/js/menu.js",
    "public/js/messages.js",
    "public/js/modal.js",
    "public/js/notifications.js",
    "public/js/profile.js",
    "public/js/public.js",
    "public/js/register.js",
    "public/js/scroll.js",
    "public/js/search.js",
    "public/js/terms-consent.js",
    "public/js/user-profile.js"
];

dateien.forEach(async (datei) => {
    try {
        await import(`./${datei}`);
    } catch (error) {
        console.error('Fehler beim Importieren der Datei:', datei, error+error.stack);
    }
});