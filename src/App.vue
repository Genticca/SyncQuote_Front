<template>
  <main class="dashboard-shell">
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
          :selected-market-code="selectedMarketCode"
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
import { createMockTickers, getMockCandles, nextMockTickers } from './data/mockMarkets'

const tickers = ref(createMockTickers())
const selectedExchange = ref('UPBIT')
const selectedMarketCode = ref('KRW-BTC')
let timerId = null

const filteredTickers = computed(() => tickers.value.filter((ticker) => ticker.exchange === selectedExchange.value))
const selectedTicker = computed(() => tickers.value.find((ticker) => ticker.market_code === selectedMarketCode.value) || filteredTickers.value[0])
const selectedCandles = computed(() => getMockCandles(selectedTicker.value?.market_code, selectedTicker.value?.trade_price))

watch(selectedExchange, () => {
  selectedMarketCode.value = filteredTickers.value[0]?.market_code || ''
})

onMounted(() => {
  timerId = window.setInterval(() => {
    tickers.value = nextMockTickers(tickers.value)
  }, 1400)
})

onUnmounted(() => {
  if (timerId) window.clearInterval(timerId)
})

const handleCoinSelect = (marketCode) => {
  selectedMarketCode.value = marketCode
}
</script>
