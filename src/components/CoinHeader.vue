<template>
  <section class="coin-header" v-if="ticker">
    <div class="asset-title">
      <div class="symbol-badge">{{ ticker.symbol }}</div>
      <div>
        <div class="title-line">
          <h1>{{ displayName }}</h1>
          <span v-if="ticker.market_warning === 'CAUTION'" class="warning-badge">유의</span>
          <span class="live-pill" :class="{ on: live }">{{ live ? '실시간' : '연결 끊김' }}</span>
        </div>
        <p>{{ subTitle }}</p>
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

    <div class="meta-strip">
      <div>
        <span>변화액</span>
        <strong :class="colorClass">{{ formatSignedPrice(ticker.signed_change_price, ticker.exchange) }}</strong>
      </div>
      <div>
        <span>거래량 24H</span>
        <strong>{{ formatCoinVolume(ticker.acc_trade_volume_24h) }}</strong>
      </div>
      <div>
        <span>52주 최고</span>
        <strong>{{ format52(ticker.high_price_52w, ticker.exchange) }}</strong>
      </div>
      <div>
        <span>52주 최저</span>
        <strong>{{ format52(ticker.low_price_52w, ticker.exchange) }}</strong>
      </div>
      <div>
        <span>갱신</span>
        <strong>{{ formatTime(ticker.event_timestamp) }}</strong>
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
  live: { type: Boolean, default: false },
})

// 바이낸스는 korean_name이 비어 있어 영문명/심볼/마켓코드로 폴백.
const displayName = computed(
  () => props.ticker?.korean_name || props.ticker?.english_name || props.ticker?.symbol || props.ticker?.market || ''
)

// 부제: 업비트는 영문명, 바이낸스는(영문명이 곧 제목이므로) 마켓 코드 + 거래소
const subTitle = computed(() => {
  const t = props.ticker
  if (!t) return ''
  const sub = t.korean_name ? t.english_name : t.market
  return [sub, t.exchange].filter(Boolean).join(' · ')
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
  return `${Math.round(Number(value || 0) / 1000000).toLocaleString('ko-KR')} ${unit}`
}

const formatSignedPrice = (value, exchange) => {
  if (value == null) return '—'
  const currency = exchange === 'BINANCE' ? 'USDT' : 'KRW'
  const abs = Math.abs(value)
  const digits = abs < 10 ? 4 : abs < 1000 ? 2 : 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits })} ${currency}`
}

const formatCoinVolume = (value) => {
  if (value == null) return '—'
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 3 })
}

const format52 = (value, exchange) => (value == null ? '—' : formatPrice(value, exchange))

const formatTime = (ms) => {
  if (!ms) return '—'
  const d = new Date(Number(ms))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} 기준`
}
</script>
