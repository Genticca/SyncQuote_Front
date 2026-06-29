<template>
  <main class="dashboard-shell">
    <p v-if="loadError" class="error-banner">⚠ {{ loadError }}</p>
    <section class="workspace">
      <div class="main-panel">
        <CoinHeader :ticker="selectedTicker" />
        <CoinChart :ticker="selectedTicker" :candles="selectedCandles" />
      </div>

      <aside class="market-panel">
        <CoinList
          v-model:exchange="selectedExchange"
          :tickers="filteredTickers"
          :all-tickers="tickers"
          :selected-market="selectedMarket"
          @select-coin="handleCoinSelect"
        />
      </aside>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CoinChart from './components/CoinChart.vue'
import CoinHeader from './components/CoinHeader.vue'
import CoinList from './components/CoinList.vue'
import { fetchCandles, fetchTickers, streamTickers } from './api/markets'

const tickers = ref([])
const selectedExchange = ref('UPBIT')
const selectedMarket = ref('')
const candlesCache = ref({}) // market -> 봉 배열(REST)
const loadError = ref('')

let tickerStream = null

const filteredTickers = computed(() =>
  tickers.value.filter((ticker) => ticker.exchange === selectedExchange.value)
)
const selectedTicker = computed(() =>
  tickers.value.find((ticker) => ticker.market === selectedMarket.value) || filteredTickers.value[0]
)

// 마지막 봉에 현재가를 반영해 차트가 실시간으로 움직이게 한다(ticker 스트림 가격 사용).
const withLivePrice = (candles, price) => {
  if (!candles?.length || price == null) return candles ?? []
  const last = { ...candles[candles.length - 1], close: price }
  last.high = Math.max(last.high, price)
  last.low = Math.min(last.low, price)
  return [...candles.slice(0, -1), last]
}

const selectedCandles = computed(() => {
  const ticker = selectedTicker.value
  if (!ticker) return []
  return withLivePrice(candlesCache.value[ticker.market] || [], ticker.trade_price)
})

const ensureSelection = () => {
  selectedMarket.value = selectedTicker.value?.market || filteredTickers.value[0]?.market || ''
}

const loadCandles = async (market, exchange) => {
  if (!market || candlesCache.value[market]) return
  try {
    const data = await fetchCandles(exchange, market, '1m', 200)
    candlesCache.value = { ...candlesCache.value, [market]: data.candles }
  } catch (error) {
    console.error('[SyncQuote] 봉 조회 실패', market, error)
    candlesCache.value = { ...candlesCache.value, [market]: [] }
  }
}

const openTickerStream = () => {
  tickerStream = streamTickers((payload) => {
    const target = tickers.value.find(
      (ticker) => ticker.market === payload.market && (!payload.exchange || ticker.exchange === payload.exchange)
    )
    if (target) Object.assign(target, payload)
  })
}

onMounted(async () => {
  try {
    tickers.value = await fetchTickers() // 전체 거래소 1회 적재 → 탭 전환은 클라이언트 필터
    ensureSelection()
    openTickerStream()
  } catch (error) {
    console.error('[SyncQuote] 현재가 조회 실패', error)
    loadError.value = '시세 데이터를 불러오지 못했습니다. 백엔드 API 연결을 확인하세요.'
  }
})

watch(selectedExchange, () => {
  selectedMarket.value = filteredTickers.value[0]?.market || ''
})

watch(selectedMarket, (market) => {
  loadCandles(market, selectedTicker.value?.exchange)
})

onUnmounted(() => {
  tickerStream?.close()
})

const handleCoinSelect = (market) => {
  selectedMarket.value = market
}
</script>

<style scoped>
.error-banner {
  margin: 0;
  padding: 6px 12px;
  background: #fdecec;
  color: #b3261e;
  font-size: 12px;
  text-align: center;
}
</style>
