<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { assetUrl } from '../services/api';
import { resizeImage } from '../utils/image';
import ConfirmModal from '../components/ConfirmModal.vue';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';
import { Plus, Search, X, Pencil, Trash2, Package } from 'lucide-vue-next';

const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const isModalOpen = ref(false);
const isEditing = ref(false);
const refreshKey = ref(0);
const imageFile = ref(null);
const imagePreview = ref('');
const removeImageFlag = ref(false);
const saving = ref(false);

// Filter, Search & Sort State (semuanya otomatis, langsung memfilter saat berubah)
const searchQuery = ref('');
const selectedCategory = ref('');
const stockFilter = ref(''); // '' = semua, 'low' = menipis, 'out' = habis
const sortBy = ref('name');

const sortOptions = [
  { value: 'name', label: 'Nama A–Z' },
  { value: 'stock', label: 'Stok terendah' },
  { value: 'profit', label: 'Profit tertinggi' }
];

const inputClass =
  'w-full text-xs p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all';

const form = ref({
  id: null,
  category_id: '',
  name: '',
  cost_price: 0,
  selling_price: 0,
  stock: 0,
  min_stock: 5
});

const fetchProducts = async () => {
  try {
    const res = await api.get('/products');
    products.value = res.data.data;
    refreshKey.value++;
  } catch (err) {
    console.error('Gagal mengambil daftar produk:', err);
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    const res = await api.get('/categories');
    categories.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil kategori:', err);
  }
};

/* Image Handling */
const revokePreview = () => {
  if (imagePreview.value.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value);
};

const onPickImage = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('File harus berupa gambar.');
    return;
  }
  try {
    const blob = await resizeImage(file);
    const ext = blob.type === 'image/webp' ? 'webp' : 'png';
    imageFile.value = new File([blob], `foto.${ext}`, { type: blob.type });
    revokePreview();
    imagePreview.value = URL.createObjectURL(blob);
    removeImageFlag.value = false;
  } catch (err) {
    alert('Gagal memproses foto.');
  }
};

const clearImage = () => {
  revokePreview();
  imageFile.value = null;
  imagePreview.value = '';
  removeImageFlag.value = true;
};

/* Modal Tambah / Edit */
const openModal = (product = null) => {
  imageFile.value = null;
  removeImageFlag.value = false;
  if (product) {
    isEditing.value = true;
    form.value = { ...product };
    imagePreview.value = assetUrl(product.image_url);
  } else {
    isEditing.value = false;
    imagePreview.value = '';
    form.value = {
      id: null,
      category_id: categories.value[0]?.id || '',
      name: '',
      cost_price: 1500,
      selling_price: 4000,
      stock: 10,
      min_stock: 5
    };
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  revokePreview();
  isModalOpen.value = false;
};

/* Notice */
const notice = ref('');
let noticeTimer;

const showNotice = (msg) => {
  notice.value = msg;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ''), 6000);
};

