<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../services/api';
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps({
  refreshKey: { type: Number, default: 0 }
});

const items = ref([]);
const loading = ref(false);

const fetchLowStock = async () => {
  loading.value = true;
  try {
    const res = await api.get('/products/low-stock');
    items.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil peringatan stok:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchLowStock);
watch(() => props.refreshKey, fetchLowStock);
</script>

<template>
  <div class="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm">
    <!-- Header -->
    <div class="px-4 sm:px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
      <span
        class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        :class="items.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
      >
        <AlertTriangle v-if="items.length > 0" class="w-[18px] h-[18px]" />
        <CheckCircle2 v-else class="w-[18px] h-[18px]" />
      </span>
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-[#262624]">Peringatan Stok</h3>
        <p
          v-if="items.length > 0"
          class="text-[11px] font-semibold text-amber-700 mt-0.5"
        >{{ items.length }} produk perlu restock</p>
        <p v-else class="text-[11px] text-neutral-400 mt-0.5">Stok terpantau</p>
      </div>
    </div>

    <!-- Memuat -->
    <ul v-if="loading && items.length === 0" class="divide-y divide-neutral-100" aria-label="Memuat">
      <li v-for="n in 3" :key="n" class="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 animate-pulse">
        <div class="flex-1 space-y-2">
          <div class="h-3 w-2/3 rounded bg-neutral-100"></div>
          <div class="h-2.5 w-1/3 rounded bg-neutral-100"></div>
        </div>
        <div class="h-5 w-14 rounded-full bg-neutral-100"></div>
      </li>
    </ul>

    <!-- Aman -->
    <div v-else-if="items.length === 0" class="px-5 py-10 text-center space-y-1.5">
      <p class="text-sm font-semibold text-[#262624]">Semua stok aman</p>
      <p class="text-xs text-neutral-400">Belum ada produk yang menipis.</p>
    </div>

    <!-- Daftar produk menipis -->
    <ul v-else class="divide-y divide-neutral-100 max-h-[22rem] overflow-y-auto overscroll-contain">
      <li
        v-for="item in items"
        :key="item.id"
        class="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-[#262624] truncate">{{ item.name }}</p>
          <p class="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5 truncate">{{ item.category_name }}</p>
          <!-- Sisa stok dibanding batas minimum -->
          <div class="mt-2 h-1 rounded-full bg-neutral-100 overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="item.status === 'habis' ? 'bg-red-500' : 'bg-amber-500'"
              :style="{ width: Math.min(100, (item.stock / Math.max(item.min_stock, 1)) * 100) + '%' }"
            ></div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span
            class="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full"
            :class="item.status === 'habis' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'"
          >{{ item.status === 'habis' ? 'Habis' : 'Menipis' }}</span>
          <p class="text-[11px] text-neutral-500 mt-1.5 tabular-nums">
            Sisa <span class="font-semibold text-[#262624]">{{ item.stock }}</span> / min {{ item.min_stock }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>