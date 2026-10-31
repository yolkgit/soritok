import { StereoRing } from './pcm-ring.mjs';
class OriginalPcm extends AudioWorkletProcessor {
  constructor(){super();this.ring=new StereoRing();this.rate=44100;this.port.onmessage=event=>{if(event.data.clear)this.ring.clear();else{this.rate=event.data.rate||44100;this.ring.push(new Float32Array(event.data.pcm));}};}
  process(_inputs,outputs){const [left,right]=outputs[0];if(left&&right)this.ring.render(left,right,this.rate,sampleRate);return true;}
}
registerProcessor('original-pcm',OriginalPcm);
