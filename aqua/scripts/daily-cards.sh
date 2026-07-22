#!/usr/bin/env bash
# aquado 도감 하루 10종 자동 생성 (cron 용)
set -uo pipefail
cd "$(dirname "$0")/.."
LOG_DIR="$HOME/soritok/aqua/logs"
mkdir -p "$LOG_DIR"
TS=$(date +%Y%m%d_%H%M%S)
./scripts/run-in-docker.sh --limit 10 >> "$LOG_DIR/cards_$TS.log" 2>&1
echo "[$(date)] 완료 → logs/cards_$TS.log"
find "$LOG_DIR" -name "cards_*.log" -mtime +30 -delete 2>/dev/null || true
