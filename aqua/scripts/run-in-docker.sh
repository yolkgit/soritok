#!/usr/bin/env bash
# aquado 도감 생성기 실행 (일회용 node 컨테이너 · 기존 서비스 무영향)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="$HOME/soritok/.env"
API_KEY=$(grep "^ANTHROPIC_API_KEY=" "$HOME/slow7-wp/slow7-bot/.env" | cut -d= -f2-)
DB_URL=$(grep "^AQUA_DATABASE_URL=" "$ENV_FILE" | cut -d= -f2-)

# 이미지 생성용 키 (없거나 플레이스홀더면 빈 값으로 넘긴다)
read_key() { # $1=키이름
  local v
  v=$(grep "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  case "$v" in your*|YOUR*|"") echo "" ;; *) echo "$v" ;; esac
}
GEM_KEY=$(read_key GEMINI_API_KEY)
OAI_KEY=$(read_key OPENAI_API_KEY)

docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "$PWD":/work -w /work \
  -v soritok_aqua_uploads:/uploads \
  -e ANTHROPIC_API_KEY="$API_KEY" \
  -e GEMINI_API_KEY="$GEM_KEY" \
  -e OPENAI_API_KEY="$OAI_KEY" \
  -e DATABASE_URL="$DB_URL" \
  -e AQUA_UPLOAD_DIR=/uploads \
  -e SCRIPT="${SCRIPT:-scripts/generate-cards.mjs}" \
  node:20-slim bash -lc '
    apt-get update -qq && apt-get install -y -qq openssl >/dev/null 2>&1
    npm i --no-save --silent @anthropic-ai/sdk @prisma/client prisma sharp >/dev/null 2>&1
    npx prisma generate --schema prisma/schema.prisma >/dev/null 2>&1
    node "$SCRIPT" '"$*"'
  '
