const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export function initMobileControls({stage,onInput,onPlay,onPause,onCamera,onShift,canDrive}){
 const $=id=>document.getElementById(id),pad=$('analog-pad'),knob=$('analog-knob');
 const state={touchSteer:null,touchThrottle:0,touchBrake:0};
 stage.dataset.manual='false';
 const contacts=new Map();let hintTimer,enteredFullscreen=false,layoutVersion=0;
 const mobile=()=>matchMedia('(any-pointer:coarse), (max-width:900px)').matches;
 const immersive=()=>document.body.classList.contains('racing-immersive');
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
  element.addEventListener('contextmenu',e=>e.preventDefault());
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
 }
 async function enter(){
  if(immersive())return;
  const version=++layoutVersion;
  document.body.classList.add('racing-immersive');
  $('mobile-expand').setAttribute('aria-label','전체화면 끝내기');$('fullscreen').setAttribute('aria-label','전체화면 끝내기');
  $('mobile-hint').hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('mobile-hint').hidden=true,5500);
  // The request happens in the original tap's activation. CSS mode also works
  // on iPhone browsers where element fullscreen/orientation lock is unavailable.
  try{if(matchMedia('(any-pointer:coarse)').matches)await stage.requestFullscreen?.();
   if(version!==layoutVersion){if(document.fullscreenElement===stage)await document.exitFullscreen();return;}
   enteredFullscreen=document.fullscreenElement===stage;
   if(enteredFullscreen)try{await screen.orientation?.lock?.('landscape');}catch{}
  }catch{}
 }
 async function exit(){
  leaveLayout();if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}
 }
 async function toggle(){if(immersive()||document.fullscreenElement)await exit();else await enter();}
 document.addEventListener('fullscreenchange',()=>{if(enteredFullscreen&&document.fullscreenElement!==stage)leaveLayout();});
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 window.addEventListener('resize',reset);
 $('mobile-expand').onclick=()=>void toggle();$('mobile-exit').onclick=()=>void exit();
 $('mobile-pause').onclick=()=>{reset();onPause();};$('mobile-confirm').onclick=()=>{reset();onPlay();};
 $('mobile-camera').onclick=onCamera;
 $('mobile-shift-down').onclick=()=>onShift(-1);$('mobile-shift-up').onclick=()=>onShift(1);
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
