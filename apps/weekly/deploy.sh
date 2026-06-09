#!/bin/bash

echo "🚀 배포(Deployment) 프로세스를 시작합니다..."

# 1. GitHub에서 최신 코드 가져오기
echo "📥 Git에서 최신 코드를 가져오는 중..."
git pull

# 2. 기존 컨테이너 중지
echo "🛑 기존 도커 컨테이너 중지 중..."
sudo docker-compose down

# 3. 새로운 도커 이미지 빌드 (캐시 사용 안 함을 원하시면 docker-compose build --no-cache 사용)
echo "🔨 도커 이미지 빌드 중..."
sudo docker-compose build

# 4. 컨테이너 백그라운드에서 실행
echo "🟢 컨테이너 실행 중..."
sudo docker-compose up -d

echo "✅ 배포가 완료되었습니다!"
echo "💡 참고: 컨테이너가 실행되면서 자동으로 'npx prisma db push'를 수행하여 DB를 최신 상태로 맞춥니다."
