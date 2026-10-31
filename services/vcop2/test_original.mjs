import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../work/vcop2-original');
const {default: createCore} = await import(pathToFileURL(path.join(root, 'web/core.mjs')).href);
const out = path.join(root, 'captures');
fs.mkdirSync(out, { recursive: true });
const core = await createCore({ locateFile: name => path.join(root, 'web', name) });
core.FS.mkdir('/roms');
for (const name of ['maincpu', 'main_data', 'copro_data', 'polygons', 'textures', 'copro_tgp_tables', 'audiocpu', 'samples']) {
  core.FS.writeFile('/roms/' + name + '.bin', fs.readFileSync(path.join(root, 'roms/images', name + '.bin')));
}
if (!core.ccall('rom_init', 'number', ['string'], ['/roms'])) throw new Error(core.UTF8ToString(core._rom_error()));
const started = performance.now();
let pcmPeak = 0, nonzeroSamples = 0;
const read = address => core._rom_peek(address);
const status = label => ({ label, frame: core._rom_frames(), instructions: core._rom_instructions(), polygons: core._rom_polygons(), state: read(0x50003d), p1: read(0x502088), life: read(0x502090), ammo: read(0x507260), credits: read(0x5d05c0), ms: Math.round(performance.now() - started), pcmPeak, nonzeroSamples });
function run(frames, buttons = 0, x = 248, y = 192) {
  for (let i = 0; i < frames; i++) {
    if (!core._rom_step(x, y, buttons)) throw new Error(core.UTF8ToString(core._rom_error()));
    const ptr = core._rom_pcm() >>> 2, count = core._rom_pcm_count();
    for (let j = 0; j < count; j++) { const sample = Math.abs(core.HEAPF32[ptr + j]); pcmPeak = Math.max(pcmPeak, sample); if (sample > 0.00001) nonzeroSamples++; }
  }
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type), result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0); t.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([t, data])), data.length + 8); return result;
}
function capture(label) {
  const width = core._rom_width(), height = core._rom_height();
  const rgba = Buffer.from(core.HEAPU8.subarray(core._rom_pixels(), core._rom_pixels() + width * height * 4));
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(path.join(out, label + '.png'), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
  console.log(JSON.stringify(status(label)));
}
run(240); capture('boot-240');
run(760); capture('boot-1000');
run(8, 4); run(35); run(8, 8); run(80); capture('after-start');
// Continue with ordinary calibrated gun presses; no game-state mutations.
run(3, 1, 80, 150); run(40); capture('after-stage-shot');
run(600); capture('game-600');
const ammoBefore = read(0x507260);
run(2, 1, 248, 192); run(8); capture('after-gun-shot');
const ammoAfterShot = read(0x507260);
run(8, 2); run(30); capture('after-reload');
fs.writeFileSync(path.join(out, 'headless-status.json'), JSON.stringify({ ...status('complete'), ammoBefore, ammoAfterShot, ammoAfterReload: read(0x507260) }, null, 2));

assert.equal(ammoBefore,6,'Original player begins with six rounds');
assert.equal(ammoAfterShot,5,'Ordinary original gun shot consumes one round');
assert.equal(read(0x507260),6,'Off-screen gun input reloads the original cylinder');
assert.equal(read(0x50003d),1,'Original game is in its real playing state');
assert.equal(read(0x502088),1,'Original player one is active');
assert.ok(core._rom_polygons()>0,'Original game produces geometry');
assert.ok(nonzeroSamples>0 && pcmPeak>.01,'Original SCSP sound is non-silent');
console.log('PASS: original ROM boot, credit/start, stage selection, real gameplay, gun shot 6→5, reload 5→6, polygons and original sound.');
