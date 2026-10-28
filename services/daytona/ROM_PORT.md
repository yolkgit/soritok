# Actual user-ROM web port

This replaces the active APEX game with the supplied **daytona.zip (1994 Revision A)** program. The former procedural racing game remains in Git history and unused source directories; none of it is imported by `rom-web/` or included in `out/`.

## What runs

- Original i960 ROM program: 38,001 decoded instructions in 26 generated translation units.
- Original uploaded MB86233 TGP program: 2,024 words, compiled to C++.
- Original 68000 sound program with MultiPCM sample ROMs and YM3438 synthesis.
- Original models, tracks, textures, tile layers, course selection, race logic and cameras.
- Original service-menu inputs set FREE PLAY and SINGLE / MASTER / SLAVE cabinet profiles; the resulting 128-byte cabinet EEPROM is configuration, not recovered ROM data.

Runtime and code generator: `alphanu1/daytona-arcade-recomp`, pinned to `f32c48ff9b9bb41ecc7a25d9998c281b9bd0952c`. Emscripten **4.0.23** compiles the original-program translations and hardware runtime to WebAssembly. SoftFloat and ymfm pins/notices are retained in `rom-web/renderer-license.txt`.

Input ZIP SHA-256: `e5d938e5fc4dc5d0fa5c8f443c95f8de3d37d3023951138f7af46cfc8256e704`.

## Rendering improvements

WebGL2 renders the original ROM polygon stream at fixed 3× internal resolution. This is real geometry rasterization at the selected resolution, not a screenshot filter. The shader preserves packed Model 2 texture addressing, perspective coordinates, bilinear/mip sampling, luma lookup and polygon ordering. Browser multisampling smooths polygon edges. The fixed expanded 16:9 viewport adds field of view. The original 2D tile graphics remain original-resolution assets.

## Run and build

`npm run dev` serves the Vinext Worker at http://127.0.0.1:3005/. `npm run build` verifies ROM artifacts, stages the game, and emits a Worker + static assets in dist/ with D1 room migrations. Node 22+, installed project dependencies, HTTPS or localhost, WebAssembly, WebGL2 and DecompressionStream are required.

Private generated artifacts live in ignored `.rom-build/`, or the directory selected by ROM_WEB_ARTIFACTS. The original ZIPs, mapped ROM images, generated original-code translations and WASM/ROM pack are not committed to the source repository. They are present only in the authorized local build and deployment authorized by the user. A fresh source-only checkout needs those artifacts or a rebuild from the user's files.

The original build workspace is the sibling `rom-runtime/` directory in this task. `rom-port/` retains the bridge, overlays, compiler recipes and verification scripts for inspection. Its scripts are snapshots from that workspace, not a claim that missing private build inputs can be downloaded automatically. Rebuilding uses the pinned upstream checkout, the locally installed emsdk, and verified mapped images. No other ROM set is downloaded.

## Controls

1. Open the page: it initializes the WebAssembly game automatically and advances the original 240-frame cabinet diagnostic sequence offscreen. Click 레이스 시작 or press Enter once; the frontend sends Start only using the original FREE PLAY setting. No ROM picker or boot action is required.
2. Use Left/Right to choose a course/transmission; Up presses the original accelerator pedal to confirm. Original selection timers also apply.
3. WASD / arrows drive, 1–4 select original views, Z/X shift in manual mode, Esc pauses. Touch buttons support simultaneous steering and pedals.
4. Sound becomes audible after Play or a sound-toggle interaction, respecting browser autoplay restrictions. The expanded 16:9 / 3× HD display is fixed for solo and every online cabinet reset.

## Automatic web entry

Game assets are packaged with the website. The initial visit fetches them automatically; subsequent visits reuse a SHA-256-addressed CacheStorage entry. Cache reads and downloads are both verified. A corrupt entry is discarded and fetched again; denied/full cache storage falls back to ordinary downloading. No input ZIP, installation or emulator setup is exposed to the player. Original-program provenance and accuracy limits remain in the game information and this document.

The Play action presses Start for ten original frames and never pulses a coin input. FREE PLAY is original service-menu setting 27; no credit RAM is patched. It uses original cabinet inputs and does not patch game RAM. Pedals still confirm the original course/transmission selections. Sound starts only after user interaction, respecting browser autoplay restrictions.

`node scripts/test-web-start.mjs` checks fresh/warm loads, corrupt/disabled/full storage, download integrity and HTTP failures. It also runs the original game through automatic warmup and a single Play action for 1,740 original frames.

## Web motion correction

The current web input adapter accepts digital keyboard intentions (left, right, accelerate, brake) rather than simulated physical pedal positions. Acceleration is full on the first held frame, release immediately coasts, and brake immediately overrides acceleration. A key tap makes a small steering correction; a sustained hold builds to 65% of physical wheel range in 0.35 seconds. Neutral input releases steering quickly and opposite input crosses neutral within three original frames. This neutralizes only the control input, never car position or lane position.

The simulation uses the original absolute 57.524160147 Hz clock. Input behavior depends on original frames, not OS key-repeat timing. Rendering still presents the newest frame at requestAnimationFrame with bounded pending frames and preserved texture updates.

## Accuracy and limits

The supplied set lacks opr-14742a.45 and opr-14743a.46, the two TGP math tables. prepare_table_ports.py replaces those table ports with explicitly approximate sin/cos, atan, reciprocal and reciprocal-square-root functions. It does not invent table ROM bytes. Rounding/quantization may differ and no bit-exact claim is made. The original geometry engine uses the pinned runtime's documented MAME-derived HLE. GPU rasterization differs at pixel boundaries from the software reference. The modern upgrade currently concerns rendering resolution, viewport and web controls; models/textures are still the original assets. Online racing uses the original linked-cabinet program; the browser transport replaces only physical communication links.

