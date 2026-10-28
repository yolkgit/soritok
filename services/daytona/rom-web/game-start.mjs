// FREE PLAY: a Play action presses Start only. No credit/coin input exists.
export const WARMUP_FRAMES=240;
export class WebRaceStart {
 constructor(){this.at=-Infinity;}
 request(frame){if(frame-this.at<90)return false;this.at=frame;return true;}
 apply(frame,in0){const elapsed=frame-this.at;if(elapsed>=0&&elapsed<10)in0&=~16;return in0;}
}
