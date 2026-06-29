import axios from 'axios'

// 기본은 상대경로(/api/v1). vite dev proxy(vite.config.js)가 localhost:8080 으로 전달한다.
// 다른 호스트로 붙으려면 .env 의 VITE_API_BASE 를 지정.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
})

// 공통 응답 Envelope({ success, data, error }) 에서 data 만 추출.
// 래퍼 없이 본문을 바로 주는 응답도 그대로 통과시킨다.
export const unwrap = (res) => {
  const body = res.data
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) {
      const err = body.error ?? {}
      throw new Error(err.message || err.code || 'API error')
    }
    return body.data
  }
  return body
}
