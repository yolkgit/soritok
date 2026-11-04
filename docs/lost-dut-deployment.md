# Lost Dutchman HD

Source: https://github.com/yolkgit/lost-dut (separate repository).
Public game: https://soritok.com/lost-dut/
Game list: https://soritok.com/games/

The independent `lost-dut` Compose project joins `soritok_default` under the
`lost-dut` service alias. Its unprivileged, read-only Node container serves the
new 3D game on port 3000, with loopback-only host port 3215.

This repository owns only the `/lost-dut/` nginx proxy route and games-list
card. Game code, assets, tests, image and release script belong to yolkgit/lost-dut.
Original DOS binaries and analysis data are not deployed.

On the server, `/home/dhind/lost-dut/deploy.sh` validates and deploys only that
game. `/lost-dut/healthz` reports the exact lost-dut source revision.
For changes to this list or proxy, build only the soritok `web` image, validate
nginx configuration before switching, and recreate only `web` with `--no-deps`.
API, Aqua, databases and all existing game containers keep their state.
