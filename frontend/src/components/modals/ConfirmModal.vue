<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { Trash2, AlertCircle } from 'lucide-vue-next';
// Sembunyikan jika tidak pakai router di modal ini, atau import router jika butuh redirect setelah konfirmasi
// import { useRouter } from 'vue-router'; 
import { useBodyScrollLock } from '../../composables/useBodyScrollLock';
import { createRipple } from '../../utils/ripple';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Konfirmasi' },
  message: { type: String, default: '' },
  itemName: { type: String, default: '' },
  error: { type: String, default: '' },
  confirmText: { type: String, default: 'Hapus' },
  loading: { type: Boolean, default: false },
  redirectTo: { type: String, default: '' } // Opsional: jika ingin melakukan navigasi setelah konfirmasi
});

useBodyScrollLock(() => props.open);

const emit = defineEmits(['confirm', 'cancel']);
// const router = useRouter(); // Uncomment jika menggunakan vue-router
const onBackdrop = () => {
  if (!props.loading) emit('cancel');
};

const onKey = (e) => {
  if (e.key === 'Escape' && props.open && !props.loading) emit('cancel');
};

// Fungsi handler tombol dengan efek ripple
const handleButtonAction = (e, actionType) => {
  e.preventDefault();
  createRipple(e); // Menjalankan animasi ripple dari utilitas Anda

  setTimeout(() => {
    if (actionType === 'confirm') {
      emit('confirm');
    } else {
      emit('cancel');
    }
  }, 200); // Jeda singkat agar animasi ripple sempat terlihat sebelum aksi berjalan
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div
    v-if="open"
    class="confirm-overlay fixed inset-0 z-50 bg-[#262624]/40 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="onBackdrop"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      class="confirm-card w-full max-w-sm bg-white rounded-3xl p-6 text-center border border-neutral-200/80 shadow-[0_24px_60px_-20px_rgba(38,38,36,0.35)]"
    >
      <!-- Ikon -->
      <div class="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
        <div class="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <Trash2 class="w-5 h-5" />
        </div>
      </div>

      <!-- Teks -->
      <div class="mt-4 space-y-1.5">
        <h3 id="confirm-title" class="text-base font-bold text-[#262624] tracking-tight">{{ title }}</h3>
        <p v-if="message" class="text-[13px] text-neutral-500 leading-relaxed">{{ message }}</p>
      </div>

      <!-- Nama item yang akan dihapus -->
      <div
        v-if="itemName"
        class="mt-4 rounded-xl bg-neutral-50 border border-neutral-200/70 px-3.5 py-2.5 text-[13px] font-semibold text-[#262624] truncate"
      >{{ itemName }}</div>

      <!-- Pesan error -->
      <div
        v-if="error"
        role="alert"
        class="mt-3 flex items-start gap-2 text-left text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 leading-relaxed"
      >
        <AlertCircle class="w-4 h-4 shrink-0 mt-px" />
        <span>{{ error }}</span>
      </div>

      <!-- Bagian Tombol Aksi dengan Efek Ripple -->
      <div class="grid grid-cols-2 gap-2.5 mt-6">
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'cancel')"
          :disabled="loading"
          class="relative overflow-hidden py-3 px-4 rounded-xl text-sm font-semibold text-[#262624] bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >Batal</button>

        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'confirm')"
          :disabled="loading"
          class="relative overflow-hidden py-3 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <span
            v-if="loading"
            class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            aria-hidden="true"
          ></span>
          <span>{{ loading ? 'Menghapus...' : confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  animation: confirm-fade 0.18s ease-out both;
}

.confirm-card {
  animation: confirm-pop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes confirm-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes confirm-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-overlay,
  .confirm-card {
    animation: none;
  }
}
</style>