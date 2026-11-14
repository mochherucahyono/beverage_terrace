<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogOut } from 'lucide-vue-next';
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
</script>

<template>
  <!-- Header atas: desktop = logo + menu, mobile = logo saja -->
  <header class="bg-white border-b border-brand-border sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between">
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

      <!-- Menu desktop -->
      <nav class="hidden lg:flex items-center space-x-2">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          @click="(e) => handleNavigation(e, link.to)"
          class="px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center space-x-2"
          :class="isActive(link.to)
            ? 'bg-neutral-100 text-[#262624]'
            : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'"
        >
          <!-- Render komponen icon Lucide secara dinamis -->
          <component :is="link.icon" class="w-4 h-4" />
          <span>{{ link.label }}</span>
        </router-link>
        <button
          type="button"
          @click="(e) => handleButtonClick(e)"
          class="px-3.5 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all flex items-center space-x-1.5"
          title="Keluar dari sesi"
        >
          <LogOut class="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </nav>
    </div>
  </header>

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