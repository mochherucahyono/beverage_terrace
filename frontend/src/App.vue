<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#FBFBF9]">
    <Navbar />
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-6">
      <router-view />
    </main>
  </div>
</template>