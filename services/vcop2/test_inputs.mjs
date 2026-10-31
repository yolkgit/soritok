import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
// Exercise the shipped DOM handlers with independent pointer identities,
// cancellation and focus loss. This is not a physical touch-device test.
const sent=[],nodes=new Map();
function node(id){if(nodes.has(id))return nodes.get(id);const e={id,hidden:false,style:{},dataset:{},events:{},classList:{add(){},remove(){},toggle(){}},addEventListener(name,fn){(this.events[name]??=[]).push(fn);},setAttribute(){},setPointerCapture(){},focus(){},matches(){return false;},getBoundingClientRect(){return {left:10,top:20,width:662,height:384};}};nodes.set(id,e);return e;}
const document={getElementById:node,events:{},body:{classList:{add(){}}},addEventListener(name,fn){(this.events[name]??=[]).push(fn);}};
const window={events:{},addEventListener(name,fn){(this.events[name]??=[]).push(fn);}};
class Worker{constructor(){this.postMessage=m=>sent.push(m);worker=this;}terminate(){}}
let worker;const context=vm.createContext({document,window,Worker,URL,console,Float32Array,Uint8Array,Map,Promise,setTimeout:()=>0,clearTimeout(){},navigator:{userAgent:'Unit test'},matchMedia:()=>({matches:false}),localStorage:{getItem(){return null;},setItem(){}},location:{reload(){}},screen:{}});
vm.runInContext(fs.readFileSync(new URL('./web/app.mjs',import.meta.url),'utf8').replaceAll('import.meta.url',"'http://127.0.0.1:3018/vcop2/app.mjs'"),context);
worker.onmessage({data:{type:'ready',renderer:'webgl2',nativeWidth:662,width:1920,height:1080}});
const screen=node('screen');
function event(type,id=1,extra={}){const e={type,pointerId:id,pointerType:'touch',button:0,clientX:341,clientY:212,preventDefault(){this.prevented=true;},target:{matches:()=>false},...extra};for(const fn of screen.events[type]??[])fn(e);return e;}
const input=()=>sent.filter(m=>m.type==='input').at(-1);
event('pointerdown',11);assert.equal(input().buttons,1);assert.equal(input().x,331);assert.equal(input().y,192);
event('pointerdown',22);event('pointercancel',11);assert.equal(input().buttons,1,'One cancelled finger preserves the other');
const menu={preventDefault(){this.prevented=true;}};for(const fn of node('cabinet').events.contextmenu)fn(menu);assert.equal(menu.prevented,true);assert.equal(input().buttons,1,'Context menu prevention does not release held trigger');
node('reload').onpointerdown({preventDefault(){}});assert.equal(sent.at(-1).type,'reload');assert.equal(input().buttons,1,'Second-finger reload preserves trigger identity');
event('pointerup',22);assert.equal(input().buttons,0);
event('pointerdown',33);for(const fn of window.events.blur)fn();assert.equal(input().buttons,0);assert.ok(sent.some(m=>m.type==='pause'&&m.paused));
worker.onmessage({data:{type:'paused',paused:false,frame:1}});
for(const fn of document.events.keydown)fn({code:'Space',repeat:false,target:{matches:()=>false},preventDefault(){}});assert.equal(input().buttons,1);
for(const fn of document.events.keyup)fn({code:'Space'});assert.equal(input().buttons,0);
console.log('PASS: independent touch cancellation, long-press prevention, simultaneous reload, focus-loss release, Space key-up.');
