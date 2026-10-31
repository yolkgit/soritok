# Virtua Cop 2 service

Use yolkgit/soritok as the source repository. Commit/push reviewed changes here
and deploy via bash deploy/vcop2.sh in /home/dhind/soritok.
Verify the public /vcop2/healthz revision against the pushed commit.

Keep original ROM behavior and data. Runtime assets live outside Git and are
mounted read-only. Never commit ROM/WASM packs, DBs, browser author data or keys.
Preserve existing Daytona, other games, TLS and persistent volumes.

Use the original/HD/input/server tests and actual browser play as appropriate.
Distinguish automated tests, browser viewport tests and physical-device checks.
