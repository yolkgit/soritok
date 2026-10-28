#!/usr/bin/env bash
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo"
if test -n "$(git status --porcelain --untracked-files=no)"; then
  printf 'Tracked source has local changes; commit or resolve them before deployment.\n' >&2
  exit 1
fi
git pull --ff-only
export DAYTONA_COMMIT=$(git rev-parse HEAD)
export DAYTONA_TAG=${DAYTONA_COMMIT:0:12}
compose=(docker compose -p daytona -f "$repo/deploy/daytona.compose.yaml")
"${compose[@]}" build daytona
"${compose[@]}" up -d --no-deps --wait --wait-timeout 60 daytona
"${compose[@]}" ps daytona
printf 'Deployed yolkgit/soritok commit %s\n' "$DAYTONA_COMMIT"
printf 'https://daytona.soritok.com/racing/\n'
