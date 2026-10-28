// Fingerprints of the supplied Revision A's original, static 2D menu titles.
// Read the native tile layer, before WebGL scaling; no timers or key-count guesses.
export function detectSelectionMenu(pixels,width,height=384){
 if(height!==384||width<496||pixels.length<width*height)return null;
 const left=Math.floor((width-496)/2)+87;let hash=2166136261;
 for(let y=8;y<56;y++)for(let x=left;x<left+312;x++)hash=Math.imul(hash^pixels[y*width+x],16777619)>>>0;
 return hash===0x48cb24b1?'course':hash===0x526b174d?'transmission':null;
}
export class MenuSelection {
 constructor(){this.reset();}
 reset(){this.phase=null;this.index=0;this.previousDirection=0;this.confirmUntil=-1;}
 observe(pixels,width,height){const phase=detectSelectionMenu(pixels,width,height);if(phase!==this.phase){this.phase=phase;this.index=0;this.previousDirection=0;this.confirmUntil=-1;}}
 releaseKeys(){this.previousDirection=0;}
 confirm(frame){if(!this.phase)return false;this.confirmUntil=frame+10;return true;}
 apply(keys,input,frame){
  if(!this.phase)return input;
  const direction=Number(!!keys.right)-Number(!!keys.left),count=this.phase==='course'?3:2;
  if(direction&&direction!==this.previousDirection)this.index=Math.max(0,Math.min(count-1,this.index+direction));
  this.previousDirection=direction;
  const steer=this.phase==='course'?[128,176,224][this.index]:[128,224][this.index];
  return {...input,steer,...(frame<this.confirmUntil?{accel:224,brake:32}:{})};
 }
}
