<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';

const route = useRoute();
const isLoginPage = computed(() => route.name === 'login');
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#FBFBF9]">
    <Navbar v-if="!isLoginPage" />
    <main
      :class="isLoginPage ? 'flex-1' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'"
    >
      <router-view />
    </main>
  </div>
</template>