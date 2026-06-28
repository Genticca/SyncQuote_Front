const marketSeeds = [
  { exchange: 'UPBIT', market_code: 'KRW-BTC', symbol: 'BTC', korean_name: '비트코인', english_name: 'Bitcoin', binance_symbol: 'BTCUSDT', base_price: 138250000, volume_seed: 126000000000 },
  { exchange: 'UPBIT', market_code: 'KRW-ETH', symbol: 'ETH', korean_name: '이더리움', english_name: 'Ethereum', binance_symbol: 'ETHUSDT', base_price: 5050000, volume_seed: 88100000000 },
  { exchange: 'UPBIT', market_code: 'KRW-XRP', symbol: 'XRP', korean_name: '리플', english_name: 'XRP', binance_symbol: 'XRPUSDT', base_price: 3120, volume_seed: 54300000000 },
  { exchange: 'UPBIT', market_code: 'KRW-SOL', symbol: 'SOL', korean_name: '솔라나', english_name: 'Solana', binance_symbol: 'SOLUSDT', base_price: 238000, volume_seed: 42600000000 },
  { exchange: 'UPBIT', market_code: 'KRW-ADA', symbol: 'ADA', korean_name: '에이다', english_name: 'Cardano', binance_symbol: 'ADAUSDT', base_price: 920, volume_seed: 19400000000 },
  { exchange: 'UPBIT', market_code: 'KRW-DOGE', symbol: 'DOGE', korean_name: '도지코인', english_name: 'Dogecoin', binance_symbol: 'DOGEUSDT', base_price: 245, volume_seed: 16800000000 },
  { exchange: 'BINANCE', market_code: 'USDT-BTC', symbol: 'BTC', korean_name: 'Bitcoin', english_name: 'Bitcoin', binance_symbol: 'BTCUSDT', base_price: 98200, volume_seed: 2840000000 },
  { exchange: 'BINANCE', market_code: 'USDT-ETH', symbol: 'ETH', korean_name: 'Ethereum', english_name: 'Ethereum', binance_symbol: 'ETHUSDT', base_price: 3580, volume_seed: 1960000000 },
  { exchange: 'BINANCE', market_code: 'USDT-BNB', symbol: 'BNB', korean_name: 'BNB', english_name: 'BNB', binance_symbol: 'BNBUSDT', base_price: 710, volume_seed: 840000000 },
  { exchange: 'BINANCE', market_code: 'USDT-SOL', symbol: 'SOL', korean_name: 'Solana', english_name: 'Solana', binance_symbol: 'SOLUSDT', base_price: 169, volume_seed: 790000000 },
  { exchange: 'BINANCE', market_code: 'USDT-XRP', symbol: 'XRP', korean_name: 'XRP', english_name: 'XRP', binance_symbol: 'XRPUSDT', base_price: 2.22, volume_seed: 710000000 },
  { exchange: 'BINANCE', market_code: 'USDT-DOGE', symbol: 'DOGE', korean_name: 'Dogecoin', english_name: 'Dogecoin', binance_symbol: 'DOGEUSDT', base_price: 0.174, volume_seed: 480000000 },
]

const makeDate = (offset) => {
  const date = new Date('2026-04-30T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

const wave = (index, seed) => Math.sin(index * 0.31 + seed) * 0.018 + Math.cos(index * 0.17 + seed) * 0.011

const buildCandles = (market, seed) => {
  let close = market.base_price * (0.93 + seed * 0.012)
  return Array.from({ length: 60 }, (_, index) => {
    const drift = 1 + wave(index, seed) + 0.0025
    const open = close
    close = Math.max(market.base_price * 0.2, open * drift)
    const high = Math.max(open, close) * (1 + 0.004 + ((index + seed) % 5) * 0.001)
    const low = Math.min(open, close) * (1 - 0.004 - ((index + seed) % 4) * 0.001)
    return {
      time: makeDate(index),
      open: Number(open.toFixed(market.base_price < 10 ? 4 : 0)),
      high: Number(high.toFixed(market.base_price < 10 ? 4 : 0)),
      low: Number(low.toFixed(market.base_price < 10 ? 4 : 0)),
      close: Number(close.toFixed(market.base_price < 10 ? 4 : 0)),
    }
  })
}

export const mockCandlesByMarket = Object.fromEntries(
  marketSeeds.map((market, index) => [market.market_code, buildCandles(market, index + 1)])
)

export const createMockTickers = () => marketSeeds.map((market, index) => {
  const candles = mockCandlesByMarket[market.market_code]
  const latest = candles[candles.length - 1]
  const previous = candles[candles.length - 2]
  const changeRate = ((latest.close - previous.close) / previous.close) * 100
  const accTradePrice = market.volume_seed * (0.78 + (index % 5) * 0.09)

  return {
    ...market,
    trade_price: latest.close,
    opening_price: latest.open,
    high_price: latest.high,
    low_price: latest.low,
    change: changeRate > 0 ? 'RISE' : changeRate < 0 ? 'FALL' : 'EVEN',
    signed_change_rate: changeRate,
    high_price_52w: Number((market.base_price * 1.36).toFixed(market.base_price < 10 ? 4 : 0)),
    low_price_52w: Number((market.base_price * 0.62).toFixed(market.base_price < 10 ? 4 : 0)),
    acc_trade_volume_24h: Number((accTradePrice / latest.close).toFixed(3)),
    acc_trade_price_24h: Math.round(accTradePrice),
    market_warning: index === 5 ? 'CAUTION' : 'NONE',
  }
})

export const nextMockTickers = (tickers) => tickers.map((ticker, index) => {
  const factor = 1 + (Math.sin(Date.now() / 900 + index) * 0.0018)
  const decimals = ticker.trade_price < 10 ? 4 : 0
  const nextPrice = Number((ticker.trade_price * factor).toFixed(decimals))
  const changeRate = ((nextPrice - ticker.opening_price) / ticker.opening_price) * 100

  return {
    ...ticker,
    trade_price: nextPrice,
    high_price: Math.max(ticker.high_price, nextPrice),
    low_price: Math.min(ticker.low_price, nextPrice),
    change: changeRate > 0 ? 'RISE' : changeRate < 0 ? 'FALL' : 'EVEN',
    signed_change_rate: changeRate,
    acc_trade_price_24h: Math.round(ticker.acc_trade_price_24h * (1 + 0.0007 + index * 0.00002)),
  }
})

export const getMockCandles = (marketCode, livePrice) => {
  const candles = [...(mockCandlesByMarket[marketCode] || [])]
  if (!candles.length || livePrice == null) return candles

  const last = { ...candles[candles.length - 1] }
  last.close = livePrice
  last.high = Math.max(last.high, livePrice)
  last.low = Math.min(last.low, livePrice)
  candles[candles.length - 1] = last
  return candles
}
