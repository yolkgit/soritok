# syntax=docker/dockerfile:1
# Base Image for Node.js
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Prisma requires openssl. We install openssl to handle libssl needs
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# Install OpenSSL in the builder stage as well for Prisma generator
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules

# 스키마만 먼저 복사 → 소스만 바뀌면 prisma generate 를 건너뛴다(캐시)
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

# Next 빌드 캐시를 BuildKit 캐시에 보존 → 재빌드 시 증분 컴파일
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
# Production runtime requires OpenSSL as well
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Ensure necessary writable directories for volumes
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app/prisma

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Copy schema so prisma can apply it on startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# 런타임 db push 용 prisma CLI 를 독립 경로에 완전 설치(의존성 포함)
RUN mkdir /prisma-cli && cd /prisma-cli && npm init -y >/dev/null 2>&1 \
    && npm install prisma@5.22.0 --no-audit --no-fund \
    && chown -R nextjs:nodejs /prisma-cli

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Note: server.js is created by next build from the standalone output
# 시작 시 prisma db push 로 스키마 자동 반영(마이그레이션 파일 없음)
CMD /prisma-cli/node_modules/.bin/prisma db push --skip-generate --schema /app/prisma/schema.prisma && node server.js
