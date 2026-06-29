<template>
  <button class="coin-item" :class="[{ selected }, flashClass]" @click="$emit('select')">
    <span class="col-name">
      <span class="fav-icon" @click.stop="$emit('toggle-fav', coin.market)">{{ isFavorite ? '★' : '☆' }}</span>
      <span class="name-wrap">
        <strong>{{ coin.korean_name }}</strong>
        <small>{{ coin.market }} · {{ coin.binance_symbol }}</small>
      </span>
    </span>
    <span class="price" :class="colorClass">{{ formatPrice(coin.trade_price) }}</span>
    <span :class="colorClass">{{ formatChange(coin.signed_change_rate) }}</span>
    <span>{{ formatVolume(coin.acc_trade_price_24h) }}</span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  coin: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
})

defineEmits(['select', 'toggle-fav'])

const flashClass = ref('')

watch(() => props.coin.trade_price, (newPrice, oldPrice) => {
  if (oldPrice === undefined || newPrice === oldPrice) return
  flashClass.value = newPrice > oldPrice ? 'flash-up' : 'flash-down'
  window.setTimeout(() => {
    flashClass.value = ''
  }, 450)
})

const colorClass = computed(() => {
  if (props.coin.change_status === 'RISE') return 'text-red'
  if (props.coin.change_status === 'FALL') return 'text-blue'
  return 'text-black'
})

const formatPrice = (value) => {
  const digits = value < 10 ? 4 : value < 1000 ? 2 : 0
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

const formatChange = (value) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value || 0).toFixed(2)}%`
}

const formatVolume = (value) => Math.round(value / 1000000).toLocaleString('ko-KR')
</script>
