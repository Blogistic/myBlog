// Auto-translate module using MyMemory API (free, no API key required)
// Post titles and content are auto-translated based on UI language

const AUTO_TRANSLATE_ENABLED = true;
const CACHE_KEY = 'biblog_translations_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function getTranslationCache() {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (cache) {
            const parsed = JSON.parse(cache);
            if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
                return parsed.data;
            }
        }
    } catch (e) {}
    return {};
}

function setTranslationCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (e) {}
}

window.translationCache = getTranslationCache();

async function translateText(text, targetLang, sourceLang = 'auto') {
    if (!text || !text.trim() || !AUTO_TRANSLATE_ENABLED) return text;
    if (targetLang === 'en') return text;
    
    const cacheKey = `${sourceLang}_${targetLang}_${text.substring(0, 100)}`;
    
    if (window.translationCache[cacheKey]) {
        return window.translationCache[cacheKey];
    }
    
    try {
        const encoded = encodeURIComponent(text);
        const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${sourceLang}|${targetLang}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            window.translationCache[cacheKey] = translated;
            setTranslationCache(window.translationCache);
            return translated;
        }
    } catch (e) {
        console.warn('Translation error:', e);
    }
    
    return text;
}

async function detectLanguage(text) {
    if (!text || !text.trim()) return 'en';
    
    const turkishChars = /[çğıüşöÇĞİÜŞÖ]/;
    const arabicChars = /[\u0600-\u06FF]/;
    const germanChars = /[äöüßÄÖÜ]/;
    const frenchChars = /[éèêëàâùûîïôœç]/i;
    const spanishChars = /[áéíóúüñ¿¡]/i;
    
    if (turkishChars.test(text)) return 'tr';
    if (arabicChars.test(text)) return 'ar';
    if (germanChars.test(text)) return 'de';
    if (frenchChars.test(text)) return 'fr';
    if (spanishChars.test(text)) return 'es';
    
    return 'en';
}

window.translateText = translateText;
window.detectLanguage = detectLanguage;

window.autoTranslatePost = async function(postElement, docId) {
    if (!AUTO_TRANSLATE_ENABLED) return;
    
    const currentLang = localStorage.getItem('language') || 'en';
    if (currentLang === 'en') return;
    
    const titleEl = postElement.querySelector('h1');
    const contentEl = postElement.querySelector('.post > p:not(.authorAndDate span)');
    
    if (titleEl && contentEl) {
        const title = titleEl.textContent;
        const content = contentEl.textContent;
        
        const titleLang = await detectLanguage(title);
        const contentLang = await detectLanguage(content);
        
        if (titleLang !== currentLang || contentLang !== currentLang) {
            const [translatedTitle, translatedContent] = await Promise.all([
                translateText(title, currentLang, titleLang),
                translateText(content, currentLang, contentLang)
            ]);
            
            titleEl.textContent = translatedTitle;
            contentEl.textContent = translatedContent;
            
            const translateBtn = document.createElement('button');
            translateBtn.className = 'translate-btn';
            translateBtn.innerHTML = '<i class="fa-solid fa-language"></i>';
            translateBtn.title = window.t ? window.t('translate') : 'Translate';
            translateBtn.onclick = async (e) => {
                e.stopPropagation();
                const original = titleEl.dataset.original || title;
                const originalContent = contentEl.dataset.original || content;
                
                if (titleEl.dataset.translated) {
                    titleEl.textContent = original;
                    contentEl.textContent = originalContent;
                    titleEl.dataset.translated = '';
                } else {
                    const [tTitle, tContent] = await Promise.all([
                        translateText(original, currentLang, titleLang),
                        translateText(originalContent, currentLang, contentLang)
                    ]);
                    titleEl.dataset.original = title;
                    contentEl.dataset.original = content;
                    titleEl.textContent = tTitle;
                    contentEl.textContent = tContent;
                    titleEl.dataset.translated = 'true';
                    contentEl.dataset.translated = 'true';
                }
            };
            
            const reactions = postElement.querySelector('.post-reactions');
            if (reactions) {
                reactions.insertBefore(translateBtn, reactions.firstChild);
            }
        }
    }
};

window.translatePostContent = async function(docId, title, content) {
    if (!AUTO_TRANSLATE_ENABLED) return { title, content };
    
    const currentLang = localStorage.getItem('language') || 'en';
    if (currentLang === 'en') return { title, content };
    
    const titleLang = await detectLanguage(title);
    const contentLang = await detectLanguage(content);
    
    if (titleLang !== currentLang || contentLang !== currentLang) {
        const [translatedTitle, translatedContent] = await Promise.all([
            translateText(title, currentLang, titleLang),
            translateText(content, currentLang, contentLang)
        ]);
        
        return {
            title: translatedTitle,
            content: translatedContent,
            originalTitle: title,
            originalContent: content,
            titleLang,
            contentLang
        };
    }
    
    return { title, content };
};
