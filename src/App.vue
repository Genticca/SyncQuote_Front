<template>
  <main class="dashboard-shell">
    <!-- 첫 로딩: 전체 화면 스피너 대신 실제 레이아웃 형태의 스켈레톤을 즉시 노출 -->
    <section v-if="loading" class="workspace skeleton-view" aria-hidden="true">
      <div class="main-panel">
        <div class="coin-header">
          <div class="asset-title">
            <div class="sk sk-badge"></div>
            <div class="sk-titles">
              <div class="sk sk-line sk-title"></div>
              <div class="sk sk-line sk-sub"></div>
            </div>
          </div>
          <div class="summary-grid">
            <div class="sk sk-block" v-for="n in 4" :key="n"></div>
          </div>
          <div class="meta-strip">
            <div class="sk sk-line" v-for="n in 5" :key="n" style="height: 26px"></div>
          </div>
        </div>

        <div class="chart-card sk-chart">
          <div class="sk sk-fill"></div>
        </div>

        <div class="info-panel">
          <div class="info-block">
            <div class="sk sk-line sk-block-line" v-for="n in 5" :key="'a' + n"></div>
          </div>
          <div class="info-block">
            <div class="sk sk-line sk-block-line" v-for="n in 5" :key="'b' + n"></div>
          </div>
        </div>
      </div>

      <aside class="market-panel">
        <div class="list-container">
          <div class="sk sk-tabs"></div>
          <div class="sk-rows">
            <div class="sk sk-row" v-for="n in 10" :key="n"></div>
          </div>
        </div>
      </aside>
    </section>

    <!-- 로딩 실패: 상단 배너 대신 전체 에러 상태 + 다시 시도 -->
    <div v-else-if="loadError" class="error-state" role="alert">
      <div class="error-illustration" aria-hidden="true">!</div>
      <h2 class="error-title">데이터를 불러오지 못했어요</h2>
      <p class="error-desc">{{ loadError }}</p>
      <button type="button" class="error-retry" @click="loadInitialData">
        <span class="retry-icon" aria-hidden="true">↻</span> 다시 시도
      </button>
    </div>

    <section v-else class="workspace">
      <div class="main-panel">
        <CoinHeader :ticker="selectedTicker" :live="live" />
        <CoinChart
          :ticker="selectedTicker"
          :candles="selectedCandles"
          :load-older="loadOlderCandles"
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
const loading = ref(true) // 첫 진입 데이터 로딩 표시

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

// 차트를 과거로 스크롤하면 호출: 가장 오래된 봉보다 이전 구간을 to 커서로 받아 앞에 붙인다.
// 1s는 Redis(짧은 보존 + SSE가 앞에서 shift)라 페이징 제외 → 1m(MySQL, 깊은 히스토리)만.
// 반환: 새로 붙인 봉 수(0 = 더 이상 과거 없음).
let loadingOlder = false
const loadOlderCandles = async () => {
  const ticker = selectedTicker.value
  const interval = chartInterval.value
  if (!ticker || interval !== '1m' || loadingOlder) return 0
  const key = `${ticker.market}:${interval}`
  const existing = candlesCache.value[key]
  if (!existing || existing.length === 0) return 0
  loadingOlder = true
  try {
    const oldest = existing[0].time // 오름차순 첫 봉의 시각(epoch 초)
    const data = await fetchCandles(ticker.exchange, ticker.market, interval, 200, oldest - 1)
    const older = (data.candles || []).filter((c) => c.time < oldest)
    if (older.length === 0) return 0
    candlesCache.value = { ...candlesCache.value, [key]: [...older, ...existing] }
    return older.length
  } catch (error) {
    console.error('[SyncQuote] 과거 봉 조회 실패', key, error)
    return 0
  } finally {
    loadingOlder = false
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

// 첫 진입 데이터 적재. 실패 시 에러 상태를 띄우고, '다시 시도' 버튼이 이 함수를 재호출한다.
const loadInitialData = async () => {
  loading.value = true
  loadError.value = ''
  tickerStream?.close() // 재시도 대비: 기존 스트림이 있으면 정리 후 다시 연다
  tickerStream = null
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
  } finally {
    loading.value = false
  }
}

onMounted(loadInitialData)

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
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 70vh;
  padding: 40px 20px;
  text-align: center;
}
.error-illustration {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: #fdeaea;
  color: #d24f45;
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  animation: err-pulse 2s ease-in-out infinite;
}
.error-title {
  margin: 4px 0 0;
  font-size: 22px;
  color: #222831;
}
.error-desc {
  margin: 0;
  max-width: 420px;
  color: #68717f;
  font-size: 14px;
  line-height: 1.65;
}
.error-retry {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border: 0;
  border-radius: 8px;
  background: #115dcb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.error-retry:hover {
  background: #0d4ba6;
}
.error-retry:active {
  transform: translateY(1px);
}
.retry-icon {
  font-size: 17px;
}
@keyframes err-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(210, 79, 69, 0.28); }
  50% { box-shadow: 0 0 0 16px rgba(210, 79, 69, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .error-illustration { animation: none; }
}
</style>
