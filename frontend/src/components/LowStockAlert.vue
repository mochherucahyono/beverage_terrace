<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../services/api';

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
  <div class="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
    <div class="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
      <h3 class="text-xs font-bold text-[#262624]">Peringatan Stok</h3>
      <span
        v-if="items.length > 0"
        class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800"
      >{{ items.length }} rasa perlu restock</span>
    </div>

    <p v-if="loading && items.length === 0" class="px-4 py-6 text-xs text-neutral-400">Memuat...</p>

    <p v-else-if="items.length === 0" class="px-4 py-6 text-xs text-neutral-400">
      Semua stok aman. Belum ada produk yang menipis.
    </p>

    <ul v-else class="divide-y divide-neutral-100">
      <li
        v-for="item in items"
        :key="item.id"
        class="px-4 py-3 flex items-center justify-between gap-3"
      >
        <div class="min-w-0">
          <p class="text-xs font-bold text-[#262624] truncate">{{ item.name }}</p>
          <p class="text-[10px] uppercase tracking-wider text-neutral-400">{{ item.category_name }}</p>
        </div>
        <div class="text-right shrink-0">
          <span
            class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md"
            :class="item.status === 'habis' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'"
          >{{ item.status === 'habis' ? 'Habis' : 'Menipis' }}</span>
          <p class="text-[11px] text-neutral-500 mt-1">
            Sisa {{ item.stock }} / min {{ item.min_stock }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>