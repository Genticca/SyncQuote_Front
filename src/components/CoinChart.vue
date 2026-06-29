<template>
  <section class="chart-card">
    <div class="chart-toolbar">
      <div>
        <strong>{{ ticker?.market }}</strong>
        <span>1m Candles</span>
      </div>
      <div class="legend">
        <span class="legend-up"></span>상승
        <span class="legend-down"></span>하락
      </div>
    </div>
    <div ref="chartContainer" class="chart-container"></div>
  </section>
</template>

<script setup>
import { CandlestickSeries, ColorType, createChart } from 'lightweight-charts'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  ticker: { type: Object, default: null },
  candles: { type: Array, default: () => [] },
})

const chartContainer = ref(null)
let chart = null
let candlestickSeries = null
let resizeObserver = null

const setChartData = () => {
  if (!candlestickSeries) return
  candlestickSeries.setData(props.candles)
  chart?.timeScale().fitContent()
}

onMounted(() => {
  chart = createChart(chartContainer.value, {
    height: 440,
    layout: {
      background: { type: ColorType.Solid, color: '#ffffff' },
      textColor: '#343a46',
      fontFamily: 'Arial, sans-serif',
    },
    grid: {
      vertLines: { color: '#eef1f5' },
      horzLines: { color: '#eef1f5' },
    },
    rightPriceScale: {
      borderColor: '#d8dde6',
    },
    timeScale: {
      borderColor: '#d8dde6',
      timeVisible: true,
    },
  })

  candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#d24f45',
    downColor: '#1261c4',
    borderVisible: false,
    wickUpColor: '#d24f45',
    wickDownColor: '#1261c4',
  })

  resizeObserver = new ResizeObserver(([entry]) => {
    chart.applyOptions({ width: entry.contentRect.width })
  })
  resizeObserver.observe(chartContainer.value)
  setChartData()
})

watch(() => props.candles, setChartData, { deep: true })

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.remove()
})
</script>
