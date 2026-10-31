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
not in a shared server database. No visitor memo or online multiplayer is claimed.

## Verification limits

Desktop browser play and mobile viewport layout are tested separately from
automated ROM/input tests. Physical iPhone/Android multitouch, Safari Home Screen
installation, platform-specific orientation lock and full-game completion
still require physical-device or longer-play verification.
