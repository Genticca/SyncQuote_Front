# syntax=docker/dockerfile:1
# SyncQuote Front (Vue 3 + Vite) — 빌드 후 정적 파일을 nginx로 서빙

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# .env.production 의 VITE_API_BASE=/api/v1 가 자동 적용된다.
# 다른 값이 필요하면 --build-arg VITE_API_BASE=... 로 덮어쓴다.
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
