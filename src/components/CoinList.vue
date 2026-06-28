<template>
  <section class="list-container">
    <div class="exchange-tabs">
      <button :class="{ active: activeTab === 'UPBIT' }" @click="selectExchangeTab('UPBIT')">Upbit</button>
      <button :class="{ active: activeTab === 'BINANCE' }" @click="selectExchangeTab('BINANCE')">Binance</button>
      <button :class="{ active: activeTab === 'FAVORITES' }" @click="activeTab = 'FAVORITES'">관심목록</button>
    </div>

    <div class="search-box">
      <input v-model="searchQuery" type="text" placeholder="코인명 또는 심볼 검색" class="search-input" />
    </div>

    <div class="list-header">
      <button class="col-name" @click="toggleSort('name')">종목<span class="sort-arrow">{{ sortArrow('name') }}</span></button>
      <button @click="toggleSort('price')">현재가<span class="sort-arrow">{{ sortArrow('price') }}</span></button>
      <button @click="toggleSort('change')">전일대비<span class="sort-arrow">{{ sortArrow('change') }}</span></button>
      <button @click="toggleSort('volume')">거래대금<span class="sort-arrow">{{ sortArrow('volume') }}</span></button>
    </div>

    <div class="list-body">
      <p v-if="activeTab === 'FAVORITES' && displayedTickers.length === 0" class="empty-favorites">
        관심목록에 추가된 코인이 없습니다.
      </p>
      <p v-else-if="searchQuery && filteredTickers.length === 0" class="empty-favorites">
        검색 결과가 없습니다.
      </p>
      <CoinListItem
        v-for="coin in sortedTickers"
        :key="coin.market_code"
        :coin="coin"
        :selected="coin.market_code === selectedMarketCode"
        :is-favorite="favorites.includes(coin.market_code)"
        @select="$emit('select-coin', coin.market_code)"
        @toggle-fav="toggleFavorite"
      />
    </div>
  </section>
</template>

<script setup>
import Cookies from 'js-cookie'
import { computed, onMounted, ref } from 'vue'
import CoinListItem from './CoinListItem.vue'

const props = defineProps({
  exchange: { type: String, required: true },
  tickers: { type: Array, default: () => [] },
  allTickers: { type: Array, default: () => [] },
  selectedMarketCode: { type: String, default: '' },
})

const emit = defineEmits(['select-coin', 'update:exchange'])

const favorites = ref([])
const activeTab = ref(props.exchange)
const searchQuery = ref('')

onMounted(() => {
  try {
    favorites.value = JSON.parse(Cookies.get('mock_favorites') || '[]')
  } catch {
    favorites.value = []
  }
})

const displayedTickers = computed(() => {
  if (activeTab.value === 'FAVORITES') {
    return props.allTickers.filter((coin) => favorites.value.includes(coin.market_code))
  }
  return props.tickers
})

const filteredTickers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return displayedTickers.value
  return displayedTickers.value.filter((coin) =>
    [coin.korean_name, coin.english_name, coin.symbol, coin.market_code].some((field) =>
      field?.toLowerCase().includes(query)
    )
  )
})

const sortKey = ref(null)
const sortOrder = ref('asc')

const sortValueGetters = {
  name: (coin) => coin.korean_name,
  price: (coin) => coin.trade_price,
  change: (coin) => coin.signed_change_rate,
  volume: (coin) => coin.acc_trade_price_24h,
}

const sortedTickers = computed(() => {
  if (!sortKey.value) return filteredTickers.value
  const getValue = sortValueGetters[sortKey.value]
  const sorted = [...filteredTickers.value].sort((a, b) => {
    const aValue = getValue(a)
    const bValue = getValue(b)
    if (typeof aValue === 'string') return aValue.localeCompare(bValue)
    return aValue - bValue
  })
  return sortOrder.value === 'asc' ? sorted : sorted.reverse()
})

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortArrow = (key) => {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? ' ▲' : ' ▼'
}

const selectExchangeTab = (exchange) => {
  activeTab.value = exchange
  emit('update:exchange', exchange)
}

const toggleFavorite = (marketCode) => {
  const index = favorites.value.indexOf(marketCode)
  if (index === -1) favorites.value.push(marketCode)
  else favorites.value.splice(index, 1)
  Cookies.set('mock_favorites', JSON.stringify(favorites.value), { expires: 30 })
}
</script>
