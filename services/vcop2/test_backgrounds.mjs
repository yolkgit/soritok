import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../work/vcop2-original',import.meta.url)),{default:createCore}=await import(pathToFileURL(path.join(root,'web/core.mjs')));
const core=await createCore({locateFile:n=>path.join(root,'web',n)});core.FS.mkdir('/roms');
for(const n of ['maincpu','main_data','copro_data','polygons','textures','copro_tgp_tables','audiocpu','samples'])core.FS.writeFile('/roms/'+n+'.bin',fs.readFileSync(path.join(root,'roms/images',n+'.bin')));
assert.equal(core.ccall('rom_init','number',['string'],['/roms']),1);core._rom_gpu_mode(1);core._rom_wide_columns(83);
const run=(n,b=0,x=331,y=192)=>{for(let i=0;i<n;i++)assert.equal(core._rom_step(x,y,b),1);};
const layer=front=>new Uint32Array(core.HEAPU8.buffer,core._rom_gpu_layer(front),core._rom_width()*384).slice();
let checks=0,seenSideColour=false,seenPanorama=false;const samples=[];
function check(){core._rom_gpu_build();const hash=core._rom_sync_hash()>>>0,wide=[layer(0),layer(1)],stats=[0,1,2].map(i=>core._rom_gpu_side_pixels(i));core._rom_wide_columns(0);const native=[layer(0),layer(1)];
 for(let front=0;front<2;front++)for(let y=0;y<384;y++)assert.deepEqual(wide[front].subarray(y*662+83,y*662+579),native[front].subarray(y*496,(y+1)*496),'Original center and HUD stay pixel-exact');
 core._rom_wide_columns(83);assert.equal(core._rom_sync_hash()>>>0,hash,'Rendering never changes native game RAM/CPU');
 let colored=0,colors=new Set();for(let y=0;y<384;y++)for(const begin of [0,579])for(let x=begin;x<begin+83;x++){const c=wide[0][y*662+x];assert.equal(c>>>24,255,'Every side backdrop pixel resolves');if(c&0xffffff){colored++;colors.add(c);}}
 seenSideColour||=colors.size>8&&colored>1000;seenPanorama||=stats[0]+stats[1]>0;samples.push({frame:core._rom_frames(),colored,colors:colors.size,cache:stats[0],loop:stats[1],fallback:stats[2]});checks++;
}
run(1000);check();run(8,4);run(35);run(8,8);run(80);check();run(3,1,163,150);run(40);
for(let i=0;i<12;i++){run(100);check();}
assert.ok(seenSideColour,'Original tile colours extend into both widened margins');assert.ok(seenPanorama,'Scroll cache or verified repeating original map is used');
const n=core._rom_state_save(),state=core.HEAPU8.slice(core._rom_state_data(),core._rom_state_data()+n),savedHash=core._rom_sync_hash()>>>0;run(80);const ptr=core._malloc(n);core.HEAPU8.set(state,ptr);assert.equal(core._rom_state_load(ptr,n),1);core._free(ptr);assert.equal(core._rom_sync_hash()>>>0,savedHash);check();
const result={checks,centerAndHudPixelExact:true,nativeStateUnchanged:true,sideColour:true,panoramaUsed:true,snapshotRestored:true,samples};fs.writeFileSync(path.join(root,'captures/background-tests.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('PASS: full-width original tile backdrops, exact center/HUD, bounded panorama cache and snapshot restore.');
