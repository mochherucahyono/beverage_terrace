<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import api from '../services/api';
import LowStockAlert from '../components/LowStockAlert.vue';
import { Wallet, TrendingUp, ShoppingBag, Receipt, Search, X, Calendar } from 'lucide-vue-next';

/* ---------- State utama ---------- */
const loading = ref(false);
const activeRange = ref('7');
const filters = reactive({ start_date: '', end_date: '' });
const report = ref({
  range: null,
  summary: { transactions: 0, qtys: 0, revenue: 0, profit: 0, margin: 0 },
  daily: [],
  top_products: []
});

/* ---------- Helper format ---------- */
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDay = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });

const formatShort = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

/* ---------- Filter periode (otomatis) ---------- */
const lastDays = (n) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  return [start, end];
};

const presets = [
  { key: 'today', label: 'Hari ini', range: () => lastDays(1) },
  { key: '7', label: '7 hari', range: () => lastDays(7) },
  { key: '30', label: '30 hari', range: () => lastDays(30) },
  {
    key: 'month',
    label: 'Bulan ini',
    range: () => {
      const t = new Date();
      return [new Date(t.getFullYear(), t.getMonth(), 1), t];
    }
  }
];

const applyPreset = (preset) => {
  const [start, end] = preset.range();
  filters.start_date = toISO(start);
  filters.end_date = toISO(end);
  activeRange.value = preset.key;
};

const rangeError = computed(() => {
  if (!filters.start_date || !filters.end_date) return 'Pilih tanggal awal dan tanggal akhir.';
  if (filters.start_date > filters.end_date) return 'Tanggal awal tidak boleh melewati tanggal akhir.';
  return '';
});

// Mencegah hasil request lama menimpa request yang lebih baru
let requestId = 0;

const fetchSummary = async () => {
  if (rangeError.value) return;
  const id = ++requestId;
  loading.value = true;
  try {
    const res = await api.get('/reports/summary', {
      params: {
        start_date: filters.start_date,
        end_date: filters.end_date,
        top_limit: 50
      }
    });
    if (id !== requestId) return;
    report.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil laporan:', err);
  } finally {
    if (id === requestId) loading.value = false;
  }
};

// Nilai awal: 7 hari terakhir (diset sebelum watcher dibuat, data dimuat di onMounted)
applyPreset(presets[1]);

let debounceTimer;
watch(
  () => [filters.start_date, filters.end_date],
  () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchSummary, 250);
  }
);

onMounted(fetchSummary);
onBeforeUnmount(() => clearTimeout(debounceTimer));

const periodLabel = computed(() => {
  const r = report.value.range;
  if (!r) return '';
  return r.start_date === r.end_date
    ? formatShort(r.start_date)
    : `${formatShort(r.start_date)} – ${formatShort(r.end_date)}`;
});

/* ---------- Produk terlaris: pencarian & filter brand otomatis ---------- */
const productSearch = ref('');
const productBrand = ref('');

const rankedProducts = computed(() =>
  report.value.top_products.map((p, i) => ({ ...p, rank: i + 1 }))
);

const brandOptions = computed(() =>
  [...new Set(rankedProducts.value.map((p) => p.category_name).filter(Boolean))].sort()
);

const maxQty = computed(() => Math.max(1, ...rankedProducts.value.map((p) => p.qty_sold)));

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  return rankedProducts.value.filter((p) => {
    const matchBrand = !productBrand.value || p.category_name === productBrand.value;
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q);
    return matchBrand && matchSearch;
  });
});

// Reset filter brand kalau brand tersebut tidak ada di periode yang baru
watch(brandOptions, (opts) => {
  if (productBrand.value && !opts.includes(productBrand.value)) productBrand.value = '';
});

const resetProductFilters = () => {
  productSearch.value = '';
  productBrand.value = '';
};

/* ---------- Rekap harian: pencarian & urutan otomatis ---------- */
const dailySearch = ref('');
const dailySort = ref('newest');

