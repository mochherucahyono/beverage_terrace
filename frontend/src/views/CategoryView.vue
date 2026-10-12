<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal.vue';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';
import { Plus, Search, X, Pencil, Trash2 } from 'lucide-vue-next';

const categories = ref([]);
const loading = ref(true);
const isModalOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const form = ref({ id: null, name: '' });

// Pencarian otomatis (langsung memfilter saat mengetik)
const searchQuery = ref('');

const filteredCategories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return categories.value;
  return categories.value.filter((c) => c.name.toLowerCase().includes(q));
});

const totalProducts = computed(() =>
  categories.value.reduce((sum, c) => sum + Number(c.product_count || 0), 0)
);

const emptyCategories = computed(
  () => categories.value.filter((c) => Number(c.product_count || 0) === 0).length
);

const fetchCategories = async () => {
  try {
    const res = await api.get('/categories');
    categories.value = res.data.data;
  } catch (err) {
    console.error('Gagal mengambil brand:', err);
  } finally {
    loading.value = false;
  }
};

const openModal = (cat = null) => {
  isEditing.value = !!cat;
  form.value = cat ? { id: cat.id, name: cat.name } : { id: null, name: '' };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

useBodyScrollLock(isModalOpen);

const saveCategory = async () => {
  saving.value = true;
  try {
    if (isEditing.value) {
      await api.put(`/categories/${form.value.id}`, { name: form.value.name });
    } else {
      await api.post('/categories', { name: form.value.name });
    }
    closeModal();
    fetchCategories();
  } catch (err) {
    alert(err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

const deleteTarget = ref(null);
const deleting = ref(false);
const deleteError = ref('');

const askDelete = (cat) => {
  deleteError.value = '';
  deleteTarget.value = cat;
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
    await api.delete(`/categories/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    fetchCategories();
  } catch (err) {
    deleteError.value = err.response?.data?.message || err.message;
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchCategories);
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-base font-bold text-[#262624]">Kelola Kategori</h1>
        <p class="text-xs text-neutral-400">Tambah atau ubah merek atau kategori minuman (Pop Ice, Good Day, dll).</p>
      </div>
      <button
        @click="openModal()"
        class="px-4 py-2.5 bg-[#262624] text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Tambah Kategori</span>
      </button>
    </div>

    <!-- Ringkasan -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-sm">
        <p class="text-neutral-400 text-[11px] font-medium">Total Kategori</p>
        <p class="text-lg font-bold text-[#262624] mt-0.5">{{ categories.length }}</p>
      </div>
      <div class="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-sm">
        <p class="text-neutral-400 text-[11px] font-medium">Total Produk</p>
        <p class="text-lg font-bold text-[#DA6B4F] mt-0.5">{{ totalProducts }}</p>
      </div>
      <div class="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-sm">
        <p class="text-neutral-400 text-[11px] font-medium">Belum Ada Produk</p>
        <p class="text-lg font-bold text-amber-600 mt-0.5">{{ emptyCategories }}</p>
      </div>
    </div>

    <!-- Pencarian -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="relative w-full sm:w-80">
        <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kategori..."
          autocomplete="off"
          class="w-full text-xs py-2.5 pl-10 pr-9 rounded-xl border border-neutral-200 bg-white shadow-sm focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
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
      <span v-if="searchQuery" class="text-[11px] text-neutral-400 sm:text-right">
        Menampilkan {{ filteredCategories.length }} dari {{ categories.length }} kategori
      </span>
    </div>

    <!-- Memuat -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="n in 6"
        :key="n"
        class="bg-white rounded-2xl border border-neutral-200/80 p-4 flex items-center gap-3 animate-pulse"
      >
        <div class="w-11 h-11 rounded-xl bg-neutral-100"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 w-2/3 rounded bg-neutral-100"></div>
          <div class="h-2.5 w-1/3 rounded bg-neutral-100"></div>
        </div>
      </div>
    </div>

    <!-- Daftar Kategori -->
    <div v-else-if="filteredCategories.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="bg-white rounded-2xl border border-neutral-200/80 p-4 flex items-center gap-3 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:shadow-md"
      >
        <div class="w-11 h-11 rounded-xl bg-[#DA6B4F]/10 text-[#DA6B4F] flex items-center justify-center text-base font-bold shrink-0">
          {{ cat.name.charAt(0).toUpperCase() }}
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-bold text-[#262624] truncate">{{ cat.name }}</h3>
          <p class="text-[11px] mt-0.5" :class="cat.product_count > 0 ? 'text-neutral-400' : 'text-amber-600'">
            {{ cat.product_count > 0 ? `${cat.product_count} Produk` : 'Belum ada produk' }}
          </p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="openModal(cat)"
            title="Edit"
            aria-label="Edit kategori"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            @click="askDelete(cat)"
            :disabled="cat.product_count > 0"
            :title="cat.product_count > 0 ? 'Masih punya produk, tidak bisa dihapus' : 'Hapus'"
            aria-label="Hapus kategori"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-500"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kosong -->
    <div
      v-else
      class="bg-white rounded-2xl border border-dashed border-neutral-300 py-12 px-6 text-center space-y-3"
    >
      <template v-if="searchQuery">
        <p class="text-sm font-semibold text-[#262624]">Tidak ada kategori yang cocok</p>
        <p class="text-xs text-neutral-400">Tidak ditemukan hasil untuk “{{ searchQuery }}”.</p>
        <button
          @click="searchQuery = ''"
          class="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-all"
        >Hapus pencarian</button>
      </template>
      <template v-else>
        <p class="text-sm font-semibold text-[#262624]">Belum ada kategori</p>
        <p class="text-xs text-neutral-400">Tambahkan merek pertama Anda untuk mulai mengelompokkan rasa.</p>
        <button
          @click="openModal()"
          class="px-4 py-2 rounded-xl bg-[#DA6B4F] text-white text-xs font-semibold hover:bg-[#C25A40] transition-all"
        >Tambah Kategori</button>
      </template>
    </div>

    <!-- Modal Tambah / Edit -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
    >
      <div class="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-100">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-[#262624]">{{ isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru' }}</h3>
          <button
            type="button"
            @click="closeModal"
            aria-label="Tutup"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveCategory" class="space-y-3">
          <div>
            <label class="block text-[11px] font-semibold text-neutral-600 mb-1">Nama Kategori</label>
            <input
              v-model="form.name"
              type="text"
              maxlength="50"
              placeholder="misal: Marimas"
              required
              class="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
            />
          </div>
          <div class="flex items-center justify-end space-x-2 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100">Batal</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#262624] text-white hover:bg-neutral-800 disabled:opacity-50">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <ConfirmModal
      :open="!!deleteTarget"
      title="Hapus Kategori?"
      message="Kategori ini akan dihapus permanen dan tidak bisa dikembalikan."
      :item-name="deleteTarget?.name"
      :error="deleteError"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>