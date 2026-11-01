import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../work/vcop2-original',import.meta.url));
const {default:createCore}=await import(pathToFileURL(path.join(root,'web/core.mjs')));
async function instance(){const c=await createCore({locateFile:n=>path.join(root,'web',n)});c.FS.mkdir('/roms');for(const n of ['maincpu','main_data','copro_data','polygons','textures','copro_tgp_tables','audiocpu','samples'])c.FS.writeFile('/roms/'+n+'.bin',fs.readFileSync(path.join(root,'roms/images',n+'.bin')));assert.equal(c.ccall('rom_init','number',['string'],['/roms']),1);c._rom_gpu_mode(1);c._rom_wide_columns(83);return c;}
const a=await instance(),b=await instance();
function load(c,bytes){const p=c._malloc(bytes.length);c.HEAPU8.set(bytes,p);assert.equal(c._rom_state_load(p,bytes.length),1,c.UTF8ToString(c._rom_error()));c._free(p);}
function snapshot(c){const n=c._rom_state_save();assert.ok(n>0);return c.HEAPU8.slice(c._rom_state_data(),c._rom_state_data()+n);}
function one(c,p=[331,192,0],q=[331,192,0]){assert.equal(c._rom_step2(...p,...q),1,c.UTF8ToString(c._rom_error()));}
for(let i=0;i<1000;i++)one(a);
const start=performance.now(),state=snapshot(a),compressed=gzipSync(state),snapshotMs=performance.now()-start;
load(b,state);assert.equal(a._rom_sync_hash(),b._rom_sync_hash());
let compared=0;
function run(n,p=[331,192,0],q=[331,192,0]){for(let i=0;i<n;i++){one(a,p,q);one(b,p,q);assert.equal(a._rom_frames(),b._rom_frames());assert.equal(a._rom_instructions(),b._rom_instructions());const sa=Buffer.from(a.HEAPU8.buffer,a._rom_pcm(),a._rom_pcm_count()*4),sb=Buffer.from(b.HEAPU8.buffer,b._rom_pcm(),b._rom_pcm_count()*4);assert.ok(sa.equals(sb),'Original SCSP output matches');if(i%30===0){assert.equal(a._rom_sync_hash(),b._rom_sync_hash(),'Full work RAM and CPU progress match');compared++;}}}
run(8,[331,192,4],[331,192,4]);run(35);run(8,[331,192,8],[331,192,8]);run(80);run(3,[163,150,1]);run(40);run(600);
const read=address=>a._rom_peek(address);
console.log(JSON.stringify({stage:read(0x50003d),p1:read(0x502088),p2:read(0x50208c),ammo1:read(0x507260),ammo2:read(0x507264)}));
assert.equal(read(0x50003d),1);assert.equal(read(0x502088),1);assert.equal(read(0x50208c),1);
assert.deepEqual([read(0x507260),read(0x507264)],[6,6]);
run(2,[331,192,1]);run(8);assert.deepEqual([read(0x507260),read(0x507264)],[5,6]);
run(2,[331,192,0],[480,192,1]);run(8);assert.deepEqual([read(0x507260),read(0x507264)],[5,5]);
run(8,[331,192,0],[480,192,2]);run(30);assert.deepEqual([read(0x507260),read(0x507264)],[5,6]);
run(8,[331,192,2]);run(30);assert.deepEqual([read(0x507260),read(0x507264)],[6,6]);
run(2,[200,200,1],[460,210,1]);run(8);assert.deepEqual([read(0x507260),read(0x507264)],[5,5]);
const later=snapshot(a);one(b,[20,20,1],[640,360,1]);assert.notEqual(a._rom_sync_hash(),b._rom_sync_hash());load(b,later);
assert.equal(a._rom_sync_hash(),b._rom_sync_hash());
run(120);
const result={twoNativePlayers:true,independentShotReload:true,simultaneousAmmo:[5,5],snapshotBytes:state.length,compressedBytes:compressed.length,snapshotMs,matchedChecks:compared,frame:a._rom_frames(),instructions:a._rom_instructions(),hash:a._rom_sync_hash()>>>0,pcmExact:true,restorePlayingState:true};
fs.mkdirSync(path.join(root,'captures'),{recursive:true});fs.writeFileSync(path.join(root,'captures/two-player-tests.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));console.log('PASS: original P2, independent guns/reload, simultaneous shooting, shared-state replay, exact PCM, snapshot restore and canonical RAM checksums.');
