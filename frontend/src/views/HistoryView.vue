<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import api from '../services/api';
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, Receipt } from 'lucide-vue-next';

/* ---------- State ---------- */
const transactions = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 1 });
const loading = ref(false);
const limit = ref(10);
const filters = reactive({ search: '', start_date: '', end_date: '', payment_method: '' });
const activePreset = ref('all');

const expandedId = ref(null);
const detailCache = reactive({});
const detailError = reactive({});

/* ---------- Helper ---------- */
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (d) =>
  new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- Opsi filter ---------- */
const datePresets = [
  { key: 'all', label: 'Semua' },
  { key: 'today', label: 'Hari ini' },
  { key: '7', label: '7 hari' },
  { key: '30', label: '30 hari' }
];

const paymentOptions = [
  { value: '', label: 'Semua' },
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' }
];

const applyDatePreset = (key) => {
  activePreset.value = key;
  if (key === 'all') {
    filters.start_date = '';
    filters.end_date = '';
    return;
  }
  const days = key === 'today' ? 1 : Number(key);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  filters.start_date = toISO(start);
  filters.end_date = toISO(end);
};

const rangeError = computed(() =>
  filters.start_date && filters.end_date && filters.start_date > filters.end_date
    ? 'Tanggal awal tidak boleh melewati tanggal akhir.'
    : ''
);

const hasActiveFilters = computed(
  () => !!(filters.search.trim() || filters.start_date || filters.end_date || filters.payment_method)
);

const resetFilters = () => {
  filters.search = '';
  filters.payment_method = '';
  applyDatePreset('all');
};

/* ---------- Ambil data ---------- */
// Mencegah hasil request lama menimpa request yang lebih baru
let requestId = 0;

const fetchHistory = async (page = 1) => {
  const id = ++requestId;
  loading.value = true;
  try {
    const params = { page, limit: limit.value };
    const q = filters.search.trim();
    if (q) params.search = q;
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    if (filters.payment_method) params.payment_method = filters.payment_method;

    const res = await api.get('/transactions/history', { params });
    if (id !== requestId) return;
    transactions.value = res.data.data;
    pagination.value = res.data.pagination;
    expandedId.value = null;
  } catch (err) {
    console.error('Gagal mengambil riwayat:', err);
  } finally {
    if (id === requestId) loading.value = false;
  }
};

// Filter dan pencarian berjalan otomatis setelah jeda singkat
let debounceTimer;
watch(
  () => [filters.search, filters.start_date, filters.end_date, filters.payment_method, limit.value],
  () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!rangeError.value) fetchHistory(1);
    }, 300);
  }
);

