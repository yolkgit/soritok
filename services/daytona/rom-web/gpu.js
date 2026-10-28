// WebGL2 frontend for the original Model 2 polygon/texture stream.
// Renderer algorithms/shaders adapted under BSD-3-Clause; see renderer-license.txt.
import {backgroundRange} from './background.mjs?v=background-1';
import {translateJapanese} from './japanese-text.mjs?v=jp-ko-1';
export async function createGpu(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,stencil:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL2를 사용할 수 없습니다. 최신 브라우저에서 하드웨어 가속을 켜 주세요.');
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const [v,f]=await Promise.all(['poly.vert','poly.frag'].map(async name=>{const r=await fetch('./'+name);if(!r.ok)throw Error(name+' '+r.status);return r.text();}));
 const poly=program(v,f),quad=program(`#version 300 es
 precision highp float;
 out vec2 uv;
 void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=vec2(p.x,1.0-p.y);gl_Position=vec4(p*2.0-1.0,0,1);}`,`#version 300 es
 precision highp float;
 uniform sampler2D layer;
 uniform vec2 xRange;
 in vec2 uv;
 out vec4 color;
 void main(){vec4 c=texture(layer,vec2(mix(xRange.x,xRange.y,uv.x),uv.y));if(c.a<0.01)discard;color=vec4(c.rgb,1);}`);
 const vao=gl.createVertexArray(),vertices=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
 for(const [n,count,offset] of [[0,3,0],[1,3,12],[2,4,24]]){gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,count,gl.FLOAT,false,64,offset);}
 for(const [n,count,offset] of [[3,4,40],[4,2,56]]){gl.enableVertexAttribArray(n);gl.vertexAttribIPointer(n,count,gl.UNSIGNED_INT,64,offset);}
 const emptyVao=gl.createVertexArray();
 function integerTexture(unit,w,h){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,gl.R32UI,w,h);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);return t;}
 const textures=[integerTexture(0,1024,1024),integerTexture(1,256,128),integerTexture(2,256,96)];
 gl.useProgram(poly);['texram','lumaram','xlat'].forEach((name,i)=>gl.uniform1i(gl.getUniformLocation(poly,name),i));
 const layer=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,layer);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.useProgram(quad);gl.uniform1i(gl.getUniformLocation(quad,'layer'),3);
 const xRange=gl.getUniformLocation(quad,'xRange');
 let smooth=true;
 function layerDraw(buffer,w,h,range=[0,1]){
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.SCISSOR_TEST);gl.useProgram(quad);gl.bindVertexArray(emptyVao);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,layer);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,smooth?gl.LINEAR:gl.NEAREST);
  gl.uniform2f(xRange,range[0],range[1]);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(buffer));gl.drawArrays(gl.TRIANGLES,0,3);
 }
 function upload(unit,w,h,buffer){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[unit]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RED_INTEGER,gl.UNSIGNED_INT,new Uint32Array(buffer));}
 return {
  setSmooth(value){smooth=value;},
  draw(data){
   const scale=data.scale||2,w=data.width,h=data.height;
   if(canvas.width!==w*scale||canvas.height!==h*scale){canvas.width=w*scale;canvas.height=h*scale;}
   gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,1);gl.clearDepth(1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   layerDraw(data.back,data.backWidth,h,backgroundRange(data.backWidth));
   if(data.texture)upload(0,1024,1024,data.texture);
   upload(1,256,128,data.luma);upload(2,256,96,data.xlat);
   gl.useProgram(poly);gl.uniform2f(gl.getUniformLocation(poly,'size'),w,h);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(data.vertices),gl.STREAM_DRAW);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
   const batches=new Int32Array(data.batches);
   for(let n=0;n<batches.length;n+=6){const [first,count,x,y,bw,bh]=batches.subarray(n,n+6);gl.scissor(x*scale,(h-y-bh)*scale,bw*scale,bh*scale);gl.drawArrays(gl.TRIANGLES,first,count);}
   const translated=translateJapanese(new Uint8Array(data.front),data.frontWidth,h);
   layerDraw(data.front,data.frontWidth,h);
   const error=gl.getError();if(error)throw Error('WebGL renderer error '+error);
   canvas.dataset.renderer='original-rom-webgl2';canvas.dataset.internalResolution=canvas.width+'×'+canvas.height;canvas.dataset.romTriangles=String(data.vertices.byteLength/64/3);
   canvas.dataset.backgroundMode='full-native-art';
   canvas.dataset.japaneseTranslation=translated.join(',');
  }
 };
}
