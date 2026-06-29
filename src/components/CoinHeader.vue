<template>
  <section class="coin-header" v-if="ticker">
    <div class="asset-title">
      <div class="symbol-badge">{{ ticker.symbol }}</div>
      <div>
        <div class="title-line">
          <h1>{{ ticker.korean_name }}</h1>
          <span v-if="ticker.market_warning === 'CAUTION'" class="warning-badge">유의</span>
        </div>
        <p>{{ ticker.english_name }} · {{ ticker.exchange }}</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="price-block" :class="colorClass">
        <span class="label">현재가</span>
        <strong>{{ formatPrice(ticker.trade_price, ticker.exchange) }}</strong>
        <small>전일대비 {{ formatChange(ticker.signed_change_rate) }}</small>
      </div>
      <div class="metric">
        <span>고가</span>
        <strong>{{ formatPrice(ticker.high_price, ticker.exchange) }}</strong>
      </div>
      <div class="metric">
        <span>저가</span>
        <strong>{{ formatPrice(ticker.low_price, ticker.exchange) }}</strong>
      </div>
      <div class="metric">
        <span>거래대금 24H</span>
        <strong>{{ formatVolume(ticker.acc_trade_price_24h, ticker.exchange) }}</strong>
      </div>
    </div>

    <div class="quick-links">
      <a v-if="exchangeLink" :href="exchangeLink" target="_blank" rel="noopener noreferrer" class="quick-link">
        {{ ticker.exchange === 'BINANCE' ? 'Binance' : 'Upbit' }}에서 보기 ↗
      </a>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  ticker: { type: Object, default: null },
})

const colorClass = computed(() => {
  if (props.ticker?.change_status === 'RISE') return 'text-red'
  if (props.ticker?.change_status === 'FALL') return 'text-blue'
  return 'text-black'
})

const exchangeLink = computed(() => {
  if (props.ticker?.exchange === 'UPBIT') {
    return `https://upbit.com/exchange?code=CRIX.UPBIT.${props.ticker.market}`
  }
  if (props.ticker?.exchange === 'BINANCE') {
    return `https://www.binance.com/en/trade/${props.ticker.market}`
  }
  return null
})

const formatPrice = (value, exchange) => {
  const currency = exchange === 'BINANCE' ? 'USDT' : 'KRW'
  const digits = value < 10 ? 4 : value < 1000 ? 2 : 0
  return `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits })} ${currency}`
}

const formatChange = (value) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value || 0).toFixed(2)}%`
}

const formatVolume = (value, exchange) => {
  const unit = exchange === 'BINANCE' ? 'M USDT' : '백만 KRW'
  return `${Math.round(value / 1000000).toLocaleString('ko-KR')} ${unit}`
}
</script>