const saveProduct = async () => {
  saving.value = true;
  try {
    let productId = form.value.id;
    if (isEditing.value) {
      await api.put(`/products/${productId}`, form.value);
    } else {
      const res = await api.post('/products', form.value);
      productId = res.data.data.id;
    }

    // Foto dikirim terpisah setelah data produk tersimpan
    try {
      if (imageFile.value) {
        const fd = new FormData();
        fd.append('image', imageFile.value);
        await api.post(`/products/${productId}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (isEditing.value && removeImageFlag.value) {
        await api.delete(`/products/${productId}/image`);
      }
    } catch (imgErr) {
      showNotice('Data tersimpan, tetapi foto gagal diunggah: ' + (imgErr.response?.data?.message || imgErr.message));
    }

    closeModal();
    fetchProducts();
  } catch (err) {
    alert('Gagal menyimpan produk: ' + (err.response?.data?.message || err.message));
  } finally {
    saving.value = false;
  }
};

/* Hapus Produk */
const deleteTarget = ref(null);
const deleting = ref(false);
const deleteError = ref('');

const askDelete = (prod) => {
  deleteError.value = '';
  deleteTarget.value = prod;
};

const cancelDelete = () => {
  if (deleting.value) return;
  deleteTarget.value = null;
  deleteError.value = '';
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    const res = await api.delete(`/products/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    if (res.data?.deactivated) showNotice(res.data.message);
    fetchProducts();
  } catch (err) {
    deleteError.value = err.response?.data?.message || err.message;
  } finally {
    deleting.value = false;
  }
};

/* Helper tampilan */
const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const profit = (p) => Number(p.selling_price) - Number(p.cost_price);

const stockStatus = (p) => {
  if (p.stock <= 0) return 'out';
  if (p.stock <= p.min_stock) return 'low';
  return 'ok';
};

const stockClass = (p) => ({
  'bg-red-50 text-red-700': stockStatus(p) === 'out',
  'bg-amber-50 text-amber-700': stockStatus(p) === 'low',
  'bg-neutral-100 text-neutral-600': stockStatus(p) === 'ok'
});

const stockLabel = (p) => {
  const s = stockStatus(p);
  if (s === 'out') return 'Habis';
  if (s === 'low') return `Sisa ${p.stock}`;
  return `Stok ${p.stock}`;
};

const formProfit = computed(
  () => (Number(form.value.selling_price) || 0) - (Number(form.value.cost_price) || 0)
);

/* Ringkasan stok */
const lowCount = computed(() => products.value.filter((p) => stockStatus(p) === 'low').length);
const outCount = computed(() => products.value.filter((p) => stockStatus(p) === 'out').length);

/* Logika Search & Filter */
const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return products.value.filter((p) => {
    const matchSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      (p.category_name && p.category_name.toLowerCase().includes(q));

    const matchCategory =
      selectedCategory.value === '' || String(p.category_id) === String(selectedCategory.value);

    const matchStock =
      stockFilter.value === '' || stockStatus(p) === stockFilter.value;

    return matchSearch && matchCategory && matchStock;
  });
});

const sortedProducts = computed(() => {
  const arr = [...filteredProducts.value];
  if (sortBy.value === 'stock') {
    arr.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  } else if (sortBy.value === 'profit') {
    arr.sort((a, b) => profit(b) - profit(a) || a.name.localeCompare(b.name));
  } else {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return arr;
});

// Pengelompokan Otomatis Berdasarkan Kategori
const groupedProducts = computed(() => {
  const groups = {};
  sortedProducts.value.forEach((prod) => {
    const catName = prod.category_name || 'Tanpa Brand';
    if (!groups[catName]) {
      groups[catName] = [];
    }
    groups[catName].push(prod);
  });
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, items: groups[name] }));
});

const hasActiveFilters = computed(
  () => !!(searchQuery.value.trim() || selectedCategory.value !== '' || stockFilter.value !== '')
);

const resetFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = '';
  stockFilter.value = '';
};

onMounted(() => {
  fetchCategories();
  fetchProducts();
});

useBodyScrollLock(isModalOpen);
</script>

