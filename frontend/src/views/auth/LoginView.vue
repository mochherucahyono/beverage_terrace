<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Lock, User, Eye, EyeOff } from 'lucide-vue-next';
import api from '../../services/api';
import { createRipple } from '../../utils/ripple';

onMounted(() => {
  document.title = 'Masuk - Teras Minuman';
});

// Inisialisasi router untuk navigasi
const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

// Fungsi untuk menangani proses login
const handleLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    const res = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    });

    if (res.data.success && res.data.token) {
      localStorage.setItem('terasminuman_token', res.data.token);
      router.push('/cashier');
    }
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Gagal terhubung ke server. Periksa koneksi Anda.';
  } finally {
    isLoading.value = false;
  }
};

// Fungsi untuk menangani klik tombol dengan efek ripple
const handleButtonClick = (e) => {
  createRipple(e);
  setTimeout(() => {
    handleLogin();
  }, 200); // Jeda singkat agar animasi ripple sempat terlihat sebelum aksi berjalan
};

</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FBFBF9] px-4">
    <div class="max-w-sm w-full bg-white rounded-2xl border border-neutral-200/80 p-7 shadow-sm space-y-6">
      <!-- Identitas Brand -->
      <div class="text-center space-y-1.5">
        <div class="w-11 h-11 rounded-xl bg-[#262624] text-white flex items-center justify-center font-bold text-base mx-auto shadow-sm">
          TM
        </div>
        <h1 class="text-base font-bold text-[#262624] pt-1">Teras Minuman</h1>
        <p class="text-xs text-neutral-400">Masuk sebagai pemilik untuk mengelola kasir</p>
      </div>

      <!-- Form Login -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div
          v-if="errorMessage"
          role="alert"
          class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium"
        >
          {{ errorMessage }}
        </div>

        <div class="space-y-1.5">
          <label for="username" class="block text-xs font-semibold text-neutral-600">
            Nama Pengguna
          </label>
          <div class="relative">
            <User class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="username"
              v-model="username"
              type="text"
              required
              autocomplete="username"
              placeholder="Masukkan nama pengguna"
              class="w-full text-xs py-3 pl-10 pr-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="password" class="block text-xs font-semibold text-neutral-600">
            Kata Sandi
          </label>
          <div class="relative">
            <Lock class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Masukkan kata sandi"
              class="w-full text-xs py-3 pl-10 pr-10 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-2 focus:ring-[#DA6B4F]/15 transition-all"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          @click="handleButtonClick"
          :disabled="isLoading"
          class="w-full py-3 rounded-xl bg-[#262624] text-white font-semibold text-xs shadow-sm hover:bg-neutral-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Memverifikasi...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>