# Lost Dutchman HD

Source: https://github.com/yolkgit/lost-dut (separate repository).
Public game: https://soritok.com/lost-dut/
Game list: https://soritok.com/games/

The independent `lost-dut` Compose project joins `soritok_default` under the
`lost-dut` service alias. Its unprivileged, read-only Node container serves the
original DOS game with presentation-only HD upscaling on port 3000, with
loopback-only host port 3215. Original executable/data and the DOSBox engine
are verified by SHA-256 in an independent read-only runtime-assets mount.

This repository owns only the `/lost-dut/` nginx proxy route and games-list
card. Game code, assets, tests, image and release script belong to yolkgit/lost-dut.
Original DOS binaries are outside Git; the runtime serves the user-supplied
game data unchanged, plus locally hosted emulators8.5.2 and its GPL source.

On the server, `/home/dhind/lost-dut/deploy.sh` validates and deploys only that
game. `/lost-dut/healthz` reports the exact lost-dut source revision.
For changes to this list or proxy, build only the soritok `web` image, validate
nginx configuration before switching, and recreate only `web` with `--no-deps`.
API, Aqua, databases and all existing game containers keep their state.
