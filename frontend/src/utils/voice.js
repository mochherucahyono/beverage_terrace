// src/utils/voice.js
// Parser perintah suara untuk kasir (Bahasa Indonesia).
// JavaScript murni (tanpa Vue) supaya mudah diuji dan dipakai ulang.

export const MAX_QTY = 99;
const MIN_MATCH_SCORE = 0.5; // ambang kecocokan nama produk (0–1)
const TIE_MARGIN = 0.06; // selisih skor yang dianggap "sama bagus" -> tanya ulang

// Ejaan / salah dengar -> bentuk baku. Berlaku untuk ucapan DAN nama produk,
// jadi "es", "ais", dan "ice" dianggap sama. Tambahkan sendiri sesuai produk Anda.
export const VOICE_ALIASES = {
    es: 'ice',
    ais: 'ice',
    aice: 'ice',
    cokelat: 'coklat',
    chocolate: 'coklat',
    choco: 'coklat',
    kapucino: 'cappuccino',
    kapuchino: 'cappuccino',
    capucino: 'cappuccino',
    cappucino: 'cappuccino',
    strawberry: 'stroberi',
    strawberi: 'stroberi',
    stoberi: 'stroberi',
    vanila: 'vanilla',
    orange: 'jeruk',
    grape: 'anggur',
    mango: 'mangga',
    manga: 'mangga',
    pineapple: 'nanas',
    tea: 'teh',
    coffee: 'kopi',
    milk: 'susu',
    gud: 'good',
    gut: 'good',
    dei: 'day',
    dey: 'day',
};

// Kata yang diabaikan saat mencari nama produk
const STOPWORDS = new Set([
    'tolong', 'tambah', 'tambahkan', 'tambahin', 'pesan', 'pesen', 'pesanan', 'beli', 'minta',
    'mau', 'order', 'kasih', 'buatkan', 'bikin', 'dong', 'deh', 'ya', 'lagi', 'porsi', 'saset',
    'sachet', 'bungkus', 'buah', 'gelas', 'pcs', 'biji', 'item', 'yang', 'nya', 'untuk', 'saya', 'aku',
]);

// Kata sambung pemisah antar produk: "pop ice coklat 2 DAN good day 3"
const SEPARATORS = new Set(['dan', 'sama', 'lalu', 'terus', 'kemudian', 'serta', 'plus']);

const REMOVE_WORDS = new Set(['hapus', 'buang', 'batalkan', 'batal', 'kurangi', 'kurangin', 'cancel']);
const REDUCE_WORDS = new Set(['kurangi', 'kurangin']);

const UNITS = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };
const NUM_FIX = { saat: 'satu' }; // salah dengar yang umum

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// ------------------------------------------------------------
// Normalisasi teks
// ------------------------------------------------------------
export const normalizeText = (s = '') =>
    s.toLowerCase()
    .replace(/[,;]/g, ' dan ')
    .replace(/(\d+)\s*x\b/g, '$1 ') // "2x" -> "2"
    .replace(/\bx\s*(\d+)/g, '$1 ') // "x2" -> "2"
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (s) =>
    normalizeText(s)
    .split(' ')
    .filter(Boolean)
    .map((w) => (has(VOICE_ALIASES, w) ? VOICE_ALIASES[w] : w));

// Nama tampilan produk: "Pop Ice Coklat" (brand + rasa), tanpa dobel kalau nama sudah memuat brand
export const productLabel = (p) => {
    const cat = p.category_name || '';
    return cat && !p.name.toLowerCase().includes(cat.toLowerCase()) ? `${cat} ${p.name}` : p.name;
};

