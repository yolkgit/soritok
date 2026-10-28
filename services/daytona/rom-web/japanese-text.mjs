import {japaneseText} from './japanese-text-data.mjs?v=jp-ko-1';

const ink=character=>character==='#'?2:character==='R'?3:character==='.'?1:0;
const labels=japaneseText.map(label=>({...label,sprite:label.rows.map(row=>Uint8Array.from(row,ink))}));
const brightness=p=>(p&255)*299+((p>>>8)&255)*587+((p>>>16)&255)*114;

// Match only the original Japanese glyph shape, independent of palette fades.
// No OCR, guessed game timer, native memory patch, or full-screen replacement.
export function translateJapanese(front,width,height=384){
 if(height!==384||width<496||front.byteLength!==width*height*4)return [];
 const pixels=new Uint32Array(front.buffer,front.byteOffset,front.byteLength/4),margin=Math.floor((width-496)/2),changed=[];
 for(const label of labels){
  const [bx,y,w,h]=label.box,x=bx+margin;
  const background=label.bg?pixels[label.bg[1]*width+label.bg[0]+margin]:0;
  let hash=2166136261,bright=0,dark=0,highest=-1,lowest=Infinity;
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
   const pixel=pixels[(y+dy)*width+x+dx],isInk=pixel!==background;
   hash=Math.imul(hash^Number(isInk),16777619)>>>0;
   if(isInk){const light=brightness(pixel);if(light>highest){highest=light;bright=pixel;}if(light<lowest){lowest=light;dark=pixel;}}
  }
  if(hash!==label.signature)continue;
  // When the source has a single ink, use a proportional dark outline so a
  // fade never introduces a full-bright or full-black rectangle.
  if(dark===bright)dark=(bright&0xff000000)|((bright&0xfcfcfc)>>>2);
  const red=(bright&0xff000000)|(bright&255),palette=[background,dark,bright,red];
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)pixels[(y+dy)*width+x+dx]=palette[label.sprite[dy][dx]];
  changed.push(label.id);
 }
 return changed;
}

export const japaneseTranslations=japaneseText.map(({id,source,text,box})=>({id,source,text,box}));
