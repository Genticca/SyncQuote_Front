import { api, unwrap, API_BASE } from './client'

// ===== REST =====

// 현재가 목록(전광판). exchange 미지정 시 전체 거래소.
export const fetchTickers = async (exchange) =>
  unwrap(await api.get('/tickers', { params: exchange ? { exchange } : {} }))

// 현재가 단건(코인 헤더).
export const fetchTicker = async (exchange, market) =>
  unwrap(await api.get(`/tickers/${exchange}/${market}`))

// 마켓 기준 정보.
export const fetchMarkets = async (exchange) =>
  unwrap(await api.get('/markets', { params: exchange ? { exchange } : {} }))

// 봉 조회(차트). 반환: { exchange, market, interval, candles: [{time,open,high,low,close,volume}] }
export const fetchCandles = async (exchange, market, interval = '1m', limit = 200) =>
  unwrap(await api.get('/candles', { params: { exchange, market, interval, limit } }))

// ===== SSE =====

// 현재가 실시간. onTicker(payload) 로 변동분(market 기준) 전달. EventSource 반환(언마운트 시 close()).
export const streamTickers = (onTicker, { exchange } = {}) => {
  const qs = exchange ? `?exchange=${encodeURIComponent(exchange)}` : ''
  const es = new EventSource(`${API_BASE}/stream/tickers${qs}`)
  es.onerror = (e) => console.warn('[SyncQuote] ticker SSE 오류 — EventSource 자동 재연결 시도', es.readyState, e)
  es.addEventListener('ticker', (e) => {
    try {
      onTicker(JSON.parse(e.data))
    } catch {
      /* malformed payload 무시 */
    }
  })
  return es
}

// 봉 실시간(1s). 1s 전용 차트에서 series.update() 에 사용. (현재 App 은 ticker 가격으로 마지막 봉을 갱신)
export const streamCandles = (onCandle, { exchange, market, interval = '1s' }) => {
  const url = `${API_BASE}/stream/candles?exchange=${encodeURIComponent(exchange)}&market=${encodeURIComponent(market)}&interval=${interval}`
  const es = new EventSource(url)
  es.onerror = (e) => console.warn('[SyncQuote] candle SSE 오류 — EventSource 자동 재연결 시도', es.readyState, e)
  es.addEventListener('candle', (e) => {
    try {
      onCandle(JSON.parse(e.data))
    } catch {
      /* ignore */
    }
  })
  return es
}
