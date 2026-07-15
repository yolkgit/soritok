#!/bin/bash
set -e

# 전체를 함수로 감싸 bash 가 파일을 끝까지 파싱한 뒤 실행하게 함
#  → git pull 이 deploy.sh 자신을 덮어써도 실행 중인 스크립트가 깨지지 않음
main() {
  echo "🚀 소리톡 배포 시작..."

  if [ ! -f .env ]; then
    echo "❌ .env 가 없습니다. 'cp .env.example .env' 후 값을 채우세요."
    exit 1
  fi

  echo "📥 최신 코드 가져오기..."
  git pull

  # BuildKit 사용 + 기본 어테스테이션(provenance/sbom) 비활성화
  #  → "resolving provenance for metadata file" 단계로 멈춘 듯 보이는 현상 제거 + 빌드/export 가속
  export DOCKER_BUILDKIT=1
  export BUILDX_NO_DEFAULT_ATTESTATIONS=1

  # 사용법:
  #   ./deploy.sh            → 전체 빌드 후 "이미지가 바뀐 컨테이너만" 교체 (무중단)
  #   ./deploy.sh aqua       → aqua 만 빌드/교체
  #   ./deploy.sh api web    → 여러 서비스 지정 가능 (api / aqua / web)
  local services=("$@")

  echo "🔨 이미지 빌드... (기존 컨테이너는 중단 없이 계속 서비스됩니다)"
  docker compose build "${services[@]}"

  echo "🔄 변경된 컨테이너만 교체..."
  docker compose up -d "${services[@]}"

  echo "🧹 사용하지 않는 이전 이미지 정리..."
  docker image prune -f >/dev/null 2>&1 || true

  # .env 의 WEB_PORT 읽어 안내
  local web_port
  web_port=$(grep -E '^WEB_PORT=' .env | cut -d= -f2)
  web_port=${web_port:-8080}

  echo "✅ 배포 완료! http://<서버IP>:${web_port} 에서 확인하세요."
  echo "💡 이미지가 바뀐 컨테이너만 재시작됩니다 (api/aqua 시작 시 prisma db push 자동 반영)."
  docker compose ps
}

main "$@"
