const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
async function snapshot(db,code){const room=await one(db,'SELECT code,host,phase,match,start_at,play_at FROM race_rooms WHERE code=?',code);const players=await all(db,'SELECT id,seat,name,ready,connected,cabinet FROM race_players WHERE room=? ORDER BY seat',code);return {...room,players};}
export async function roomRequest(request,db){
 try{
  if(!db)return json({error:'온라인 서버를 준비 중입니다.'},503);
  const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).slice(2),code=parts[0],action=parts[1];
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)fail('다른 사이트에서 요청할 수 없습니다.',403);
  let body={};if(request.method==='POST'){const raw=await request.text();if(raw.length>32768)fail('요청이 너무 큽니다.',413);try{body=JSON.parse(raw||'{}');}catch{fail('잘못된 요청입니다.');}}
  const now=Date.now();
  if(request.method==='POST'&&(!code||action==='join')){
   const name=String(body.name||'RACER').trim().slice(0,24)||'RACER';
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),secret=await digest(token);
   if(!code){
    const count=await one(db,'SELECT COUNT(*) AS n FROM race_rooms WHERE updated>?',now-900000);if(count.n>=100)fail('현재 방이 많습니다. 잠시 후 다시 시도해 주세요.',429);
    const createdCode=roomCode();
    await db.batch([db.prepare('DELETE FROM race_signals WHERE created<?').bind(now-900000),db.prepare('DELETE FROM race_players WHERE room IN (SELECT code FROM race_rooms WHERE updated<?)').bind(now-900000),db.prepare('DELETE FROM race_rooms WHERE updated<?').bind(now-900000),db.prepare('INSERT INTO race_rooms(code,host,phase,created,updated) VALUES(?,?,?,?,?)').bind(createdCode,id,'waiting',now,now),db.prepare('INSERT INTO race_players(id,room,seat,name,secret,seen) VALUES(?,?,?,?,?,?)').bind(id,createdCode,1,name,secret,now)]);
    return json({room:await snapshot(db,createdCode),player:{id,token,seat:1}},201);
   }
   if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))fail('방 코드를 확인해 주세요.');
   const room=await one(db,'SELECT * FROM race_rooms WHERE code=?',code);if(!room||now-room.updated>900000)fail('방을 찾을 수 없습니다.',404);if(room.phase!=='waiting')fail('이미 시작한 방입니다.',409);
   for(let seat=1;seat<=4;seat++){
    try{const r=await run(db,"INSERT INTO race_players(id,room,seat,name,secret,seen) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM race_rooms WHERE code=? AND phase='waiting') AND NOT EXISTS(SELECT 1 FROM race_players WHERE room=? AND seat=?)",id,code,seat,name,secret,now,code,code,seat);if(r.meta.changes){await run(db,'UPDATE race_rooms SET updated=? WHERE code=?',now,code);return json({room:await snapshot(db,code),player:{id,token,seat}},201);}}catch(error){if(!String(error).includes('UNIQUE'))throw error;}
   }
   fail('최대 4명까지 참여할 수 있습니다.',409);
  }
  if(!code||!/^[A-HJ-NP-Z2-9]{6}$/.test(code))fail('방을 찾을 수 없습니다.',404);
  const auth=request.headers.get('x-room-token');if(!auth||auth.length>150)fail('방에 다시 참여해 주세요.',401);
  const player=await one(db,'SELECT * FROM race_players WHERE room=? AND secret=?',code,await digest(auth));if(!player)fail('참가 권한이 없습니다.',403);
  let room=await one(db,'SELECT * FROM race_rooms WHERE code=?',code);if(!room||now-room.updated>900000)fail('종료된 방입니다.',410);
  const host=await one(db,'SELECT seen FROM race_players WHERE id=?',room.host);
  if(!host||now-host.seen>45000){await run(db,"UPDATE race_rooms SET phase='closed' WHERE code=?",code);room.phase='closed';}
  await run(db,'UPDATE race_players SET seen=? WHERE id=?',now,player.id);
  await run(db,'UPDATE race_rooms SET updated=? WHERE code=?',now,code);
  if(request.method==='GET'){
   const after=Math.max(0,Number(url.searchParams.get('after'))||0);
   const signals=await all(db,'SELECT id,sender,payload FROM race_signals WHERE room=? AND recipient=? AND id>? ORDER BY id LIMIT 100',code,player.id,after);
   return json({room:await snapshot(db,code),signals:signals.map(s=>({...s,payload:JSON.parse(s.payload)})),serverTime:now});
  }
  if(action==='ready'){if(room.phase!=='waiting')fail('이미 시작한 방입니다.',409);await run(db,'UPDATE race_players SET ready=? WHERE id=?',body.ready?1:0,player.id);}
  else if(action==='launch'){
   if(room.host!==player.id)fail('방장만 시작할 수 있습니다.',403);
   const roster=await all(db,'SELECT * FROM race_players WHERE room=? ORDER BY seat',code);
   if(room.phase!=='waiting'||roster.length<2||roster.length>4||roster.some(p=>!p.ready||now-p.seen>30000))fail('2–4명 모두 준비를 눌러 주세요.',409);
   await db.batch([db.prepare("UPDATE race_rooms SET phase='connecting',match=?,start_at=NULL,play_at=NULL WHERE code=?").bind(crypto.randomUUID(),code),db.prepare('UPDATE race_players SET connected=0,cabinet=0 WHERE room=?').bind(code)]);
  }else if(action==='signal'){
   if(!['connecting','booting','playing'].includes(room.phase))fail('연결 준비 전입니다.',409);
   const recipient=await one(db,'SELECT id FROM race_players WHERE room=? AND id=?',code,String(body.to));if(!recipient||recipient.id===player.id)fail('잘못된 연결 대상입니다.');
   const payload=body.payload;if(!payload||!['offer','answer','candidate'].includes(payload.type)||JSON.stringify(payload).length>24000)fail('잘못된 연결 정보입니다.');
   const quota=await one(db,'SELECT COUNT(*) AS n FROM race_signals WHERE room=? AND sender=?',code,player.id);if(quota.n>=400)fail('연결 요청이 너무 많습니다.',429);
   await run(db,'INSERT INTO race_signals(room,sender,recipient,payload,created) VALUES(?,?,?,?,?)',code,player.id,recipient.id,JSON.stringify(payload),now);
  }else if(action==='connected'){
   if(!['connecting','booting'].includes(room.phase))fail('연결 상태가 바뀌었습니다.',409);
   await run(db,'UPDATE race_players SET connected=1 WHERE id=?',player.id);
   const remaining=await one(db,'SELECT COUNT(*) AS n FROM race_players WHERE room=? AND connected=0',code);
   if(!remaining.n)await run(db,"UPDATE race_rooms SET phase='booting',start_at=? WHERE code=? AND phase='connecting'",now+1500,code);
  }else if(action==='cabinet'){
   const count=await one(db,'SELECT COUNT(*) AS n FROM race_players WHERE room=?',code);if(Number(body.count)!==count.n)fail('게임 연결 인원이 맞지 않습니다.',409);
   await run(db,'UPDATE race_players SET cabinet=1 WHERE id=?',player.id);
   const remaining=await one(db,'SELECT COUNT(*) AS n FROM race_players WHERE room=? AND cabinet=0',code);
   if(!remaining.n)await run(db,"UPDATE race_rooms SET phase='playing',play_at=? WHERE code=? AND phase='booting'",now+5000,code);
  }else if(action==='leave'){
   if(room.phase!=='waiting'||room.host===player.id)await run(db,"UPDATE race_rooms SET phase='closed' WHERE code=?",code);
   await run(db,'DELETE FROM race_players WHERE id=?',player.id);
  }else if(action==='abort')await run(db,"UPDATE race_rooms SET phase='closed' WHERE code=?",code);
  else fail('지원하지 않는 요청입니다.',404);
  return json({room:await snapshot(db,code)});
 }catch(error){return json({error:error.status?error.message:'온라인 서버 요청에 실패했습니다.'},error.status||500);}
}
