// Frontend controls/pacing only. The original ROM physics and frame rate stay intact.
export const ARCADE_HZ=16000000/(656*424);
export const FRAME_MS=1000/ARCADE_HZ;
export function latestFrame(previous,next){
 // Texture RAM is sent only when changed; carry an unpresented update forward.
 if(previous?.texture&&!next.texture)next.texture=previous.texture;
 return next;
}
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

export const NEUTRAL_KEYS=Object.freeze({left:false,right:false,accelerate:false,brake:false,in0:255,in1:143});

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
  const target=direction*(.22+.43*hold);
  const reversing=direction&&this.steering*direction<0;
  const step=!direction ? .22 : reversing ? .28 : .18;
  this.steering+=clamp(target-this.steering,-step,step);
  this.direction=direction;
  // Buttons are buttons: immediate acceleration, coast on release, brake wins.
  // Only this adapter translates keyboard intentions to the ROM's ADC ports.
  return {steer:Math.round(128+this.steering*96),accel:keys.accelerate&&!keys.brake?224:32,brake:keys.brake?224:32,in0:keys.in0,in1:keys.in1};
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
