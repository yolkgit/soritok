import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
fs.mkdirSync('outputs',{recursive:true});
const db='outputs/qa-'+Date.now()+'.sqlite';
const child=spawn(process.execPath,['server/start.mjs'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',PUBLIC_ORIGIN:'',DATABASE_PATH:db},stdio:['ignore','pipe','inherit']});
let base;
try{
 base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);child.stdout.on('data',chunk=>{const match=String(chunk).match(/listening on port (\d+)/);if(match){clearTimeout(timer);resolve('http://127.0.0.1:'+match[1]);}});child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});});
 assert.equal((await fetch(base+'/healthz')).status,200);
 assert.ok((await fetch(base+'/racing/')).headers.get('content-type').includes('text/html'));
 const wasm=await fetch(base+'/racing/core.wasm',{method:'HEAD'});assert.equal(wasm.status,200);assert.equal(wasm.headers.get('content-type'),'application/wasm');
 for(const name of ['/.env','/server/start.mjs','/racing/%2e%2e/%2e%2e/package.json'])assert.equal((await fetch(base+name)).status,404);
 for(const script of ['test-journal.mjs','test-checkin.mjs']){
  const test=spawn(process.execPath,['scripts/'+script,base],{stdio:'inherit'});assert.equal((await once(test,'exit'))[0],0,script);
 }
 async function api(route,body,token){const r=await fetch(base+'/api/rooms'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(token?{'x-room-token':token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 const host=await api('',{name:'HOST'});assert.equal(host.status,201);const code=host.data.room.code,players=[host.data.player];
 for(let i=2;i<=4;i++){const joined=await api('/'+code+'/join',{name:'PLAYER '+i});assert.equal(joined.status,201);players.push(joined.data.player);}
 assert.equal((await api('/'+code+'/join',{name:'FIFTH'})).status,409);
 assert.equal((await api('/'+code+'/launch',{},players[1].token)).status,403);
 assert.equal((await api('/'+code+'/launch',{},players[0].token)).status,409);
 for(const player of players)assert.equal((await api('/'+code+'/ready',{ready:true},player.token)).status,200);
 assert.equal((await api('/'+code+'/launch',{},players[0].token)).status,200);
 assert.equal((await api('/'+code+'/signal',{to:players[1].id,payload:{type:'offer',sdp:'LOCAL QA'}},players[0].token)).status,200);
 const result={passed:true,staticMime:true,privatePathsBlocked:true,journalAndAttendance:true,fourPlayers:true,fifthRejected:true,hostOnlyLaunch:true,readyChecks:true,signaling:true};
 fs.writeFileSync('outputs/server-tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{child.kill('SIGTERM');await once(child,'exit');}
