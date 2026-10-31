// WebGL2 display-list renderer, based on sm2-emu and daytona-arcade-recomp.
// Copyrights and BSD/GPL notices: renderer-license.txt and runtime-notice.txt.
export async function createGpu(canvas) {
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,stencil:false,desynchronized:true,preserveDrawingBuffer:false});
  if(!gl){const error=Error('WebGL2 unavailable');error.unsupported=true;throw error;}
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  const [vertex,fragment]=await Promise.all(['poly.vert','poly.frag'].map(async file=>{const response=await fetch(new URL(file,import.meta.url));if(!response.ok)throw Error(`Shader ${response.status}`);return response.text();}));
  const poly=program(vertex,fragment);
  const quad=program(`#version 300 es
    precision highp float;out vec2 uv;
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=vec2(p.x,1.0-p.y);gl_Position=vec4(p*2.0-1.0,0,1);}`,
    `#version 300 es
    precision highp float;uniform sampler2D layer;uniform float nativeWidth;uniform float centered;
    in vec2 uv;out vec4 color;
    void main(){float x=centered>.5?(uv.x*nativeWidth-(nativeWidth-496.0)*.5)/496.0:uv.x;
    if(x<0.0||x>1.0)discard;vec4 c=texture(layer,vec2(x,uv.y));if(c.a<.01)discard;color=vec4(c.rgb,1);}`);
  const vao=gl.createVertexArray(),vertices=gl.createBuffer(),empty=gl.createVertexArray();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
  for(const [location,count,offset] of [[0,3,0],[1,3,12],[2,4,24]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,64,offset);}
  for(const [location,count,offset] of [[3,4,40],[4,2,56]]){gl.enableVertexAttribArray(location);gl.vertexAttribIPointer(location,count,gl.UNSIGNED_INT,64,offset);}
  const textures=[];
  for(const [unit,width,height] of [[0,1024,512],[1,256,128],[2,256,96]]){
    const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texStorage2D(gl.TEXTURE_2D,1,gl.R32UI,width,height);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  }
  const ringTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,ringTexture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  const layerTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,layerTexture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,496,384);
  gl.useProgram(poly);['texram','lumaram','xlat','rings'].forEach((name,i)=>gl.uniform1i(gl.getUniformLocation(poly,name),i===3?4:i));
  gl.useProgram(quad);gl.uniform1i(gl.getUniformLocation(quad,'layer'),3);
  const uniforms={size:gl.getUniformLocation(poly,'size'),native:gl.getUniformLocation(poly,'nativeSize'),output:gl.getUniformLocation(poly,'outputSize'),layerWidth:gl.getUniformLocation(quad,'nativeWidth'),centered:gl.getUniformLocation(quad,'centered')};
  let textureGeneration=-1,tableGeneration=-1,quality=1080,vertexCapacity=0,ringHeight=0;
  function upload(unit,width,height,view){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[unit]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RED_INTEGER,gl.UNSIGNED_INT,view);}
  function layer(core,front,width){gl.disable(gl.DEPTH_TEST);gl.disable(gl.SCISSOR_TEST);gl.useProgram(quad);gl.bindVertexArray(empty);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,layerTexture);
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,496,384,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(core.HEAPU8.buffer,core._rom_gpu_layer(front),496*384*4));
    gl.uniform1f(uniforms.layerWidth,width);gl.uniform1f(uniforms.centered,1);gl.drawArrays(gl.TRIANGLES,0,3);}
  return {
    setQuality(value){quality=value===384?384:value===720?720:1080;},
    get width(){return canvas.width;},get height(){return canvas.height;},
    draw(core){
      core._rom_gpu_build();
      const width=core._rom_width(),height=384,w=quality===384?width:quality===720?1280:1920,h=quality;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);const background=core._rom_gpu_background()>>>0;
      gl.clearColor((background&255)/255,((background>>>8)&255)/255,((background>>>16)&255)/255,1);
      gl.depthMask(true);gl.clearDepth(1);gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      layer(core,0,width);
      const texGeneration=core._rom_gpu_texture_generation(),tabGeneration=core._rom_gpu_table_generation();
      if(texGeneration!==textureGeneration){upload(0,1024,512,new Uint32Array(core.HEAPU8.buffer,core._rom_gpu_texture(),0x80000));textureGeneration=texGeneration;}
      if(tabGeneration!==tableGeneration){upload(1,256,128,new Uint32Array(core.HEAPU8.buffer,core._rom_gpu_luma(),0x8000));upload(2,256,96,new Uint32Array(core.HEAPU8.buffer,core._rom_gpu_xlat(),0x6000));tableGeneration=tabGeneration;}
      const floats=core._rom_gpu_ring_floats(),rows=Math.max(1,floats/1024);
      gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,ringTexture);
      const rings=floats?new Float32Array(core.HEAPU8.buffer,core._rom_gpu_rings(),floats):new Float32Array(1024);
      if(ringHeight!==rows){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,256,rows,0,gl.RGBA,gl.FLOAT,rings);ringHeight=rows;}
      else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,256,rows,gl.RGBA,gl.FLOAT,rings);
      gl.useProgram(poly);gl.uniform2f(uniforms.size,width,height);gl.uniform2f(uniforms.native,width,height);gl.uniform2f(uniforms.output,w,h);
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
      const count=core._rom_gpu_vertex_count(),bytes=count*64;
      if(bytes>vertexCapacity){vertexCapacity=Math.ceil(bytes/65536)*65536;gl.bufferData(gl.ARRAY_BUFFER,vertexCapacity,gl.DYNAMIC_DRAW);}
      if(bytes)gl.bufferSubData(gl.ARRAY_BUFFER,0,new Uint8Array(core.HEAPU8.buffer,core._rom_gpu_vertices(),bytes));
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
      const batches=new Int32Array(core.HEAPU8.buffer,core._rom_gpu_batches(),core._rom_gpu_batch_count()*6);
      for(let i=0;i<batches.length;i+=6){const [first,n,x,y,bw,bh]=batches.subarray(i,i+6);const x0=Math.floor(x*w/width),x1=Math.ceil((x+bw)*w/width),y0=Math.floor((height-y-bh)*h/height),y1=Math.ceil((height-y)*h/height);gl.scissor(x0,y0,x1-x0,y1-y0);gl.drawArrays(gl.TRIANGLES,first,n);}
      layer(core,1,width);
    },
    error(){return gl.getError();},
  };
}
