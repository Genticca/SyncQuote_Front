# SyncQuote 프론트엔드

업비트·바이낸스 실시간 시세/차트 대시보드 **SyncQuote**의 프론트엔드입니다. Vue 3 기반이며, 백엔드 **SyncQuote API(REST + SSE)** 에서 데이터를 받아 전광판(종목 목록) · 종목 헤더 · 캔들 차트를 렌더링합니다.

> 이전에는 `mockMarkets.js` 기반의 Mock 프로토타입이었으나, 현재는 **백엔드 REST/SSE API에 직접 연동**합니다. 필드명/단위는 모두 **DB 스키마 기준(snake_case)** 으로 통일되어 있습니다.

## 목차
1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [실행 방법](#3-실행-방법)
4. [백엔드 연동](#4-백엔드-연동)
5. [데이터 모델](#5-데이터-모델)
6. [API 모듈 (`src/api`)](#6-api-모듈-srcapi)
7. [컴포넌트 설명](#7-컴포넌트-설명)
8. [구현된 기능](#8-구현된-기능)
9. [구현 예정 기능](#9-구현-예정-기능)

---

## 1. 기술 스택

| 구분 | 사용 |
| --- | --- |
| 프레임워크 | Vue 3 (`<script setup>`) |
| 빌드 | Vite 7 |
| REST | axios |
| 실시간 | SSE (`EventSource`) |
| 차트 | lightweight-charts v5 |
| 클라이언트 저장 | js-cookie (관심목록) |

---

## 2. 프로젝트 구조

```text
src/
├── api/
│   ├── client.js        # axios 인스턴스 + 공통 응답 Envelope unwrap
│   └── markets.js       # REST(fetch*) + SSE(stream*) 호출 헬퍼
├── components/
│   ├── CoinList.vue     # 종목 목록 패널 (탭/카테고리/검색/정렬/관심목록)
│   ├── CoinListItem.vue # 종목 행 (가격·등락·Flash)
│   ├── CoinHeader.vue   # 선택 종목 상세 헤더
│   └── CoinChart.vue    # 캔들스틱 차트
├── assets/
│   └── global.css
├── App.vue              # 데이터 적재 / SSE 구독 / 상태 관리
└── main.js
```

---

## 3. 실행 방법

```bash
npm install
npm run dev       # development mode: Vite dev server
npm run build     # production mode: 정적 파일 빌드
npm run preview   # 빌드 결과 미리보기
```

### Development / Production 환경

Front는 Vite mode 기준으로 환경을 분리합니다.

| 파일 | 사용 시점 | 역할 |
| --- | --- | --- |
| `.env.development` | `npm run dev` | `/api` 요청을 로컬 Spring(`VITE_API_TARGET`)으로 프록시 |
| `.env.production` | `npm run build` | K8s Ingress/Nginx 같은 origin의 `/api/v1` 사용 |
| `.env.example` | 공유용 예시 | 환경변수 설명 |

개발 모드에서는 브라우저가 `http://localhost:5173/api/v1/...`로 요청하지만, Vite proxy가 Spring으로 전달합니다.

```env
# .env.development
VITE_API_BASE=/api/v1
VITE_API_TARGET=http://localhost:8080
```

운영 모드에서는 Front와 API가 외부 80 포트의 같은 origin 아래에서 Ingress path로 분기된다는 전제로 상대경로를 유지합니다.

```env
# .env.production
VITE_API_BASE=/api/v1
```

---

## 4. 백엔드 연동

**원칙:** 진입 시 REST로 초기 데이터를 1회 적재하고, 이후 갱신은 SSE로 받습니다.

```text
진입         GET  /api/v1/tickers              → 전광판 초기 렌더 (전체 거래소)
실시간 시세  SSE  /api/v1/stream/tickers        → market 기준 항목 in-place 갱신
종목 선택    GET  /api/v1/candles?interval=1m   → 차트 초기 렌더
차트 실시간  ticker 현재가를 마지막 봉에 주입    → 캔들 실시간 반영
```

- 거래소 탭(UPBIT/BINANCE) 전환은 전체 목록을 받아 **클라이언트에서 필터링**합니다(관심목록의 거래소 교차 지원).
- 검색 · 정렬 · 카테고리 · 관심목록은 데이터셋이 작아 **클라이언트에서 처리**합니다.
- API 호출 실패 시 Mock으로 대체하지 않고 **에러 배너**를 표시합니다.

응답은 공통 Envelope로 감싸져 옵니다.

```json
{ "success": true, "data": <본문>, "error": null, "timestamp": 1719628800000 }
```

---

## 5. 데이터 모델

필드명은 **DB 컬럼명(snake_case)** 기준입니다. (구 `market_code → market`, `change → change_status`, `binance_symbol` 제거)

### Ticker

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `exchange` | string | `UPBIT` / `BINANCE` |
| `market` | string | 마켓 코드 (전 화면 식별 키) |
| `symbol` | string | 심볼 (예: `BTC`) |
| `korean_name` / `english_name` | string | 이름 |
| `market_warning` | string | `NONE` / `CAUTION` |
| `trade_price` | number | 현재가 |
| `change_status` | string | `RISE` / `EVEN` / `FALL` (색상 분기) |
| `change_rate` | number | 변화율 절댓값(%) |
| `signed_change_rate` | number | 전일대비 부호 변화율(%) |
| `signed_change_price` | number | 전일대비 금액 |
| `acc_trade_price_24h` | number | 24h 거래대금 |
| `acc_trade_volume_24h` | number | 24h 거래량 |
| `high_price` / `low_price` | number | 당일 고가/저가 |
| `high_price_52w` / `low_price_52w` | number | 52주 고가/저가 |
| `event_timestamp` | number | 거래소 이벤트 시각(ms) |

> 등락 색상: `change_status`가 `RISE` → 빨강, `FALL` → 파랑, 그 외 → 검정.
> 변화율은 **퍼센트** 값이므로 `toFixed(2) + '%'`로 그대로 표기.

### Candle (lightweight-charts 호환)

```js
{
  time: 1719628740,   // unix 초
  open: 138200000,
  high: 138400000,
  low:  138150000,
  close: 138310000,
  volume: 12.84       // 선택
}
```

---

## 6. API 모듈 (`src/api`)

### `client.js`
- `api`: axios 인스턴스 (`baseURL = VITE_API_BASE ?? '/api/v1'`).
- `unwrap(res)`: 응답 Envelope에서 `data`만 추출하고, `success: false`면 `error.message`로 throw.

### `markets.js`

| 함수 | 메서드 | 설명 |
| --- | --- | --- |
| `fetchTickers(exchange?)` | GET `/tickers` | 현재가 목록(미지정 시 전체 거래소) |
| `fetchTicker(exchange, market)` | GET `/tickers/{ex}/{market}` | 현재가 단건 |
| `fetchMarkets(exchange?)` | GET `/markets` | 마켓 기준 정보 |
| `fetchCandles(exchange, market, interval='1m', limit=200)` | GET `/candles` | 봉 조회 |
| `streamTickers(onTicker, {exchange?})` | SSE `/stream/tickers` | 현재가 실시간(`EventSource` 반환) |
| `streamCandles(onCandle, {exchange, market, interval})` | SSE `/stream/candles` | 봉 실시간(1s 차트용) |

---

## 7. 컴포넌트 설명

### App.vue
데이터 적재와 상태의 중심. `fetchTickers()`로 전체 종목을 받고 `streamTickers()`로 실시간 갱신, 선택 종목 변경 시 `fetchCandles()`로 차트 데이터를 캐싱한다.

| 상태 | 설명 |
| --- | --- |
| `tickers` | 전체 거래소 종목 목록 |
| `selectedExchange` / `selectedMarket` | 현재 거래소 탭 / 선택 종목 |
| `candlesCache` | 마켓별 봉 캐시 |
| `selectedCandles` | 마지막 봉에 현재가를 반영한 차트 데이터 |
| `loadError` | API 실패 시 에러 배너 메시지 |

### CoinList.vue
종목 목록 패널. 거래소 탭(UPBIT/BINANCE/관심목록), 카테고리 필터, 검색, 컬럼 정렬, 즐겨찾기를 처리한다.

| Prop | 타입 | 설명 |
| --- | --- | --- |
| `exchange` | String | 현재 거래소 (`v-model:exchange`) |
| `tickers` | Array | 현재 거래소 종목 |
| `allTickers` | Array | 전체 거래소 종목(관심목록용) |
| `selectedMarket` | String | 선택된 마켓 코드 |

### CoinListItem.vue
개별 종목 행. 가격/등락/거래대금 포맷, `change_status` 색상, 가격 변동 Flash, 관심 토글(`market` 기준).

### CoinHeader.vue
선택 종목 요약 헤더. 현재가·전일대비·당일 고저가·24h 거래대금을 거래소별 통화(KRW/USDT)로 표시. 외부 거래소 링크는 `exchange` + `market`으로 생성.

### CoinChart.vue
`lightweight-charts` v5 캔들 차트. `candles` prop을 watch하여 `setData()` + `fitContent()`. `ResizeObserver` 반응형, `onUnmounted`에서 정리.

---

## 8. 구현된 기능

| 기능 | 파일 | 데이터 출처 |
| --- | --- | --- |
| 거래소 탭 전환 | CoinList.vue | 클라이언트 필터 |
| 관심목록(즐겨찾기) | CoinList.vue, CoinListItem.vue | 쿠키 `syncquote_favorites`(30일) |
| 종목 선택/하이라이트 | CoinList.vue, App.vue | — |
| 종목 검색 | CoinList.vue | 클라이언트 (`korean_name`/`english_name`/`symbol`/`market`) |
| 컬럼 정렬 | CoinList.vue | 클라이언트 (`trade_price`/`signed_change_rate`/`acc_trade_price_24h`/`korean_name`) |
| 자산 분류 필터 | CoinList.vue | 클라이언트 (전체/상승률/거래대금) |
| 가격 포맷·등락 색상 | CoinListItem.vue, CoinHeader.vue | — |
| 가격 변동 Flash | CoinListItem.vue | — |
| 종목 상세 헤더 | CoinHeader.vue | **REST `/tickers`** |
| 캔들 차트 | CoinChart.vue | **REST `/candles`** |
| 실시간 현재가 | App.vue | **SSE `/stream/tickers`** |
| 외부 거래소 링크 | CoinHeader.vue | — |

---

## 9. 구현 예정 기능

### 9.1 차트 주기 변경 (Timeframe)
차트 툴바에 `[1m | 1H | 1D | 1W]` 버튼을 추가하고, 선택 시 `fetchCandles(..., interval)`을 재호출하여 `candles`를 갱신. `candles` watch 구조가 이미 있어 prop 갱신만으로 차트가 바뀐다.

### 9.2 실시간 체결 내역 (Trade History)
선택 종목의 체결 내역을 시간 역순으로 보여주는 신규 컴포넌트. 별도 API/스트림 연동 및 `.workspace` 레이아웃(2열→3열) 조정이 필요하다.

### 9.3 봉 단위 실시간 차트
`streamCandles()`(SSE `/stream/candles`, 1s)를 사용해 `series.update()`로 1초봉 차트를 실시간 갱신.
