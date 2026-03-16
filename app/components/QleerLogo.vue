<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <NuxtLink
    to="/dashboard"
  >
    <UColorModeImage
      v-if="!collapsed"
      light="/logo_light.svg"
      dark="/logo_dark.svg"
      height="72"
      width="158"
      alt="App Qleer Logo"
    />
    <NuxtImg
      v-else
      src="/favicon.png"
      height="72"
      width="72"
      alt="App Qleer Logo"
    />
  </NuxtLink>
</template>
