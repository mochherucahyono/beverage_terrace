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
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="emit('cancel')"
  >
    <div class="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between">
        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <LogOut class="w-5 h-5" />
        </div>
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'cancel')"
          class="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-1">
        <h3 class="text-sm font-bold text-[#262624]">Konfirmasi Keluar</h3>
        <p class="text-xs text-neutral-500 leading-relaxed">
          Apakah Anda yakin ingin keluar dari sesi kasir Teras Minuman? Anda harus masuk kembali untuk melanjutkan.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'cancel')"
          class="py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
        >
          Batal
        </button>
        <button
          type="button"
          @click="(e) => handleButtonAction(e, 'confirm')"
          class="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm"
        >
          Ya, Keluar
        </button>
      </div>
    </div>
  </div>
</template>