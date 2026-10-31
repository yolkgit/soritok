import {initJournal} from './journal.mjs?v=note-rows-1';
import {createGpu} from './gpu.js?v=jp-ko-1';
import {latestFrame} from './motion.mjs?v=mobile-3';
import {initMobileControls} from './mobile-controls.mjs?v=mobile-3';
import {OnlineRoom} from './online.mjs?v=online-1';
const $=id=>document.getElementById(id),canvas=$('screen'),worker=new Worker(new URL('./worker.js?v=mobile-3',import.meta.url),{type:'module'});
let room=null,onlineActive=false,onlinePlaying=false;
const launchedAt=performance.now();
let renderer,mobileUI;
const touchState={touchSteer:null,touchThrottle:0,touchBrake:0};
let started=false,paused=false,gear=0,audio,pcmAt=0,fmAt=0,lastTelemetry='',frameCount=0;
let pendingFrame=null,lastPresentedAt=0,presentationMs=0,frameAgeMs=0;
const displayIntervals=[],frameAges=[];
// Present at the display's animation callback, never on an arbitrary worker
// message. Acknowledge receipt immediately: one in transit and one latest
// pending snapshot, without serializing simulation behind a display refresh.
function present(now){
 if(pendingFrame){const data=pendingFrame;pendingFrame=null;
  try{renderer.draw(data);frameCount++;presentationMs=lastPresentedAt?now-lastPresentedAt:0;lastPresentedAt=now;frameAgeMs=Math.max(0,performance.timeOrigin+performance.now()-data.builtAt);
   if(!$('loading-panel').hidden&&(!onlineActive||onlinePlaying)){$('loading-panel').hidden=true;$('loading-panel').setAttribute('aria-busy','false');document.body.dataset.gameState=onlineActive?'online':'ready';document.body.dataset.launchMs=(performance.now()-launchedAt).toFixed(0);}
   canvas.dataset.presentedFrame=String(data.sequence);canvas.dataset.presentationMs=presentationMs.toFixed(2);canvas.dataset.frameAgeMs=frameAgeMs.toFixed(2);
   if(presentationMs>0)displayIntervals.push(presentationMs);frameAges.push(frameAgeMs);if(displayIntervals.length>120)displayIntervals.shift();if(frameAges.length>120)frameAges.shift();
   canvas.dataset.renderHz=(displayIntervals.length?1000*displayIntervals.length/displayIntervals.reduce((a,b)=>a+b,0):0).toFixed(1);
   canvas.dataset.frameAgeP95Ms=[...frameAges].sort((a,b)=>a-b)[Math.floor((frameAges.length-1)*.95)].toFixed(2);
  }catch(e){$('error-panel').hidden=false;$('error').textContent=e.message;worker.postMessage({type:'pause',value:true});}
 }
 requestAnimationFrame(present);
}
requestAnimationFrame(present);
const held=new Set(),pointerKeys=new Map();
function sendInput(){
 const keys=new Set([...held,...pointerKeys.values()]);let in0=255,in1=143;
 const touchLeft=touchState.touchSteer<-.3,touchRight=touchState.touchSteer>.3;
 if(keys.has('1'))in0&=~32;if(keys.has('2'))in0&=~64;if(keys.has('3'))in0&=~128;if(keys.has('4'))in1&=~1;
 const gearValues=[0,2,1,6,5];in1=(in1&~112)|(gearValues[gear]<<4);
 worker.postMessage({type:'input',value:{...touchState,left:keys.has('ArrowLeft')||keys.has('a')||touchLeft,right:keys.has('ArrowRight')||keys.has('d')||touchRight,accelerate:keys.has('ArrowUp')||keys.has('w'),brake:keys.has('ArrowDown')||keys.has('s')||keys.has(' ')||keys.has('r'),reverse:keys.has('ArrowDown')||keys.has('s')||keys.has('r')||touchState.touchBrake>=.7,stop:keys.has(' '),in0,in1}});
}
function showControls(accel=32,brake=32,steer=128,selectionMenu=null,selectionIndex=0,reversing=false){
 const driving=accel>32,stopping=brake>32;
 $('drive-state').textContent=selectionMenu?(selectionMenu==='course'?['초급 코스','중급 코스','상급 코스']:['자동 변속','수동 변속'])[selectionIndex]:reversing?'R · 후진':stopping?'제동':driving?'가속':'타력 주행';
 document.querySelector('.keyboard-controls>b').textContent=selectionMenu?'MENU':'KEYBOARD';document.querySelector('.keyboard-hint').textContent=selectionMenu?'← → 선택 · ↑ / Enter 결정 · 키를 놓아도 선택 유지':'W / ↑ 가속 · S / ↓ 정지 후 후진 · Space 제동';$('drive-state').dataset.mode=reversing?'reverse':stopping?'brake':driving?'gas':'coast';
 $('steer-marker').style.left=((steer-32)/192*100)+'%';
 canvas.dataset.selectionMenu=selectionMenu||'';canvas.dataset.selectionIndex=String(selectionIndex);
 canvas.dataset.reverse=String(reversing);
 canvas.dataset.throttle=String(Math.round((accel-32)/192*100));canvas.dataset.brake=String(Math.round((brake-32)/192*100));canvas.dataset.keyboardSteer=String(steer);
 mobileUI?.update({menu:selectionMenu,index:selectionIndex,paused,online:onlineActive,ready:started,reversing});
}
function togglePause(){if(!started)return;paused=!paused;worker.postMessage({type:'pause',value:paused});$('pause-panel').hidden=!paused;$('pause').innerHTML='<kbd>ESC</kbd> '+(paused?'계속 실행':'일시정지');if(paused){mobileUI?.reset();held.clear();pointerKeys.clear();sendInput();showControls(32,32);pendingFrame=null;}lastPresentedAt=0;displayIntervals.length=0;frameAges.length=0;}
function sound(samples,rate,which){
 if(!audio||!$('sound').checked||!samples.byteLength)return;
 const data=new Float32Array(samples),buffer=audio.createBuffer(2,data.length/2,Math.round(rate));
 for(let ch=0;ch<2;ch++){const output=buffer.getChannelData(ch);for(let i=0;i<output.length;i++)output[i]=data[i*2+ch];}
 const source=audio.createBufferSource();source.buffer=buffer;const gain=audio.createGain();gain.gain.value=.65;source.connect(gain);gain.connect(audio.destination);
 let at=which==='pcm'?pcmAt:fmAt;if(at<audio.currentTime||at>audio.currentTime+.3)at=audio.currentTime+.035;
 source.start(at);if(which==='pcm')pcmAt=at+buffer.duration;else fmAt=at+buffer.duration;
}
async function unlockAudio(){if($('sound').checked){try{audio??=new AudioContext();await audio.resume();}catch{$('sound').checked=false;}}}
function play(){if(!started)return;if(mobileUI?.mobile()&&!mobileUI.immersive())void mobileUI.enter();if(room){if(onlinePlaying)worker.postMessage({type:'confirm-menu'});return;}if(paused)togglePause();void unlockAudio();worker.postMessage({type:'play'});}
$('start').onclick=play;
$('pause').onclick=()=>{if(!onlineActive)togglePause();};$('resume').onclick=togglePause;
$('smooth').onchange=()=>renderer?.setSmooth($('smooth').checked);
$('sound').onchange=()=>{void unlockAudio();pcmAt=fmAt=0;};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'전체화면 끝내기':'전체화면');});
function selectCamera(index){for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(Number(button.dataset.view)===index));}
selectCamera(0);
$('fullscreen').onclick=async()=>{if(mobileUI?.mobile()){void mobileUI.toggle();return;}try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
for(const button of document.querySelectorAll('[data-view]')){
 const key=String(Number(button.dataset.view)+1);
 button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);selectCamera(Number(button.dataset.view));pointerKeys.set(e.pointerId,key);sendInput();};
 const release=e=>{pointerKeys.delete(e.pointerId);sendInput();};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
}
for(const button of document.querySelectorAll('[data-key]')){
 button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,button.dataset.key);sendInput();};
 const release=e=>{pointerKeys.delete(e.pointerId);sendInput();};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
}
window.addEventListener('keydown',e=>{
 if(e.target.closest?.('#race-journal')||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement||(e.target instanceof HTMLInputElement&&['text','number','range'].includes(e.target.type)))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
 if(!e.repeat){if(/^[1-4]$/.test(e.key))selectCamera(Number(e.key)-1);if(e.key==='Escape'){if(!onlineActive)togglePause();return;}if(e.key==='Enter')play();if(e.key.toLowerCase()==='z')gear=Math.max(1,gear-1);if(e.key.toLowerCase()==='x')gear=Math.min(4,gear+1);}
 held.add(e.key.length===1?e.key.toLowerCase():e.key);sendInput();
});
window.addEventListener('keyup',e=>{held.delete(e.key.length===1?e.key.toLowerCase():e.key);sendInput();});
function unfocus(){mobileUI?.reset();showControls(32,32);held.clear();pointerKeys.clear();sendInput();worker.postMessage({type:'reset-input'});if(started&&!paused&&!onlineActive)togglePause();}
window.addEventListener('blur',unfocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)unfocus();});
worker.onmessage=({data})=>{
 if(data.type==='progress'){$('progress').textContent=data.message;if(Number.isFinite(data.percent))$('load-progress').value=data.percent;}
 else if(data.type==='ready'){started=true;for(const id of ['start','pause','online-toggle'])$(id).disabled=false;if(room?.room){$('start').disabled=true;renderRoom(room.room,room.player);}$('telemetry').textContent='레이스 시작을 눌러 주세요';document.body.dataset.assetsCache=data.cached?'hit':'miss';if(document.hidden)togglePause();}
 else if(data.type==='network-out')room?.send(data.bytes);
 else if(data.type==='cabinet-ready'){canvas.dataset.onlineCabinetId=String(data.id);canvas.dataset.onlineCabinetCount=String(data.count);room?.cabinetReady(data.count).catch(e=>room?.fail(e));}
 else if(data.type==='network-lost')room?.fail(Error('레이스 연결이 끊겼습니다.'));
 else if(data.type==='reset-ready'){selectCamera(0);if(!data.online){$('start').disabled=false;$('pause').disabled=false;}}
 else if(data.type==='frame'){
  showControls(data.accel,data.brake,data.steer,data.selectionMenu,data.selectionIndex,data.reversing);canvas.dataset.internalWidth=String(data.width*data.scale);canvas.dataset.internalHeight=String(data.height*data.scale);
  if(!paused)pendingFrame=latestFrame(pendingFrame,data);
  worker.postMessage({type:'frame-received'});
  sound(data.pcm,10000000/224,'pcm');sound(data.fm,8000000/144,'fm');
 }
 else if(data.type==='audio'){sound(data.pcm,10000000/224,'pcm');sound(data.fm,8000000/144,'fm');}
 else if(data.type==='stats'){lastTelemetry=(Number(canvas.dataset.renderHz)||data.fps).toFixed(0)+' FPS';$('telemetry').textContent=lastTelemetry;canvas.setAttribute('data-rom-frames',String(data.frames));canvas.setAttribute('data-rom-instructions',String(data.instructions));canvas.dataset.cabinetSteer=String(data.steer);canvas.dataset.skippedPresentations=String(data.skippedPresentations);canvas.dataset.targetHz=String(data.targetHz);}
 else if(data.type==='error')showError(data.message);
};
function showError(message){started=false;mobileUI?.reset();mobileUI?.update({ready:false,paused,online:onlineActive});document.body.dataset.gameState='error';$('error-panel').hidden=false;$('loading-panel').hidden=true;$('error').textContent=message;}
worker.onerror=e=>showError(e.message);
// Automatic web launch: no file picker, ROM-loading action or boot button.
async function launch(){try{renderer=await createGpu(canvas);worker.postMessage({type:'boot'});}catch(e){showError(e.message);}}
void launch();