## Validation

- Supplied ZIP and mapped ROM-region SHA-256 hashes recorded in rom-port/evidence/.
- Original code reached coin acceptance, original course selection UI, transmission selection, and an actual 40-car beginner race. Accelerating into the outer wall produced original sparks/collision behavior in captured frames.
- Software-reference run: 4,500 frames / 681,984,001 i960 instructions without a fault.
- GPU bridge regression: 3,101 frames / 469,962,753 instructions, 1,463,223 math-port reads, up to 3,716 real triangles; 10,799,464 original sound samples. Vertex floats finite; packed-region hashes match; 16:9 width 682 verified.
- Browser: ROM boot, course selection, player race, acceleration, 4× internal resolution (1984×1536), expanded 16:9, sound activation and 390×844 touch layout checked. Pause held frame 4598 unchanged between observations; resume continued. No browser console errors. The tested desktop usually reported 55–57 FPS. No claim of a completed race or all-course parity.

## FREE PLAY and original 2–4 player online link

The five 128-byte cabinet EEPROM profiles in rom-web/cabinet-profiles.json were produced by original service-menu inputs: FREE PLAY for both coin chutes, SINGLE for solo, MASTER car 1 and SLAVE cars 2–4 for multiplayer. rom-port/test_link.mjs runs four independent WASM machines and forwards the original communication-board byte stream around their ring. All linked at frame 416 with four unique cabinet IDs. At frame 2400 the original game showed a four-entry race (POSITION 1ST/4 and 3RD/4); each cabinet transmitted 14,239,620 bytes. The evidence JSON is rom-port/evidence/link-four.json.

Room membership, ready checks, private SDP/ICE inboxes and synchronized startup are served by the Sites Worker with D1. Browser peers use ordered reliable WebRTC data channels; each native cabinet receives its predecessor's bytes and sends to its successor. There is no fabricated ghost state or bot substitute. Four local browser clients reported three open peer links each and original cabinet count 4 with unique IDs. Backend tests reject a fifth player, invalid tokens, non-host starts, unready starts and late joins; disconnect closes the race. Production checks are recorded separately in outputs/.

STUN-only direct connectivity is configured. Restrictive NAT or firewall environments may require a TURN service, which is not configured. No claim of four physical devices or WAN latency testing. Public access was explicitly authorized by the user for anyone with the link.

Dependency audit: the public RSC runtime was patched from React 19.2.6 to 19.2.8 for GHSA-wx67-qw84-cm4g. Other reported findings concern unused starter tooling/dependencies or build-time tools; this is not a claim of a vulnerability-free dependency tree.

## Fixed wide HD and keyboard input

The worker applies 16:9 after every original game initialization, including online start and return to solo, and renders at scale 3 (2046×1152). No display toggles are exposed. The UI shows keyboard mode, acceleration/coast/brake state and a steering marker. Space is an additional brake key; camera, manual gears, original course selection, FREE PLAY and networking are preserved. test-motion.mjs covers first-frame acceleration, immediate coast/brake, short taps, long turns, reversals, repeated corrections, cancel/reset, fixed HD and 3100 original ROM frames. The existing original WASM/ROM asset hashes remain unchanged.

## Persistent menu selection

Course and transmission menus interpret wheel position as an absolute selection, so returning a released key to neutral used to select the left item again. The worker now recognizes the supplied Revision A menu titles from the native front tile layer before WebGL scaling (static title-region fingerprints, separate for course and transmission). In these two menus only, a new left/right press changes a discrete selection and retains its ADC value on release or blur. Enter/accelerator confirms through original inputs. Leaving the native menu clears the selection adapter and restores ordinary keyboard steering. No game RAM or car position is patched. test-menu-selection.mjs runs the original program, holds both choices for 90 released frames, switches both directions, confirms, and verifies neutral steering after leaving the menu.

## Full-width backdrop composition

The external GPU path exports a native 496-column tile backdrop centred in the 682-column bitmap and returns before the software compositor's fill_margins/stretch_backdrop step. The WebGL background pass now samples only the complete native art (using texel-centre bounds) across the wide viewport. This removes the flat padded side bands without cropping any original artwork. The separate foreground pass still samples its full width; HUD, native menus, polygon positions, original textures/audio, simulation and online transport are unchanged. No native core or ROM asset was rebuilt.

## Responsive play layout

The original HUD artwork, numbers, textures, audio and simulation are retained. The 16:9 game viewport now fits the available window height as well as width, so the complete native HUD and primary controls remain visible. A compact dock groups start/online/pause and camera controls, with live keyboard input immediately below. Help and sound/display settings are collapsible; touch controls appear only on coarse touch devices. Short landscape and fullscreen layouts reserve space for controls instead of cropping the game.

## Japanese lettering translated in place

`japanese-text.mjs` replaces recognized native Japanese text with Korean at the
same native tile resolution. It covers three course difficulty labels, the two
transmission labels, the time-attack shortcut, the two attract-mode view-button
messages and the fourth-gear rolling-start instruction. Nanum Myeongjo ExtraBold
glyphs retain the original serif character, slant, outline, shadow and sampled
palette. `japanese-text-data.mjs` contains newly rendered Hangul and original
shape fingerprints, without copies of the original Japanese bitmap artwork.

The renderer matches glyph silhouettes before changing their bounded rectangles;
unrecognized frames pass through unchanged. Menu titles, English, countdowns,
numeric HUD, models, audio, game rules, keyboard selection and online transport
are preserved. The replacement runs on every cabinet's shared renderer. Font
source and SIL OFL attribution are in `nanum-font-license.txt`. The native
regression is `node scripts/test-japanese-text.mjs`.
