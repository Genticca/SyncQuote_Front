<template>
  <section class="chart-card">
    <div class="chart-toolbar">
      <div>
        <strong>{{ ticker?.market }}</strong>
        <span>{{ interval === '1s' ? '1s · 실시간' : '1m' }} Candles</span>
      </div>
      <div class="chart-controls">
        <div class="interval-toggle">
          <button :class="{ active: interval === '1m' }" @click="$emit('update:interval', '1m')">1m</button>
          <button :class="{ active: interval === '1s' }" @click="$emit('update:interval', '1s')">1s</button>
        </div>
        <div class="legend">
          <span class="legend-up"></span>상승
          <span class="legend-down"></span>하락
        </div>
      </div>
    </div>
    <div class="chart-wrap">
      <div ref="chartContainer" class="chart-container"></div>
      <div v-if="hovered" class="ohlc-tooltip" :style="tooltipStyle">
        <div class="ohlc-time">{{ hovered.time }}</div>
        <div class="ohlc-rows">
          <span>시 <b>{{ hovered.open }}</b></span>
          <span>고 <b>{{ hovered.high }}</b></span>
          <span>저 <b>{{ hovered.low }}</b></span>
          <span>종 <b>{{ hovered.close }}</b></span>
        </div>
        <div class="ohlc-foot">
          <span :class="hovered.dir">{{ hovered.change }}</span>
          <span class="ohlc-vol">거래량 {{ hovered.volume }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { CandlestickSeries, HistogramSeries, ColorType, createChart } from 'lightweight-charts'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  ticker: { type: Object, default: null },
  candles: { type: Array, default: () => [] },
  interval: { type: String, default: '1m' },
  loadOlder: { type: Function, default: null }, // 과거 봉 지연 로더(0 반환 시 더 없음)
})

defineEmits(['update:interval'])

const UP = '#d24f45'
const DOWN = '#1261c4'

const chartContainer = ref(null)
const hovered = ref(null)
const tooltipStyle = ref({})
let chart = null
let candlestickSeries = null
let volumeSeries = null
let resizeObserver = null
let renderedKey = ''       // 현재 그려진 종목:인터벌 (바뀌면 fresh = 전체 맞춤)
let loadingMore = false    // 과거 로딩 중복 방지
let noMore = false         // 더 이상 과거 데이터 없음
let canLoadOlder = false   // fresh 직후 자동 로딩 방지: 사용자가 줌/스크롤해야 활성화

const numFmt = (value) => {
  const v = Number(value)
  const digits = v < 10 ? 4 : v < 1000 ? 2 : 0
  return v.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}
const volFmt = (value) => Number(value ?? 0).toLocaleString('ko-KR', { maximumFractionDigits: 3 })
const timeFmt = (time) => {
  const d = new Date(Number(time) * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const setChartData = () => {
  if (!candlestickSeries) return
  const key = `${props.ticker?.market ?? ''}:${props.interval}`
  const fresh = key !== renderedKey
  // 실시간 갱신(매 틱 마지막 봉 변경)·과거 prepend 시엔 사용자의 보기 범위를 보존해
  // fitContent 스냅백(과거로 스크롤해도 전체 맞춤으로 튕김)을 막는다.
  const savedRange = !fresh && props.candles.length ? chart?.timeScale().getVisibleRange() : null

  candlestickSeries.setData(props.candles)
  volumeSeries?.setData(
    props.candles.map((c) => ({
      time: c.time,
      value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(210, 79, 69, 0.45)' : 'rgba(18, 97, 196, 0.45)',
    }))
  )

  if (!props.candles.length) return // 빈 데이터면 renderedKey 유지(다음 실데이터에서 fresh 처리)

  if (fresh) {
    renderedKey = key
    noMore = false
    loadingMore = false
    canLoadOlder = false
    chart?.timeScale().fitContent() // 새 종목/인터벌만 전체 맞춤
  } else if (savedRange) {
    try {
      chart?.timeScale().setVisibleRange(savedRange)
    } catch {
      /* 저장 범위가 새 데이터 밖이면 무시 */
    }
  }
}

onMounted(() => {
  chart = createChart(chartContainer.value, {
    height: 440,
    layout: {
      background: { type: ColorType.Solid, color: '#ffffff' },
      textColor: '#343a46',
      fontFamily: 'Arial, sans-serif',
      attributionLogo: false, // 좌측 하단 TradingView 로고 숨김
    },
    grid: {
      vertLines: { color: '#eef1f5' },
      horzLines: { color: '#eef1f5' },
    },
    rightPriceScale: {
      borderColor: '#d8dde6',
      scaleMargins: { top: 0.08, bottom: 0.26 },
    },
    timeScale: {
      borderColor: '#d8dde6',
      timeVisible: true,
      secondsVisible: true,
      fixLeftEdge: true,   // 데이터 없는 과거로 과도하게 스크롤되는 것 차단
      fixRightEdge: true,  // 최신 봉 너머 빈 공간으로 밀리는 것 차단
      lockVisibleTimeRangeOnResize: true,
    },
  })

  candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: UP,
    downColor: DOWN,
    borderVisible: false,
    wickUpColor: UP,
    wickDownColor: DOWN,
  })

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  })
  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.82, bottom: 0 },
  })

  chart.subscribeCrosshairMove((param) => {
    if (!param.point || param.time == null || !param.seriesData.has(candlestickSeries)) {
      hovered.value = null
      return
    }
    const candle = param.seriesData.get(candlestickSeries)
    const vol = param.seriesData.get(volumeSeries)
    const change = candle.close - candle.open
    hovered.value = {
      time: timeFmt(param.time),
      open: numFmt(candle.open),
      high: numFmt(candle.high),
      low: numFmt(candle.low),
      close: numFmt(candle.close),
      volume: volFmt(vol?.value),
      change: `${change >= 0 ? '+' : ''}${numFmt(change)}`,
      dir: change >= 0 ? 'text-red' : 'text-blue',
    }
    tooltipStyle.value = { left: `${param.point.x + 16}px`, top: `${param.point.y + 16}px` }
  })

  // 과거로 스크롤해 왼쪽 끝(가장 오래된 봉) 근처에 오면 이전 구간을 더 불러와 앞에 붙인다.
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!range) return
    // 왼쪽에 여유가 생긴 적(줌인/스크롤)이 있어야 자동 로딩 허용 → 첫 전체맞춤 직후 불필요한 요청 방지.
    if (range.from > 8) canLoadOlder = true
    if (!props.loadOlder || loadingMore || noMore || !canLoadOlder || range.from > 8) return
    loadingMore = true
    Promise.resolve(props.loadOlder())
      .then((added) => {
        if (!added) noMore = true // 더 이상 과거 데이터 없음 → 재요청 중단
      })
      .finally(() => {
        loadingMore = false
      })
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