function renderRoom(state,player){
 $('room-entry').hidden=true;$('room-controls').hidden=false;$('room-label').textContent='ROOM '+state.code+' · '+state.players.length+'/4';
 $('online-panel').dataset.players=String(state.players.length);$('online-panel').dataset.phase=state.phase;
 const me=state.players.find(p=>p.id===player.id);$('room-ready').textContent=me?.ready?'준비 취소':'준비';$('room-ready').disabled=!started||state.phase!=='waiting';
 $('room-launch').hidden=state.host!==player.id;$('room-launch').disabled=state.phase!=='waiting'||state.players.length<2||state.players.some(p=>!p.ready);
 $('room-players').replaceChildren();for(let seat=1;seat<=4;seat++){const li=document.createElement('li'),p=state.players.find(p=>p.seat===seat);const title=document.createElement('strong'),status=document.createElement('span');title.textContent=p?'P'+seat+' '+p.name:'P'+seat+' 참가자 대기';status.textContent=p?(p.cabinet?'연결 완료':p.connected?'게임 준비 중':p.ready?'준비 완료':'준비 대기'):'빈 자리';li.append(title,status);li.dataset.ready=p?.ready?'true':'false';$('room-players').append(li);}
 $('online-status').textContent={waiting:'모두 준비하면 시작할 수 있습니다',connecting:'참가자 간 직접 연결 중…',booting:'온라인 레이스 준비 중…',playing:'코스 선택 / 레이스 진행 중',closed:'종료된 방'}[state.phase]||state.phase;
}
function newRoom(){
 $('online-error').hidden=true;
 return new OnlineRoom({state:renderRoom,boot:value=>{onlineActive=true;onlinePlaying=false;mobileUI?.reset();if(paused)togglePause();held.clear();pointerKeys.clear();sendInput();pendingFrame=null;$('start').disabled=true;$('pause').disabled=true;$('loading-panel').hidden=false;$('progress').textContent='온라인 레이스 준비 중…';$('load-progress').removeAttribute('value');worker.postMessage({type:'online-start',value});},packet:bytes=>worker.postMessage({type:'network-in',bytes},[bytes]),play:()=>{onlinePlaying=true;worker.postMessage({type:'play'});},connection:count=>$('online-panel').dataset.peers=String(count),error:message=>{$('online-error').hidden=false;$('online-error').textContent=message;},left:()=>{const wasActive=onlineActive;room=null;onlineActive=false;onlinePlaying=false;for(const key of ['players','phase','peers'])delete $('online-panel').dataset[key];delete canvas.dataset.onlineCabinetId;delete canvas.dataset.onlineCabinetCount;$('room-entry').hidden=false;$('room-controls').hidden=true;$('start').disabled=false;$('pause').disabled=false;$('online-status').textContent='방을 만들거나 코드로 참여하세요';if(wasActive){pendingFrame=null;$('loading-panel').hidden=false;$('progress').textContent='솔로 레이스 준비 중…';worker.postMessage({type:'online-stop'});}}});
}
async function enterRoom(create){
 if(room)return;void unlockAudio();const client=newRoom();room=client;
 try{if(create)await client.create($('driver-name').value);else await client.join($('room-code').value.trim().toUpperCase(),$('driver-name').value);$('start').disabled=true;}
 catch(error){room=null;$('online-error').hidden=false;$('online-error').textContent=error.message;}
}
$('online-toggle').onclick=()=>{$('online-panel').hidden=!$('online-panel').hidden;$('online-toggle').setAttribute('aria-expanded',String(!$('online-panel').hidden));if(!$('online-panel').hidden)$('online-panel').scrollIntoView({block:'nearest'});};
$('room-create').onclick=()=>void enterRoom(true);$('room-join').onclick=()=>void enterRoom(false);
$('room-ready').onclick=()=>{void unlockAudio();const me=room?.room.players.find(p=>p.id===room.player.id);room?.ready(!me?.ready).catch(e=>room?.fail(e));};
$('room-launch').onclick=()=>{void unlockAudio();room?.launch().catch(e=>{$('online-error').hidden=false;$('online-error').textContent=e.message;});};
$('room-leave').onclick=()=>void room?.leave();
$('room-copy').onclick=async()=>{if(!room)return;const url=new URL(location.href);url.searchParams.set('room',room.room.code);try{await navigator.clipboard.writeText(url.href);$('online-status').textContent='초대 링크를 복사했습니다';}catch{$('online-status').textContent='방 코드 '+room.room.code+' 를 공유해 주세요';}};
const invitedRoom=new URL(location.href).searchParams.get('room');if(invitedRoom){$('room-code').value=invitedRoom.toUpperCase();$('online-panel').hidden=false;$('online-toggle').setAttribute('aria-expanded','true');}
window.addEventListener('beforeunload',()=>void room?.leave());

initJournal({onFocus(){mobileUI?.reset();held.clear();pointerKeys.clear();sendInput();worker.postMessage({type:'reset-input'});if(started&&!paused&&!onlineActive)togglePause();}});

mobileUI=initMobileControls({stage:$('game-stage'),canDrive:()=>started&&!paused,
 onInput:value=>{Object.assign(touchState,value);sendInput();},onPlay:play,
 onPause:()=>{if(!onlineActive)togglePause();},
 onCamera:()=>{const current=document.querySelector('[data-view][aria-pressed=true]');const index=(Number(current?.dataset.view||0)+1)%4;selectCamera(index);pointerKeys.set(-1,String(index+1));sendInput();setTimeout(()=>{pointerKeys.delete(-1);sendInput();},140);},
 onShift:delta=>{gear=Math.max(1,Math.min(4,gear+delta));sendInput();}
});
