<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next';

/*
  Pemilih tanggal kustom (pengganti <input type="date">).
  - v-model berisi string 'YYYY-MM-DD' (sama seperti input date bawaan), kosong = ''.
  - Event `change` hanya terpicu saat pengguna memilih/menghapus tanggal,
    bukan saat nilai diubah dari luar (mis. tombol periode cepat).
  - Di layar kecil tampil sebagai kartu di tengah layar; di layar lebar sebagai popover.
*/
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Pilih tanggal' },
  ariaLabel: { type: String, default: 'Pilih tanggal' },
  min: { type: String, default: '' }, // batas awal (YYYY-MM-DD), opsional
  max: { type: String, default: '' }, // batas akhir (YYYY-MM-DD), opsional
  clearable: { type: Boolean, default: true }
});
const emit = defineEmits(['update:modelValue', 'change']);

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseISO = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};
const todayISO = () => {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
};

const open = ref(false);
const view = ref('days'); // 'days' | 'months'
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());
const isMobile = ref(false);
const panelStyle = ref({});
const triggerRef = ref(null);
const panelRef = ref(null);

const displayText = computed(() => {
  const p = parseISO(props.modelValue);
  return p ? `${p.d} ${MONTHS_SHORT[p.m]} ${p.y}` : '';
});

const isDisabled = (iso) =>
  !!((props.min && iso < props.min) || (props.max && iso > props.max));

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const offset = (first.getDay() + 6) % 7; // pekan dimulai Senin
  const today = todayISO();
  const out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(viewYear.value, viewMonth.value, 1 - offset + i);
    const iso = toISO(d.getFullYear(), d.getMonth(), d.getDate());
    out.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth.value,
      today: iso === today,
      selected: iso === props.modelValue,
      disabled: isDisabled(iso)
    });
  }
  return out;
});

const cellClass = (c) => {
  if (c.selected) return 'bg-[#262624] text-white font-semibold';
  if (c.disabled) return 'text-neutral-300 cursor-not-allowed';
  if (c.today) return 'text-[#DA6B4F] font-semibold ring-1 ring-inset ring-[#DA6B4F]/40 hover:bg-neutral-100';
  return (c.inMonth ? 'text-[#262624]' : 'text-neutral-300') + ' hover:bg-neutral-100';
};

const monthClass = (i) => {
  const sel = parseISO(props.modelValue);
  if (sel && sel.y === viewYear.value && sel.m === i) return 'bg-[#262624] text-white font-semibold';
  const t = parseISO(todayISO());
  if (t.y === viewYear.value && t.m === i) {
    return 'text-[#DA6B4F] font-semibold ring-1 ring-inset ring-[#DA6B4F]/40 hover:bg-neutral-100';
  }
  return 'text-[#262624] hover:bg-neutral-100';
};

const shift = (dir) => {
  if (view.value === 'months') {
    viewYear.value += dir;
    return;
  }
  let m = viewMonth.value + dir;
  let y = viewYear.value;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  viewMonth.value = m;
  viewYear.value = y;
};

const pickMonth = (i) => {
  viewMonth.value = i;
  view.value = 'days';
};

/* ---------- Posisi popover ---------- */
const updatePosition = () => {
  if (!open.value) return;
  isMobile.value = window.innerWidth < 640;
  if (isMobile.value) {
    panelStyle.value = {};
    return;
  }
  const trig = triggerRef.value?.getBoundingClientRect();
  if (!trig) return;
  const w = panelRef.value?.offsetWidth || 304;
  const h = panelRef.value?.offsetHeight || 380;
  const gap = 8;
  const left = Math.min(Math.max(8, trig.left), window.innerWidth - w - 8);
  let top = trig.bottom + gap;
  if (top + h > window.innerHeight - 8 && trig.top - gap - h > 8) top = trig.top - gap - h;
  panelStyle.value = { top: `${top}px`, left: `${left}px` };
};

/* ---------- Buka / tutup ---------- */
const openPicker = () => {
  const p = parseISO(props.modelValue) || parseISO(todayISO());
  viewYear.value = p.y;
  viewMonth.value = p.m;
  view.value = 'days';
  isMobile.value = window.innerWidth < 640;
  panelStyle.value = { top: '0px', left: '0px', visibility: 'hidden' };
  open.value = true;
  nextTick(updatePosition);
};

const closePicker = (refocus = false) => {
  open.value = false;
  if (refocus) nextTick(() => triggerRef.value?.focus());
};

const togglePicker = () => (open.value ? closePicker() : openPicker());

const onPointerDown = (e) => {
  if (!open.value) return;
  if (panelRef.value?.contains(e.target) || triggerRef.value?.contains(e.target)) return;
  closePicker();
};
const onKeyDown = (e) => {
  if (open.value && e.key === 'Escape') closePicker(true);
};

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition, true);
  }
});

// Tinggi panel berbeda antara tampilan hari dan bulan
watch(view, () => nextTick(updatePosition));

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
});

/* ---------- Memilih nilai ---------- */
const commit = (value) => {
  emit('update:modelValue', value);
  emit('change', value);
  closePicker(true);
};