const filteredDaily = computed(() => {
  const q = dailySearch.value.trim().toLowerCase();
  let rows = report.value.daily.filter(
    (d) => !q || d.day.includes(q) || formatDay(d.day).toLowerCase().includes(q)
  );
  if (dailySort.value === 'revenue') rows = [...rows].sort((a, b) => b.revenue - a.revenue);
  else if (dailySort.value === 'profit') rows = [...rows].sort((a, b) => b.profit - a.profit);
  return rows;
});
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
      <div>
        <h1 class="text-base font-bold text-[#262624]">Laporan Penjualan</h1>
        <p class="text-xs text-neutral-400">Ringkasan omzet, laba, dan produk terlaris.</p>
      </div>
      <div v-if="report.range" class="flex items-center gap-2 text-[11px] text-neutral-400">
        <Calendar class="w-3.5 h-3.5" />
        <span>{{ periodLabel }}</span>
        <span
          v-if="loading"
          class="w-3 h-3 rounded-full border-2 border-neutral-300 border-t-[#DA6B4F] animate-spin"
          aria-label="Memuat"
        ></span>
      </div>
    </div>

    <!-- Filter periode -->
    <div class="bg-white rounded-2xl border border-neutral-200/80 p-3 sm:p-4 shadow-sm space-y-2">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto max-w-full self-start">
          <button
            v-for="p in presets"
            :key="p.key"
            @click="applyPreset(p)"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            :class="activeRange === p.key
              ? 'bg-white text-[#262624] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800'"
          >{{ p.label }}</button>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="filters.start_date"
            @change="activeRange = null"
            type="date"
            aria-label="Dari tanggal"
            class="flex-1 lg:flex-none text-xs p-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
          <span class="text-neutral-300">–</span>
          <input
            v-model="filters.end_date"
            @change="activeRange = null"
            type="date"
            aria-label="Sampai tanggal"
            class="flex-1 lg:flex-none text-xs p-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
          />
        </div>
      </div>
      <p v-if="rangeError" class="text-[11px] text-red-600">{{ rangeError }}</p>
    </div>

    <!-- Kartu ringkasan -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity" :class="{ 'opacity-60': loading }">
      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-neutral-400">Omzet</span>
          <span class="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center">
            <Wallet class="w-4 h-4" />
          </span>
        </div>
        <p class="text-lg font-bold text-[#262624] mt-2 truncate">{{ formatRupiah(report.summary.revenue) }}</p>
        <p class="text-[11px] text-transparent select-none">.</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-neutral-400">Laba</span>
          <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp class="w-4 h-4" />
          </span>
        </div>
        <p class="text-lg font-bold text-emerald-700 mt-2 truncate">{{ formatRupiah(report.summary.profit) }}</p>
        <p class="text-[11px] text-neutral-400">Margin {{ report.summary.margin }}%</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-neutral-400">Terjual</span>
          <span class="w-8 h-8 rounded-xl bg-[#DA6B4F]/10 text-[#DA6B4F] flex items-center justify-center">
            <ShoppingBag class="w-4 h-4" />
          </span>
        </div>
        <p class="text-lg font-bold text-[#DA6B4F] mt-2">{{ report.summary.qtys }}</p>
        <p class="text-[11px] text-transparent select-none">.</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-neutral-400">Transaksi</span>
          <span class="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center">
            <Receipt class="w-4 h-4" />
          </span>
        </div>
        <p class="text-lg font-bold text-[#262624] mt-2">{{ report.summary.transactions }}</p>
        <p class="text-[11px] text-transparent select-none">.</p>
      </div>
    </div>

    <!-- Produk terlaris + peringatan stok -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="px-4 py-3.5 border-b border-neutral-100 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-[#262624]">Produk Terlaris</h3>
              <p class="text-[11px] text-neutral-400">Diurutkan dari jumlah produk terjual terbanyak.</p>
            </div>
            <div class="relative w-full sm:w-56">
              <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="productSearch"
                type="text"
                placeholder="Cari produk atau brand..."
                autocomplete="off"
                class="w-full text-xs py-2 pl-9 pr-8 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
              />
              <button
                v-if="productSearch"
                type="button"
                @click="productSearch = ''"
                aria-label="Hapus pencarian"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Filter brand -->
          <div v-if="brandOptions.length > 1" class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              @click="productBrand = ''"
              class="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all"
              :class="productBrand === ''
                ? 'bg-[#262624] text-white border-[#262624]'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
            >Semua</button>
            <button
              v-for="b in brandOptions"
              :key="b"
              @click="productBrand = b"
              class="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all"
              :class="productBrand === b
                ? 'bg-[#262624] text-white border-[#262624]'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'"
            >{{ b }}</button>
          </div>
        </div>

        <ul class="divide-y divide-neutral-100">
          <li v-if="rankedProducts.length === 0" class="px-4 py-10 text-center text-xs text-neutral-400">
            Belum ada penjualan di periode ini.
          </li>

          <li v-else-if="filteredProducts.length === 0" class="px-4 py-10 text-center space-y-2">
            <p class="text-xs font-semibold text-[#262624]">Tidak ada produk yang cocok</p>
            <button
              @click="resetProductFilters"
              class="px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >Reset pencarian dan filter</button>
          </li>

          <li v-for="p in filteredProducts" :key="p.id" class="px-4 py-3 flex items-center gap-3">
            <span
              class="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
              :class="p.rank <= 3 ? 'bg-[#DA6B4F]/10 text-[#DA6B4F]' : 'bg-neutral-100 text-neutral-500'"
            >{{ p.rank }}</span>

            <div class="min-w-0 flex-1 space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-bold text-[#262624] truncate">{{ p.name }}</p>
                <p class="text-xs font-semibold text-neutral-600 shrink-0">{{ p.qty_sold }} pcs</p>
              </div>
              <div class="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-[#DA6B4F]"
                  :style="{ width: (p.qty_sold / maxQty) * 100 + '%' }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-neutral-400">{{ p.category_name }}</span>
                <span class="font-semibold text-emerald-600">Laba {{ formatRupiah(p.profit) }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <LowStockAlert />
    </div>

    <!-- Rekap harian -->
    <div class="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
      <div class="px-4 py-3.5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-[#262624]">Rekap Harian</h3>
          <p class="text-[11px] text-neutral-400">{{ filteredDaily.length }} hari ditampilkan</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative flex-1 sm:flex-none sm:w-52">
            <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="dailySearch"
              type="text"
              placeholder="Cari tanggal, mis. okt"
              autocomplete="off"
              class="w-full text-xs py-2 pl-9 pr-8 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
            />
            <button
              v-if="dailySearch"
              type="button"
              @click="dailySearch = ''"
              aria-label="Hapus pencarian"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            v-model="dailySort"
            aria-label="Urutkan rekap harian"
            class="text-xs py-2 px-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15"
          >
            <option value="newest">Terbaru</option>
            <option value="revenue">Omzet tertinggi</option>
            <option value="profit">Laba tertinggi</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold">
              <th class="py-3 px-4">Tanggal</th>
              <th class="py-3 px-4 hidden sm:table-cell">Transaksi</th>
              <th class="py-3 px-4">Qty</th>
              <th class="py-3 px-4">Omzet</th>
              <th class="py-3 px-4 text-right">Laba</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-if="report.daily.length === 0">
              <td colspan="5" class="text-center py-10 text-neutral-400">Belum ada transaksi di periode ini.</td>
            </tr>
            <tr v-else-if="filteredDaily.length === 0">
              <td colspan="5" class="text-center py-10 text-neutral-400">
                Tidak ada tanggal yang cocok dengan “{{ dailySearch }}”.
              </td>
            </tr>
            <tr v-for="d in filteredDaily" :key="d.day" class="hover:bg-neutral-50/50 transition-colors">
              <td class="py-3 px-4 font-semibold text-neutral-700 whitespace-nowrap">{{ formatDay(d.day) }}</td>
              <td class="py-3 px-4 text-neutral-500 hidden sm:table-cell">{{ d.transactions }}</td>
              <td class="py-3 px-4 text-neutral-600">{{ d.qtys }}</td>
              <td class="py-3 px-4 text-neutral-600 whitespace-nowrap">{{ formatRupiah(d.revenue) }}</td>
              <td class="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">{{ formatRupiah(d.profit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>