<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next';
import { createRipple } from '../utils/ripple';
// Import icon yang dibutuhkan dari lucide-vue-next
import { 
  Calculator, 
  Package, 
  Tags, 
  BarChart3, 
  History 
} from 'lucide-vue-next';
import ConfirmLogoutModal from './ConfirmLogoutModal.vue';

const route = useRoute();
const router = useRouter();

const isLogoutModalOpen = ref(false);

const handleLogout = () => {
  localStorage.removeItem('terasminuman_token');
  router.push('/login');
};

const handleNavigation = (e, path) => {
  e.preventDefault();
  createRipple(e);
  setTimeout(() => {
    router.push(path);
  }, 200);
};

const handleButtonClick = (e) => {
  createRipple(e);
  setTimeout(() => {
    isLogoutModalOpen.value = true;
  }, 200); // Jeda singkat agar animasi ripple sempat terlihat sebelum aksi berjalan
};

const links = [
  {
    to: '/cashier',
    label: 'Kasir',
    short: 'Kasir',
    icon: Calculator
  },
  {
    to: '/product',
    label: 'Produk & Stok',
    short: 'Produk & Stok',
    icon: Package
  },
  {
    to: '/category',
    label: 'Kategori',
    short: 'Kategori',
    icon: Tags
  },
  {
    to: '/report',
    label: 'Laporan',
    short: 'Laporan',
    icon: BarChart3
  },
  {
    to: '/history',
    label: 'Riwayat',
    short: 'Riwayat',
    icon: History
  }
];

const isActive = (to) => route.path === to;

/* ---------- Sidebar buka/tutup (desktop) ---------- */
const STORAGE_KEY = 'terasminuman_sidebar_collapsed';
const SIDEBAR_WIDTH_OPEN = 256;  // w-64
const SIDEBAR_WIDTH_CLOSED = 72; // w-[72px]

const isCollapsed = ref(false);
try {
  isCollapsed.value = localStorage.getItem(STORAGE_KEY) === '1';
} catch (_) { /* abaikan jika localStorage tidak tersedia */ }

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  try {
    localStorage.setItem(STORAGE_KEY, isCollapsed.value ? '1' : '0');
  } catch (_) { /* abaikan */ }
};

const handleToggleClick = (e) => {
  createRipple(e);
  toggleSidebar();
};

// Konten halaman digeser dengan padding-left pada <body> (hanya di desktop),
// sehingga layout induk (App.vue) tidak perlu diubah.
const isDesktop = ref(false);
const sidebarWidth = computed(() => (isCollapsed.value ? SIDEBAR_WIDTH_CLOSED : SIDEBAR_WIDTH_OPEN));

const applyBodyOffset = () => {
  document.body.style.paddingLeft = isDesktop.value ? `${sidebarWidth.value}px` : '';
};

let desktopQuery;
const onDesktopChange = (e) => {
  isDesktop.value = e.matches;
  applyBodyOffset();
};

watch(isCollapsed, applyBodyOffset);

onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 1024px)');
  isDesktop.value = desktopQuery.matches;
  applyBodyOffset();
  // Aktifkan transisi setelah posisi awal terpasang agar tidak beranimasi saat halaman dimuat
  requestAnimationFrame(() => {
    document.body.style.transition = 'padding-left 200ms ease-in-out';
  });
  desktopQuery.addEventListener?.('change', onDesktopChange);
});

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener?.('change', onDesktopChange);
  document.body.style.paddingLeft = '';
  document.body.style.transition = '';
});
</script>

