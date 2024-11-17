<script setup>
import { isMobile } from 'is-mobile'
import CryptoJS from 'crypto-js'
const { $i18n } = useNuxtApp()

const props = defineProps({
  sendMessage: {
    type: Function,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const message = ref('')
const rows = ref(1)
const autoGrow = ref(true)

const hint = computed(() => {
  return isMobile() ? '' : $i18n.t('pressEnterToSendYourMessageOrShiftEnterToAddANewLine')
})

watchEffect(() => {
  const lines = message.value.split(/\r\n|\r|\n/).length
  if (lines > 8) {
    rows.value = 8
    autoGrow.value = false
  } else {
    rows.value = 1
    autoGrow.value = true
  }
})

const imageFile = ref(null)
const imageBase64 = ref('')
const { currentModel } = useCurrentModel()

const showImageUpload = computed(() => {
  return currentModel.value?.image_support
})

const imageStorage = useState('imageStorage', () => ({}))

const calculateImageHash = (base64String) => {
  return CryptoJS.MD5(base64String).toString()
}

const handleImageSelect = async (event) => {
  const file = event.target.files[0]
  if (file) {
    imageFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imageBase64.value = e.target.result
      const imageHash = calculateImageHash(e.target.result)
      imageStorage.value[imageHash] = e.target.result
      localStorage.setItem('imageStorage', JSON.stringify(imageStorage.value))
    }
    reader.readAsDataURL(file)
  }
}

const clearImage = () => {
  imageFile.value = null
  imageBase64.value = ''
}

const send = () => {
  let msg = message.value
  if (msg[msg.length - 1] === "\n") {
    msg = msg.slice(0, -1)
  }
  if (msg.length > 0) {
    try {
      const messageData = {
        content: msg,
        tool: 'chat',
        message_type: 0
      }
      
      if (imageBase64.value) {
        const imageHash = calculateImageHash(imageBase64.value)
        messageData.image = imageBase64.value
        messageData.image_hash = imageHash
        messageData.message_type = 120
      }
      
      props.sendMessage(messageData)
      message.value = ""
      clearImage()
    } catch (error) {
      if (error.message === 'Rate limit exceeded') {
        showSnackbar($t('rateLimitExceeded'))
      } else {
        showSnackbar(error.message)
      }
    }
  }
}

const textArea = ref()

const usePrompt = (prompt) => {
  message.value = prompt
  textArea.value.focus()
}

const clickSendBtn = () => {
  send()
}

const enterOnly = (event) => {
  event.preventDefault();
  if (!isMobile()) {
    send()
  }
}

defineExpose({
  usePrompt
})

const toolSelector = ref({
  list: [
    { title: "Chat", icon: "add", name: "chat", type: 0 },
    { title: "Web Search", icon: "travel_explore", name: "web_search", type: 100 },
    { title: "ArXiv", icon: "local_library", name: "arxiv", type: 110 },
  ],
  selected: 0,
})
function getToolIcon() {
  let v = toolSelector.value
  let icon = v.list[v.selected].icon
  return icon
}
function getLabel() {
  let v = toolSelector.value
  let name = v.list[v.selected].name
  return "messageLabel." + name
}
function selectTool(idx) {
  let v = toolSelector.value
  v.selected = idx
  let name = v.list[idx].name
}
const docDialogCtl = ref({
  dialog: false,
})

onMounted(() => {
  const storedImages = localStorage.getItem('imageStorage')
  if (storedImages) {
    imageStorage.value = JSON.parse(storedImages)
  }
})
</script>

<template>
  <div class="flex-grow-1 d-flex flex-column">
    <div class="d-flex align-center justify-space-between">
      <v-textarea
        ref="textArea"
        v-model="message"
        :label="$t(getLabel())"
        :placeholder="hint"
        :rows="rows"
        max-rows="8"
        :auto-grow="autoGrow"
        :disabled="disabled"
        :loading="loading"
        :hide-details="true"
        clearable
        variant="outlined"
        class="userinputmsg"
        @keypress.enter.exact="enterOnly"
      ></v-textarea>
      <v-btn
        :disabled="loading"
        icon="send"
        title="Send"
        class="ml-3"
        @click="clickSendBtn"
      ></v-btn>
    </div>
    
    <div v-if="showImageUpload" class="d-flex align-center mt-2">
      <input
        type="file"
        accept="image/*"
        ref="imageInput"
        style="display: none"
        @change="handleImageSelect"
      >
      <v-btn
        v-if="!imageBase64"
        size="small"
        prepend-icon="image"
        @click="$refs.imageInput.click()"
      >
        {{ $t('selectImage') }}
      </v-btn>
      <div v-else class="d-flex align-center">
        <v-chip
          closable
          @click:close="clearImage"
        >
          {{ imageFile.name }}
        </v-chip>
      </div>
    </div>
  </div>
</template>
