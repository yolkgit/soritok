#!/bin/bash
set -e

echo "🚀 소리톡 배포 시작..."

if [ ! -f .env ]; then
  echo "❌ .env 가 없습니다. 'cp .env.example .env' 후 값을 채우세요."
  exit 1
fi

echo "📥 최신 코드 가져오기..."
git pull

echo "🛑 기존 컨테이너 중지..."
docker compose down

echo "🔨 이미지 빌드..."
# BuildKit 사용 + 기본 어테스테이션(provenance/sbom) 비활성화
#  → "resolving provenance for metadata file" 단계로 멈춘 듯 보이는 현상 제거 + 빌드/export 가속
export DOCKER_BUILDKIT=1
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
docker compose build

echo "🟢 컨테이너 실행..."
docker compose up -d

# .env 의 WEB_PORT 읽어 안내
WEB_PORT=$(grep -E '^WEB_PORT=' .env | cut -d= -f2)
WEB_PORT=${WEB_PORT:-8080}

echo "✅ 배포 완료! http://<서버IP>:${WEB_PORT} 에서 확인하세요."
echo "💡 컨테이너 시작 시 'prisma db push' 로 DB 스키마(신규 테이블 포함)가 자동 반영됩니다."
docker compose ps
