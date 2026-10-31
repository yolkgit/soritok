import assert from 'node:assert/strict';
import {KeyboardControls,NEUTRAL_KEYS} from '../rom-web/motion.mjs';
import {initMobileControls} from '../rom-web/mobile-controls.mjs';

// Exercise simultaneous contacts and cancellation through the real handlers.
class Element extends EventTarget{
 constructor(rect={left:0,top:0,width:120,height:120}){
  super();this.rect=rect;this.attributes={};this.captures=new Set();
  const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};
  this.style={setProperty:(k,v)=>this.style[k]=v};this.dataset={};
 }
 setAttribute(k,v){this.attributes[k]=v;}
 getBoundingClientRect(){return this.rect;}
 setPointerCapture(id){this.captures.add(id);}
 hasPointerCapture(id){return this.captures.has(id);}
 releasePointerCapture(id){this.captures.delete(id);this.fire('lostpointercapture',{pointerId:id});}
 fire(name,props={}){const event=new Event(name,{cancelable:true});Object.assign(event,props);this.dispatchEvent(event);}
}
const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const doc=new EventTarget();doc.getElementById=$;doc.body=new Element();doc.hidden=false;doc.fullscreenElement=null;
doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));};
globalThis.document=doc;globalThis.window=new EventTarget();globalThis.matchMedia=()=>({matches:true});
globalThis.screen={orientation:{unlock(){},async lock(){}}};
let state,driving=true;const stage=new Element();
const ui=initMobileControls({stage,onInput:value=>state=value,onPlay(){},onPause(){},onCamera(){},onShift(){},canDrive:()=>driving});
const pad=$('analog-pad'),gas=$('gas-pedal'),brake=$('brake-pedal');
pad.fire('pointerdown',{pointerId:1,button:0,clientX:100,clientY:60});
assert.ok(state.touchSteer>.5&&state.touchSteer<=1);
gas.fire('pointerdown',{pointerId:2,button:0,clientY:50});
assert.equal(state.touchThrottle,1);assert.ok(state.touchSteer>.5,'gas finger preserves steering finger');
gas.fire('pointermove',{pointerId:2,clientY:98});assert.equal(state.touchThrottle,.5);
const cabinet=new KeyboardControls();let sample=cabinet.sample({...NEUTRAL_KEYS,...state});
assert.equal(sample.accel,128,'half pedal maps to half native ADC travel');
brake.fire('pointerdown',{pointerId:3,button:0,clientY:40});
sample=cabinet.sample({...NEUTRAL_KEYS,...state});assert.equal(sample.accel,32);assert.equal(sample.brake,224,'brake wins with simultaneous pedals');
brake.fire('pointercancel',{pointerId:3});assert.equal(state.touchBrake,0);assert.equal(state.touchThrottle,.5);
pad.fire('pointerup',{pointerId:1});assert.equal(state.touchSteer,null);assert.equal(state.touchThrottle,.5);
gas.fire('lostpointercapture',{pointerId:2});assert.equal(state.touchThrottle,0);
pad.fire('pointerdown',{pointerId:4,button:0,clientX:-1000,clientY:60});assert.equal(state.touchSteer,-1,'out-of-bounds drags stay bounded');
gas.fire('pointerdown',{pointerId:5,button:0,clientY:50});window.dispatchEvent(new Event('blur'));
assert.deepEqual(state,{touchSteer:null,touchThrottle:0,touchBrake:0},'blur releases every contact');
driving=false;gas.fire('pointerdown',{pointerId:6,button:0,clientY:50});assert.equal(state.touchThrottle,0,'paused touches cannot stick');driving=true;
await ui.enter();assert.ok(ui.immersive(),'CSS fullscreen fallback works without Fullscreen API');
await ui.exit();assert.equal(ui.immersive(),false);
stage.requestFullscreen=async()=>{throw Error('unsupported');};await ui.enter();assert.ok(ui.immersive());await ui.exit();
stage.requestFullscreen=async()=>{doc.fullscreenElement=stage;doc.dispatchEvent(new Event('fullscreenchange'));};
await ui.enter();assert.equal(doc.fullscreenElement,stage);await doc.exitFullscreen();assert.equal(ui.immersive(),false,'browser exit restores the page');
let finish;stage.requestFullscreen=()=>new Promise(resolve=>{finish=()=>{doc.fullscreenElement=stage;resolve();};});
const pending=ui.enter();await ui.exit();finish();await pending;assert.equal(doc.fullscreenElement,null,'late fullscreen resolution cannot trap the player');
for(let i=0;i<30;i++)sample=cabinet.sample({...NEUTRAL_KEYS,right:true});assert.ok(sample.steer>175);assert.equal(sample.accel,32);
sample=cabinet.sample({...NEUTRAL_KEYS,accelerate:true});assert.equal(sample.accel,224,'keyboard acceleration remains digital');
console.log('PASS: multi-touch, analog ADC, pedal priority, cancel/blur, paused inputs, fullscreen fallback/exit, keyboard');
