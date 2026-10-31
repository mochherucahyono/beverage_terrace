<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import api, { assetUrl } from '../services/api';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';
import { Search, X, Plus, Minus, Trash2, ShoppingBag, Check, Mic, MicOff } from 'lucide-vue-next';

// Impor parser suara yang sudah Anda miliki (pastikan path file sesuai)
import { interpretSpeech, productLabel } from '../utils/voice';

/* ---------- State ---------- */
const categories = ref([]);
const products = ref([]);
const productsLoading = ref(true);
const selectedCategory = ref(null);
const searchQuery = ref('');
const cart = ref([]);
const paymentMethod = ref('cash');
const isSubmitting = ref(false);
const cashReceived = ref(null);
const quickCash = [5000, 10000, 20000, 50000, 100000];
const showSuccess = ref(false);
const lastTransaction = ref(null);
const doneBtn = ref(null);

// Kontrol keranjang di mobile (sheet dari bawah)
const isMobileCartOpen = ref(false);

/* ---------- State & Logika Perintah Suara (Voice Order Terintegrasi) ---------- */
const isListening = ref(false);
const voiceFeedback = ref('');
let recognition = null;

// Inisialisasi Web Speech API
const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Browser Anda tidak mendukung Web Speech API.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.continuous = false;
  recognition.interimResults = true; // Mengambil hasil sementara untuk respons instan

  recognition.onstart = () => {
    isListening.value = true;
    voiceFeedback.value = 'Mendengarkan... (Contoh: "Pop Ice Coklat 2")';
  };

  recognition.onresult = (event) => {
    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      } else {
        interimText += event.results[i][0].transcript;
      }
    }

    const currentText = finalText || interimText;
    if (currentText) {
      voiceFeedback.value = `Suara: "${currentText}"`;
    }

    if (finalText) {
      handleVoiceResult(finalText);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech Recognition Error:', event.error);
    isListening.value = false;
    voiceFeedback.value = 'Gagal mengenali suara. Coba lagi.';
  };

  recognition.onend = () => {
    isListening.value = false;
  };
};

// Text-to-Speech (Respon Suara Balik ke Kasir)
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

const toggleVoiceRecognition = () => {
  if (!recognition) {
    showToast('Fitur suara tidak didukung browser ini. Gunakan Google Chrome.', 'error');
    return;
  }

  if (isListening.value) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
};

// Proses Hasil Suara Menggunakan voiceOrderParser.js
const handleVoiceResult = (rawText) => {
  // Siapkan pool produk di database dan isi keranjang (untuk perintah hapus/kurang)
  const pool = products.value;
  const cartPool = cart.value.map(item => {
    const matchedProd = products.value.find(p => p.id === item.product_id);
    return matchedProd || { id: item.product_id, name: item.name };
  });

  // Jalankan interpreter parser
  const interpretation = interpretSpeech([{ text: rawText, confidence: 0.9 }], {
    pool,
    cartPool,
    defaultQty: 1
  });

  if (!interpretation || interpretation.intent === 'total') {
    const msg = `Total pesanan saat ini adalah ${formatRupiah(totalAmount.value)}`;
    voiceFeedback.value = msg;
    showToast(msg, 'info');
    speak(msg);
    return;
  }

  if (interpretation.intent === 'clear') {
    cart.value = [];
    const msg = 'Keranjang berhasil dikosongkan.';
    voiceFeedback.value = msg;
    showToast(msg, 'warning');
    speak(msg);
    return;
  }

  // Tangani penambahan/pengurangan item
  let summaryText = '';
  interpretation.items.forEach(it => {
    if (!it.product) {
      if (it.candidates && it.candidates.length > 0) {
        summaryText = `Produk ambigu, maksud Anda ${productLabel(it.candidates[0])}?`;
      } else {
        summaryText = `Produk tidak dikenali.`;
      }
      return;
    }

    const prod = it.product;
    const qty = it.qty;

    if (interpretation.intent === 'remove') {
      const cartIdx = cart.value.findIndex(c => c.product_id === prod.id);
      if (cartIdx !== -1) {
        updateQuantity(cartIdx, -qty);
        summaryText = `Mengurangi ${prod.name}`;
      }
    } else {
      // Intent: Add
      if (prod.stock <= 0) {
        summaryText = `Stok ${prod.name} habis.`;
      } else {
        for (let i = 0; i < qty; i++) {
          addToCart(prod);
        }
        summaryText = `Menambahkan ${qty} ${productLabel(prod)}`;
      }
    }
  });

  if (summaryText) {
    voiceFeedback.value = summaryText;
    showToast(summaryText, 'info');
    speak(summaryText);
  }
};

