# File: infra/docker/frontend.Dockerfile

# --------------------------------------------------
# Frontend Dockerfile (Next.js App Router)
# --------------------------------------------------
# Production-grade:
# - Multi-stage build
# - Optimized output
# - Non-root runtime
# - Suitable for CDN / ingress
# --------------------------------------------------

# --------------------------------------------------
# Frontend Dockerfile (Next.js App Router)
# --------------------------------------------------

# --------------------------------------------------
# Frontend Dockerfile (Next.js App Router)
# --------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# --------------------------------------------------
# Build stage
# --------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 🔑 Accept build-time args
ARG BACKEND_BASE_URL
ARG NEXT_PUBLIC_BACKEND_BASE_URL

# 🔑 Expose them to Next.js (SERVER + CLIENT)
ENV BACKEND_BASE_URL=$BACKEND_BASE_URL
ENV NEXT_PUBLIC_BACKEND_BASE_URL=$NEXT_PUBLIC_BACKEND_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY frontend .

RUN npm run build

# --------------------------------------------------
# Runtime stage
# --------------------------------------------------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

USER nextjs
CMD ["npm", "start"]
