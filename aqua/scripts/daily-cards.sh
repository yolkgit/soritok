#!/usr/bin/env bash
# aquado 도감 하루 10종 자동 생성 + 이미지 채우기 (cron 용)
#
# 1단계: 카드 본문·스탯 생성 (이미지 없이)
# 2단계: 사진이 빈 카드 채우기 — iNaturalist CC 실사진 우선, 없으면 AI 생성
# 3단계: 가상 어항용 부가정보 — 누끼(배경 제거)·유영층·활동성·바라보는 방향
#
# 2·3단계는 --limit 로 상한을 둔다. 오류로 빈 카드가 쌓여도 하룻밤에
# 과도하게 생성(=비용)되지 않게 하는 안전장치이며, 밀린 분은 다음 날 이어서 채운다.
# 3단계 없이는 새 종이 어항에서 사각 사진으로 떠다닌다(누끼가 없으므로).
set -uo pipefail
cd "$(dirname "$0")/.."
LOG_DIR="$HOME/soritok/aqua/logs"
mkdir -p "$LOG_DIR"
TS=$(date +%Y%m%d_%H%M%S)
LOG="$LOG_DIR/cards_$TS.log"

echo "=== [1/2] 카드 생성 $(date) ===" >> "$LOG"
./scripts/run-in-docker.sh --limit 10 >> "$LOG" 2>&1

echo "=== [2/3] 사진 채우기 $(date) ===" >> "$LOG"
SCRIPT=scripts/generate-images.mjs ./scripts/run-in-docker.sh --limit 15 >> "$LOG" 2>&1

echo "=== [3/3] 어항용 부가정보(누끼·유영층·활동성·방향) $(date) ===" >> "$LOG"
SCRIPT=scripts/enrich-cards.mjs ./scripts/run-in-docker.sh --limit 15 >> "$LOG" 2>&1

echo "[$(date)] 완료 → logs/cards_$TS.log"
find "$LOG_DIR" -name "cards_*.log" -mtime +30 -delete 2>/dev/null || true
