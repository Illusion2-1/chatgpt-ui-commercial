<template>
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <v-toolbar dark color="primary" class="px-4">
        <v-toolbar-title>{{ $t('announcements') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <template v-if="announcements.length > 1">
          <v-btn 
            icon="chevron_left" 
            variant="outlined" 
            class="mx-1" 
            color="white" 
            size="small"
            @click="prevAnnouncement"
          ></v-btn>
          <span class="mx-2 text-white">{{ currentIndex + 1 }}/{{ announcements.length }}</span>
          <v-btn 
            icon="chevron_right" 
            variant="outlined" 
            class="mx-1" 
            color="white" 
            size="small"
            @click="nextAnnouncement"
          ></v-btn>
        </template>
      </v-toolbar>

      <v-card-title class="pt-6 px-4">
        <v-icon icon="campaign" class="mr-2" color="primary"></v-icon>
        {{ currentAnnouncement?.title }}
      </v-card-title>

      <v-card-text class="px-4">
        <div class="announcement-content py-4">
          {{ currentAnnouncement?.content }}
        </div>
        <v-divider class="my-2"></v-divider>
        <div class="d-flex align-center text-caption text-grey">
          <v-icon icon="schedule" size="small" class="mr-1"></v-icon>
          {{ new Date(currentAnnouncement?.created_at).toLocaleDateString() }}
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer></v-spacer>
        <v-btn v-if="!hideReadButton" 
          color="primary" 
          variant="text" 
          prepend-icon="mark_email_read"
          @click="markAsRead"
        >
          {{ $t('doNotShowAgain') }}
        </v-btn>
        <v-btn 
          color="primary" 
          variant="text"
          prepend-icon="close"
          @click="closeDialog"
        >
          {{ $t('close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  hideReadButton: {
    type: Boolean,
    default: false
  }
})

const dialog = ref(false)
const announcements = ref([])
const currentIndex = ref(0)
const currentAnnouncement = computed(() => announcements.value[currentIndex.value])

const checkAndShowAnnouncements = async () => {
  const { data } = await useFetch('/api/announcements/list/')
  if (data.value?.announcements?.length > 0) {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    const unreadAnnouncements = data.value.announcements.filter(a => !readIds.includes(a.id))
    
    if (unreadAnnouncements.length > 0) {
      announcements.value = unreadAnnouncements
      dialog.value = true
      return true
    }
  }
  return false
}

const markAsRead = () => {
  const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
  readIds.push(currentAnnouncement.value.id)
  localStorage.setItem('readAnnouncements', JSON.stringify(readIds))
  announcements.value = announcements.value.filter(a => a.id !== currentAnnouncement.value.id)
  if (announcements.value.length === 0) {
    dialog.value = false
  } else {
    currentIndex.value = 0
  }
}

const nextAnnouncement = () => {
  currentIndex.value = (currentIndex.value + 1) % announcements.value.length
}

const prevAnnouncement = () => {
  currentIndex.value = (currentIndex.value - 1 + announcements.value.length) % announcements.value.length
}

const closeDialog = () => {
  dialog.value = false
}

defineExpose({
  checkAndShowAnnouncements,
  loadAnnouncements: async () => {
    const { data } = await useFetch('/api/announcements/list/')
    if (data.value?.announcements) {
      announcements.value = data.value.announcements
      dialog.value = true
    }
  }
})
</script>

<style scoped>
.announcement-content {
  font-size: 1rem;
  line-height: 1.6;
  white-space: pre-line;
  color: var(--v-theme-on-surface);
}

.v-toolbar-title {
  font-size: 1.25rem;
}
</style> 