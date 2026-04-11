import LeoProfanity from "https://cdn.jsdelivr.net/npm/leo-profanity@1.6.0/+esm";

const turkishBadWords = [
    "amk", "bok", "orospu", "piç", "göt", "sik", "yarrak", "oç",
    "puşt", "ibne", "kaltak", "kahpe", "sürtük", "siktir", "pezevenk",
    "gavat", "gerizekalı", "şerefsiz", "namussuz", "orosbuçocuğu",
    "sikeyim", "sikerim", "ananı", "babanı", "amcık", "götveren"
];

// Yasaklı kullanıcı adları — siyasi figürler, ünlüler, troller
const bannedUsernames = [
    // Siyasi
    "trump", "donaldtrump", "biden", "joebiden", "obama", "barackobama",
    "putin", "vladimirputin", "erdogan", "tayyiperdogan", "receperdogan",
    "hitler", "mussolini", "stalin", "mao", "lenin", "ataturk",
    "macron", "scholz", "zelensky", "kimjongun", "kim", "xijinping",
    "modi", "imrankhan", "netanyahu", "maduro", "chavez", "castro",
    "trump2024", "maga", "isis", "pkk", "terrorist",
    // Futbolcular
    "ronaldo", "cristiano", "messi", "leonelmessi", "neymar", "mbappe",
    "haaland", "benzema", "modric", "salah", "lewandowski", "robben",
    "zidane", "beckham", "maradona", "pele", "ronaldinho", "kaka",
    "ibrahimovic", "zlatan", "rooney", "gerrard", "lampard", "terry",
    "iniesta", "xavi", "puyol", "casillas", "buffon", "cannavaro",
    "dybala", "depay", "dembele", "griezmann", "felix", "pedri",
    "vinicius", "bellingham", "saka", "rashford", "sterling",
    // Ünlüler/diğer
    "elonmusk", "musk", "billgates", "gates", "zuckerberg", "facebook",
    "jeffbezos", "bezos", "stevejobs", "jobs", "apple", "google",
    "admin", "administrator", "root", "system", "biblog", "moderator",
    "mod", "staff", "official", "support", "helpdesk",
    "anonymous", "anon", "hacker", "hack", "null", "undefined",
    "test", "testuser", "user", "demo", "guest"
];

LeoProfanity.add(turkishBadWords);

export function containsBadWord(text) {
    if (!text) return false;
    return LeoProfanity.check(text);
}

export function isBannedUsername(username) {
    if (!username) return false;
    const lower = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    return bannedUsernames.some(banned => {
        const b = banned.toLowerCase().replace(/[^a-z0-9]/g, "");
        return lower === b || lower.includes(b) || b.includes(lower);
    });
}

export function validateUsername(username) {
    if (!username || username.length < 3) return "Kullanıcı adı en az 3 karakter olmalıdır.";
    if (username.length > 20) return "Kullanıcı adı en fazla 20 karakter olabilir.";
    if (!/^[a-zA-Z0-9_. ]+$/.test(username)) return "Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir.";
    if (containsBadWord(username)) return "Kullanıcı adında uygunsuz içerik tespit edildi.";
    if (isBannedUsername(username)) return "Bu kullanıcı adı kullanılamaz. Lütfen farklı bir isim seçin.";
    return null;
}

export function validateFields(fields) {
    for (const [fieldName, value] of Object.entries(fields)) {
        if (containsBadWord(value)) {
            return `"${fieldName}" alanında uygunsuz içerik tespit edildi.`;
        }
    }
    return null;
}