const selectDate = (iso) => {
  if (isDisabled(iso)) return;
  commit(iso);
};

const clearDate = () => commit('');
const todayDisabled = computed(() => isDisabled(todayISO()));
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      @click="togglePicker"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :aria-label="displayText ? `${ariaLabel}: ${displayText}` : ariaLabel"
      class="w-full sm:min-w-[10.5rem] flex items-center justify-between gap-2 text-left text-base sm:text-sm py-2.5 px-3 rounded-xl border hover:border-neutral-300 focus:bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-4 focus:ring-[#DA6B4F]/10 transition-all"
      :class="open
        ? 'bg-white border-[#DA6B4F] ring-4 ring-[#DA6B4F]/10'
        : 'bg-neutral-50/60 border-neutral-200'"
    >
      <span class="truncate" :class="displayText ? 'text-[#262624]' : 'text-neutral-400'">
        {{ displayText || placeholder }}
      </span>
      <Calendar
        class="w-4 h-4 shrink-0 transition-colors"
        :class="open ? 'text-[#DA6B4F]' : 'text-neutral-400'"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :class="isMobile ? 'fixed inset-0 z-[80] flex items-center justify-center p-4' : ''"
      >
        <!-- Latar belakang (khusus HP) -->
        <div
          v-if="isMobile"
          class="dp-fade absolute inset-0 bg-[#262624]/40 backdrop-blur-sm"
          @click="closePicker()"
          @touchmove.prevent
          aria-hidden="true"
        ></div>

        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-label="ariaLabel"
          class="dp-pop z-[81] bg-white rounded-2xl border border-neutral-200/80 shadow-[0_24px_60px_-20px_rgba(38,38,36,0.35)] p-4"
          :class="isMobile ? 'relative w-full max-w-[20rem]' : 'fixed w-[19rem]'"
          :style="isMobile ? null : panelStyle"
        >
          <!-- Kepala: bulan/tahun + navigasi -->
          <div class="flex items-center justify-between mb-3">
            <button
              type="button"
              @click="view = view === 'days' ? 'months' : 'days'"
              class="flex items-center gap-1 -ml-1.5 px-2 py-1.5 rounded-lg text-sm font-bold text-[#262624] hover:bg-neutral-100 transition-colors"
              :aria-label="view === 'days' ? 'Pilih bulan dan tahun' : 'Kembali ke tampilan hari'"
            >
              <span>{{ view === 'days' ? `${MONTHS[viewMonth]} ${viewYear}` : viewYear }}</span>
              <ChevronDown
                class="w-4 h-4 text-neutral-400 transition-transform duration-200"
                :class="view === 'months' ? 'rotate-180' : ''"
              />
            </button>
            <div class="flex items-center gap-0.5">
              <button
                type="button"
                @click="shift(-1)"
                :aria-label="view === 'days' ? 'Bulan sebelumnya' : 'Tahun sebelumnya'"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-[#262624] transition-colors"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <button
                type="button"
                @click="shift(1)"
                :aria-label="view === 'days' ? 'Bulan berikutnya' : 'Tahun berikutnya'"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-[#262624] transition-colors"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Tampilan hari -->
          <div v-if="view === 'days'">
            <div class="grid grid-cols-7 mb-1">
              <span
                v-for="w in WEEKDAYS"
                :key="w"
                class="h-8 flex items-center justify-center text-[11px] font-semibold text-neutral-400"
              >{{ w }}</span>
            </div>
            <div class="grid grid-cols-7 gap-y-0.5">
              <button
                v-for="c in cells"
                :key="c.iso"
                type="button"
                :disabled="c.disabled"
                @click="selectDate(c.iso)"
                :aria-label="c.iso"
                :aria-pressed="c.selected"
                class="mx-auto w-9 h-9 rounded-xl text-sm tabular-nums flex items-center justify-center transition-colors"
                :class="cellClass(c)"
              >{{ c.day }}</button>
            </div>
          </div>

          <!-- Tampilan bulan -->
          <div v-else class="grid grid-cols-3 gap-2 py-1">
            <button
              v-for="(name, i) in MONTHS_SHORT"
              :key="name"
              type="button"
              @click="pickMonth(i)"
              class="py-3 rounded-xl text-sm transition-colors"
              :class="monthClass(i)"
            >{{ name }}</button>
          </div>

          <!-- Kaki -->
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
            <button
              v-if="clearable && modelValue"
              type="button"
              @click="clearDate"
              class="px-2.5 py-1.5 -ml-2.5 rounded-lg text-xs font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-[#262624] transition-colors"
            >Hapus</button>
            <span v-else></span>
            <button
              type="button"
              :disabled="todayDisabled"
              @click="selectDate(todayISO())"
              class="px-2.5 py-1.5 -mr-2.5 rounded-lg text-xs font-semibold text-[#DA6B4F] hover:bg-[#DA6B4F]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Hari ini</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dp-fade {
  animation: dp-fade 0.18s ease-out both;
}

.dp-pop {
  animation: dp-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes dp-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes dp-pop {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .dp-fade,
  .dp-pop {
    animation: none;
  }
}
</style>