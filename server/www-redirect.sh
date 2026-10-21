#!/usr/bin/env bash
# www.soritok.com → soritok.com 301 을 운영 nginx 설정에 넣는다 (여러 번 돌려도 같음).
# 사용: bash server/www-redirect.sh
set -euo pipefail
CONF=/etc/nginx/sites-available/soritok
LINE='if ($host = www.soritok.com) { return 301 https://soritok.com$request_uri; }'
if sudo grep -qF 'return 301 https://soritok.com$request_uri' "$CONF"; then
    echo "이미 들어가 있음"; exit 0
fi
BK="$CONF.bak-$(date +%Y%m%d_%H%M%S)"
sudo cp "$CONF" "$BK"
# www.soritok.com 이 들어 있는 server_name 줄마다 바로 뒤에 넣는다 (80, 443 블록 모두)
sudo sed -i "/server_name[^;]*www\.soritok\.com/a\\    $LINE" "$CONF"
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "적용 완료 (백업 $BK)"
    curl -sI https://www.soritok.com/slow7/ | grep -iE '^(HTTP|location)'
else
    sudo cp "$BK" "$CONF"; echo "nginx 설정 오류로 되돌림"; exit 1
fi