/* ---------- Notifikasi singkat (pengganti alert) ---------- */
const toast = ref({ show: false, message: '', type: 'info' });
let toastTimer;

const showToast = (message, type = 'info', duration = 3500) => {
  toast.value = { show: true, message, type };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value.show = false;
  }, duration);
};

/* ---------- Ambil data ---------- */
const fetchCategories = async () => {
  try {
    const res = await api.get('/categories');
    categories.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil kategori:', err);
  }
};

let productsRequestId = 0;

const fetchProducts = async () => {
  const id = ++productsRequestId;
  try {
    const url = selectedCategory.value
      ? `/products?category_id=${selectedCategory.value}`
      : '/products';
    const res = await api.get(url);
    if (id !== productsRequestId) return;
    products.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil produk:', err);
  } finally {
    if (id === productsRequestId) productsLoading.value = false;
  }
};

const selectCategory = (catId) => {
  selectedCategory.value = catId;
  fetchProducts();
};

/* ---------- Pencarian produk ---------- */
const visibleProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return products.value;
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
  );
});

/* ---------- Keranjang ---------- */
const cartQty = computed(() => {
  const map = {};
  cart.value.forEach((item) => {
    map[item.product_id] = item.quantity;
  });
  return map;
});

const addToCart = (product) => {
  if (product.stock <= 0) return;

  const existing = cart.value.find((item) => item.product_id === product.id);
  if (existing) {
    if (existing.quantity < product.stock) {
      existing.quantity++;
    } else {
      showToast(`Stok ${product.name} tidak cukup.`, 'warning');
    }
  } else {
    cart.value.push({
      product_id: product.id,
      name: product.name,
      category_name: product.category_name,
      price: parseFloat(product.selling_price),
      quantity: 1,
      stock: product.stock
    });
  }
};

const updateQuantity = (index, delta) => {
  const item = cart.value[index];
  if (!item) return;
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    cart.value.splice(index, 1);
    if (cart.value.length === 0) {
      isMobileCartOpen.value = false;
    }
  } else if (newQty <= item.stock) {
    item.quantity = newQty;
  } else {
    showToast(`Stok ${item.name} hanya tersisa ${item.stock} saset.`, 'warning');
  }
};

const totalAmount = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.price * item.quantity, 0);
});

const totalQuantity = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.quantity, 0);
});

const change = computed(() => (Number(cashReceived.value) || 0) - totalAmount.value);

const suggestedCash = computed(() => quickCash.filter((n) => n >= totalAmount.value));

const canCheckout = computed(() => {
  if (cart.value.length === 0 || isSubmitting.value) return false;
  if (paymentMethod.value === 'cash') return (Number(cashReceived.value) || 0) >= totalAmount.value;
  return true;
});

/* ---------- Checkout ---------- */
const checkout = async () => {
  if (!canCheckout.value) return;

  const wasCash = paymentMethod.value === 'cash';
  const snapshot = {
    items: cart.value.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    })),
    total: totalAmount.value,
    method: paymentMethod.value,
    received: wasCash ? Number(cashReceived.value) || 0 : null,
    change: wasCash ? change.value : null,
    time: new Date()
  };

  isSubmitting.value = true;
  try {
    const payload = {
      total_amount: totalAmount.value,
      payment_method: paymentMethod.value,
      items: cart.value.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    const res = await api.post('/transactions', payload);

    lastTransaction.value = { ...snapshot, id: res.data.transactionId };
    showSuccess.value = true;
    cart.value = [];
    cashReceived.value = null;
    isMobileCartOpen.value = false;
    fetchProducts();

    await nextTick();
    doneBtn.value?.focus();
  } catch (err) {
    showToast(
      'Gagal memproses transaksi: ' + (err.response?.data?.message || err.message),
      'error',
      5000
    );
  } finally {
    isSubmitting.value = false;
  }
};

