// Frontend controls/pacing only. The original ROM physics and frame rate stay intact.
export const ARCADE_HZ=16000000/(656*424);
export const FRAME_MS=1000/ARCADE_HZ;
export function latestFrame(previous,next){
 // Texture RAM is sent only when changed; carry an unpresented update forward.
 if(previous?.texture&&!next.texture)next.texture=previous.texture;
 return next;
}
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

export const NEUTRAL_KEYS=Object.freeze({left:false,right:false,accelerate:false,brake:false,reverse:false,stop:false,touchSteer:null,touchThrottle:0,touchBrake:0,in0:255,in1:143});

export class KeyboardControls {
 constructor(){this.reset();}
 reset(){this.steering=0;this.direction=0;this.heldFrames=0;}
 sample(keys){
  const direction=Number(!!keys.right)-Number(!!keys.left);
  if(direction!==this.direction)this.heldFrames=0;
  if(direction)this.heldFrames++;
  // A tap makes a small correction. A deliberate hold turns further, with a
  // bounded wheel range so an ordinary key hold never means physical full lock.
  const hold=Math.min(this.heldFrames/(ARCADE_HZ*.35),1);
  const analog=Number.isFinite(keys.touchSteer);
  const target=analog?clamp(keys.touchSteer,-1,1)*.9:direction*(.22+.43*hold);
  const reversing=direction&&this.steering*direction<0;
  const step=analog?.14:!direction ? .22 : reversing ? .28 : .18;
  this.steering+=clamp(target-this.steering,-step,step);
  this.direction=direction;
  // Buttons are buttons: immediate acceleration, coast on release, brake wins.
  // Only this adapter translates keyboard intentions to the ROM's ADC ports.
  const brake=Math.max(keys.brake?1:0,clamp(Number(keys.touchBrake)||0,0,1));
  const gas=Math.max(keys.accelerate?1:0,clamp(Number(keys.touchThrottle)||0,0,1));
  return {steer:Math.round(128+this.steering*96),accel:32+Math.round((brake>.02?0:gas)*192),brake:32+Math.round(brake*192),in0:keys.in0,in1:keys.in1};
 }
}

export class ArcadeClock {
 constructor(){this.next=0;}
 reset(now){this.next=now;}
 due(now){
  // Do not replay seconds of simulation after a hidden tab or a suspended OS.
  if(now-this.next>250)this.reset(now);
  return now+0.1>=this.next;
 }
 advance(){this.next+=FRAME_MS;}
 delay(now){return Math.max(0,this.next-now);}
}
