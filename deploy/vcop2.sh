#!/usr/bin/env bash
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo"
if test -n "$(git status --porcelain --untracked-files=no)"; then
  printf 'Tracked source has local changes; commit or resolve them first.\n' >&2
  exit 1
fi
git pull --ff-only
export VCOP2_COMMIT=$(git rev-parse HEAD)
export VCOP2_TAG=${VCOP2_COMMIT:0:12}
export VCOP2_RUNTIME_ASSETS=${VCOP2_RUNTIME_ASSETS:-/home/dhind/vcop2/runtime-assets/current}
python3 services/vcop2/verify_runtime.py "$VCOP2_RUNTIME_ASSETS"
docker compose config --quiet
compose=(docker compose -p vcop2 -f "$repo/deploy/vcop2.compose.yaml")
"${compose[@]}" build vcop2
"${compose[@]}" up -d --no-deps --wait --wait-timeout 60 vcop2
web_image=$(docker inspect soritok_web --format '{{.Config.Image}}')
network=${SORITOK_NETWORK:-soritok_default}
docker run --rm --network "$network" --entrypoint nginx \
  -v "$repo/nginx.conf:/etc/nginx/conf.d/default.conf:ro" "$web_image" -t
# Only web is recreated for its config mount; API, other games and DBs stay separate.
docker compose up -d --no-deps --no-build web
docker exec soritok_web nginx -t
curl --fail --silent http://127.0.0.1:3212/healthz
printf '\nDeployed soritok commit %s\nhttps://soritok.com/vcop2/\n' "$VCOP2_COMMIT"
