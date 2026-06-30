<template>
  <button class="coin-item" :class="[{ selected }, flashClass]" @click="$emit('select')">
    <span class="col-name">
      <span class="fav-icon" @click.stop="$emit('toggle-fav', coin.market)">{{ isFavorite ? '★' : '☆' }}</span>
      <span class="name-wrap">
        <strong>{{ coin.korean_name }}</strong>
        <small>{{ coin.market }}</small>
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
let flashTimer = null

const triggerFlash = (direction) => {
  const next = direction >= 0 ? 'flash-up' : 'flash-down'
  // 같은 방향 연속 체결도 애니메이션이 다시 재생되도록 한 번 비웠다가 다음 프레임에 적용.
  flashClass.value = ''
  window.requestAnimationFrame(() => {
    flashClass.value = next
  })
  if (flashTimer) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    flashClass.value = ''
  }, 900)
}

// 가격이 바뀐 체결뿐 아니라 같은 가격이라도 거래대금이 늘면(=체결 발생) 행을 깜빡인다.
// 방향: 가격이 바뀌면 그 부호로, 같은 가격이면 전일대비(signed_change_price) 부호로 판정.
watch(
  () => [props.coin.trade_price, props.coin.acc_trade_price_24h],
  ([newPrice, newVol], [oldPrice, oldVol]) => {
    if (oldPrice === undefined || (newPrice === oldPrice && newVol === oldVol)) return
    const direction = newPrice !== oldPrice ? newPrice - oldPrice : (props.coin.signed_change_price ?? 0)
    triggerFlash(direction)
  }
)

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
