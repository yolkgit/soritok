// Run against a --debug native build; private ROMs remain outside the repository.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {MenuSelection} from '../rom-web/menu-selection.mjs';
const assets=path.resolve(process.env.ROM_WEB_ARTIFACTS||'.rom-build');
const {default:createCore}=await import(pathToFileURL(path.resolve(process.argv[2]||path.join(assets,'core.mjs'))));
const core=await createCore();
assert.equal(typeof core._rom_debug_read,'function','Use native/build-extension.py --debug');
const manifest=JSON.parse(fs.readFileSync(path.join(assets,'rom/manifest.json')));
const data=gunzipSync(fs.readFileSync(path.join(assets,'rom/daytona.pack.gz')));
core.FS.mkdir('/rom');for(const r of manifest.regions)core.FS.writeFile('/rom/'+r.name,data.subarray(r.offset,r.offset+r.bytes));
const profiles=JSON.parse(fs.readFileSync(new URL('../rom-web/cabinet-profiles.json',import.meta.url)));
core.FS.writeFile('/rom/ioboard_eeprom.bin',Buffer.from(profiles.profiles['free-single.bin'].base64,'base64'));
const view=new DataView(new ArrayBuffer(4));
const read=a=>core._rom_debug_read(a)>>>0;
const float=a=>{view.setUint32(0,read(a),true);return view.getFloat32(0,true);};
let menu,in1=143;
function tick({gas=false,reverse=false,stop=false,brake=false,steer=128,start=false}={}){
 core._rom_reverse_input(reverse,stop,gas);
 assert.ok(core._rom_step(steer,gas&&!brake&&!reverse&&!stop?224:32,brake||reverse||stop?224:32,start?239:255,in1));
 core._rom_gpu_build(1);const n=core._rom_gpu_layer_size(1),p=core._rom_gpu_layer(1)>>>2;
 menu.observe(core.HEAPU32.subarray(p,p+n),n/384,384);
}
const steps=(n,input)=>{for(let i=0;i<n;i++)tick(input);};
function until(phase){for(let i=0;i<300&&menu.phase!==phase;i++)tick();assert.equal(menu.phase,phase);}
const car=()=>read(0x54004c);
const speed=()=>float(car()+0x34);
const position=()=>[float(car()+0x1c),float(car()+0x24)];
for(const course of [0,1,2])for(const manual of [false,true]){
 in1=143;
 assert.equal(core.ccall('rom_init','number',['string','number'],['/rom',0]),1);
 core._rom_gpu_mode(1);core._rom_aspect(16/9);menu=new MenuSelection();steps(240);
 steps(30,{reverse:true});assert.equal(core._rom_reverse_active(),0,'attract cannot reverse');
 steps(10,{start:true});until('course');steps(30,{reverse:true});assert.equal(core._rom_reverse_active(),0,'menu cannot reverse');
 steps(30,{steer:[128,176,224][course]});steps(15,{gas:true,steer:[128,176,224][course]});until('transmission');
 steps(30,{steer:manual?224:128});steps(15,{gas:true,steer:manual?224:128});in1=manual?223:143;steps(2500,{brake:true});in1=manual?175:143;
 assert.ok(Math.abs(speed())<.001,'brakes bring the vehicle to rest');
 steps(40,{stop:true});assert.equal(core._rom_reverse_active(),0,'Space never engages reverse');
 steps(10,{reverse:true});assert.equal(core._rom_reverse_active(),0,'requires a deliberate hold at rest');
 const before=position();steps(120,{reverse:true});const after=position();
 assert.equal(core._rom_reverse_active(),1);assert.ok(speed()<-.02&&speed()>=-.051,'bounded signed reverse speed');
 assert.ok(Math.hypot(after[0]-before[0],after[1]-before[1])>1,'actual world position moves');
 assert.ok(read(car()+0x18)<30,'native HUD speed is a positive magnitude');
 steps(30);assert.equal(core._rom_reverse_active(),0);assert.ok(Math.abs(speed())<.001,'release stops backing up');
 steps(90,{gas:true});assert.ok(speed()>.02,'forward acceleration works after reverse');
 const forward=position();steps(1,{reverse:true});assert.equal(core._rom_reverse_active(),0,'no direction switch at road speed');
 const delta=[after[0]-before[0],after[1]-before[1]];
 const forwardDelta=[forward[0]-after[0],forward[1]-after[1]];
 assert.ok(delta[0]*forwardDelta[0]+delta[1]*forwardDelta[1]<0,'reverse and forward travel in opposite directions');
 steps(200,{brake:true});steps(120,{reverse:true,steer:160});assert.equal(core._rom_reverse_active(),1);
 steps(20,{stop:true});assert.equal(core._rom_reverse_active(),0);assert.ok(Math.abs(speed())<.001,'Space stops reverse');
 console.log(JSON.stringify({course,manual,courseMemory:read(0x5010f0),transmissionMemory:read(car()+4),reverseDisplacement:delta,forwardDisplacement:forwardDelta,frames:core._rom_frames()}));
}
console.log('PASS: all three courses, AT/MT, native backing, HUD, braking, forward return, input guards');
