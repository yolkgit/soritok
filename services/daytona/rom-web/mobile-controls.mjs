const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const standaloneMode=()=>!!globalThis.navigator?.standalone||(!(document.fullscreenElement||document.webkitFullscreenElement)&&matchMedia('(display-mode:standalone), (display-mode:fullscreen)').matches);
export const iphoneBrowser=()=>/iPhone|iPod/.test(globalThis.navigator?.userAgent||'');

export function initMobileControls({stage,onInput,onPlay,onPause,onCamera,onShift,canDrive,onGuideChange}){
 const $=id=>document.getElementById(id),pad=$('analog-pad'),knob=$('analog-knob');
 const state={touchSteer:null,touchThrottle:0,touchBrake:0};
 stage.dataset.manual='false';
 // Cancel browser callouts across the game, including labels and empty canvas.
 // Do not reset contacts: a long press must keep steering/pedals held down.
 for(const type of ['contextmenu','selectstart','dragstart'])stage.addEventListener(type,e=>e.preventDefault(),{capture:true});
 const contacts=new Map();let hintTimer,enteredFullscreen=false,layoutVersion=0,guideShown=false;
 const mobile=()=>iphoneBrowser()||standaloneMode()||matchMedia('(any-pointer:coarse), (max-width:900px)').matches;
 const immersive=()=>document.body.classList.contains('racing-immersive');
 const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const nativeRequest=()=>stage.requestFullscreen||stage.webkitRequestFullscreen;
 async function closeNative(){const close=document.fullscreenElement?document.exitFullscreen:document.webkitFullscreenElement?document.webkitExitFullscreen:null;if(close)await close.call(document);}
 function syncMode(){
  stage.dataset.fullscreenMode=standaloneMode()?'standalone':fullscreenElement()?'native':immersive()?'expanded':'browser';
  const button=$('mobile-browser-fullscreen');button.hidden=standaloneMode()||!!fullscreenElement();
  button.textContent=iphoneBrowser()?'앱으로':'⤢';button.setAttribute('aria-label',iphoneBrowser()?'주소줄 없이 앱으로 실행':'브라우저 전체화면 다시 시도');
 }
 function showInstallGuide(){
  const dialog=$('iphone-install-dialog');if(dialog.open)return;
  guideShown=true;reset();dialog.showModal();queueMicrotask(()=>onGuideChange?.(true));
 }
 function publish(){onInput({...state});}
 function center(){state.touchSteer=null;knob.style.transform='translate(0px,0px)';pad.setAttribute('aria-valuenow','0');pad.classList.remove('pressed');}
 function setPedal(kind,value){
  state[kind]=value;const pedal=$(kind==='touchThrottle'?'gas-pedal':'brake-pedal');
  pedal.style.setProperty('--amount',String(value));pedal.classList.toggle('pressed',value>0);
  pedal.setAttribute('aria-pressed',String(value>0));
 }
 function reset(){
  const previous=[...contacts];contacts.clear();center();setPedal('touchThrottle',0);setPedal('touchBrake',0);publish();
  for(const [id,c] of previous)if(c.element.hasPointerCapture?.(id))c.element.releasePointerCapture(id);
 }
 function padMove(e){
  const c=contacts.get(e.pointerId);if(c?.kind!=='steer')return;
  const rect=pad.getBoundingClientRect(),radius=rect.width*.34;
  let x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);
  const length=Math.hypot(x,y);if(length>radius){x*=radius/length;y*=radius/length;}
  const raw=x/radius,amount=Math.abs(raw);
  state.touchSteer=amount<.08?0:Math.sign(raw)*Math.pow((amount-.08)/.92,1.2);
  knob.style.transform=`translate(${x}px,${y}px)`;pad.classList.add('pressed');
  pad.setAttribute('aria-valuenow',String(Math.round(state.touchSteer*100)));publish();
 }
 function pedalMove(e){
  const c=contacts.get(e.pointerId);if(!c||c.kind==='steer')return;
  // A tap gives full pedal. Drag down while holding to ease it, up to press it.
  const range=Math.max(48,c.element.getBoundingClientRect().height*.8);
  setPedal(c.kind,clamp(1-(e.clientY-c.startY)/range,0,1));publish();
 }
 function bind(element,kind,move){
  element.addEventListener('pointerdown',e=>{
   if(!canDrive()||e.button>0||[...contacts.values()].some(c=>c.kind===kind))return;
   e.preventDefault();element.setPointerCapture(e.pointerId);
   contacts.set(e.pointerId,{kind,element,startY:e.clientY});move(e);
  });
  element.addEventListener('pointermove',e=>{if(contacts.has(e.pointerId)){e.preventDefault();move(e);}});
  const release=e=>{
   const c=contacts.get(e.pointerId);if(!c||c.element!==element)return;
   contacts.delete(e.pointerId);if(kind==='steer')center();else setPedal(kind,0);publish();
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,release);
 }
 bind(pad,'steer',padMove);bind($('gas-pedal'),'touchThrottle',pedalMove);bind($('brake-pedal'),'touchBrake',pedalMove);
 // Accessible keyboard operation of the slider; normal driving keys remain intact.
 pad.addEventListener('keydown',e=>{
  if(!canDrive()||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();state.touchSteer=e.key==='Home'?0:e.key==='ArrowLeft'?-.65:.65;
  pad.setAttribute('aria-valuenow',String(Math.round(state.touchSteer*100)));publish();
 });
 pad.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.stopPropagation();center();publish();}});
 function leaveLayout(){
  layoutVersion++;clearTimeout(hintTimer);$('mobile-hint').hidden=true;
  document.body.classList.remove('racing-immersive');enteredFullscreen=false;reset();
  $('mobile-expand').setAttribute('aria-label','전체화면 플레이');$('fullscreen').setAttribute('aria-label','전체화면');
  try{screen.orientation?.unlock?.();}catch{}
  syncMode();
 }
 async function enter(){
  const version=++layoutVersion;
  const first=!immersive();document.body.classList.add('racing-immersive');
  $('mobile-expand').setAttribute('aria-label','전체화면 끝내기');$('fullscreen').setAttribute('aria-label','전체화면 끝내기');
  if(first){$('mobile-hint').hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('mobile-hint').hidden=true,5500);}
  syncMode();
  // Home Screen launches already have no Safari toolbar. Normal tabs must
  // request the browser API in this tap, independently of pointer detection.
  if(standaloneMode())return;
  const request=nativeRequest();
  if(!request){if(iphoneBrowser()&&!guideShown)showInstallGuide();return;}
  try{if(!fullscreenElement())await request.call(stage,{navigationUI:'hide'});
   if(version!==layoutVersion){if(fullscreenElement()===stage)await closeNative();return;}
   enteredFullscreen=fullscreenElement()===stage;syncMode();
   if(enteredFullscreen)try{await screen.orientation?.lock?.('landscape');}catch{}
  }catch{syncMode();if(version===layoutVersion&&iphoneBrowser()&&!guideShown)showInstallGuide();}
 }
 async function exit(){
  leaveLayout();try{await closeNative();}catch{}
 }
 async function toggle(){if(immersive()||fullscreenElement())await exit();else await enter();}
 const fullscreenChanged=()=>{if(enteredFullscreen&&fullscreenElement()!==stage)leaveLayout();else syncMode();};
 document.addEventListener('fullscreenchange',fullscreenChanged);document.addEventListener('webkitfullscreenchange',fullscreenChanged);
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 window.addEventListener('resize',reset);
 $('mobile-expand').onclick=()=>void toggle();$('mobile-exit').onclick=()=>void exit();
 $('mobile-browser-fullscreen').onclick=()=>{if(iphoneBrowser()&&!nativeRequest())showInstallGuide();else void enter();};
 $('iphone-install-help').onclick=showInstallGuide;
 $('iphone-install-close').onclick=()=>$('iphone-install-dialog').close();
 $('iphone-install-dialog').addEventListener('close',()=>{reset();onGuideChange?.(false);});
 $('mobile-pause').onclick=()=>{reset();onPause();};$('mobile-confirm').onclick=()=>{reset();onPlay();};
 $('mobile-camera').onclick=onCamera;
 $('mobile-shift-down').onclick=()=>onShift(-1);$('mobile-shift-up').onclick=()=>onShift(1);
 syncMode();if(standaloneMode())void enter();
 return {mobile,immersive,enter,exit,toggle,reset,
  update({menu,index=0,paused,online,ready,reversing}){
   stage.dataset.selection=menu||'';
   if(menu==='course')stage.dataset.manual='false';
   if(menu==='transmission')stage.dataset.manual=String(index===1);
   $('mobile-confirm').textContent=menu?'선택':'시작';
   $('mobile-confirm').disabled=!ready;
   $('mobile-pause').disabled=!ready||online;
   $('mobile-pause').setAttribute('aria-label',paused?'계속 실행':'일시정지');
   $('mobile-pause').textContent=paused?'▶':'Ⅱ';
   $('brake-pedal').setAttribute('aria-label',reversing?'후진 중, 놓으면 정지':'브레이크 페달, 정차 후 계속 누르면 후진');
  }
 };
}
