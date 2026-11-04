import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validSample,updateRecord} from './web/records-store.mjs';
const sample={phase:1,player:1,p2:0,frame:2000,scores:[277,0]};
assert.equal(validSample(null),false);assert.equal(validSample({...sample,phase:0}),false,'Attract scores are excluded');
assert.equal(validSample({...sample,scores:[NaN,0]}),false);
let row=updateRecord(null,sample,100,'original-session');assert.equal(row.best[0],277);
row=updateRecord(row,{...sample,frame:2100,scores:[1383,0]},200);assert.equal(row.id,'original-session');assert.equal(row.best[0],1383);
assert.notEqual(updateRecord(row,{...sample,frame:2101,scores:[0,0]},300,'new-session').id,row.id,'A reset score starts a new run');
const root=fileURLToPath(new URL('../work/vcop2-original/',import.meta.url));
const {default:createCore}=await import(pathToFileURL(path.join(root,'web/core.mjs')));
const c=await createCore({locateFile:n=>path.join(root,'web',n)});c.FS.mkdir('/roms');c.FS.mkdir('/nvram');
for(const n of ['maincpu','main_data','copro_data','polygons','textures','copro_tgp_tables','audiocpu','samples'])c.FS.writeFile('/roms/'+n+'.bin',fs.readFileSync(path.join(root,'roms/images',n+'.bin')));
assert.equal(c.ccall('rom_init','number',['string'],['/roms']),1);c._rom_gpu_mode(1);c._rom_wide_columns(83);
const run=(n,p=[331,192,0],q=[331,192,0])=>{for(let i=0;i<n;i++)assert.equal(c._rom_step2(...p,...q),1);};
run(1000);run(8,[331,192,4],[331,192,4]);run(35);run(8,[331,192,8],[331,192,8]);run(80);run(3,[499,150,1]);run(40);run(600);
const n=c._rom_state_save(),initial=c.HEAPU8.slice(c._rom_state_data(),c._rom_state_data()+n);
const load=bytes=>{const p=c._malloc(bytes.length);c.HEAPU8.set(bytes,p);assert.equal(c._rom_state_load(p,bytes.length),1);c._free(p);};
const word=a=>[0,1,2,3].reduce((v,i)=>v+c._rom_peek(a+i)*256**i,0);
const cases=[];for(const [name,player,y,expected]of [['miss',1,40,0],['body',1,260,277],['head',2,238,1383]]){
 load(initial);const point=name==='miss'?[40,40,1]:[321,y,1],release=[point[0],point[1],0];run(2,player===1?point:undefined,player===2?point:undefined);run(120,player===1?release:undefined,player===2?release:undefined);
 const scores=[word(0x50a714),word(0x50a718)];assert.equal(scores[player-1],expected);assert.equal(scores[2-player],0);cases.push({name,player,scores});
}
// Exercise the shipped worker's compression, validation, pause and restore
// handlers using the real WASM instance, not an alternate save implementation.
const version=JSON.parse(fs.readFileSync(path.join(root,'web/runtime.json'))).assets['core.wasm'].sha256;
const responses=new Map(),events=[];
const context=vm.createContext({console,performance,crypto,Blob,Response,CompressionStream,DecompressionStream,ArrayBuffer,Uint8Array,Uint8ClampedArray,Float32Array,ImageData:class{},setTimeout:()=>0,fixture:c,fixtureVersion:version,postMessage:m=>{events.push(m);if(responses.has(m.requestId)){responses.get(m.requestId)(m);responses.delete(m.requestId);}}});
const source=fs.readFileSync(new URL('./web/worker.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',"'http://localhost/worker.mjs'");
vm.runInContext(source+"\ncore=fixture;running=true;runtimeVersion=fixtureVersion;paused=true;",context);
let serial=0;function request(type,data={}){const id='test-local-'+(++serial);return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Worker timeout')),20000);responses.set(id,m=>{clearTimeout(timeout);setImmediate(()=>resolve(m));});context.onmessage({data:{type,requestId:id,...data}});});}
const start=performance.now(),saved=await request('local-snapshot');assert.equal(saved.type,'local-snapshot');assert.deepEqual(Array.from(saved.scores),[0,1383]);assert.ok(saved.data.byteLength<3*1024*1024);
const nativeHash=c._rom_sync_hash()>>>0,frame=c._rom_frames(),instructions=c._rom_instructions();run(60);assert.notEqual(c._rom_sync_hash()>>>0,nativeHash);
let restored=await request('local-load',{data:saved.data.slice(0),hash:saved.hash,version});assert.equal(restored.type,'local-loaded');assert.equal(restored.frame,frame);assert.equal(restored.instructions,instructions);assert.equal(restored.syncHash,nativeHash);assert.deepEqual(Array.from(restored.scores),[0,1383]);
const bad=saved.data.slice(0);new Uint8Array(bad)[100]^=1;
assert.equal((await request('local-load',{data:bad,hash:saved.hash,version})).type,'local-error');assert.equal(c._rom_sync_hash()>>>0,nativeHash,'Corrupt state never changes the machine');
assert.equal((await request('local-load',{data:saved.data,hash:saved.hash,version:'wrong'})).type,'local-error');
vm.runInContext('network=true;',context);assert.equal((await request('local-snapshot')).type,'local-error');assert.equal((await request('local-load',{data:saved.data,hash:saved.hash,version})).type,'local-error');vm.runInContext('network=false;',context);
const result={nativeScoreCases:cases,compressedBytes:saved.data.byteLength,restoredFrame:frame,restoredHash:nativeHash,scoreAndCpuExact:true,corruptionRejected:true,versionRejected:true,onlineProtected:true,elapsedMs:Math.round(performance.now()-start)};
fs.writeFileSync(path.join(root,'captures/records-tests.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('PASS: real score counters, original machine snapshot, exact restore, corrupt/version guards, online isolation and record sessions.');