// ------------------------------------------------------------
// Angka: "2", "dua", "sebelas", "dua belas", "dua puluh lima"
// ------------------------------------------------------------
const parseNumberAt = (tokens, i) => {
    const w = tokens[i];
    if (/^\d+$/.test(w)) return { value: parseInt(w, 10), len: 1 };

    const fix = (x) => (x && has(NUM_FIX, x) ? NUM_FIX[x] : x);
    const a = fix(w);
    if (a === 'sepuluh') return { value: 10, len: 1 };
    if (a === 'sebelas') return { value: 11, len: 1 };
    if (a === 'seratus') return { value: 100, len: 1 };

    if (a && has(UNITS, a)) {
        const next = tokens[i + 1];
        if (next === 'belas') return { value: UNITS[a] + 10, len: 2 };
        if (next === 'puluh') {
            const n2 = fix(tokens[i + 2]);
            if (n2 && has(UNITS, n2)) return { value: UNITS[a] * 10 + UNITS[n2], len: 3 };
            return { value: UNITS[a] * 10, len: 2 };
        }
        return { value: UNITS[a], len: 1 };
    }
    return null;
};

// ------------------------------------------------------------
// Kemiripan kata (toleran salah dengar)
// ------------------------------------------------------------
const levenshtein = (a, b) => {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[n];
};

// Penyamaan bunyi: c/k/q, v/f, z/s, y/i, huruf ganda
const fold = (w) =>
    w.replace(/ph/g, 'f').replace(/kh/g, 'k').replace(/ch/g, 'k').replace(/sh/g, 's')
    .replace(/[cq]/g, 'k').replace(/x/g, 'ks').replace(/v/g, 'f').replace(/z/g, 's').replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');

const tokenSim = (a, b) => {
    if (a === b) return 1;
    const fa = fold(a);
    const fb = fold(b);
    if (fa === fb) return 0.95;
    if (Math.min(a.length, b.length) <= 3) return 0; // kata pendek harus persis
    const sim = 1 - levenshtein(fa, fb) / Math.max(fa.length, fb.length);
    return sim >= 0.75 ? sim : 0;
};

// Skor 0–1: seberapa cocok token ucapan dengan nama produk (koefisien Dice, pasangan satu-satu)
const scoreProduct = (spoken, product) => {
    const pTokens = tokenize(`${product.category_name || ''} ${product.name}`);
    if (!spoken.length || !pTokens.length) return 0;

    const pairs = [];
    spoken.forEach((s, i) => pTokens.forEach((p, j) => {
        const sim = tokenSim(s, p);
        if (sim > 0) pairs.push({ i, j, sim });
    }));
    pairs.sort((x, y) => y.sim - x.sim);

    const usedS = new Set();
    const usedP = new Set();
    let sum = 0;
    for (const { i, j, sim }
        of pairs) {
        if (usedS.has(i) || usedP.has(j)) continue;
        usedS.add(i);
        usedP.add(j);
        sum += sim;
    }
    const tokenScore = (2 * sum) / (spoken.length + pTokens.length);

    // Cadangan: ucapan tersambung/terpisah beda ("popice" vs "pop ice")
    const a = fold(spoken.join(''));
    const b = fold(pTokens.join(''));
    let joinedScore = 0;
    if (b.length >= 5) {
        const joined = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
        joinedScore = joined >= 0.8 ? joined * 0.95 : 0;
    }
    return Math.max(tokenScore, joinedScore);
};

// Cari produk terbaik. Jika ada beberapa yang sama bagus -> product null + candidates (ambigu)
const matchProduct = (words, pool) => {
    const ranked = pool
        .map((p) => ({ p, score: scoreProduct(words, p) }))
        .filter((r) => r.score >= MIN_MATCH_SCORE)
        .sort((a, b) => b.score - a.score);

    if (!ranked.length) return { product: null, candidates: [], score: 0 };

    const top = ranked[0];
    const close = ranked.filter((r) => top.score - r.score <= TIE_MARGIN);
    if (close.length === 1) return { product: top.p, candidates: [], score: top.score };
    return { product: null, candidates: close.slice(0, 4).map((r) => r.p), score: top.score };
};

