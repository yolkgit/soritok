// Four linked native cabinets; use a private --debug core build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const assets=path.resolve(process.env.ROM_WEB_ARTIFACTS||'.rom-build');
const {default:createCore}=await import(pathToFileURL(path.resolve(process.argv[2]||path.join(assets,'core.mjs'))));
import zlib from 'node:zlib';
const regions=JSON.parse(fs.readFileSync(path.join(assets,'rom/manifest.json'))).regions;const raw=zlib.gunzipSync(fs.readFileSync(path.join(assets,'rom/daytona.pack.gz')));const profiles=JSON.parse(fs.readFileSync(new URL('../rom-web/cabinet-profiles.json',import.meta.url)));const histories=[[],[],[],[]];const view=new DataView(new ArrayBuffer(4));const rf=(c,a)=>{view.setUint32(0,c._rom_debug_read(a),true);return view.getFloat32(0,true);};
const cores=[];for(let n=0;n<4;n++){
 const c=await createCore();c.FS.mkdir('/rom');for(const r of regions)c.FS.writeFile('/rom/'+r.name,raw.subarray(r.offset,r.offset+r.bytes));
 c.FS.writeFile('/rom/ioboard_eeprom.bin',Buffer.from(profiles.profiles[n===0?'free-master.bin':'free-slave'+(n+1)+'.bin'].base64,'base64'));
 assert.equal(c.ccall('rom_init','number',['string','number'],['/rom',0]),1);c._rom_gpu_mode(1);c._rom_link_enable();c._rom_link_open(1,1);c.rx=c._malloc(1048576);c.bytes=0;cores.push(c);
}
const began=performance.now();let firstUp=0;
for(let f=0;f<3501;f++){
 for(let n=0;n<4;n++){
  const c=cores[n];let port=255;if((f>=700&&f<710)||(f>=1050&&f<1060))port&=~16;
  const pedal=(f>=950&&f<980)||(f>=1150&&f<1180)||(f>=1500&&f<2300)?224:32;
  c._rom_reverse_input(n===0&&f>=3300&&f<3500,f>=3500,pedal>32);assert.equal(c._rom_step(f>=1600&&f<1630?128+(n-1)*20:128,pedal,f>=2300?224:32,port,143),1,c.UTF8ToString(c._rom_error()));
  const count=c._rom_link_output_size();if(count){const bytes=c.HEAPU8.slice(c._rom_link_output(),c._rom_link_output()+count),next=cores[(n+1)%4];assert.ok(count<1048576);next.HEAPU8.set(bytes,next.rx);assert.equal(next._rom_link_receive(next.rx,count),1);c._rom_link_drain();c.bytes+=count;}if(n===0&&[3300,3325,3350,3400,3500].includes(f)){const car=c._rom_debug_read(0x54004c);histories[n].push({frame:f,active:c._rom_reverse_active(),flags:c._rom_debug_read(0x501090).toString(16),car:car.toString(16),routine:c._rom_debug_read(car+12).toString(16),speed:rf(c,car+0x34),x:rf(c,car+0x1c),z:rf(c,car+0x24)});}
 }
 if(!firstUp&&cores.every(c=>c._rom_link_state()===2&&c._rom_link_count()===4)){firstUp=f+1;console.log('Four original cabinets linked at frame '+firstUp);}
 if([400,800,1400,2400].includes(f+1))console.log(JSON.stringify({frame:f+1,players:cores.map(c=>({state:c._rom_link_state(),id:c._rom_link_id(),count:c._rom_link_count(),bytes:c.bytes}))}));
}
assert.ok(firstUp>0);assert.deepEqual(cores.map(c=>c._rom_link_id()).sort(),[1,2,3,4]);
for(const c of cores){assert.equal(c._rom_link_state(),2);assert.equal(c._rom_link_count(),4);assert.ok(c.bytes>100000);assert.ok(c._rom_table_reads()>10000);}
assert.ok(histories[0].some(x=>x.active&&x.speed<0),'online cabinet reverses');console.log(JSON.stringify({passed:true,linked:cores.map(c=>c._rom_link_state()),reverse:histories[0]}));
