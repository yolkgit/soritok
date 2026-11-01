# Virtua Cop 2 production service

User-approved destination: the existing yolkgit/soritok repository and server,
as an independent original-ROM game. Public route: https://soritok.com/vcop2/.

## Layout

- services/vcop2/: browser wrapper, WASM bridge/shaders and reproducible scripts.
- deploy/vcop2.compose.yaml: independent project/service vcop2; loopback 3212.
- Existing soritok_default network connects only its /vcop2/ reverse-proxy route.
- Main web mounts the tracked nginx.conf read-only. This changes proxy routes
  without rebuilding any frontend app. Existing host nginx and TLS remain intact.
- Existing Daytona/Galpanic containers, API, database and upload volumes are separate.
- External assets: /home/dhind/vcop2/runtime-assets/<release>/, mounted read-only.
  ROM, WASM, DBs, credentials and server keys are never committed.

The existing source checkout is /home/dhind/soritok, branch main.
The host's 3211 port belongs to another game; VCOP2 uses 3212.

## Package and deploy

1. Validate the original ROM, rebuild WASM and run the service tests.
2. Run python package_runtime.py <ignored-output-directory> from the service.
   It produces a flat runtime, all SHA-256 receipts and full corresponding
   source (public emulator sources plus modified bridge/shaders, no ROM).
3. Copy that verified directory into a new versioned external asset directory.
   Run python3 services/vcop2/verify_runtime.py <directory> on the server.
4. Commit/push only reviewed source changes to yolkgit/soritok.
5. In the clean server checkout run:
   VCOP2_RUNTIME_ASSETS=<absolute-release-directory> bash deploy/vcop2.sh
6. Check https://soritok.com/vcop2/healthz: ready=true and revision exactly equals
   the pushed commit. Check WASM/ROM headers, then play the public URL.

The script starts only vcop2 and waits for health. It tests the updated proxy
configuration in the active web image before recreating only the web proxy
for its configuration mount. It does not restart API/database/other games.
A failed preflight leaves the existing web proxy running.

The worker verifies WASM and original ROM hashes; immutable URLs include hashes.
Version manifests use no-cache. NVRAM and EEPROM persist in each browser origin,
not in a shared server database. One-line memos use an independent persistent vcop2-data SQLite volume.
Online rooms synchronize the two original guns via same-origin HTTP, with
version checks, authenticated slots, bounded input history and periodic RAM checks.

## Verification limits

Desktop browser play and mobile viewport layout are tested separately from
automated ROM/input tests. Physical iPhone/Android multitouch, Safari Home Screen
installation, platform-specific orientation lock and full-game completion
still require physical-device or longer-play verification.

## Cooperative rooms and memo persistence

The VCOP2 image now requires Node's built-in SQLite and owns /app/data as the
unprivileged node user. Keep the named vcop2-data volume on updates; do not
remove/recreate it. Native ROM assets remain in the separate read-only mount.
Do not commit the database, cookies, room tokens or snapshot buffers.

The /vcop2/api/memos and /vcop2/api/rooms routes go through the existing proxy.
No host nginx/TLS or WebSocket upgrade changes are required. Room state is
temporary: restarting VCOP2 ends active rooms; clients must make/rejoin a room.
Memo records and author access secrets survive service updates in SQLite.

Run test_two_player.mjs, test_api.mjs and browser two-client checks when changing
the synchronization protocol, bridge state format, roles or memo permissions.
After deploying a changed games-list label, rebuild only the soritok web image
and recreate only web; deploy/vcop2.sh itself does not rebuild those frontend apps.
