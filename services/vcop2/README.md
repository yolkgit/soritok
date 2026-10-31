# Virtua Cop 2 — original arcade ROM, browser HD

Runs the user's supplied 1995 Model 2A arcade game through a pinned sm2-emu
WebAssembly build. Programs, geometry, textures, SCSP audio, stage progression,
ammunition and hit rules come from the ROM. No replacement game is used.

## Play

Run node server.mjs from this service folder, or node vcop2-port/server.mjs from
the original task checkout. Open http://127.0.0.1:3018/vcop2/.

Assets are prepared and verified automatically. Original boot advances 1,000
frames. Download/boot progress and errors with retry are shown.

- Enter / 게임 시작 integrates original coin and Start.
- Shoot a stage-selection card, then click/touch to aim and fire.
- R / right click / 재장전 sends an original calibrated off-screen shot.
- Space fires at the current aim. Escape / P pauses.
- Sound begins after Start/Sound interaction and honors explicit mute.
- Backgrounding releases inputs, clears queued audio and pauses.
- Touch pointers are tracked independently; another finger can reload.
- Fullscreen uses the browser API when supported. iPhone uses Safari Share →
  Add to Home Screen. This Home Screen mode requires a network connection.

## HD display

WebGL2 rasterizes the original polygon list at **1920×1080**, with a **1280×720**
performance option. OffscreenCanvas renders in the emulation worker; the
reticle follows input immediately on the main thread. AudioWorklet streams
original stereo PCM through a bounded ring and sample-rate converter.
Software fallback retains the original 4:3 image; GPU context loss offers retry.

The actual scene widens by 83 columns per side: 662×384 internal coordinates,
displayed at 16:9 with the arcade's non-square pixels. Frusta, scissors and gun
calibration expand together. Native tile layers, menus and HUD remain centered
with their original proportions. No new side scenery is invented.
3D edges render at HD resolution; texture/2D source detail, gamma, mip rules
and native-grid checker transparency remain original.

Fixed-deadline simulation follows original 57.5245 Hz, with bounded catch-up
and one presentation after catch-up. Desktop browser samples were approximately
57–58 FPS at 1080p. This is not an all-device guarantee or a GPU timer measurement.

## ROM evidence

ZIP SHA-256: 73a5e14d178a9d44fea266b832a840366807779d2e351d4c33d6fd40d16d3aff.
All 30 chips are validated against the pinned MAME-derived game map.
Assembly applies only declared interleave, mirrors, empty sockets and 68000
word swaps. Original instructions and assets are not patched.

Compressed pack: 15,062,908 bytes.
SHA-256: de103c2c653a4e27086aeb2f63e15553051d0efe41b45f7d76b39d2f60d33e96.

Original i960, MB86234, Model 2A I/O/lightgun, 68000 and SCSP run via:

- https://github.com/dmanlfc/sm2-emu
  revision cf83971ce1ca570d344e82f788a19d75daff2340
- https://github.com/kstenerud/Musashi
  revision 313ebf1bd9f4d0d93341eb5ce21fd8a119e9dbdd

The renderer adapts BSD display-list shader conventions from
daytona-arcade-recomp. Original notices/source headers remain.
The page links runtime/renderer licenses, notices and complete corresponding
source. That archive includes the pinned public runtime and dependencies,
bridge, shaders and build recipes; it contains no game ROM.

ROM/WASM packs stay outside Git. SHA-addressed asset URLs, runtime.json and
no-cache version metadata prevent stale mixes. The worker checks WASM, ROM pack
and each mapped region. Original 16 KiB NVRAM and 128-byte EEPROM are retained
in this browser. This does not save an entire in-progress stage.

## Build

Requires Python 3, Node and Emscripten (tested 4.0.23).
Set VCOP2_EMSDK or EMSDK to the SDK root. Put the exact public runtime above
at ../work/vcop2-original/vendor/sm2-emu relative to this service folder,
and initialize its pinned Musashi submodule.

Run python prepare_rom.py <user-supplied-vcop2.zip>, then python build_core.py.
Outputs are in the ignored ../work/vcop2-original/{roms,web} directories.
VCOP2_RUNTIME_ASSETS selects a flat external directory for the host server.
VCOP2_HOST defaults to loopback; the container explicitly binds 0.0.0.0.

## Verification

- node test_original.mjs: real boot, Start/stage, active game, ammo 6→5→6,
  real polygons and non-silent SCSP PCM.
- node test_hd.mjs: widened gun calibration, ammo 6→5→6, finite ordered geometry,
  scissor bounds, extra side geometry, CPU raster bypass, stream resampling
  and original NVRAM/EEPROM round trip.
- node test_inputs.mjs: independent pointer cancellation, long-press prevention
  while preserving trigger state, simultaneous reload, blur and key-up.
- /vcop2/verify.html?mode=gpu (also software/wide) pauses identical cabinet inputs
  at frame 1,774. Native and GPU reach 195,040,918 i960 instructions and the same
  phase/player/lives/ammo. Captures were visually compared for road, walls,
  cutouts and HUD. Native raster-edge/MSAA differences remain.
- Browser QA: Start, stage selection, beginner gameplay, original failure/
  continue flow, pause, frozen-frame resolution switching, sound controls,
  actual fullscreen and desktop/mobile viewport layouts.

Physical iPhone/Android multitouch, Safari installation and orientation locking
were not tested on physical devices. The input test is an automated handler
test, not a physical touch claim. All stages/full-game completion are not
comprehensively verified. This wrapper exposes one player; original two-gun
and online play are not implemented. No fake online players are shown.

The soritok deployment uses an independent service, /vcop2/ route and external
assets. Existing Daytona containers and persistent volumes remain separate.
