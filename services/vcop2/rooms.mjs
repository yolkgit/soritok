import {randomInt} from 'node:crypto';
import {body,bytes,json,fail,sameOrigin,clientIp,RateLimit,token,hash} from './http.mjs';
import {CabinetInput} from './web/cabinet-input.mjs';
const STEP=1000/57.5245,alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export class Rooms{
 constructor(version){this.version=version;this.rooms=new Map();this.rates=new RateLimit();this.deadline=performance.now()+STEP;const tick=()=>{this.tick();this.deadline+=STEP;if(performance.now()-this.deadline>STEP*3)this.deadline=performance.now()+STEP;this.timer=setTimeout(tick,Math.max(1,this.deadline-performance.now()));this.timer.unref();};this.timer=setTimeout(tick,STEP);this.timer.unref();}
 close(){clearTimeout(this.timer);for(const room of this.rooms.values())for(const pending of room.polls)pending.done();}
 player(){return {token:token(),input:new CabinetInput(),ack:0,ready:false,visible:true,seen:Date.now()};}
 state(r){return {code:r.code,phase:r.phase,reason:r.reason||'',seq:r.seq,epoch:r.epoch,verifiedSeq:r.verifiedSeq,snapshot:r.snapshot?{id:r.snapshot.id,frame:r.snapshot.frame,bytes:r.snapshot.data.length,version:this.version,width:662}:null,waiting:r.phase==='playing'&&!!r.lagSince&&Date.now()-r.lagSince>750,players:r.players.map(p=>({connected:!!p&&Date.now()-p.seen<8000,ready:!!p?.ready}))};}
 reset(r,phase='checkpoint'){r.phase=phase;r.reason='';r.epoch++;r.seq=0;r.history=[];r.hashes.clear();r.verifiedSeq=0;r.snapshot=null;r.upload=null;for(const p of r.players)if(p){p.ready=false;p.ack=0;p.input.clear();}this.flush(r,true);}
 pause(r,reason){r.phase='paused';r.reason=reason;for(const p of r.players)if(p)p.input.clear();this.flush(r,true);}
 flush(r,force=false){for(const pending of [...r.polls])if(force||r.seq>pending.after&&r.seq%2===0)pending.done();}
 tick(){const now=Date.now();for(const [code,r]of this.rooms){if(now-r.created>7200000||now-r.players[0].seen>120000||r.phase==='closed'&&now-r.closedAt>30000){r.phase='closed';r.reason='방이 만료되었습니다.';this.flush(r,true);this.rooms.delete(code);continue;}if(r.phase!=='playing')continue;
   if(r.players.some(p=>!p||now-p.seen>8000)){this.pause(r,'상대 연결이 끊겨 일시정지했습니다.');continue;}
   if(r.players.some(p=>r.seq-p.ack>=8)){r.lagSince??=now;if(now-r.lagSince>10000)this.pause(r,'상대 연결을 기다리고 있습니다.');continue;}r.lagSince=null;
   const frame={n:++r.seq,p:r.players.map(p=>p.input.next())};r.history.push(frame);if(r.history.length>160)r.history.shift();this.flush(r);
  }}
 authenticate(req,r){const t=String(req.headers['x-live-token']||'');const i=r.players.findIndex(p=>p?.token===t);if(i<0)fail(403,'방에 다시 참가해 주세요.');const p=r.players[i];p.seen=Date.now();return {p,i};}
 versionCheck(b){if(!this.version||b.version!==this.version)fail(409,'게임 버전이 다릅니다. 두 화면을 새로고침해 주세요.');}
 async handle(req,res,url,origin){
  const parts=url.pathname.slice('/vcop2/api/rooms'.length).split('/').filter(Boolean),[code,action]=parts;
  if(req.method!=='GET')sameOrigin(req,origin);
  if(!code&&req.method==='POST'){this.rates.take('create:'+clientIp(req),4,60000);const b=await body(req);this.versionCheck(b);if(this.rooms.size>=16)fail(503,'현재 방이 많습니다. 잠시 후 다시 시도해 주세요.');let next;do{next=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(this.rooms.has(next));const r={code:next,created:Date.now(),phase:'waiting',reason:'친구를 기다리고 있습니다.',epoch:0,seq:0,history:[],hashes:new Map(),verifiedSeq:0,players:[this.player(),null],polls:new Set(),snapshot:null,everPlayed:false};this.rooms.set(next,r);json(res,201,{code:next,player:1,token:r.players[0].token,state:this.state(r)});return;}
  const r=this.rooms.get(code);if(!r||r.phase==='closed')fail(404,'종료되었거나 없는 방입니다.');
  if(action==='join'&&req.method==='POST'){this.rates.take('join:'+clientIp(req),12,60000);const b=await body(req);this.versionCheck(b);if(r.players[1]&&Date.now()-r.players[1].seen<45000)fail(409,'이미 두 명이 참가한 방입니다.');r.players[1]=this.player();this.reset(r);json(res,200,{code,player:2,token:r.players[1].token,state:this.state(r)});return;}
  const {p,i}=this.authenticate(req,r);this.rates.take('player:'+p.token,180,1000);
  if(action==='poll'&&req.method==='GET'){
   const after=Number(url.searchParams.get('after')||0),ack=Number(url.searchParams.get('ack')||0),epoch=Number(url.searchParams.get('epoch')||0);
   if(!Number.isSafeInteger(after)||!Number.isSafeInteger(ack)||after<0||ack<0)fail(400,'프레임 위치를 확인해 주세요.');
   if(epoch===r.epoch&&ack<=r.seq)p.ack=Math.max(p.ack,ack);
   if(epoch===r.epoch&&after>0&&r.history.length&&after<r.history[0].n-1){this.pause(r,'연결 복구가 필요합니다. 방장이 연결 복구를 눌러 주세요.');}
   let ended=false,pending,timer;const done=()=>{if(ended)return;ended=true;clearTimeout(timer);r.polls.delete(pending);if(!res.destroyed)json(res,200,{state:this.state(r),frames:epoch===r.epoch?r.history.filter(f=>f.n>after).slice(0,8):[]});};
   pending={after,done};r.polls.add(pending);res.on('close',()=>{ended=true;clearTimeout(timer);r.polls.delete(pending);});
   if(epoch!==r.epoch||r.seq>after&&r.seq%2===0)done();else timer=setTimeout(done,250);return;
  }
  if(action==='snapshot'&&req.method==='GET'){if(!r.snapshot)fail(409,'게임 상태를 준비하고 있습니다.');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':r.snapshot.data.length,'Cache-Control':'no-store'});res.end(r.snapshot.data);return;}
  if(action==='snapshot'&&req.method==='POST'){
   if(i!==0||r.phase!=='checkpoint')fail(403,'방장만 게임 상태를 보낼 수 있습니다.');const frame=Number(req.headers['x-snapshot-frame']),digest=String(req.headers['x-snapshot-hash']||''),chunked=req.headers['x-snapshot-parts']!==undefined,epoch=r.epoch;
   if(!Number.isSafeInteger(frame)||frame<0||frame>1e12||! /^[a-f0-9]{64}$/.test(digest))fail(400,'게임 상태를 확인해 주세요.');
   const part=Number(req.headers['x-snapshot-part']),count=Number(req.headers['x-snapshot-parts']);if(chunked&&(!Number.isInteger(count)||count<1||count>16||!Number.isInteger(part)||part<0||part>=count))fail(400,'게임 상태 조각을 확인해 주세요.');
   let data=await bytes(req,chunked?512*1024:8*1024*1024);if(r.epoch!==epoch||r.phase!=='checkpoint')fail(409,'방 상태가 바뀌었습니다. 다시 준비해 주세요.');
   if(chunked){if(part===0)r.upload={id:digest,frame,count,parts:[],size:0};const u=r.upload;if(!u||u.id!==digest||u.frame!==frame||u.count!==count||u.parts.length!==part)fail(409,'게임 상태 조각을 순서대로 보내 주세요.');let total=data.length;for(const room of this.rooms.values())total+=(room.snapshot?.data.length||0)+(room.upload?.size||0);if(total>64*1024*1024)fail(503,'방을 준비할 공간이 부족합니다.');u.parts.push(data);u.size+=data.length;if(part+1<count){json(res,200,{received:part+1});return;}data=Buffer.concat(u.parts);r.upload=null;}
   if(data.length<64||data[0]!==31||data[1]!==139||data.readUInt32LE(data.length-4)>32*1024*1024)fail(400,'게임 상태를 확인해 주세요.');
   if(hash(data)!==digest)fail(400,'게임 상태 전송 검사가 실패했습니다.');let total=data.length;for(const room of this.rooms.values())if(room!==r)total+=(room.snapshot?.data.length||0)+(room.upload?.size||0);if(total>64*1024*1024)fail(503,'방을 준비할 공간이 부족합니다.');
   r.snapshot={data,id:digest,frame};r.phase='sync';for(const q of r.players)if(q)q.ready=false;this.flush(r,true);json(res,200,{state:this.state(r)});return;
  }
  if(req.method!=='POST')fail(405,'지원하지 않는 요청입니다.');
  const b=await body(req);
  if(action==='input'){if(b.visible!==undefined)p.visible=!!b.visible;p.input.update(b);if(r.phase!=='playing')p.input.clear();json(res,200,{ok:true});return;}
  if(action==='ready'){if(b.epoch!==r.epoch||r.phase!=='sync')fail(409,'게임 상태를 다시 준비해 주세요.');if(!Number.isInteger(b.hash)||b.hash<0||b.hash>0xffffffff||b.frame!==r.snapshot.frame)fail(400,'실행 상태를 확인해 주세요.');p.ready=true;p.initialHash=b.hash;if(r.players.every(q=>q?.ready)){if(r.players[0].initialHash!==r.players[1].initialHash){r.phase='error';r.reason='게임 상태가 일치하지 않습니다. 방장이 연결 복구를 눌러 주세요.';}else{r.phase='playing';r.reason='';if(!r.everPlayed){for(const q of r.players)q.input.start=38;r.everPlayed=true;}}}this.flush(r,true);json(res,200,{state:this.state(r)});return;}
  if(action==='pause'){if(b.paused){this.pause(r,String(i+1)+'P가 일시정지했습니다.');}else{if(!r.players.every(q=>q?.ready))fail(409,'두 화면이 모두 준비되어야 계속할 수 있습니다.');if(!['paused','playing'].includes(r.phase))fail(409,'먼저 연결 복구를 진행해 주세요.');r.phase='playing';r.reason='';this.flush(r,true);}json(res,200,{state:this.state(r)});return;}
  if(action==='resync'){if(i!==0)fail(403,'방장만 연결을 복구할 수 있습니다.');if(!r.players[1])fail(409,'친구가 먼저 참가해야 합니다.');this.reset(r);json(res,200,{state:this.state(r)});return;}
  if(action==='hash'){if(b.epoch===r.epoch&&Number.isInteger(b.seq)&&b.seq>0&&b.seq<=r.seq&&b.seq>r.seq-160&&Number.isInteger(b.hash)&&b.hash>=0&&b.hash<=0xffffffff){let pair=r.hashes.get(b.seq);if(!pair){pair=[];r.hashes.set(b.seq,pair);}pair[i]=b.hash;if(pair[0]!==undefined&&pair[1]!==undefined){if(pair[0]!==pair[1]){r.phase='error';r.reason='화면 동기화가 끊겼습니다. 방장이 연결 복구를 눌러 주세요.';for(const q of r.players)q?.input.clear();this.flush(r,true);}else r.verifiedSeq=Math.max(r.verifiedSeq,b.seq);}for(const seq of r.hashes.keys())if(seq<r.seq-160)r.hashes.delete(seq);}json(res,200,{ok:true});return;}
  if(action==='leave'){p.input.clear();if(i===0){r.phase='closed';r.reason='방장이 방을 나갔습니다.';r.closedAt=Date.now();}else{r.players[1]=null;this.reset(r,'waiting');r.reason='친구가 방을 나갔습니다. 새 친구를 초대할 수 있습니다.';}this.flush(r,true);json(res,200,{ok:true});return;}
  fail(404,'요청을 찾을 수 없습니다.');
 }
}
