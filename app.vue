<template>
  <v-app>
    <Announcements ref="announcementsRef" :auto-show="true" />
    <NuxtLayout>
      <NuxtLoadingIndicator />
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>

<script setup>
const announcementsRef = ref(null)

onMounted(async () => {
  await nextTick()
  announcementsRef.value?.checkAndShowAnnouncements()
})
</script>