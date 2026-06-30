<template>
  <main class="dashboard-shell">
    <p v-if="loadError" class="error-banner">⚠ {{ loadError }}</p>
    <section class="workspace">
      <div class="main-panel">
        <CoinHeader :ticker="selectedTicker" :live="live" />
        <CoinChart
          :ticker="selectedTicker"
          :candles="selectedCandles"
          v-model:interval="chartInterval"
        />
        <InfoPanel :ticker="selectedTicker" :market-meta="selectedMarketMeta" />
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
import InfoPanel from './components/InfoPanel.vue'
import { fetchCandles, fetchMarkets, fetchTickers, streamCandles, streamTickers } from './api/markets'

const tickers = ref([])
const marketsMeta = ref({}) // market -> 마켓 메타(MarketResponseDto)
const selectedExchange = ref('UPBIT')
const selectedMarket = ref('')
const chartInterval = ref('1m')
const candlesCache = ref({}) // `${market}:${interval}` -> 봉 배열
const live = ref(false) // ticker SSE 연결 상태
const loadError = ref('')

let tickerStream = null
let candleStream = null

const filteredTickers = computed(() =>
  tickers.value.filter((ticker) => ticker.exchange === selectedExchange.value)
)
const selectedTicker = computed(() =>
  tickers.value.find((ticker) => ticker.market === selectedMarket.value) || filteredTickers.value[0]
)
const selectedMarketMeta = computed(() => marketsMeta.value[selectedMarket.value] || null)

// 1m: 마지막 봉에 현재가를 반영해 차트가 실시간으로 움직이게 한다(ticker 스트림 가격 사용).
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
  const base = candlesCache.value[`${ticker.market}:${chartInterval.value}`] || []
  // 1s는 캔들 SSE가 실시간 봉을 직접 채우므로 그대로, 1m은 ticker 가격으로 마지막 봉 보정.
  return chartInterval.value === '1s' ? base : withLivePrice(base, ticker.trade_price)
})

// 기본 진입 코인은 비트코인(거래소별 BTC 마켓). 없으면 목록 첫 종목.
const defaultBtcMarket = () => (selectedExchange.value === 'BINANCE' ? 'BTCUSDT' : 'KRW-BTC')
const pickDefaultMarket = () => {
  const list = filteredTickers.value
  const btc = defaultBtcMarket()
  return list.some((t) => t.market === btc) ? btc : list[0]?.market || ''
}
const ensureSelection = () => {
  selectedMarket.value = pickDefaultMarket()
}

const loadCandles = async (market, exchange, interval) => {
  const key = `${market}:${interval}`
  if (!market || !exchange || candlesCache.value[key]) return
  const limit = interval === '1s' ? 120 : 200
  try {
    const data = await fetchCandles(exchange, market, interval, limit)
    candlesCache.value = { ...candlesCache.value, [key]: data.candles }
  } catch (error) {
    console.error('[SyncQuote] 봉 조회 실패', key, error)
    candlesCache.value = { ...candlesCache.value, [key]: [] }
  }
}

const closeCandleStream = () => {
  candleStream?.close()
  candleStream = null
}

// 1s 인터벌일 때만 캔들 SSE로 실시간 봉을 채운다(목록 깜빡임은 ticker SSE가 담당).
const openCandleStream = (market, exchange) => {
  closeCandleStream()
  if (!market || !exchange || chartInterval.value !== '1s') return
  candleStream = streamCandles(
    (candle) => {
      const key = `${market}:1s`
      const arr = candlesCache.value[key] ? [...candlesCache.value[key]] : []
      const last = arr[arr.length - 1]
      if (last && candle.time < last.time) return // 지난 봉 무시
      if (last && last.time === candle.time) arr[arr.length - 1] = candle
      else {
        arr.push(candle)
        if (arr.length > 180) arr.shift()
      }
      candlesCache.value = { ...candlesCache.value, [key]: arr }
    },
    { exchange, market, interval: '1s' }
  )
}

const openTickerStream = () => {
  tickerStream = streamTickers(
    (payload) => {
      const target = tickers.value.find(
        (ticker) =>
          ticker.market === payload.market && (!payload.exchange || ticker.exchange === payload.exchange)
      )
      if (target) Object.assign(target, payload)
    },
    { onState: (state) => { live.value = state === 'open' } }
  )
}

onMounted(async () => {
  try {
    const [tickerList, marketList] = await Promise.all([
      fetchTickers(), // 전체 거래소 1회 적재 → 탭 전환은 클라이언트 필터
      fetchMarkets().catch(() => []),
    ])
    tickers.value = tickerList
    const map = {}
    for (const m of marketList || []) map[m.market] = m
    marketsMeta.value = map
    ensureSelection()
    openTickerStream()
  } catch (error) {
    console.error('[SyncQuote] 현재가 조회 실패', error)
    loadError.value = '시세 데이터를 불러오지 못했습니다. 백엔드 API 연결을 확인하세요.'
  }
})

watch(selectedExchange, () => {
  selectedMarket.value = pickDefaultMarket()
})

// 마켓/인터벌 변경 → 해당 봉 로드 + 1s 캔들 스트림 재연결
watch([selectedMarket, chartInterval], ([market]) => {
  const exchange = selectedTicker.value?.exchange
  loadCandles(market, exchange, chartInterval.value)
  openCandleStream(market, exchange)
})

onUnmounted(() => {
  tickerStream?.close()
  closeCandleStream()
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
