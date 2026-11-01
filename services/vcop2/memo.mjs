import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {body,cookie,token,hash,json,fail,sameOrigin,clientIp,RateLimit} from './http.mjs';
export function createMemos(filename){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS writers(id TEXT PRIMARY KEY, secret TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS memos(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,name TEXT NOT NULL,content TEXT NOT NULL,day TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,deleted INTEGER); CREATE INDEX IF NOT EXISTS memo_feed ON memos(deleted,id); CREATE UNIQUE INDEX IF NOT EXISTS memo_day ON memos(owner,day) WHERE deleted IS NULL;');
 const rates=new RateLimit(),day=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const fields=b=>{const name=String(b.name??'').normalize('NFC').replace(/[\r\n\t]+/g,' ').trim(),content=String(b.content??'').normalize('NFC').replace(/[\r\n\t]+/g,' ').trim();if(!name||[...name].length>24||[...content].length>200||/[\u0000-\u001f\u007f]/u.test(name+content))fail(400,'닉네임은 24자, 한 줄 메모는 200자까지 입력해 주세요.');return {name,content};};
 const row=(id,owner)=>{const r=db.prepare('SELECT id,name,content,day,created,updated,deleted,owner=? AS mine FROM memos WHERE id=?').get(owner||'',id);return r?{...r,mine:!!r.mine}:null;};
 return {close:()=>db.close(),healthy:()=>db.prepare('SELECT 1 AS ok').get().ok===1,
 async handle(req,res,url,origin){
  const rest=url.pathname.slice('/vcop2/api/memos'.length),match=/^\/(\d+)(\/restore)?$/.exec(rest);
  if(rest&& !match)fail(404,'메모를 찾을 수 없습니다.');
  const secret=cookie(req,'vcop2_writer'),viewer=secret&&secret.length<100?db.prepare('SELECT id,name FROM writers WHERE secret=?').get(hash(secret)):null;
  let who=viewer,headers={};const id=match?Number(match[1]):null;
  if(req.method==='GET'&&!id){const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)fail(400,'목록 위치를 확인해 주세요.');const list=db.prepare('SELECT id,name,content,day,created,updated,owner=? AS mine FROM memos WHERE deleted IS NULL AND id<? ORDER BY id DESC LIMIT 21').all(who?.id||'',before);const today=who?db.prepare('SELECT id FROM memos WHERE owner=? AND day=? AND deleted IS NULL').get(who.id,day()):null;json(res,200,{items:list.slice(0,20).map(r=>({...r,mine:!!r.mine})),next:list.length>20?list[19].id:null,viewer:who?{name:who.name}:null,today:today?row(today.id,who.id):null});return;}
  if(!['POST','PATCH','DELETE'].includes(req.method))fail(405,'지원하지 않는 요청입니다.');
  sameOrigin(req,origin);rates.take('ip:'+clientIp(req),25,60000);
  const b=req.method==='DELETE'?{}:await body(req);
  if(req.method==='POST'&&!id){
   const f=fields(b);
   if(!who){rates.take('writers',250,3600000);const t=token();who={id:token(),name:f.name};db.prepare('INSERT INTO writers VALUES(?,?,?,?)').run(who.id,hash(t),f.name,Date.now());headers['Set-Cookie']='vcop2_writer='+t+'; Path=/vcop2/api/memos; HttpOnly; SameSite=Lax; Max-Age=31536000'+(origin.startsWith('https:')?'; Secure':'');}
   rates.take('writer:'+who.id,5,60000);db.prepare('UPDATE writers SET name=? WHERE id=?').run(f.name,who.id);who.name=f.name;
   const old=db.prepare('SELECT id FROM memos WHERE owner=? AND day=? AND deleted IS NULL').get(who.id,day()),now=Date.now();
   let noteId;if(old){noteId=old.id;db.prepare('UPDATE memos SET name=?,content=?,updated=? WHERE id=?').run(f.name,f.content,now,noteId);}else noteId=Number(db.prepare('INSERT INTO memos(owner,name,content,day,created,updated) VALUES(?,?,?,?,?,?)').run(who.id,f.name,f.content,day(),now,now).lastInsertRowid);
   json(res,old?200:201,{memo:row(noteId,who.id),viewer:{name:who.name}},headers);return;
  }
  const old=id?db.prepare('SELECT owner,day,deleted FROM memos WHERE id=?').get(id):null;if(!old)fail(404,'메모를 찾을 수 없습니다.');if(!who||old.owner!==who.id)fail(403,'작성한 브라우저에서만 수정·삭제할 수 있습니다.');
  rates.take('writer:'+who.id,5,60000);
  if(req.method==='POST'&&match[2]){const exists=db.prepare('SELECT id FROM memos WHERE owner=? AND day=? AND deleted IS NULL AND id<>?').get(who.id,old.day,id);if(exists)fail(409,'같은 날짜의 메모가 이미 있습니다.');db.prepare('UPDATE memos SET deleted=NULL WHERE id=?').run(id);json(res,200,{memo:row(id,who.id)});return;}
  if(old.deleted!==null)fail(404,'삭제된 메모입니다.');
  if(req.method==='PATCH'&&!match[2]){const f=fields(b);db.prepare('UPDATE memos SET name=?,content=?,updated=? WHERE id=?').run(f.name,f.content,Date.now(),id);json(res,200,{memo:row(id,who.id)});return;}
  if(req.method==='DELETE'&&!match[2]){db.prepare('UPDATE memos SET deleted=? WHERE id=?').run(Date.now(),id);json(res,200,{deleted:true});return;}
  fail(404,'요청을 찾을 수 없습니다.');
 }};
}
