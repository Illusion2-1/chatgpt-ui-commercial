<template>
  <v-card>
    <v-toolbar dark color="primary">
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <v-toolbar-title>{{ $t('subscriptionManagement') }}</v-toolbar-title>
      <v-spacer></v-spacer>
    </v-toolbar>

    <v-tabs v-model="activeTab" centered>
      <v-tab value="subscriptions">{{ $t('subscriptions') }}</v-tab>
      <v-tab value="balance">{{ $t('balanceManagement') }}</v-tab>
    </v-tabs>

    <v-card-text>
      <v-container>
        <v-row>
          <v-col cols="12" sm="8" offset-sm="2">
            <v-window v-model="activeTab">
              <v-window-item value="subscriptions">
                <!-- Current subscription status -->
                <v-alert
                  v-if="currentSubscription"
                  type="info"
                  class="mb-4"
                >
                  {{ $t('currentSubscription') }}: {{ currentSubscription.title }}
                  <br>
                  {{ $t('expiresAt') }}: {{ formatSubscriptionExpiry }}
                </v-alert>
                <v-alert
                  v-else
                  type="info"
                  class="mb-4"
                >
                  {{ $t('noActiveSubscription') }}
                </v-alert>

                <!-- Subscription plans -->
                <v-divider class="my-4"></v-divider>
                <v-alert
                  v-if="subscriptionPlans.length"
                  type="info"
                  class="mb-4"
                >
                  {{ $t('availableSubscriptionPlans') }}
                </v-alert>
                <v-row v-if="subscriptionPlans.length">
                  <v-col v-for="plan in subscriptionPlans" :key="plan.id" cols="12" md="6">
                    <v-card elevation="2" class="mb-6">
                      <v-card-title>{{ plan.title }}</v-card-title>
                      <v-card-text>
                        <p>{{ $t('availableModels') }}: {{ plan.available_models.join(', ') }}</p>
                        <p>{{ $t('deviceLimit') }}: {{ plan.device_limit }}</p>
                        <p>{{ $t('rateLimit') }}: {{ plan.rate_limit }}</p>
                        <p>{{ $t('duration') }}: {{ formatDuration(plan.duration) }}</p>
                        <p class="text-h6">{{ $t('price') }}: ${{ plan.price }}</p>
                      </v-card-text>
                      <v-card-actions>
                        <v-btn 
                          color="primary" 
                          block 
                          @click="purchaseSubscription(plan)"
                          :loading="purchasing === plan.id"
                          :disabled="balance < plan.price"
                        >
                          {{ $t('purchase') }}
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
                
                <v-alert
                  v-else
                  type="info"
                  class="mb-4"
                >
                  {{ $t('noSubscriptionPlansAvailable') }}
                </v-alert>
              </v-window-item>

              <v-window-item value="balance">
                <!-- Balance card remains the same -->
                <v-card elevation="2" class="mb-6">
                  <v-card-text>
                    <div class="text-h6 mb-2">{{ $t('currentBalance') }}</div>
                    <div class="text-h4">${{ balance }}</div>
                  </v-card-text>
                </v-card>

                <!-- Redeem code card remains the same -->
                <v-card elevation="2" class="mb-6">
                  <v-card-text>
                    <v-text-field
                      v-model="redeemCode"
                      :label="$t('redeemCode')"
                      outlined
                      dense
                      :error-messages="redeemError"
                    ></v-text-field>
                    <v-btn
                      color="primary"
                      block
                      @click="redeemBalance"
                      :loading="redeeming"
                    >
                      {{ $t('redeem') }}
                    </v-btn>
                  </v-card-text>
                </v-card>

                <!-- Redeem history -->
                <v-card elevation="2">
                  <v-card-title>{{ $t('redeemHistory') }}</v-card-title>
                  <v-card-text>
                    <v-list v-if="redeemHistory.length">
                      <v-list-item
                        v-for="item in redeemHistory"
                        :key="item.id"
                      >
                        <v-list-item-content>
                          <v-list-item-title>{{ item.code }}</v-list-item-title>
                          <v-list-item-subtitle>
                            {{ $t('amount') }}: ${{ item.amount }} | {{ formatDate(item.used_at) }}
                          </v-list-item-subtitle>
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                    <v-alert
                      v-else
                      type="info"
                      text
                    >
                      {{ $t('noRedeemHistory') }}
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-window-item>
            </v-window>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>

    <!-- 确认操作弹窗 -->
    <v-dialog v-model="confirmDialog.show" max-width="400">
      <v-card>
        <v-card-title>{{ confirmDialog.title }}</v-card-title>
        <v-card-text>{{ confirmDialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="confirmDialog.show = false">
            {{ $t('cancel') }}
          </v-btn>
          <v-btn color="primary" text @click="confirmDialog.onConfirm">
            {{ $t('confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 操作结果提示 -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar.show = false">
          {{ $t('close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { format } from 'date-fns'
import { useNuxtApp } from '#app' // 根据项目配置引入

const { $i18n } = useNuxtApp() // 获取 $i18n

const activeTab = ref('subscriptions')
const balance = ref(0)
const redeemCode = ref('')
const redeemError = ref('')
const redeeming = ref(false)
const purchasing = ref(null)
const redeemHistory = ref([])
const subscriptionPlans = ref([])
const currentSubscription = ref(null)
const subscriptionExpiry = ref(null)

const API_BASE_URL = '/api'

const formatDate = (date) => {
  if (!date) return $i18n.t('noExpiryDate')
  try {
    return format(new Date(date), 'yyyy-MM-dd HH:mm')
  } catch (error) {
    console.error('Invalid date:', date, error)
    return $i18n.t('invalidDate')
  }
}

const formatDuration = (duration) => {
  const matches = duration.match(/P(\d+)D/)
  if (matches) {
    return `${matches[1]} ${$i18n.t('days')}`
  }
  return duration
}

const formatSubscriptionExpiry = computed(() => {
  if (!subscriptionExpiry.value) {
    return $i18n.t('noExpiryDate')
  }
  return formatDate(subscriptionExpiry.value)
})

const loadUserProfile = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/user-profile/`)
    balance.value = data.balance
    redeemHistory.value = data.redeem_codes
    currentSubscription.value = data.current_subscription
    subscriptionExpiry.value = data.subscription_expiry
    console.log('Subscription expiry:', data.subscription_expiry)
  } catch (error) {
    console.error('Failed to load user profile:', error)
  }
}

const loadSubscriptions = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/subscriptions/`)
    subscriptionPlans.value = data
  } catch (error) {
    console.error('Failed to load subscriptions:', error)
  }
}

const redeemBalance = async () => {
  if (!redeemCode.value) return
  
  showConfirmDialog(
    $i18n.t('confirmRedeem'),
    $i18n.t('confirmRedeemMessage', { code: redeemCode.value }),
    async () => {
      redeeming.value = true
      redeemError.value = ''
      
      try {
        const { data } = await axios.post(`${API_BASE_URL}/redeem-codes/redeem/`, {
          code: redeemCode.value
        })
        balance.value = data.new_balance
        redeemCode.value = ''
        await loadUserProfile()
        showSnackbar($i18n.t('redeemSuccess'))
      } catch (error) {
        redeemError.value = error.response?.data?.error || $i18n.t('redeemError')
        showSnackbar($i18n.t('redeemError'), 'error')
      } finally {
        redeeming.value = false
      }
    }
  )
}

const purchaseSubscription = async (plan) => {
  showConfirmDialog(
    $i18n.t('confirmPurchase'),
    $i18n.t('confirmPurchaseMessage', { plan: plan.title, price: plan.price }),
    async () => {
      purchasing.value = plan.id
      
      try {
        const { data } = await axios.post(`${API_BASE_URL}/subscriptions/${plan.id}/purchase/`)
        balance.value = data.new_balance
        currentSubscription.value = data.subscription
        await loadUserProfile()
        showSnackbar($i18n.t('purchaseSuccess'))
      } catch (error) {
        console.error('Failed to purchase subscription:', error)
        showSnackbar($i18n.t('purchaseError'), 'error')
      } finally {
        purchasing.value = null
      }
    }
  )
}

// 新增的响应式变量
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: () => {}
})

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const showConfirmDialog = (title, message, onConfirm) => {
  confirmDialog.value = {
    show: true,
    title,
    message,
    onConfirm: () => {
      onConfirm()
      confirmDialog.value.show = false
    }
  }
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

onMounted(() => {
  loadUserProfile()
  loadSubscriptions()
})
</script>


