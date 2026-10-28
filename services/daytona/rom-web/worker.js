import createCore from './core.mjs?v=online-1';
import {KeyboardControls,NEUTRAL_KEYS,ArcadeClock,ARCADE_HZ} from './motion.mjs?v=menu-1';
import {loadGameAssets} from './game-assets.mjs?v=web-start-1';
import {WebRaceStart,WARMUP_FRAMES} from './game-start.mjs?v=online-1';
import {DISPLAY_SCALE,applyDisplay} from './display.mjs?v=wide-hd-1';
import {MenuSelection} from './menu-selection.mjs?v=menu-1';
let core, ready=false, paused=false, timer, keys={...NEUTRAL_KEYS},startUntil=0;
let lastReport=0, fpsAt=0, fpsCount=0,textureGeneration=-1;
const scale=DISPLAY_SCALE;
const cabinet=new KeyboardControls(),clock=new ArcadeClock();
const webStart=new WebRaceStart(),menuSelection=new MenuSelection();
let frameInFlight=false,skippedPresentations=0;
let profiles,online=null,linkReported=false,netPointer=0,netCapacity=0;
const pendingPackets=[];
function receivePacket(buffer){
 if(!online||!ready){if(pendingPackets.length<128)pendingPackets.push(buffer);return;}
 const bytes=new Uint8Array(buffer);if(bytes.length>1048576){error('잘못된 네트워크 패킷입니다.');return;}
 if(bytes.length>netCapacity){if(netPointer)core._free(netPointer);netCapacity=Math.max(bytes.length,65536);netPointer=core._malloc(netCapacity);}
 core.HEAPU8.set(bytes,netPointer);if(!core._rom_link_receive(netPointer,bytes.length))error('네트워크 수신 버퍼가 가득 찼습니다.');
}
async function resetGame(options){
 try{
  clearTimeout(timer);ready=false;paused=false;online=options;keys={...NEUTRAL_KEYS};cabinet.reset();menuSelection.reset();webStart.at=-Infinity;linkReported=false;frameInFlight=false;textureGeneration=-1;
  const name=options?(options.seat===1?'free-master.bin':'free-slave'+options.seat+'.bin'):'free-single.bin';
  const profile=profiles.profiles[name],bytes=Uint8Array.from(atob(profile.base64),c=>c.charCodeAt(0));
  core.FS.writeFile('/rom/ioboard_eeprom.bin',bytes);
  if(!core.ccall('rom_init','number',['string','number'],['/rom',1]))throw Error(core.UTF8ToString(core._rom_error()));
  core._rom_gpu_mode(1);applyDisplay(core);
  if(options){core._rom_link_enable();core._rom_link_open(1,1);}
  else{for(let f=0;f<WARMUP_FRAMES;f++){if(!core._rom_step(128,32,32,255,143))throw Error(core.UTF8ToString(core._rom_error()));if(f%12===11)await new Promise(r=>setTimeout(r,0));}}
  ready=true;for(const packet of pendingPackets.splice(0))if(options)receivePacket(packet);
  fpsAt=performance.now();clock.reset(fpsAt);send('reset-ready',{online:!!options});loop();
 }catch(e){error(e.message||e);}
}
const send=(type,value={})=>postMessage({type,...value});
function error(message){ready=false;clearTimeout(timer);send('error',{message:String(message)});}
async function boot(){
  try{
    send('progress',{message:'게임 준비 중…',percent:5});
    core=await createCore({locateFile:name=>new URL(name+'?v=online-1',import.meta.url).href,print:message=>send('log',{message}),printErr:message=>send('log',{message})});
    const manifestResponse=await fetch('./rom/manifest.json');if(!manifestResponse.ok)throw Error('게임 정보를 받지 못했습니다.');
    const manifest=await manifestResponse.json();
    const {bytes:packed,cached}=await loadGameAssets(manifest,{onProgress:percent=>send('progress',{message:'게임 준비 중… '+percent+'%',percent:10+percent*.6})});
    send('progress',{message:'서킷 준비 중…',percent:75});
    const unpacked=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if(unpacked.length!==manifest.unpackedBytes)throw Error('ROM 메모리 이미지 크기 불일치');
    core.FS.mkdir('/rom');
    for(const region of manifest.regions)core.FS.writeFile('/rom/'+region.name,unpacked.subarray(region.offset,region.offset+region.bytes));
    profiles=await (await fetch('./cabinet-profiles.json')).json();
    if(!core.ccall('rom_init','number',['string','number'],['/rom',1]))throw Error(core.UTF8ToString(core._rom_error()));
    core._rom_gpu_mode(1);applyDisplay(core);
    // Run the original power-on sequence before offering Play. Yield in small
    // batches; no game input or race is skipped, only the cabinet diagnostics.
    for(let frame=0;frame<WARMUP_FRAMES;frame++){
      if(!core._rom_step(128,32,32,255,143))throw Error(core.UTF8ToString(core._rom_error()));
      if(frame%12===11){send('progress',{message:'서킷 준비 중…',percent:80+(frame+1)/WARMUP_FRAMES*19});await new Promise(resolve=>setTimeout(resolve,0));}
    }
    ready=true;send('ready',{version:manifest.version,mathTables:!!core._rom_math_mode(),cached});
    fpsAt=performance.now();clock.reset(fpsAt);loop();
  }catch(e){error(e?.stack||e);}
}
function loop(){
  if(!ready)return;
  if(paused){timer=setTimeout(loop,40);return;}
  const at=performance.now();
  if(!clock.due(at)){timer=setTimeout(loop,clock.delay(at));return;}
  let in0=keys.in0;
  if(at<startUntil)in0&=~16;
  in0=webStart.apply(core._rom_frames(),in0);
  if(menuSelection.phase)cabinet.reset();
  const input=menuSelection.apply(keys,cabinet.sample(keys),core._rom_frames());
  if(!core._rom_step(input.steer,input.accel,input.brake,in0,input.in1)){error(core.UTF8ToString(core._rom_error()));return;}
  if(online){
   const n=core._rom_link_output_size();if(n){const bytes=core.HEAPU8.slice(core._rom_link_output(),core._rom_link_output()+n);core._rom_link_drain();postMessage({type:'network-out',bytes:bytes.buffer},[bytes.buffer]);}
   const state=core._rom_link_state(),count=core._rom_link_count();
   if(!linkReported&&state===2&&count===online.count){linkReported=true;send('cabinet-ready',{id:core._rom_link_id(),count});}
   if(state===3){send('network-lost');online=null;}
  }
  clock.advance();
  // Audio follows every original simulation frame. GPU snapshots have one
  // outstanding credit, so a busy display cannot accumulate stale pictures.
  const pcmCount=core._rom_pcm_count(),fmCount=core._rom_fm_count();
  const pcm=core.HEAPF32.slice(core._rom_pcm()>>>2,(core._rom_pcm()>>>2)+pcmCount);
  const fm=core.HEAPF32.slice(core._rom_fm()>>>2,(core._rom_fm()>>>2)+fmCount);
  if(!frameInFlight){
  core._rom_gpu_build(scale);
  const width=core._rom_width(),height=core._rom_height();
  const menuSize=core._rom_gpu_layer_size(1),menuPointer=core._rom_gpu_layer(1)>>>2;
  menuSelection.observe(core.HEAPU32.subarray(menuPointer,menuPointer+menuSize),menuSize/height,height);
  function layer(front){const p=core._rom_gpu_layer(front)>>>2,size=core._rom_gpu_layer_size(front),src=core.HEAPU32.subarray(p,p+size),rgba=new Uint8Array(size*4);for(let i=0;i<size;i++){const pixel=src[i],n=i*4;rgba[n]=pixel>>>16;rgba[n+1]=pixel>>>8;rgba[n+2]=pixel;rgba[n+3]=pixel?255:0;}return rgba;}
  function bytes(p,n){return core.HEAPU8.slice(p,p+n);}
  const back=layer(0),front=layer(1),vertices=bytes(core._rom_gpu_vertices(),core._rom_gpu_vertex_count()*64),batches=bytes(core._rom_gpu_batches(),core._rom_gpu_batch_count()*24);
  const luma=bytes(core._rom_gpu_luma(),0x20000),xlat=bytes(core._rom_gpu_xlat(),0x18000);
  let texture;const generation=core._rom_gpu_tex_generation();if(generation!==textureGeneration){texture=new Uint8Array(0x400000);for(let sheet=0;sheet<2;sheet++)texture.set(bytes(core._rom_gpu_tex(sheet),0x200000),sheet*0x200000);textureGeneration=generation;}
  const buffers=[back,front,vertices,batches,luma,xlat,pcm,fm,...(texture?[texture]:[])].map(b=>b.buffer);
  frameInFlight=true;
  postMessage({type:'frame',sequence:core._rom_frames(),builtAt:performance.timeOrigin+performance.now(),width,height,scale,selectionMenu:menuSelection.phase,selectionIndex:menuSelection.index,steer:input.steer,accel:input.accel,brake:input.brake,backWidth:back.length/4/height,frontWidth:front.length/4/height,back:back.buffer,front:front.buffer,vertices:vertices.buffer,batches:batches.buffer,luma:luma.buffer,xlat:xlat.buffer,texture:texture?.buffer,pcm:pcm.buffer,fm:fm.buffer},buffers);
  }else{skippedPresentations++;postMessage({type:'audio',pcm:pcm.buffer,fm:fm.buffer},[pcm.buffer,fm.buffer]);}
  fpsCount++;
  if(at-lastReport>1000){send('stats',{frames:core._rom_frames(),instructions:core._rom_instructions(),tableReads:core._rom_table_reads(),fps:fpsCount*1000/(at-fpsAt),frameMs:performance.now()-at,steer:input.steer,skippedPresentations,targetHz:ARCADE_HZ});lastReport=at;fpsAt=at;fpsCount=0;}
  timer=setTimeout(loop,clock.delay(performance.now()));
}
onmessage=({data})=>{
  if(data.type==='boot'&&!core)void boot();
  else if(data.type==='input')keys=data.value;
  else if(data.type==='start')startUntil=performance.now()+180;
  else if(data.type==='play'&&ready){if(!menuSelection.confirm(core._rom_frames()))webStart.request(core._rom_frames());}
  else if(data.type==='confirm-menu'&&ready)menuSelection.confirm(core._rom_frames());
  else if(data.type==='online-start'&&core)void resetGame(data.value);
  else if(data.type==='online-stop'&&core)void resetGame(null);
  else if(data.type==='network-in')receivePacket(data.bytes);
  else if(data.type==='frame-received')frameInFlight=false;
  else if(data.type==='reset-input'){keys={...NEUTRAL_KEYS};cabinet.reset();menuSelection.releaseKeys();}
  else if(data.type==='pause'){paused=data.value;cabinet.reset();textureGeneration=-1;fpsAt=performance.now();fpsCount=0;lastReport=fpsAt;clock.reset(fpsAt);send('pause',{value:paused});}

};
