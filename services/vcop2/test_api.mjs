import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../work/vcop2-original',import.meta.url)),version=JSON.parse(fs.readFileSync(path.join(root,'web/runtime.json'))).assets['core.wasm'].sha256;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vcop2-api-')),base='http://127.0.0.1:3021',server=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{env:{...process.env,VCOP2_PORT:'3021',DATABASE_PATH:path.join(directory,'test.sqlite')},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('Server exit '+c)));});
async function req(url,method='GET',data,extra={}){const r=await fetch(base+url,{method,headers:{Origin:base,...(data===undefined?{}:{'Content-Type':'application/json'}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const notes='/vcop2/api/memos',rooms='/vcop2/api/rooms';
try{
 let r=await req(notes,'POST',{name:'API 검사',content:'한 줄 메모'});assert.equal(r.status,201);const author=r.cookie,id=r.data.memo.id;assert.ok(author);assert.equal(r.data.memo.mine,true);
 assert.equal((await req(notes+'/'+id,'PATCH',{name:'다른 작성자',content:'변경'})).status,403);
 assert.equal((await req(notes,'POST',{name:'x',content:'y'},{Origin:'https://unrelated.invalid'})).status,403);
 assert.equal((await req(notes,'POST',{name:'x',content:'x'.repeat(201)})).status,400);
 r=await req(notes+'/'+id,'PATCH',{name:'API 검사',content:'수정 완료'},{Cookie:author});assert.equal(r.status,200);
 r=await req(notes);assert.equal(r.data.items[0].content,'수정 완료');assert.equal(r.data.items[0].mine,false);
 assert.equal((await req(notes+'/'+id,'DELETE',undefined,{Cookie:author})).status,200);
 assert.equal((await req(notes)).data.items.length,0);
 assert.equal((await req(notes+'/'+id+'/restore','POST',{}, {Cookie:author})).status,200);
 r=await req(notes,'POST',{name:'API 검사',content:'오늘 메모 갱신'},{Cookie:author});assert.equal(r.data.memo.id,id);assert.equal(r.status,200);
 assert.equal((await req(notes,'POST',{name:'API 검사',content:'한도 검사'},{Cookie:author})).status,429);
 console.log('PASS: one-line memo persistence, daily update, owner-only edit/delete, undo, validation, CSRF and rate limit.');
 r=await req(rooms,'POST',{version});assert.equal(r.status,201);const code=r.data.code,host=r.data.token,header=t=>({'X-Live-Token':t});
 r=await req(rooms+'/'+code+'/join','POST',{version});assert.equal(r.status,200);const guest=r.data.token;let epoch=r.data.state.epoch;
 assert.equal((await req(rooms+'/'+code+'/join','POST',{version})).status,409);
 assert.equal((await req(rooms,'POST',{version:'wrong'})).status,409);
 const packed=gzipSync(randomBytes(1280*1024)),digest=createHash('sha256').update(packed).digest('hex');
 async function upload(t=host){const size=512*1024,count=Math.ceil(packed.length/size);let response;for(let part=0;part<count;part++){response=await fetch(base+rooms+'/'+code+'/snapshot',{method:'POST',headers:{Origin:base,...header(t),'Content-Type':'application/octet-stream','X-Snapshot-Frame':'1000','X-Snapshot-Hash':digest,'X-Snapshot-Part':String(part),'X-Snapshot-Parts':String(count)},body:packed.subarray(part*size,(part+1)*size)});if(!response.ok)return response;}return response;}
 assert.equal((await upload(guest)).status,403);const badPart=await fetch(base+rooms+'/'+code+'/snapshot',{method:'POST',headers:{Origin:base,...header(host),'Content-Type':'application/octet-stream','X-Snapshot-Frame':'1000','X-Snapshot-Hash':digest,'X-Snapshot-Part':'1','X-Snapshot-Parts':'3'},body:packed.subarray(0,128)});assert.equal(badPart.status,409);assert.equal((await upload()).status,200);
 let downloaded=await fetch(base+rooms+'/'+code+'/snapshot',{headers:header(guest)});assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(packed));
 for(const t of [host,guest])assert.equal((await req(rooms+'/'+code+'/ready','POST',{epoch,frame:1000,hash:123},header(t))).status,200);
 await req(rooms+'/'+code+'/input','POST',{seq:2,x:100,y:150,shots:1,reloads:0,starts:0,buttons:0},header(host));
 await req(rooms+'/'+code+'/input','POST',{seq:1,x:600,y:300,shots:1,reloads:0,starts:0,buttons:1},header(host));
 let cursors=[0,0],all=[[],[]],state;
 async function poll(i){const q=await req(rooms+'/'+code+'/poll?epoch='+epoch+'&after='+cursors[i]+'&ack='+cursors[i],'GET',undefined,header([host,guest][i]));assert.equal(q.status,200);all[i].push(...q.data.frames);if(q.data.frames.length)cursors[i]=q.data.frames.at(-1).n;state=q.data.state;return q.data;}
 while(Math.min(...cursors)<34){await poll(0);await poll(1);}
 const common=new Map(all[0].map(f=>[f.n,f]));for(const f of all[1])if(common.has(f.n))assert.deepEqual(f,common.get(f.n),'Both clients receive exactly the same ordered inputs');
 assert.ok(all[0].some(f=>f.p[0][0]===100&&f.p[0][1]===150&&(f.p[0][2]&1)),'Release-before-press network ordering retains the shot');
 for(const t of [host,guest])await req(rooms+'/'+code+'/hash','POST',{epoch,seq:30,hash:77},header(t));
 await poll(0);assert.equal(state.verifiedSeq,30);
 await req(rooms+'/'+code+'/pause','POST',{paused:true},header(guest));await poll(0);assert.equal(state.phase,'paused');
 await req(rooms+'/'+code+'/pause','POST',{paused:false},header(host));
 await req(rooms+'/'+code+'/hash','POST',{epoch,seq:31,hash:1},header(host));await req(rooms+'/'+code+'/hash','POST',{epoch,seq:31,hash:2},header(guest));await poll(0);assert.equal(state.phase,'error','Divergence pauses actual play');
 assert.equal((await req(rooms+'/'+code+'/resync','POST',{},header(guest))).status,403);
 r=await req(rooms+'/'+code+'/resync','POST',{},header(host));assert.equal(r.data.state.phase,'checkpoint');epoch=r.data.state.epoch;
 assert.equal((await upload()).status,200);for(const t of [host,guest])await req(rooms+'/'+code+'/ready','POST',{epoch,frame:1000,hash:123},header(t));
 await req(rooms+'/'+code+'/leave','POST',{},header(guest));cursors=[0,0];await poll(0);assert.equal(state.phase,'waiting');assert.equal(state.players[1].connected,false);
 await req(rooms+'/'+code+'/leave','POST',{},header(host));
 console.log('PASS: two roles/full room/version checks, authenticated snapshot transfer, ordered inputs, bounded frame flow, shared pause, divergence detection, resync and disconnect.');
}finally{server.kill();await new Promise(resolve=>server.once('exit',resolve));}

const {DatabaseSync}=await import('node:sqlite');
const persisted=new DatabaseSync(path.join(directory,'test.sqlite'));
assert.equal(persisted.prepare('SELECT content FROM memos WHERE deleted IS NULL').get().content,'오늘 메모 갱신');
persisted.close();console.log('PASS: memo remains after the server and database are closed/reopened.');