<template>
  <!-- Header atas (HP & tablet): logo saja -->
  <header class="lg:hidden bg-white border-b border-brand-border sticky top-0 z-30">
    <div class="px-4 sm:px-6 h-14 flex items-center justify-between">
      <!-- Logo Brand -->
      <router-link to="/cashier" class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-[#262624] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          TM
        </div>
        <div>
          <h1 class="font-bold text-base text-[#262624] tracking-tight leading-none">Teras Minuman</h1>
          <span class="text-[11px] text-neutral-400 font-medium"></span>
        </div>
      </router-link>
    </div>
  </header>

  <!-- Sidebar desktop (bisa dibuka/tutup) -->
  <aside
    class="hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col bg-white border-r border-brand-border transition-[width] duration-200 ease-in-out"
    :class="isCollapsed ? 'w-[72px]' : 'w-64'"
  >
    <!-- Tombol buka/tutup di tepi sidebar -->
    <button
      type="button"
      @click="(e) => handleToggleClick(e)"
      class="absolute -right-3 top-[22px] z-10 w-6 h-6 rounded-full bg-white border border-brand-border shadow-sm text-neutral-500 hover:text-[#262624] hover:bg-neutral-50 flex items-center justify-center transition-colors"
      :title="isCollapsed ? 'Buka sidebar' : 'Tutup sidebar'"
      :aria-label="isCollapsed ? 'Buka sidebar' : 'Tutup sidebar'"
      :aria-expanded="!isCollapsed"
    >
      <component :is="isCollapsed ? PanelLeftOpen : PanelLeftClose" class="w-3.5 h-3.5" />
    </button>

    <!-- Logo Brand -->
    <router-link
      to="/cashier"
      class="h-16 shrink-0 flex items-center border-b border-brand-border overflow-hidden"
      :class="isCollapsed ? 'justify-center' : 'px-5 space-x-3'"
    >
      <div class="w-9 h-9 shrink-0 rounded-xl bg-[#262624] text-white flex items-center justify-center font-bold text-lg shadow-sm">
        TM
      </div>
      <div v-if="!isCollapsed" class="whitespace-nowrap">
        <h1 class="font-bold text-base text-[#262624] tracking-tight leading-none">Teras Minuman</h1>
        <span class="text-[11px] text-neutral-400 font-medium"></span>
      </div>
    </router-link>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        @click="(e) => handleNavigation(e, link.to)"
        :title="isCollapsed ? link.label : undefined"
        class="relative overflow-hidden py-2.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center whitespace-nowrap"
        :class="[
          isCollapsed ? 'justify-center px-0' : 'px-3.5 space-x-3',
          isActive(link.to)
            ? 'bg-neutral-100 text-[#262624]'
            : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
        ]"
      >
        <!-- Render komponen icon Lucide secara dinamis -->
        <component :is="link.icon" class="w-[18px] h-[18px] shrink-0" />
        <span v-if="!isCollapsed">{{ link.label }}</span>
      </router-link>
    </nav>

    <!-- Tombol Keluar -->
    <div class="shrink-0 p-3 border-t border-brand-border">
      <button
        type="button"
        @click="(e) => handleButtonClick(e)"
        class="relative overflow-hidden w-full py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all flex items-center whitespace-nowrap"
        :class="isCollapsed ? 'justify-center px-0' : 'px-3.5 space-x-3'"
        title="Keluar dari sesi"
      >
        <LogOut class="w-[18px] h-[18px] shrink-0" />
        <span v-if="!isCollapsed">Keluar</span>
      </button>
    </div>
  </aside>

  <!-- Bar tab bawah (HP & tablet) -->
  <nav class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-brand-border pb-[env(safe-area-inset-bottom)]">
    <!-- Diubah ke grid-cols-6 agar muat 5 menu nav + 1 tombol Keluar -->
    <div class="grid grid-cols-6">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
        :class="isActive(link.to) ? 'text-[#262624]' : 'text-neutral-400'"
      >
        <span
          class="px-3 py-1 rounded-full transition-colors"
          :class="isActive(link.to) ? 'bg-[#262624]/10' : ''"
        >
          <!-- Render komponen icon Lucide secara dinamis -->
          <component :is="link.icon" class="w-5 h-5" />
        </span>
        <span class="truncate max-w-[56px]">{{ link.short }}</span>
      </router-link>

      <!-- Tombol Keluar Sejajar dengan Nav Link (Versi Mobile) -->
      <button
        type="button"
        @click="isLogoutModalOpen = true"
        class="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-red-600 hover:text-red-700 transition-colors"
        title="Keluar dari sesi"
      >
        <span class="px-3 py-1 rounded-full bg-red-50 transition-colors">
          <LogOut class="w-5 h-5 text-red-600" />
        </span>
        <span>Keluar</span>
      </button>
    </div>
  </nav>
  <ConfirmLogoutModal
    :isOpen="isLogoutModalOpen"
    @confirm="handleLogout"
    @cancel="isLogoutModalOpen = false"
  />
</template>