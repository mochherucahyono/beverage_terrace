<script setup>
import { computed } from 'vue';
import { LogOut, X } from 'lucide-vue-next';
import { createRipple } from '../utils/ripple';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';

// Props untuk mengontrol visibilitas modal
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

// Emit event untuk konfirmasi dan pembatalan
const emit = defineEmits(['confirm', 'cancel']);

// Efek ripple untuk tombol
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

// Mengunci scroll body saat modal terbuka
useBodyScrollLock(computed(() => props.isOpen));
</script>

<template>
  <div
    v-if="isOpen"
    class="logout-overlay fixed inset-0 z-50 bg-[#262624]/40 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="emit('cancel')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      class="logout-card relative w-full max-w-sm bg-white rounded-3xl p-6 text-center border border-neutral-200/80 shadow-[0_24px_60px_-20px_rgba(38,38,36,0.35)]"
    >
      <!-- Tombol tutup -->
      <button
        type="button"
        @click="(e) => handleButtonAction(e, 'cancel')"
        aria-label="Tutup"
        class="absolute overflow-hidden top-4 right-4 w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Ikon -->
      <div class="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
        <div class="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <LogOut class="w-5 h-5" />
        </div>
      </div>

      <!-- Teks -->
      <div class="mt-4 space-y-1.5">
        <h3 id="logout-title" class="text-base font-bold text-[#262624] tracking-tight">Konfirmasi Keluar</h3>
        <p class="text-[13px] text-neutral-500 leading-relaxed">
          Apakah Anda yakin ingin keluar dari sesi kasir Teras Minuman? Anda harus masuk kembali untuk melanjutkan.
        </p>
      </div>

      <!-- Aksi -->
      <div class="grid grid-cols-2 gap-2.5 mt-6">
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'cancel')"
          class="relative overflow-hidden py-3 px-4 rounded-xl text-sm font-semibold text-[#262624] bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] transition-all"
        >
          Batal
        </button>
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'confirm')"
          class="relative overflow-hidden py-3 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-sm transition-all"
        >
          Ya, Keluar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logout-overlay {
  animation: logout-fade 0.18s ease-out both;
}

.logout-card {
  animation: logout-pop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes logout-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes logout-pop {
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
  .logout-overlay,
  .logout-card {
    animation: none;
  }
}
</style>