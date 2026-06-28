# Exchange View 프론트엔드 명세서

## 목차

1. [Vue 파일 설명](#1-vue-파일-설명)
   - 1.1 [CoinList.vue](#11-coinlistvue)
   - 1.2 [CoinListItem.vue](#12-coinlistitemvue)
   - 1.3 [CoinHeader.vue](#13-coinheadervue)
   - 1.4 [CoinChart.vue](#14-coinchartvue)
2. [구현된 기능](#2-구현된-기능)
   - 2.1 [거래소 탭 전환](#21-거래소-탭-전환)
   - 2.2 [관심목록 (즐겨찾기)](#22-관심목록-즐겨찾기)
   - 2.3 [종목 선택 및 하이라이트](#23-종목-선택-및-하이라이트)
   - 2.4 [종목 검색](#24-종목-검색)
   - 2.5 [컬럼별 정렬](#25-컬럼별-정렬)
   - 2.6 [가격 포맷 및 등락 색상](#26-가격-포맷-및-등락-색상)
   - 2.7 [가격 변동 Flash 애니메이션](#27-가격-변동-flash-애니메이션)
   - 2.8 [종목 상세 헤더](#28-종목-상세-헤더)
   - 2.9 [캔들스틱 차트](#29-캔들스틱-차트)

---

[전체 진행 현황 요약](#전체-진행-현황-요약)

---

3. [구현 예정 기능](#3-구현-예정-기능)
   - 3.1 [차트 주기 변경 (Timeframe)](#31-차트-주기-변경-timeframe)
   - 3.2 [자산 분류 탭 필터 (Category Filter)](#32-자산-분류-탭-필터-category-filter)
   - 3.3 [외부 거래소 링크 연결 (Quick Links)](#33-외부-거래소-링크-연결-quick-links)
   - 3.4 [실시간 체결 내역 (Trade History)](#34-실시간-체결-내역-trade-history)

---

## 1. Vue 파일 설명

### 1.1 CoinList.vue

**파일 역할**

종목 리스트 전체를 관장하는 패널 컴포넌트. Upbit / Binance / 관심목록 탭 전환, 검색, 정렬, 즐겨찾기 상태를 모두 이 파일에서 처리한다. `CoinListItem`을 v-for로 렌더링하며, 탭 변경 시 `update:exchange` emit으로 부모에 거래소 전환을 알린다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `exchange` | String | 현재 선택된 거래소 (`UPBIT` \| `BINANCE`) |
| `tickers` | Array | 현재 거래소의 종목 목록 |
| `allTickers` | Array | 전체 거래소 합산 목록 (관심목록 필터용) |
| `selectedMarketCode` | String | 현재 선택된 종목 코드 |

**내부 상태**

| ref / computed | 설명 |
|----------------|------|
| `activeTab` | 현재 활성 탭 (`UPBIT` \| `BINANCE` \| `FAVORITES`) |
| `favorites` | 쿠키에서 불러온 관심 종목 코드 배열 |
| `searchQuery` | 검색 입력값 |
| `sortKey` | 정렬 기준 컬럼 (`name` \| `price` \| `change` \| `volume`) |
| `sortOrder` | 정렬 방향 (`asc` \| `desc`) |
| `displayedTickers` | 탭 기준 필터 결과 |
| `filteredTickers` | 검색어 적용 결과 |
| `sortedTickers` | 최종 렌더링 목록 (정렬 적용) |

---

### 1.2 CoinListItem.vue

**파일 역할**

종목 목록의 개별 행(row) 컴포넌트. 가격·등락률·거래대금 포맷팅, 등락 색상, 가격 변동 시 Flash 애니메이션, 관심 아이콘 토글을 담당한다. `<button>` 태그로 구현되어 클릭 시 `select` emit으로 부모에 종목 선택을 알린다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `coin` | Object | 종목 데이터 객체 |
| `selected` | Boolean | 현재 선택된 종목 여부 |
| `isFavorite` | Boolean | 관심 종목 여부 |

**포맷터 함수**

| 함수 | 처리 내용 |
|------|-----------|
| `formatPrice(value)` | 가격 크기에 따라 소수점 자동 조정 (< 10 → 4자리, < 1000 → 2자리, 이상 → 0자리) |
| `formatChange(value)` | `signed_change_rate` 기반 `+/-` 부호 포함 % 표기 |
| `formatVolume(value)` | 백만 단위 환산 후 천 단위 콤마 표기 |

---

### 1.3 CoinHeader.vue

**파일 역할**

선택된 종목의 상세 요약 정보를 상단에 표시하는 헤더 컴포넌트. 현재가, 전일대비, 당일 고가/저가, 24H 거래대금을 `summary-grid` 4열 레이아웃으로 보여준다. Upbit(KRW) / Binance(USDT) 거래소에 따라 통화 단위를 자동 분기 표시한다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `ticker` | Object | 선택된 종목의 전체 데이터 객체 |

**포맷터 함수**

| 함수 | 처리 내용 |
|------|-----------|
| `formatPrice(value, exchange)` | 거래소별 통화 단위 분기 (`KRW` \| `USDT`) |
| `formatChange(value)` | 부호 포함 % 표기 |
| `formatVolume(value, exchange)` | 백만 단위 환산, 단위 텍스트 분기 (`백만 KRW` \| `M USDT`) |

---

### 1.4 CoinChart.vue

**파일 역할**

`lightweight-charts` v5 라이브러리를 사용한 캔들스틱 차트 컴포넌트. `candles` prop을 watch하여 종목 변경 시 차트 데이터를 자동 교체한다. `ResizeObserver`로 컨테이너 너비 변화를 감지해 반응형으로 동작하며, `onUnmounted`에서 메모리를 명시적으로 정리한다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `ticker` | Object | 선택된 종목 정보 (툴바 표시용) |
| `candles` | Array | OHLC 캔들 데이터 배열 |

**캔들 데이터 구조**

```js
{
  time: "2025-06-27",   // YYYY-MM-DD
  open: 140500000,
  high: 143200000,
  low:  139800000,
  close: 142000000
}
```

---

## 2. 구현된 기능

### 2.1 거래소 탭 전환

**구현 파일:** `CoinList.vue`

Upbit / Binance / 관심목록 3개 탭으로 구성된 거래소 전환 UI. Upbit·Binance 탭 클릭 시 `update:exchange` emit으로 부모 컴포넌트에 거래소 변경을 알리고, 부모가 해당 거래소의 `tickers`를 내려준다. 관심목록 탭은 emit 없이 컴포넌트 내부에서 `allTickers`를 쿠키 favorites와 교차 필터링하여 처리한다.

| 탭 | 동작 |
|----|------|
| `UPBIT` | `update:exchange` emit → 부모에서 Upbit tickers 공급 |
| `BINANCE` | `update:exchange` emit → 부모에서 Binance tickers 공급 |
| `FAVORITES` | 내부 처리 — `allTickers`에서 쿠키 favorites 교차 필터 |

---

### 2.2 관심목록 (즐겨찾기)

**구현 파일:** `CoinList.vue`, `CoinListItem.vue`

`js-cookie` 라이브러리를 사용해 `mock_favorites` 키로 관심 종목 코드 배열을 브라우저 쿠키에 30일 저장한다. 로그인 없이 비회원 상태에서도 관심목록이 유지된다.

| 항목 | 내용 |
|------|------|
| 저장 방식 | `js-cookie` → `mock_favorites` 키, 30일 만료 |
| 등록/해제 | `CoinListItem`의 ★/☆ 클릭 → `toggle-fav` emit → `toggleFavorite()` |
| 빈 상태 | 관심목록 탭에서 목록이 없을 때 `"관심목록에 추가된 코인이 없습니다."` 표시 |

---

### 2.3 종목 선택 및 하이라이트

**구현 파일:** `CoinList.vue`, `CoinListItem.vue`

`CoinListItem` 클릭 시 `select` emit → `CoinList`에서 `select-coin` emit으로 부모에 `market_code` 전달. 부모가 `selectedMarketCode` prop으로 내려주면 해당 행에 `.selected` 클래스가 적용되어 배경색으로 현재 선택 종목을 시각적으로 표시한다.

---

### 2.4 종목 검색

**구현 파일:** `CoinList.vue` + `global.css`

검색 입력값(`searchQuery`)을 `filteredTickers` computed에서 실시간 필터링. 탭 전환 후에도 검색 상태가 유지된다.

| 항목 | 내용 |
|------|------|
| 검색 대상 필드 | `korean_name`, `english_name`, `symbol`, `market_code` 4개 필드 |
| 대소문자 | `.toLowerCase()` 처리로 대소문자 구분 없음 |
| 빈 결과 처리 | `"검색 결과가 없습니다."` 안내 메시지 표시 |
| API 추가 | 없음 (클라이언트 computed 필터) |

> 원래 명세(2개 필드)보다 확장 구현 — `english_name`, `symbol` 필드 추가

---

### 2.5 컬럼별 정렬

**구현 파일:** `CoinList.vue` + `global.css`

`list-header`의 각 컬럼을 `<button>`으로 구현하여 클릭 시 해당 컬럼으로 정렬. 동일 컬럼 재클릭 시 `asc ↔ desc` 방향이 토글되며 `▲/▼` 화살표로 현재 상태를 표시한다. 검색 결과(`filteredTickers`)에 체이닝되어 검색과 정렬이 동시에 작동한다.

| 컬럼 | 정렬 기준 필드 | 정렬 타입 |
|------|---------------|-----------|
| 종목 | `korean_name` | 문자열 (`localeCompare`) |
| 현재가 | `trade_price` | 숫자 |
| 전일대비 | `signed_change_rate` | 숫자 |
| 거래대금 | `acc_trade_price_24h` | 숫자 |

| 항목 | 내용 |
|------|------|
| 초기값 | `sortKey = null` (서버 수신 순서 유지) |
| 방향 표시 | 활성 컬럼에 `.sort-arrow` 클래스로 `▲ / ▼` 표시 |
| API 추가 | 없음 (클라이언트 `.sort()` 처리) |

---

### 2.6 가격 포맷 및 등락 색상

**구현 파일:** `CoinListItem.vue`, `CoinHeader.vue`

가격 크기와 거래소에 따라 포맷을 자동 분기한다. `change` 필드(`RISE` / `FALL`)에 따라 CSS 클래스를 바인딩하여 상승은 빨간색(`--upbit-red`), 하락은 파란색(`--upbit-blue`)으로 표시한다.

| 조건 | 소수점 | 거래소별 단위 |
|------|--------|--------------|
| `value < 10` | 4자리 | Upbit → KRW, Binance → USDT |
| `value < 1000` | 2자리 | |
| 그 외 | 0자리 | |

---

### 2.7 가격 변동 Flash 애니메이션

**구현 파일:** `CoinListItem.vue` + `global.css`

`trade_price`를 `watch`하여 이전값 대비 변동이 감지되면 행 전체에 0.45초 배경 Flash 애니메이션을 적용한다.

| 변동 방향 | CSS 클래스 | 색상 |
|-----------|-----------|------|
| 상승 | `.flash-up` | 빨간 배경 (`rgba(210,79,69,0.18)`) → 투명 |
| 하락 | `.flash-down` | 파란 배경 (`rgba(18,97,196,0.18)`) → 투명 |

---

### 2.8 종목 상세 헤더

**구현 파일:** `CoinHeader.vue`

선택 종목의 요약 정보를 4열 그리드로 표시한다. 거래소(`exchange`) prop에 따라 통화 단위가 자동 분기되므로 Upbit·Binance 종목을 동일한 컴포넌트로 처리할 수 있다.

| 표시 항목 | 설명 |
|-----------|------|
| 심볼 배지 | `symbol` 텍스트 기반 원형 배지 |
| 한글명 / 영문명 | `korean_name` / `english_name` |
| 거래소 + Binance 심볼 | `exchange` · `binance_symbol` |
| 유의 종목 배지 | `market_warning === 'CAUTION'`일 때 노란 '유의' 뱃지 |
| 현재가 + 등락률 | 거래소별 통화 단위 분기 |
| 당일 고가 / 저가 | `high_price` / `low_price` |
| 24H 거래대금 | 백만 단위 환산, 거래소별 단위 분기 |

---

### 2.9 캔들스틱 차트

**구현 파일:** `CoinChart.vue`

`lightweight-charts` v5의 `CandlestickSeries`를 사용한 OHLC 차트. 종목 변경 시 `candles` prop watch로 `setData()` + `fitContent()`를 자동 실행한다.

| 항목 | 내용 |
|------|------|
| 라이브러리 | `lightweight-charts` v5 (`addSeries(CandlestickSeries)` 방식) |
| 상승 색상 | `#d24f45` (업비트 빨강) |
| 하락 색상 | `#1261c4` (업비트 파랑) |
| 반응형 | `ResizeObserver`로 컨테이너 너비 변화 자동 감지 |
| 메모리 정리 | `onUnmounted`에서 `ResizeObserver` disconnect + `chart.remove()` |

---

## 전체 진행 현황 요약

| 순위 | 기능명 | 상태 | 관련 파일 | API 필요 |
|:----:|--------|:----:|-----------|:--------:|
| — | 거래소 탭 전환 | ✅ 완료 | CoinList.vue | ❌ |
| — | 관심목록 (즐겨찾기) | ✅ 완료 | CoinList.vue, CoinListItem.vue | ❌ |
| — | 종목 선택 및 하이라이트 | ✅ 완료 | CoinList.vue, CoinListItem.vue | ❌ |
| — | 가격 포맷 및 등락 색상 | ✅ 완료 | CoinListItem.vue, CoinHeader.vue | ❌ |
| — | Flash 애니메이션 | ✅ 완료 | CoinListItem.vue, global.css | ❌ |
| — | 종목 상세 헤더 | ✅ 완료 | CoinHeader.vue | ❌ |
| — | 캔들스틱 차트 | ✅ 완료 | CoinChart.vue | ❌ |
| 1 | 종목 검색 (Search) | ✅ 완료 | CoinList.vue, global.css | ❌ |
| 2 | 컬럼별 정렬 (Sorting) | ✅ 완료 | CoinList.vue, global.css | ❌ |
| 3 | 차트 주기 변경 (Timeframe) | 🔲 예정 | CoinChart.vue + 부모 | 파라미터 추가 |
| 4 | 자산 분류 탭 필터 (Category) | 🔲 예정 | CoinList.vue | 신규 상장만 |
| 5 | 외부 거래소 링크 (Quick Links) | 🔲 예정 | CoinHeader.vue | ❌ |
| 6 | 실시간 체결 내역 (Trade History) | 🔲 예정 | TradeHistory.vue (신규) | 필요 |

---

## 3. 구현 예정 기능

### 3.1 차트 주기 변경 (Timeframe)

**구현 예정 파일:** `CoinChart.vue` + 부모 컴포넌트

**기능 설명**

차트 상단 툴바에 `[1m | 1H | 1D | 1W]` 버튼 그룹을 추가하여 사용자가 캔들 주기를 전환할 수 있도록 한다. 버튼 클릭 시 `@change-timeframe` emit으로 부모에 주기를 전달하고, 부모가 해당 주기에 맞는 `/api/candles?unit_code=` API를 재호출하여 `candles` prop을 갱신한다. `candles` watch 구조가 이미 완성되어 있어 prop만 업데이트되면 차트가 자동 갱신된다.

| 항목 | 현재 상태 | 필요 작업 |
|------|-----------|-----------|
| 툴바 영역 | `.chart-toolbar` 존재, 버튼 없음 | `[1m \| 1H \| 1D \| 1W]` 버튼 그룹 추가 |
| 주기 상태 | 없음 | `timeframe ref` 추가 (기본값 `'D'`) |
| 이벤트 | 없음 | 클릭 시 `@change-timeframe` emit |
| 차트 갱신 | `candles` prop watch 완성 | 부모에서 API 재호출 후 prop 갱신만 하면 됨 |
| API | 없음 | `/api/candles?market_code=&unit_code=` 파라미터 추가 |

**예상 추가 코드 범위**

```
CoinChart.vue   — 툴바 버튼 + timeframe ref + emit    (~15줄)
부모 컴포넌트   — timeframe watch + API 재호출         (~10줄)
global.css      — 툴바 버튼 스타일                     (~10줄)
```

---

### 3.2 자산 분류 탭 필터 (Category Filter)

**구현 예정 파일:** `CoinList.vue`

**기능 설명**

거래소 탭 하단에 카테고리 필터 행을 추가하여 `[전체 | 상승률 상위 | 거래대금 상위]` 버튼으로 목록을 빠르게 분류할 수 있게 한다. 상승률·거래대금 필터는 이미 존재하는 필드를 클라이언트에서 정렬/슬라이싱하여 처리하므로 API 추가가 필요 없다. 신규 상장 필터는 `is_new` 필드가 없어 백엔드 추가가 필요하다.

| 필터 항목 | 사용 필드 | 처리 방식 | API 필요 |
|-----------|-----------|-----------|:--------:|
| 전체 | — | 필터 없음 | ❌ |
| 상승률 상위 | `signed_change_rate` | 내림차순 정렬 + 상위 N개 슬라이스 | ❌ |
| 거래대금 상위 | `acc_trade_price_24h` | 내림차순 정렬 + 상위 N개 슬라이스 | ❌ |
| 신규 상장 | `is_new` (미존재) | — | ✅ 백엔드 필드 추가 필요 |

---

### 3.3 외부 거래소 링크 연결 (Quick Links)

**구현 예정 파일:** `CoinHeader.vue`

**기능 설명**

`CoinHeader.vue`의 `summary-grid` 하단에 링크 영역을 추가하여 현재 선택된 종목의 실제 거래소 페이지로 바로 이동할 수 있도록 한다. 이미 `ticker.market_code`, `ticker.binance_symbol`, `ticker.exchange` 필드가 존재하므로 템플릿 리터럴로 URL을 동적 생성하기만 하면 된다. 코드 추가·API 추가 없이 템플릿 수정만으로 완성 가능하다.

| 거래소 | 링크 패턴 | 조건 |
|--------|-----------|------|
| Upbit | `https://upbit.com/exchange?code=CRIX.UPBIT.{market_code}` | `exchange === 'UPBIT'` |
| Binance | `https://www.binance.com/en/trade/{binance_symbol}` | `exchange === 'BINANCE'` |

---

### 3.4 실시간 체결 내역 (Trade History)

**구현 예정 파일:** `TradeHistory.vue` (신규) + `global.css` 레이아웃 변경

**기능 설명**

선택된 종목의 실시간 체결 내역을 시간 역순으로 표시하는 신규 컴포넌트. 새 체결 데이터가 들어올 때 `unshift()`로 배열 최상단에 추가하고 최대 N개를 유지한다. `CoinListItem`과 유사한 행 구조를 재사용할 수 있어 UI 작업량이 적다. 단, 데이터 공급을 위한 API 또는 WebSocket 연동이 필요하며 `.workspace` 레이아웃 조정도 함께 필요하다.

| 항목 | 내용 |
|------|------|
| 컴포넌트 | `TradeHistory.vue` 신규 생성 |
| 레이아웃 변경 | `.workspace` 2열 → 3열 또는 차트 하단 배치 |
| 데이터 구조 | `trades[]` — 체결시간, 체결가, 체결량, `RISE` \| `FALL` |
| 갱신 방식 | `unshift()` 상단 추가 + 최대 N개 유지 |
| API | `GET /api/trades?market_code=xxx` 또는 WebSocket |