<template>
  <div class="space-y-5">
    <!-- Header Page & Button Tambah -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-base font-bold text-[#262624]">Kelola Stok & Varian Produk</h1>
        <p class="text-xs text-neutral-400">Atur daftar produk, harga modal, harga jual, dan sisa stok.</p>
      </div>
      <button
        @click="openModal()"
        class="px-4 py-2.5 bg-[#262624] text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Tambah Produk</span>
      </button>
    </div>

    <!-- Ringkasan stok (klik untuk memfilter) -->
    <div class="grid grid-cols-3 gap-3">
      <button
        type="button"
        @click="stockFilter = ''"
        class="text-left bg-white p-3.5 rounded-2xl border shadow-sm transition-all"
        :class="stockFilter === ''
          ? 'border-[#262624]/25 ring-2 ring-[#262624]/5'
          : 'border-neutral-200/80 hover:border-neutral-300'"
      >
        <p class="text-neutral-400 text-[11px] font-medium">Total Varian</p>
        <p class="text-lg font-bold text-[#262624] mt-0.5">{{ products.length }}</p>
      </button>
      <button
        type="button"
        @click="stockFilter = stockFilter === 'low' ? '' : 'low'"
        class="text-left bg-white p-3.5 rounded-2xl border shadow-sm transition-all"
        :class="stockFilter === 'low'
          ? 'border-amber-300 ring-2 ring-amber-100'
          : 'border-neutral-200/80 hover:border-neutral-300'"
      >
        <p class="text-neutral-400 text-[11px] font-medium">Stok Menipis</p>
        <p class="text-lg font-bold text-amber-600 mt-0.5">{{ lowCount }}</p>
      </button>
      <button
        type="button"
        @click="stockFilter = stockFilter === 'out' ? '' : 'out'"
        class="text-left bg-white p-3.5 rounded-2xl border shadow-sm transition-all"
        :class="stockFilter === 'out'
          ? 'border-red-300 ring-2 ring-red-100'
          : 'border-neutral-200/80 hover:border-neutral-300'"
      >
        <p class="text-neutral-400 text-[11px] font-medium">Stok Habis</p>
        <p class="text-lg font-bold text-red-600 mt-0.5">{{ outCount }}</p>
      </button>
    </div>

    <!-- Alert Notice -->
    <div v-if="notice" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      {{ notice }}
    </div>

    <!-- Panel Search, Filter & Urutan -->
    <div class="bg-white rounded-2xl border border-neutral-200/80 p-3 sm:p-4 shadow-sm space-y-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari varian produk / brand..."
            autocomplete="off"
            class="w-full text-xs py-2.5 pl-10 pr-9 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            aria-label="Hapus pencarian"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <select
          v-model="sortBy"
          aria-label="Urutkan produk"
          class="text-xs py-2.5 px-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <!-- Filter kategori -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          @click="selectedCategory = ''"
          class="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all"
          :class="selectedCategory === ''
            ? 'bg-[#262624] text-white border-[#262624]'
            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
        >Semua Kategori</button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all"
          :class="String(selectedCategory) === String(cat.id)
            ? 'bg-[#262624] text-white border-[#262624]'
            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
        >{{ cat.name }}</button>
      </div>

      <!-- Indikator hasil -->
      <div v-if="hasActiveFilters" class="flex items-center justify-between text-[11px]">
        <span class="text-neutral-400">
          Menampilkan {{ filteredProducts.length }} dari {{ products.length }} varian
        </span>
        <button @click="resetFilters" class="font-semibold text-neutral-500 hover:text-neutral-800">Reset filter</button>
      </div>
    </div>

    <!-- Memuat -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <div
        v-for="n in 6"
        :key="n"
        class="bg-white rounded-2xl border border-neutral-200/80 p-3.5 flex items-start gap-3 animate-pulse"
      >
        <div class="w-14 h-14 rounded-xl bg-neutral-100 shrink-0"></div>
        <div class="flex-1 space-y-2 pt-1">
          <div class="h-3 w-2/3 rounded bg-neutral-100"></div>
          <div class="h-3 w-1/3 rounded bg-neutral-100"></div>
          <div class="h-2.5 w-1/2 rounded bg-neutral-100"></div>
        </div>
      </div>
    </div>

    <!-- Daftar Produk Kelompok per Kategori -->
    <div v-else-if="groupedProducts.length > 0" class="space-y-6">
      <section v-for="group in groupedProducts" :key="group.name" class="space-y-2.5">
        <div class="flex items-center gap-2 px-1">
          <h3 class="text-xs font-bold text-[#262624]">{{ group.name }}</h3>
          <span class="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
            {{ group.items.length }} varian
          </span>
          <div class="flex-1 h-px bg-neutral-200/70"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="prod in group.items"
            :key="prod.id"
            class="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col transition-all duration-150 hover:border-neutral-300 hover:shadow-md"
          >
            <div class="p-3.5 flex items-start gap-3">
              <img
                v-if="prod.image_url"
                :src="assetUrl(prod.image_url)"
                :alt="prod.name"
                loading="lazy"
                class="w-14 h-14 rounded-xl object-cover border border-neutral-200 shrink-0"
              />
              <div
                v-else
                class="w-14 h-14 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center text-lg font-bold shrink-0"
              >{{ prod.name.charAt(0).toUpperCase() }}</div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <h4 class="text-sm font-bold text-[#262624] leading-snug line-clamp-2">{{ prod.name }}</h4>
                  <span
                    class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1"
                    :class="stockClass(prod)"
                  >
                    <span v-if="stockStatus(prod) === 'out'" class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span v-else-if="stockStatus(prod) === 'low'" class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {{ stockLabel(prod) }}
                  </span>
                </div>

                <p class="text-sm font-bold text-[#DA6B4F] mt-1">{{ formatRupiah(prod.selling_price) }}</p>
                <div class="flex items-center gap-2 mt-0.5 text-[11px]">
                  <span class="text-neutral-400">Modal {{ formatRupiah(prod.cost_price) }}</span>
                  <span class="font-semibold" :class="profit(prod) < 0 ? 'text-red-600' : 'text-emerald-600'">
                    {{ profit(prod) < 0 ? '-' : '+' }}{{ formatRupiah(Math.abs(profit(prod))) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 divide-x divide-neutral-100 border-t border-neutral-100 mt-auto">
              <button
                @click="openModal(prod)"
                class="py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Pencil class="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                @click="askDelete(prod)"
                class="py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Kosong -->
    <div v-else class="bg-white rounded-2xl border border-dashed border-neutral-300 py-12 px-6 text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
        <Package class="w-6 h-6" />
      </div>
      <template v-if="hasActiveFilters">
        <p class="text-sm font-semibold text-[#262624]">Varian produk tidak ditemukan</p>
        <p class="text-xs text-neutral-400">Coba ubah kata kunci atau filter yang dipakai.</p>
        <button
          @click="resetFilters"
          class="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-all"
        >Reset filter</button>
      </template>
      <template v-else>
        <p class="text-sm font-semibold text-[#262624]">Belum ada data produk</p>
        <p class="text-xs text-neutral-400">Silakan tambah data produk baru.</p>
        <button
          @click="openModal()"
          class="px-4 py-2 rounded-xl bg-[#DA6B4F] text-white text-xs font-semibold hover:bg-[#C25A40] transition-all"
        >Tambah Produk</button>
      </template>
    </div>

    <!-- Modal Form Tambah / Edit -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-[#262624]">
            {{ isEditing ? 'Edit Varian Produk' : 'Tambah Produk Baru' }}
          </h3>
          <button
            type="button"
            @click="closeModal"
            aria-label="Tutup"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-3">
          <!-- Foto -->
          <div>
            <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Foto (opsional)</label>
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="imagePreview" :src="imagePreview" class="w-full h-full object-cover" />
                <svg v-else class="w-6 h-6 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div class="flex flex-wrap gap-2">
                <label class="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer">
                  {{ imagePreview ? 'Ganti Foto' : 'Pilih Foto' }}
                  <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
                </label>
                <button
                  v-if="imagePreview"
                  type="button"
                  @click="clearImage"
                  class="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50"
                >Hapus</button>
              </div>
            </div>
            <p class="text-[10px] text-neutral-400 mt-1">Dipotong persegi dari tengah dan dikecilkan otomatis. Di HP bisa langsung foto dari kamera.</p>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Brand / Kategori</label>
            <select v-model="form.category_id" required :class="inputClass">
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Nama Varian</label>
            <input v-model="form.name" type="text" placeholder="misal: Mocafrio / Choco Cino" required :class="inputClass" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Harga Modal</label>
              <input v-model.number="form.cost_price" type="number" required :class="inputClass" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Harga Jual per Cup</label>
              <input v-model.number="form.selling_price" type="number" required :class="inputClass" />
            </div>
          </div>

          <p class="text-[11px]" :class="formProfit < 0 ? 'text-red-600' : 'text-neutral-400'">
            {{ formProfit < 0
              ? `Harga jual di bawah modal: rugi ${formatRupiah(Math.abs(formProfit))} per cup.`
              : `Profit per cup: ${formatRupiah(formProfit)}` }}
          </p>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Jumlah Stok</label>
              <input v-model.number="form.stock" type="number" required :class="inputClass" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Batas Minimum Stok Alert</label>
              <input v-model.number="form.min_stock" type="number" required :class="inputClass" />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3">
            <button type="button" @click="closeModal" class="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:bg-neutral-100">Batal</button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#262624] text-white hover:bg-neutral-800 disabled:opacity-50"
            >{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <ConfirmModal
      :open="!!deleteTarget"
      title="Hapus Varian Produk?"
      message="Produk ini akan dihapus. Jika sudah pernah terjual, produk hanya dinonaktifkan agar riwayat penjualan tetap utuh."
      :item-name="deleteTarget ? `${deleteTarget.category_name} — ${deleteTarget.name}` : ''"
      :error="deleteError"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>