const closeSuccess = () => {
  showSuccess.value = false;
};

/* ---------- Helper tampilan ---------- */
const formatDateTime = (d) =>
  d.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const cardClass = (prod) => {
  if (prod.stock <= 0) return 'border-neutral-200 bg-neutral-50 opacity-60';
  if (cartQty.value[prod.id]) return 'border-[#DA6B4F]/50 ring-2 ring-[#DA6B4F]/15';
  if (prod.stock <= prod.min_stock) return 'border-amber-300';
  return 'border-neutral-200/80 hover:border-neutral-300';
};

/* ---------- Lifecycle ---------- */
let mediaQuery;
const onBreakpointChange = (e) => {
  if (e.matches) isMobileCartOpen.value = false;
};

onMounted(() => {
  fetchCategories();
  fetchProducts();
  initSpeechRecognition();
  mediaQuery = window.matchMedia('(min-width: 1024px)');
  mediaQuery.addEventListener?.('change', onBreakpointChange);
});

onBeforeUnmount => {
  mediaQuery?.removeEventListener?.('change', onBreakpointChange);
  clearTimeout(toastTimer);
};

useBodyScrollLock(computed(() => showSuccess.value || isMobileCartOpen.value));
</script>

<template>
  <div class="relative pb-20 lg:pb-0">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- Panel Kiri: Katalog Produk -->
      <div class="lg:col-span-2 space-y-4 min-w-0">
        
        <!-- Bar Aktivasi Perintah Suara (Voice Order Terintegrasi Sempurna) -->
        <div class="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between gap-3">
          <div class="flex items-center space-x-3 min-w-0">
            <button 
              type="button"
              @click="toggleVoiceRecognition"
              class="relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 shadow-xs"
              :class="isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#262624] text-white hover:bg-neutral-800'"
              :title="isListening ? 'Matikan Mikrofon' : 'Mulai Perintah Suara'"
            >
              <Mic v-if="!isListening" class="w-4 h-4" />
              <MicOff v-else class="w-4 h-4" />
            </button>
            <div class="min-w-0">
              <p class="text-xs font-bold text-[#262624] flex items-center gap-1.5">
                <span>Perintah Suara AI</span>
                <span v-if="isListening" class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              </p>
              <p class="text-[11px] text-neutral-400 truncate">
                {{ voiceFeedback || 'Tekan mic dan ucapkan (misal: "Pop Ice Coklat 2")' }}
              </p>
            </div>
          </div>
          <span class="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-lg shrink-0 hidden sm:inline-block">
            Hands-Free POS
          </span>
        </div>

        <!-- Pencarian -->
        <div class="relative">
          <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari rasa atau brand..."
            autocomplete="off"
            class="w-full text-xs py-3 pl-10 pr-9 rounded-xl border border-neutral-200 bg-white shadow-sm focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            aria-label="Hapus pencarian"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Filter Brand/Kategori -->
        <div class="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            @click="selectCategory(null)"
            class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border"
            :class="selectedCategory === null
              ? 'bg-[#262624] text-white border-[#262624]'
              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
          >Semua Brand</button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            @click="selectCategory(cat.id)"
            class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border"
            :class="selectedCategory === cat.id
              ? 'bg-[#262624] text-white border-[#262624]'
              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
          >{{ cat.name }}</button>
        </div>

        <!-- Memuat -->
        <div v-if="productsLoading" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="n in 8"
            :key="n"
            class="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden animate-pulse"
          >
            <div class="aspect-[4/3] bg-neutral-100"></div>
            <div class="p-3 space-y-2">
              <div class="h-2.5 w-1/3 rounded bg-neutral-100"></div>
              <div class="h-3 w-3/4 rounded bg-neutral-100"></div>
              <div class="h-3 w-1/2 rounded bg-neutral-100"></div>
            </div>
          </div>
        </div>

        <!-- Grid Produk -->
        <div v-else-if="visibleProducts.length > 0" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          <button
            v-for="prod in visibleProducts"
            :key="prod.id"
            type="button"
            @click="addToCart(prod)"
            :disabled="prod.stock <= 0"
            class="relative text-left bg-white rounded-2xl border overflow-hidden flex flex-col shadow-sm transition-all duration-150 select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
            :class="cardClass(prod)"
          >
            <!-- Foto -->
            <span class="relative block aspect-[4/3] bg-neutral-100">
              <img
                v-if="prod.image_url"
                :src="assetUrl(prod.image_url)"
                :alt="prod.name"
                loading="lazy"
                draggable="false"
                class="w-full h-full object-cover"
                :class="{ grayscale: prod.stock <= 0 }"
              />
              <span v-else class="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-300">
                {{ prod.name.charAt(0).toUpperCase() }}
              </span>

              <!-- Jumlah di keranjang -->
              <span
                v-if="cartQty[prod.id]"
                class="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#DA6B4F] text-white text-[11px] font-bold flex items-center justify-center shadow-sm"
              >{{ cartQty[prod.id] }}</span>

              <span
                v-if="prod.stock > 0 && prod.stock <= prod.min_stock"
                class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800"
              >Sisa {{ prod.stock }}</span>
              <span
                v-else-if="prod.stock <= 0"
                class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700"
              >Habis</span>
            </span>

            <!-- Info -->
            <span class="flex flex-col flex-1 p-3">
              <span class="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                <span class="truncate">{{ prod.category_name }}</span>
                <span v-if="prod.stock > prod.min_stock" class="shrink-0">Stok {{ prod.stock }}</span>
              </span>
              <span class="mt-1 text-xs font-bold text-[#262624] leading-snug line-clamp-2">
                {{ prod.name }}
              </span>
              <span class="mt-auto pt-2.5 flex items-center justify-between">
                <span class="text-xs font-bold text-[#DA6B4F]">{{ formatRupiah(prod.selling_price) }}</span>
                <span class="w-6 h-6 rounded-lg bg-[#262624] text-white flex items-center justify-center">
                  <Plus class="w-3.5 h-3.5" />
                </span>
              </span>
            </span>
          </button>
        </div>

        <!-- Kosong -->
        <div v-else class="bg-white rounded-2xl border border-dashed border-neutral-300 py-12 px-6 text-center space-y-3">
          <template v-if="searchQuery">
            <p class="text-sm font-semibold text-[#262624]">Tidak ada produk yang cocok</p>
            <p class="text-xs text-neutral-400">Tidak ditemukan hasil untuk “{{ searchQuery }}”.</p>
            <button
              type="button"
              @click="searchQuery = ''"
              class="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-all"
            >Hapus pencarian</button>
          </template>
          <template v-else>
            <p class="text-sm font-semibold text-[#262624]">Belum ada produk</p>
            <p class="text-xs text-neutral-400">Tambahkan produk di halaman Stok untuk mulai berjualan.</p>
          </template>
        </div>
      </div>

      <!-- Keranjang: panel samping di desktop, sheet dari bawah di mobile -->
      <aside
        :class="isMobileCartOpen ? 'flex' : 'hidden lg:flex'"
        class="sheet-up fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex-col overflow-hidden bg-white rounded-t-3xl shadow-2xl lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-20 lg:z-0 lg:max-h-none lg:h-[calc(100vh-7rem)] lg:rounded-2xl lg:border lg:border-neutral-200/80 lg:shadow-sm"
      >
        <!-- Pegangan sheet (mobile) -->
        <div class="lg:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-200 shrink-0"></div>

        <!-- Header -->
        <div class="px-5 pt-3 lg:pt-5 pb-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div class="flex items-baseline gap-2">
            <h2 class="text-sm font-bold text-[#262624]">Pesanan Aktif</h2>
            <span class="text-xs text-neutral-400">{{ totalQuantity }} item</span>
          </div>
          <button
            type="button"
            @click="isMobileCartOpen = false"
            aria-label="Tutup keranjang"
            class="lg:hidden w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Isi (bisa digulir): item + pembayaran -->
        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div class="flex flex-col min-h-full px-5 py-3">
            <div class="flex-1 space-y-2">
              <div
                v-if="cart.length === 0"
                class="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-10"
              >
                <div class="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                  <ShoppingBag class="w-6 h-6 text-neutral-300" />
                </div>
                <p class="text-xs leading-relaxed">Pilih produk di sebelah kiri / gunakan suara<br>untuk menambah pesanan</p>
              </div>

              <div
                v-for="(item, index) in cart"
                :key="item.product_id"
                class="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-100"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-[#262624] truncate">{{ item.name }}</p>
                  <p class="text-[11px] text-neutral-400">{{ formatRupiah(item.price) }}</p>
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="updateQuantity(index, -1)"
                    :aria-label="item.quantity === 1 ? 'Hapus item' : 'Kurangi jumlah'"
                    class="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200"
                    :class="item.quantity === 1 ? 'text-red-500' : 'text-neutral-600'"
                  >
                    <Trash2 v-if="item.quantity === 1" class="w-3.5 h-3.5" />
                    <Minus v-else class="w-3.5 h-3.5" />
                  </button>
                  <span class="w-6 text-center text-xs font-bold tabular-nums text-[#262624]">{{ item.quantity }}</span>
                  <button
                    type="button"
                    @click="updateQuantity(index, 1)"
                    aria-label="Tambah jumlah"
                    class="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200"
                  >
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                </div>

                <p class="w-20 text-right text-xs font-bold text-[#262624] tabular-nums">
                  {{ formatRupiah(item.price * item.quantity) }}
                </p>
              </div>
            </div>

            <!-- Pembayaran -->
            <div class="mt-3 pt-3 border-t border-neutral-100 space-y-3">
              <div class="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  @click="paymentMethod = 'cash'"
                  class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
                  :class="paymentMethod === 'cash' ? 'bg-white text-[#262624] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'"
                >Tunai</button>
                <button
                  type="button"
                  @click="paymentMethod = 'qris'"
                  class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
                  :class="paymentMethod === 'qris' ? 'bg-white text-[#262624] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'"
                >QRIS</button>
              </div>

              <!-- Uang diterima (khusus tunai) -->
              <div v-if="paymentMethod === 'cash'" class="space-y-2">
                <input
                  v-model.number="cashReceived"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  placeholder="Uang diterima"
                  class="w-full text-sm font-semibold p-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
                />
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    @click="cashReceived = totalAmount"
                    :disabled="cart.length === 0"
                    class="px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40"
                  >Pas</button>
                  <button
                    v-for="n in suggestedCash"
                    :key="n"
                    type="button"
                    @click="cashReceived = n"
                    class="px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"
                  >{{ n / 1000 }}rb</button>
                </div>
                <div
                  class="flex justify-between items-center px-3.5 py-2.5 rounded-xl border"
                  :class="change >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'"
                >
                  <span class="text-xs font-semibold" :class="change >= 0 ? 'text-green-800' : 'text-red-700'">
                    {{ change >= 0 ? 'Kembalian' : 'Kurang' }}
                  </span>
                  <span class="text-sm font-bold" :class="change >= 0 ? 'text-green-700' : 'text-red-600'">
                    {{ formatRupiah(Math.abs(change)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Total & tombol simpan (selalu terlihat) -->
        <div class="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-neutral-100 bg-white rounded-b-2xl space-y-3 shrink-0">
          <div class="flex justify-between items-center">
            <span class="text-xs font-medium text-neutral-500">Total Bayar</span>
            <span class="text-lg font-bold text-[#262624]">{{ formatRupiah(totalAmount) }}</span>
          </div>
          <button
            type="button"
            @click="checkout"
            :disabled="!canCheckout"
            class="w-full py-3.5 rounded-xl bg-[#262624] text-white font-semibold text-xs shadow-sm hover:bg-[#1a1a1a] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >{{ isSubmitting ? 'Memproses...' : 'Simpan Transaksi' }}</button>
        </div>
      </aside>
    </div>

    <!-- Latar gelap untuk sheet keranjang (mobile) -->
    <div
      v-if="isMobileCartOpen"
      class="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      @click="isMobileCartOpen = false"
    ></div>

    <!-- Bar keranjang mengambang (mobile), di atas bar tab bawah -->
    <button
      v-if="cart.length > 0 && !isMobileCartOpen"
      type="button"
      @click="isMobileCartOpen = true"
      class="lg:hidden fixed left-4 right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 bg-[#262624] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-neutral-700 active:scale-[0.99] transition-transform"
    >
      <span class="flex items-center gap-3">
        <span class="relative">
          <ShoppingBag class="w-6 h-6" />
          <span class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-[#DA6B4F] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {{ totalQuantity }}
          </span>
        </span>
        <span class="text-left">
          <span class="block text-[10px] text-neutral-400 leading-none">Total Pesanan</span>
          <span class="block text-sm font-bold text-white leading-tight mt-1">{{ formatRupiah(totalAmount) }}</span>
        </span>
      </span>
      <span class="px-4 py-2 bg-[#DA6B4F] text-white font-semibold text-xs rounded-xl">Lihat Keranjang</span>
    </button>

    <!-- Modal Transaksi Berhasil -->
    <div
      v-if="showSuccess && lastTransaction"
      class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
      @click.self="closeSuccess"
      @keydown.esc="closeSuccess"
    >
      <div class="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
        <div class="text-center space-y-1.5">
          <div class="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
            <Check class="w-6 h-6" stroke-width="2.5" />
          </div>
          <h3 class="text-sm font-bold text-[#262624]">Transaksi Berhasil</h3>
          <p class="text-[11px] text-neutral-400">
            #TRX-{{ lastTransaction.id }}
          </p>
          <p class="text-[11px] text-neutral-400">{{ formatDateTime(lastTransaction.time) }}</p>
        </div>

        <div class="rounded-xl bg-neutral-50/80 border border-neutral-100 p-3 space-y-1.5 max-h-40 overflow-y-auto">
          <div
            v-for="(item, i) in lastTransaction.items"
            :key="i"
            class="flex justify-between text-xs"
          >
            <span class="text-neutral-600 truncate pr-2">{{ item.quantity }}× {{ item.name }}</span>
            <span class="font-semibold text-[#262624] shrink-0">{{ formatRupiah(item.price * item.quantity) }}</span>
          </div>
        </div>

        <div class="space-y-1.5 text-xs">
          <div class="flex justify-between">
            <span class="text-neutral-500">Total</span>
            <span class="font-bold text-[#262624]">{{ formatRupiah(lastTransaction.total) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-500">Metode</span>
            <span class="font-semibold text-neutral-700">{{ lastTransaction.method === 'cash' ? 'Tunai' : 'QRIS' }}</span>
          </div>
          <div v-if="lastTransaction.method === 'cash'" class="flex justify-between">
            <span class="text-neutral-500">Uang diterima</span>
            <span class="font-semibold text-neutral-700">{{ formatRupiah(lastTransaction.received) }}</span>
          </div>
        </div>

        <div
          v-if="lastTransaction.method === 'cash'"
          class="rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex items-center justify-between"
        >
          <span class="text-xs font-semibold text-green-800">Kembalian</span>
          <span class="text-lg font-bold text-green-700">{{ formatRupiah(lastTransaction.change) }}</span>
        </div>

        <button
          ref="doneBtn"
          type="button"
          @click="closeSuccess"
          class="w-full py-3 rounded-xl bg-[#DA6B4F] text-white font-semibold text-xs shadow-sm hover:bg-[#C25A40] transition-all"
        >Selesai</button>
      </div>
    </div>

    <!-- Notifikasi singkat -->
    <div class="fixed top-20 inset-x-0 z-[70] px-4 flex justify-center pointer-events-none">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="toast.show"
          role="status"
          class="max-w-sm px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border"
          :class="{
            'bg-amber-50 text-amber-800 border-amber-200': toast.type === 'warning',
            'bg-red-50 text-red-700 border-red-200': toast.type === 'error',
            'bg-white text-[#262624] border-neutral-200': toast.type === 'info'
          }"
        >{{ toast.message }}</div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@media (max-width: 1023px) {
  .sheet-up {
    animation: sheet-up 0.22s ease-out;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet-up {
    animation: none;
  }
}
</style>