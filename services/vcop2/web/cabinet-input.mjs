// Cabinet switches, sequenced once by the room server. No game-rule changes.
export class CabinetInput{
 constructor(){this.x=331;this.y=192;this.seq=-1;this.shots=this.reloads=this.starts=0;this.clear();}
 clear(){this.held=0;this.pending=0;this.pulse=0;this.gap=0;this.reload=0;this.start=0;}
 update(m){if(!Number.isSafeInteger(m.seq)||m.seq<=this.seq)return;this.seq=m.seq;
  this.x=Math.round(Math.max(0,Math.min(661,Number(m.x)||0)));this.y=Math.round(Math.max(0,Math.min(383,Number(m.y)||0)));this.held=m.buttons&1;
  for(const key of ['shots','reloads','starts']){const n=Number(m[key]);if(!Number.isSafeInteger(n)||n<0||n>1e9)continue;const delta=Math.max(0,Math.min(4,n-this[key]));if(key==='shots')this.pending=Math.min(4,this.pending+delta);else if(key==='reloads'&&delta){this.reload=10;this.pending=this.pulse=0;}else if(key==='starts'&&delta)this.start=38;this[key]=Math.max(this[key],n);}
 }
 next(){let flags=0;if(this.reload){if(this.reload<=8)flags=3;this.reload--;}else if(this.gap)this.gap--;else{if(!this.pulse&&this.pending){this.pending--;this.pulse=2;}if(this.pulse){flags=1;if(!--this.pulse)this.gap=2;}}
  if(this.start){const i=38-this.start;if(i<7)flags|=4;else if(i>=17&&i<29)flags|=8;this.start--;}
  return [this.x,this.y,flags];
 }
}
