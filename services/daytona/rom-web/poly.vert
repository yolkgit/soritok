#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aOz;
layout(location=2) in vec4 aColor;
layout(location=3) in uvec4 aInfo;
layout(location=4) in uvec2 aMore;
uniform vec2 size;
out vec3 vOz;
flat out vec4 vColor;
flat out uvec4 vInfo;
flat out uvec2 vMore;
void main(){gl_Position=vec4(aPos.x/size.x*2.0-1.0,1.0-aPos.y/size.y*2.0,aPos.z*2.0-1.0,1.0);vOz=aOz;vColor=aColor;vInfo=aInfo;vMore=aMore;}
