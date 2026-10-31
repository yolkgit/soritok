import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {StereoRing} from './web/pcm-ring.mjs';
const root=fileURLToPath(new URL('../work/vcop2-original',import.meta.url)),{default:createCore}=await import(pathToFileURL(path.join(root,'web/core.mjs')));
const core=await createCore({locateFile:name=>path.join(root,'web',name)});
core.FS.mkdir('/roms');for(const name of ['maincpu','main_data','copro_data','polygons','textures','copro_tgp_tables','audiocpu','samples'])core.FS.writeFile('/roms/'+name+'.bin',fs.readFileSync(path.join(root,'roms/images',name+'.bin')));
assert.equal(core.ccall('rom_init','number',['string'],['/roms']),1);
core._rom_gpu_mode(1);core._rom_wide_columns(83);assert.equal(core._rom_width(),662);
const read=address=>core._rom_peek(address);
function run(n,buttons=0,x=331,y=192){for(let i=0;i<n;i++)assert.equal(core._rom_step(x,y,buttons),1);}
run(1000);run(8,4);run(35);run(8,8);run(80);run(3,1,163,150);run(40);run(600);
assert.equal(read(0x50003d),1);assert.equal(read(0x502088),1);
const ammoBefore=read(0x507260);run(2,1);run(8);const ammoShot=read(0x507260);run(8,2);run(30);const ammoReload=read(0x507260);
assert.deepEqual([ammoBefore,ammoShot,ammoReload],[6,5,6]);
core._rom_gpu_build();
const count=core._rom_gpu_vertex_count(),batchCount=core._rom_gpu_batch_count(),ringFloats=core._rom_gpu_ring_floats();
assert.ok(count>0&&count%3===0);assert.ok(ringFloats>0&&ringFloats%1024===0);
const data=new DataView(core.HEAPU8.buffer,core._rom_gpu_vertices(),count*64),clips=new Int32Array(core.HEAPU8.buffer,core._rom_gpu_batches(),batchCount*6);
let lastDepth=0,sideVertices=0;
for(let i=0;i<count;i++){for(const offset of [0,4,8,12,16,24,28,32])assert.ok(Number.isFinite(data.getFloat32(i*64+offset,true)));const depth=data.getFloat32(i*64+8,true);assert.ok(depth>=lastDepth&&depth>0&&depth<1);lastDepth=depth;const x=data.getFloat32(i*64,true);if(x<83||x>579)sideVertices++;}
assert.ok(sideVertices>0,'Extra scene geometry exists beyond original centered 496 columns');
let next=0;for(let i=0;i<clips.length;i+=6){const [first,n,x,y,w,h]=clips.subarray(i,i+6);assert.equal(first,next);next+=n;assert.ok(x>=0&&y>=0&&x+w<=662&&y+h<=384);}assert.equal(next,count);
function sample(gpu){core._rom_gpu_mode(gpu);let cpu=0,raster=0,tiles=0;for(let i=0;i<60;i++){run(1);cpu+=core._rom_cpu_ms();raster+=core._rom_raster_ms();tiles+=core._rom_tile_ms();}return {cpuMs:cpu/60,rasterMs:raster/60,tileMs:tiles/60};}
const gpu=sample(1);core._rom_wide_columns(0);const software=sample(0);
assert.ok(gpu.rasterMs<.1);assert.ok(software.rasterMs>gpu.rasterMs);
const ring=new StereoRing(),samples=new Float32Array(4000);for(let i=0;i<2000;i++){samples[i*2]=.25;samples[i*2+1]=-.5;}ring.push(samples);const l=new Float32Array(128),r=new Float32Array(128);ring.render(l,r,44100,48000);assert.ok(l.every(v=>Math.abs(v-.25)<1e-6));assert.ok(r.every(v=>Math.abs(v+.5)<1e-6));for(let i=0;i<30;i++)ring.render(l,r,44100,48000);assert.ok(l.every(v=>v===0));ring.push(new Float32Array(40000));assert.ok(ring.count<=8192);ring.clear();assert.equal(ring.count,0);
core.FS.mkdir('/nvram');core._rom_nvram_save();
assert.equal(core.FS.readFile('/nvram/vcop2.nv').length,16384);
assert.equal(core.FS.readFile('/nvram/vcop2.eeprom').length,128);
const before=Buffer.from(core.FS.readFile('/nvram/vcop2.eeprom'));core._rom_nvram_load();core._rom_nvram_save();
assert.deepEqual(Buffer.from(core.FS.readFile('/nvram/vcop2.eeprom')),before);
const result={nvramRoundTrip:'pass',width:662,output:'1920x1080',ammoBefore,ammoShot,ammoReload,vertices:count,triangles:count/3,batches:batchCount,sideVertices,gpu,software,ringResampling:'pass'};
fs.mkdirSync(path.join(root,'captures'),{recursive:true});fs.writeFileSync(path.join(root,'captures/hd-tests.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('PASS: original widescreen gun calibration, geometry packing/order/scissors, CPU raster bypass and stereo stream.');
