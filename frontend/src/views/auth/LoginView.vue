<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-vue-next';
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
  if (isLoading.value) return; // cegah permintaan ganda
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

// Efek ripple pada tombol; proses login dijalankan oleh submit form
const handleButtonClick = (e) => {
  createRipple(e);
};

</script>

<template>
  <div class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#FBFBF9] px-4 py-10">
    <!-- Latar kotak-kotak dengan pudar ke tepi -->
    <div class="login-grid absolute inset-0 pointer-events-none" aria-hidden="true"></div>

    <!-- Cahaya lembut aksen terakota -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] w-[420px] h-[420px] rounded-full bg-[#DA6B4F]/15 blur-3xl pointer-events-none" aria-hidden="true"></div>

    <div class="login-card relative z-10 w-full max-w-[400px]">
      <div class="bg-white/90 backdrop-blur-sm rounded-3xl border border-neutral-200/80 p-8 shadow-[0_24px_60px_-24px_rgba(38,38,36,0.28)] space-y-7">
        <!-- Identitas Brand -->
        <div class="text-center space-y-2">
          <div class="relative w-14 h-14 mx-auto">
            <div class="w-14 h-14 rounded-2xl bg-[#262624] text-white flex items-center justify-center font-bold text-lg shadow-md">
              TM
            </div>
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#DA6B4F] border-[3px] border-white"></span>
          </div>
          <h1 class="text-xl font-bold text-[#262624] tracking-tight pt-2">Teras Minuman</h1>
          <p class="text-xs text-neutral-400">Masuk sebagai pemilik untuk mengelola kasir</p>
        </div>

        <!-- Form Login -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div
            v-if="errorMessage"
            role="alert"
            class="login-shake flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
          >
            <AlertCircle class="w-4 h-4 shrink-0 mt-px" />
            <span>{{ errorMessage }}</span>
          </div>

          <div class="space-y-1.5">
            <label for="username" class="block text-xs font-semibold text-neutral-600">
              Nama Pengguna
            </label>
            <div class="relative group">
              <User class="w-4 h-4 text-neutral-400 group-focus-within:text-[#DA6B4F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                id="username"
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="Masukkan nama pengguna"
                class="w-full text-sm py-3.5 pl-11 pr-4 rounded-xl border border-neutral-200 bg-neutral-50/60 placeholder:text-neutral-400 hover:border-neutral-300 focus:bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-4 focus:ring-[#DA6B4F]/10 transition-all"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="password" class="block text-xs font-semibold text-neutral-600">
              Kata Sandi
            </label>
            <div class="relative group">
              <Lock class="w-4 h-4 text-neutral-400 group-focus-within:text-[#DA6B4F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Masukkan kata sandi"
                class="w-full text-sm py-3.5 pl-11 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/60 placeholder:text-neutral-400 hover:border-neutral-300 focus:bg-white focus:outline-none focus:border-[#DA6B4F] focus:ring-4 focus:ring-[#DA6B4F]/10 transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-700 transition-colors"
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
            class="relative overflow-hidden w-full mt-2 py-3.5 rounded-xl bg-[#262624] text-white font-semibold text-sm shadow-sm hover:bg-neutral-800 hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span
              v-if="isLoading"
              class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden="true"
            ></span>
            <span>{{ isLoading ? 'Memverifikasi...' : 'Masuk' }}</span>
            <ArrowRight v-if="!isLoading" class="w-4 h-4" />
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-[11px] text-neutral-400">
        &copy; {{ new Date().getFullYear() }} Teras Minuman
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Kotak-kotak halus, memudar ke arah tepi layar */
.login-grid {
  background-image:
    linear-gradient(to right, rgba(38, 38, 36, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(38, 38, 36, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
  mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
}

.login-card {
  animation: login-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.login-shake {
  animation: login-shake 0.4s ease-in-out;
}

@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes login-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@media (prefers-reduced-motion: reduce) {
  .login-card,
  .login-shake {
    animation: none;
  }
}
</style>