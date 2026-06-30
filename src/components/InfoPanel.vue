<template>
  <section class="info-panel" v-if="ticker">
    <div class="info-block">
      <h2 class="info-title">마켓 정보</h2>
      <dl class="meta-list">
        <div><dt>거래소</dt><dd>{{ ticker.exchange }}</dd></div>
        <div><dt>마켓</dt><dd>{{ ticker.market }}</dd></div>
        <div><dt>심볼</dt><dd>{{ ticker.symbol }}</dd></div>
        <div><dt>영문명</dt><dd>{{ ticker.english_name || meta.english_name || '—' }}</dd></div>
      </dl>
      <div class="meta-badges">
        <span v-if="warning" class="badge warn">거래유의</span>
        <span v-if="meta.event_warning" class="badge warn">투자경고</span>
        <span v-if="meta.event_caution" class="badge caution">투자주의</span>
        <span v-if="!warning && !meta.event_warning && !meta.event_caution" class="badge ok">정상</span>
      </div>
      <a v-if="exchangeLink" :href="exchangeLink" target="_blank" rel="noopener noreferrer" class="quick-link">
        {{ ticker.exchange === 'BINANCE' ? 'Binance' : 'Upbit' }}에서 보기 ↗
      </a>
    </div>

    <div class="info-block">
      <h2 class="info-title">시세 통계</h2>

      <div class="gauge-row">
        <div class="gauge-label"><span>24H 저가</span><span>24H 고가</span></div>
        <div class="gauge"><div class="gauge-marker" :style="{ left: pct24 + '%' }"></div></div>
        <div class="gauge-values">
          <span>{{ formatPrice(ticker.low_price) }}</span>
          <span class="cur">{{ formatPrice(ticker.trade_price) }}</span>
          <span>{{ formatPrice(ticker.high_price) }}</span>
        </div>
      </div>

      <div v-if="has52" class="gauge-row">
        <div class="gauge-label"><span>52주 최저</span><span>52주 최고</span></div>
        <div class="gauge"><div class="gauge-marker" :style="{ left: pct52 + '%' }"></div></div>
        <div class="gauge-values">
          <span>{{ formatPrice(ticker.low_price_52w) }}</span>
          <span class="cur">{{ formatPrice(ticker.trade_price) }}</span>
          <span>{{ formatPrice(ticker.high_price_52w) }}</span>
        </div>
      </div>
      <p v-else class="gauge-empty">52주 데이터 없음</p>

      <div class="change-card" :class="colorClass">
        <span>전일대비</span>
        <strong>{{ formatSignedPrice(ticker.signed_change_price) }}</strong>
        <small>{{ formatChange(ticker.signed_change_rate) }}</small>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  ticker: { type: Object, default: null },
  marketMeta: { type: Object, default: null },
})

const meta = computed(() => props.marketMeta || {})
const warning = computed(() => props.ticker?.market_warning === 'CAUTION')
const has52 = computed(
  () => props.ticker?.high_price_52w != null && props.ticker?.low_price_52w != null
)

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

const position = (low, high, cur) => {
  if (low == null || high == null || cur == null || high <= low) return 50
  return Math.min(100, Math.max(0, ((cur - low) / (high - low)) * 100))
}
const pct24 = computed(() =>
  position(props.ticker?.low_price, props.ticker?.high_price, props.ticker?.trade_price)
)
const pct52 = computed(() =>
  position(props.ticker?.low_price_52w, props.ticker?.high_price_52w, props.ticker?.trade_price)
)

const formatPrice = (value) => {
  if (value == null) return '—'
  const digits = value < 10 ? 4 : value < 1000 ? 2 : 0
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

const formatSignedPrice = (value) => {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const digits = abs < 10 ? 4 : abs < 1000 ? 2 : 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits })}`
}

const formatChange = (value) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value || 0).toFixed(2)}%`
}
</script>