// ------------------------------------------------------------
// Memecah ucapan menjadi item pesanan: [{ words, qty }]
//  "pop ice coklat 2 dan good day 3"  -> dipisah kata sambung
//  "2 pop ice coklat 3 good day"      -> angka di depan
//  "pop ice coklat 2 good day 3"      -> angka di belakang
// ------------------------------------------------------------
const parseOrderItems = (tokens) => {
    const chunks = [
        []
    ];
    tokens.forEach((t) => (SEPARATORS.has(t) ? chunks.push([]) : chunks[chunks.length - 1].push(t)));

    const items = [];
    for (const chunk of chunks) {
        const parts = [];
        for (let i = 0; i < chunk.length;) {
            const num = parseNumberAt(chunk, i);
            if (num) {
                parts.push({ num: num.value });
                i += num.len;
            } else {
                if (!STOPWORDS.has(chunk[i])) parts.push({ word: chunk[i] });
                i += 1;
            }
        }

        const numIdx = parts.map((p, i) => (p.num !== undefined ? i : -1)).filter((i) => i >= 0);
        let groups = [parts];
        if (numIdx.length > 1) {
            groups = [];
            if (parts[0].num !== undefined) {
                numIdx.forEach((start, k) => groups.push(parts.slice(start, (numIdx[k + 1] !== undefined ? numIdx[k + 1] : parts.length))));
            } else {
                let from = 0;
                numIdx.forEach((i) => {
                    groups.push(parts.slice(from, i + 1));
                    from = i + 1;
                });
                if (from < parts.length) groups.push(parts.slice(from));
            }
        }

        for (const g of groups) {
            const words = g.filter((p) => p.word !== undefined).map((p) => p.word);
            const nums = g.filter((p) => p.num !== undefined);
            if (!words.length) continue;
            items.push({ words, qty: nums.length ? nums[0].num : null });
        }
    }
    return items;
};

const detectIntent = (tokens) => {
    const joined = tokens.join(' ');
    if (/\b(kosongkan|kosongin|bersihkan|reset)\b/.test(joined) || /\b(hapus|batal|batalkan|buang)\s+semua/.test(joined)) return 'clear';
    if (/\btotal\b/.test(joined) || /\bberapa\s+(semua|harganya|bayar)\b/.test(joined)) return 'total';
    if (REMOVE_WORDS.has(tokens[0])) return 'remove';
    return 'add';
};

// ------------------------------------------------------------
// Menafsirkan SATU teks hasil pengenalan suara
// ------------------------------------------------------------
const interpret = (text, { pool, cartPool, defaultQty }) => {
    const tokens = tokenize(text);
    if (!tokens.length) return null;

    const intent = detectIntent(tokens);
    if (intent === 'clear' || intent === 'total') return { intent, text, quality: 0.9, items: [] };

    const isRemove = intent === 'remove';
    const body = isRemove ? tokens.slice(1) : tokens;
    const matchPool = isRemove ? cartPool : pool;

    const items = parseOrderItems(body).map((it) => ({
        ...it,
        qty: it.qty != null ? it.qty : defaultQty,
        ...matchProduct(it.words, matchPool),
    }));

    const quality = items.length ?
        items.reduce((s, it) => s + (it.product ? it.score : it.candidates.length ? it.score * 0.7 : 0), 0) / items.length :
        0;

    return { intent, text, items, quality, reduce: isRemove && REDUCE_WORDS.has(tokens[0]) };
};

// ------------------------------------------------------------
// Pilih tafsir terbaik dari beberapa alternatif hasil recognizer.
//  alternatives: [{ text, confidence }]
//  pool: produk yang boleh dipesan | cartPool: isi keranjang (untuk hapus/kurangi)
// ------------------------------------------------------------
export const interpretSpeech = (alternatives, { pool = [], cartPool = [], defaultQty = null } = {}) => {
    let best = null;
    alternatives.forEach((alt, idx) => {
        const r = interpret(alt.text, { pool, cartPool, defaultQty });
        if (!r) return;
        const rank = r.quality + (alt.confidence || 0) * 0.1 - idx * 0.01;
        if (!best || rank > best.rank) best = {...r, rank };
    });
    return best;
};