const goToPage = (page) => {
  fetchHistory(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const rangeText = computed(() => {
  const { page, total } = pagination.value;
  if (total === 0) return 'Tidak ada transaksi';
  const from = (page - 1) * limit.value + 1;
  const to = Math.min(page * limit.value, total);
  return `${from}–${to} dari ${total} transaksi`;
});

/* ---------- Detail transaksi ---------- */
const loadDetail = async (id) => {
  delete detailError[id];
  try {
    const res = await api.get(`/transactions/${id}`);
    detailCache[id] = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil detail:', err);
    detailError[id] = true;
  }
};

const toggleDetail = async (id) => {
  if (expandedId.value === id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = id;
  if (detailCache[id]) return;
  await loadDetail(id);
};

onMounted(() => fetchHistory(1));
onBeforeUnmount(() => clearTimeout(debounceTimer));
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
      <div>
        <h1 class="text-base font-bold text-[#262624]">Riwayat Transaksi</h1>
        <p class="text-xs text-neutral-400">Lihat semua transaksi beserta rincian produk yang terjual.</p>
      </div>
      <div class="flex items-center gap-2 text-[11px] text-neutral-400">
        <span>{{ pagination.total }} transaksi</span>
        <span
          v-if="loading"
          class="w-3 h-3 rounded-full border-2 border-neutral-300 border-t-[#DA6B4F] animate-spin"
          aria-label="Memuat"
        ></span>
      </div>
    </div>

    <!-- Pencarian & filter -->
    <div class="bg-white rounded-2xl border border-neutral-200/80 p-3 sm:p-4 shadow-sm space-y-3">
      <!-- Pencarian -->
      <div class="relative">
        <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="filters.search"
          type="text"
          placeholder="Cari nomor transaksi (mis. 12), rasa, atau brand..."
          autocomplete="off"
          class="w-full text-xs py-2.5 pl-10 pr-9 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
        />
        <button
          v-if="filters.search"
          type="button"
          @click="filters.search = ''"
          aria-label="Hapus pencarian"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center gap-3">
        <!-- Periode cepat -->
        <div class="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto max-w-full self-start">
          <button
            v-for="p in datePresets"
            :key="p.key"
            @click="applyDatePreset(p.key)"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            :class="activePreset === p.key
              ? 'bg-white text-[#262624] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800'"
          >{{ p.label }}</button>
        </div>

        <!-- Tanggal manual -->
        <div class="flex items-center gap-2">
          <input
            v-model="filters.start_date"
            @change="activePreset = null"
            type="date"
            aria-label="Dari tanggal"
            class="flex-1 lg:flex-none text-xs p-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
          <span class="text-neutral-300">–</span>
          <input
            v-model="filters.end_date"
            @change="activePreset = null"
            type="date"
            aria-label="Sampai tanggal"
            class="flex-1 lg:flex-none text-xs p-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
        </div>

        <!-- Metode bayar -->
        <div class="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl self-start">
          <button
            v-for="opt in paymentOptions"
            :key="opt.value"
            @click="filters.payment_method = opt.value"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            :class="filters.payment_method === opt.value
              ? 'bg-white text-[#262624] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800'"
          >{{ opt.label }}</button>
        </div>

        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="lg:ml-auto self-start px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:bg-neutral-100 transition-all"
        >Reset filter</button>
      </div>

      <p v-if="rangeError" class="text-[11px] text-red-600">{{ rangeError }}</p>
    </div>

    <!-- Daftar transaksi -->
    <div class="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
      <!-- Memuat pertama kali -->
      <ul v-if="loading && transactions.length === 0" class="divide-y divide-neutral-100">
        <li v-for="n in 5" :key="n" class="px-4 py-4 flex items-center gap-3 animate-pulse">
          <div class="w-10 h-10 rounded-xl bg-neutral-100 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3 w-1/3 rounded bg-neutral-100"></div>
            <div class="h-2.5 w-1/2 rounded bg-neutral-100"></div>
          </div>
          <div class="h-3 w-16 rounded bg-neutral-100"></div>
        </li>
      </ul>

      <!-- Kosong -->
      <div v-else-if="transactions.length === 0" class="py-14 px-6 text-center space-y-3">
        <template v-if="hasActiveFilters">
          <p class="text-sm font-semibold text-[#262624]">Tidak ada transaksi yang cocok</p>
          <p class="text-xs text-neutral-400">Coba ubah kata kunci atau rentang tanggalnya.</p>
          <button
            @click="resetFilters"
            class="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-all"
          >Reset filter</button>
        </template>
        <template v-else>
          <p class="text-sm font-semibold text-[#262624]">Belum ada transaksi</p>
          <p class="text-xs text-neutral-400">Transaksi dari halaman Kasir akan muncul di sini.</p>
        </template>
      </div>

      <!-- Daftar -->
      <ul v-else class="divide-y divide-neutral-100 transition-opacity" :class="{ 'opacity-60': loading }">
        <li v-for="tx in transactions" :key="tx.id">
          <button
            type="button"
            @click="toggleDetail(tx.id)"
            :aria-expanded="expandedId === tx.id"
            class="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-neutral-50/60 transition-colors"
          >
            <span
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              :class="tx.payment_method === 'qris' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'"
            >
              <Receipt class="w-4 h-4" />
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-[#262624]">#TRX-{{ tx.id }}</span>
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  :class="tx.payment_method === 'qris' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'"
                >{{ tx.payment_method === 'qris' ? 'QRIS' : 'Tunai' }}</span>
              </div>
              <p class="text-[11px] text-neutral-400 mt-0.5">
                {{ formatDate(tx.created_at) }}
              </p>
              <p class="text-[11px] text-neutral-500 mt-0.5">{{ tx.total_items }} pcs</p>
            </div>

            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-[#262624]">{{ formatRupiah(tx.total_amount) }}</p>
              <p class="text-[11px] font-semibold text-emerald-600">Laba {{ formatRupiah(tx.profit) }}</p>
            </div>

            <ChevronDown
              class="w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200"
              :class="expandedId === tx.id ? 'rotate-180' : ''"
            />
          </button>

          <!-- Rincian item -->
          <div v-if="expandedId === tx.id" class="px-4 pb-4 pt-1 bg-neutral-50/70 border-t border-neutral-100">
            <div v-if="detailError[tx.id]" class="py-3 flex items-center justify-between gap-3">
              <p class="text-xs text-red-600">Gagal memuat rincian transaksi.</p>
              <button
                @click="loadDetail(tx.id)"
                class="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
              >Coba lagi</button>
            </div>

            <div v-else-if="!detailCache[tx.id]" class="py-3 space-y-2 animate-pulse">
              <div class="h-3 w-2/3 rounded bg-neutral-200/70"></div>
              <div class="h-3 w-1/2 rounded bg-neutral-200/70"></div>
            </div>

            <div v-else class="pt-2">
              <ul class="divide-y divide-neutral-200/70">
                <li
                  v-for="item in detailCache[tx.id].items"
                  :key="item.id"
                  class="py-2.5 flex items-center justify-between gap-3"
                >
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-[#262624] truncate">{{ item.product_name }}</p>
                    <p class="text-[10px] text-neutral-400">{{ item.category_name }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs font-semibold text-[#262624]">{{ formatRupiah(item.price * item.quantity) }}</p>
                    <p class="text-[10px] text-neutral-400">{{ item.quantity }} × {{ formatRupiah(item.price) }}</p>
                  </div>
                </li>
              </ul>
              <div class="mt-1 pt-2.5 border-t border-neutral-200/70 flex items-center justify-between text-xs">
                <span class="text-neutral-500">Total</span>
                <span class="font-bold text-[#262624]">{{ formatRupiah(tx.total_amount) }}</span>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <!-- Pagination -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100 text-xs text-neutral-500">
        <span>{{ rangeText }}</span>
        <div class="flex items-center justify-between sm:justify-end gap-3">
          <label class="flex items-center gap-2">
            <span class="text-neutral-400">Per halaman</span>
            <select
              v-model.number="limit"
              class="text-xs py-1.5 px-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F]"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>

          <div class="flex items-center gap-1.5">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              aria-label="Halaman sebelumnya"
              class="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="px-1 tabular-nums">{{ pagination.page }} / {{ pagination.total_pages }}</span>
            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.total_pages"
              aria-label="Halaman berikutnya"
              class="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>