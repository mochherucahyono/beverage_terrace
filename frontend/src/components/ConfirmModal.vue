<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';



const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Konfirmasi' },
  message: { type: String, default: '' },
  itemName: { type: String, default: '' },
  error: { type: String, default: '' },
  confirmText: { type: String, default: 'Hapus' },
  loading: { type: Boolean, default: false }
});

useBodyScrollLock(() => props.open);

const emit = defineEmits(['confirm', 'cancel']);

const onBackdrop = () => {
  if (!props.loading) emit('cancel');
};

const onKey = (e) => {
  if (e.key === 'Escape' && props.open && !props.loading) emit('cancel');
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="onBackdrop"
  >
    <div class="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-100">
      <div class="flex items-start space-x-3">
        <div class="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div class="space-y-1 min-w-0">
          <h3 class="text-sm font-bold text-[#262624]">{{ title }}</h3>
          <p class="text-xs text-neutral-500 leading-relaxed">{{ message }}</p>
        </div>
      </div>

      <div
        v-if="itemName"
        class="rounded-xl bg-neutral-50/80 border border-neutral-100 px-3 py-2 text-xs font-bold text-[#262624] truncate"
      >{{ itemName }}</div>

      <p
        v-if="error"
        class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 leading-relaxed"
      >{{ error }}</p>

      <div class="flex items-center justify-end space-x-2 pt-1">
        <button
          type="button"
          @click="emit('cancel')"
          :disabled="loading"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >Batal</button>
        <button
          type="button"
          @click="emit('confirm')"
          :disabled="loading"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >{{ loading ? 'Menghapus...' : confirmText }}</button>
      </div>
    </div>
  </div>
</template>