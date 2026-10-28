const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const text=(value,max,label,required=true)=>{if(typeof value!=='string')value='';value=value.trim();if((required&&!value)||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail(label+'을 확인해 주세요.');return value;};
export function parseTime(value){
 if(value==null||value==='')return null;
 if(typeof value!=='string')fail('기록 시간은 분:초.밀리초 형식으로 입력해 주세요.');
 const match=/^(\d{1,2}):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(value.trim());
 if(!match||Number(match[1])>59)fail('기록 시간은 01:23.456 형식으로 입력해 주세요.');
 const ms=Number(match[1])*60000+Number(match[2])*1000+Number((match[3]||'').padEnd(3,'0'));
 if(ms<=0)fail('기록 시간은 0초보다 커야 합니다.');return ms;
}
// Attendance dates are based on Korea time, independent of the visitor's zone.
export function checkinDay(at){const date=new Date(at+32400000).toISOString().slice(0,10),start=Date.parse(date+'T00:00:00+09:00');return {date,start,end:start+86400000};}
function fields(body,created=Date.now()){
 if(body.kind==='checkin')return {name:text(body.name,24,'닉네임'),title:checkinDay(created).date+' 출석',content:text(body.content,200,'메모',false),course:'checkin',kind:'checkin',time:null};
 const name=text(body.name,24,'닉네임'),title=text(body.title,80,'제목'),content=text(body.content,2000,'메모',false);
 if(!['beginner','advanced','expert'].includes(body.course))fail('코스를 선택해 주세요.');
 if(!['lap','race'].includes(body.kind))fail('기록 종류를 선택해 주세요.');
 return {name,title,content,course:body.course,kind:body.kind,time:parseTime(body.time)};
}
const recordColumns=`r.id,r.name,r.title,r.course,r.kind,r.time_ms AS timeMs,r.content,r.created,r.updated,CASE WHEN r.owner=? THEN 1 ELSE 0 END AS mine,(SELECT COUNT(*) FROM journal_comments c WHERE c.record_id=r.id AND c.deleted IS NULL) AS commentCount`;
const commentColumns=`c.id,c.record_id AS recordId,c.name,c.content,c.created,c.updated,CASE WHEN c.owner=? THEN 1 ELSE 0 END AS mine`;
export async function journalRequest(request,db){
 let responseHeaders={};
 try{
  if(!db)return json({error:'기록실을 준비 중입니다. 잠시 후 다시 시도해 주세요.'},503);
  const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).slice(2),[type,id,action]=parts,method=request.method;
  if(!['GET','POST','PATCH','DELETE'].includes(method))fail('지원하지 않는 요청입니다.',405);
  if(method!=='GET'){
   if((request.headers.get('origin')&&request.headers.get('origin')!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')fail('이 사이트에서 작성해 주세요.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))fail('잘못된 요청 형식입니다.',415);
  }
  let body={};if(['POST','PATCH'].includes(method)){const raw=await request.text();if(new TextEncoder().encode(raw).length>12000)fail('내용이 너무 깁니다.',413);try{body=JSON.parse(raw);}catch{fail('잘못된 요청입니다.');}if(!body||Array.isArray(body)||typeof body!=='object')fail('잘못된 요청입니다.');}
  const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('racing_writer='))?.slice(14);
  let viewer=cookie&&cookie.length<160?await one(db,'SELECT id,name FROM journal_writers WHERE secret=?',await hash(cookie)):null;
  const viewerData=()=>viewer?{name:viewer.name}:null;
  const record=recordId=>one(db,`SELECT ${recordColumns} FROM journal_records r WHERE r.id=? AND r.deleted IS NULL`,viewer?.id||'',recordId);
  const comment=commentId=>one(db,`SELECT ${commentColumns} FROM journal_comments c WHERE c.id=? AND c.deleted IS NULL`,viewer?.id||'',commentId);
  const now=Date.now(),day=checkinDay(now);
  async function today(){const count=await one(db,"SELECT COUNT(*) AS n FROM journal_records WHERE kind='checkin' AND deleted IS NULL AND created>=? AND created<?",day.start,day.end),mine=viewer?await one(db,"SELECT id FROM journal_records WHERE owner=? AND kind='checkin' AND deleted IS NULL AND created>=? AND created<? ORDER BY id DESC LIMIT 1",viewer.id,day.start,day.end):null;return {date:day.date,count:count.n,mine:mine?await record(mine.id):null};}
  async function writer(name){
   if(!viewer){
    const quota=await one(db,'SELECT COUNT(*) AS n FROM journal_writers WHERE created>?',now-3600000);if(quota.n>=200)fail('작성 요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
    const token=crypto.randomUUID()+'.'+crypto.randomUUID();viewer={id:crypto.randomUUID(),name};await run(db,'INSERT INTO journal_writers(id,secret,name,created) VALUES(?,?,?,?)',viewer.id,await hash(token),name,now);
    responseHeaders['Set-Cookie']='racing_writer='+token+'; Path=/api/journal; HttpOnly; SameSite=Lax; Max-Age=31536000'+(url.protocol==='https:'?'; Secure':'');
   }else{await run(db,'UPDATE journal_writers SET name=? WHERE id=?',name,viewer.id);viewer.name=name;}
   return viewer.id;
  }
  const before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER;
  if(!Number.isSafeInteger(before)||before<1)fail('목록 위치가 잘못됐습니다.');
  if(type==='records'&&!id&&method==='GET'){
   const scope=url.searchParams.get('scope')||'all',course=url.searchParams.get('course');if(!['all','mine','comments'].includes(scope))fail('목록을 확인해 주세요.');
   if(scope!=='all'&&!viewer)return json({items:[],next:null,viewer:null});
   if(scope==='comments'){
    const items=await all(db,`SELECT ${commentColumns},r.title,r.course FROM journal_comments c JOIN journal_records r ON r.id=c.record_id WHERE c.owner=? AND c.deleted IS NULL AND r.deleted IS NULL AND c.id<? ORDER BY c.id DESC LIMIT 21`,viewer.id,viewer.id,before);
    const next=items.length>20?items[19].id:null;return json({items:items.slice(0,20),next,viewer:viewerData()});
   }
   const where=['r.deleted IS NULL','r.id<?'],args=[viewer?.id||'',before];
   if(scope==='mine'){where.push('r.owner=?');args.push(viewer.id);}
   if(course){if(!['beginner','advanced','expert'].includes(course))fail('코스를 확인해 주세요.');where.push('r.course=?');args.push(course);}
   const items=await all(db,`SELECT ${recordColumns} FROM journal_records r WHERE ${where.join(' AND ')} ORDER BY r.id DESC LIMIT 21`,...args),next=items.length>20?items[19].id:null;
   return json({items:items.slice(0,20),next,viewer:viewerData(),today:await today()});
  }
  if(type==='records'&&!id&&method==='POST'){
   const f=fields(body),owner=await writer(f.name),quota=await one(db,'SELECT COUNT(*) AS n FROM journal_records WHERE owner=? AND created>?',owner,now-60000);if(quota.n>=5)fail('기록은 1분에 5개까지 등록할 수 있습니다.',429);
   if(f.kind==='checkin'){
    const r=await run(db,"INSERT INTO journal_records(owner,name,title,course,kind,time_ms,content,created,updated) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM journal_records WHERE owner=? AND kind='checkin' AND deleted IS NULL AND created>=? AND created<?)",owner,f.name,f.title,f.course,f.kind,null,f.content,now,now,owner,day.start,day.end);
    const id=r.meta.changes?r.meta.last_row_id:(await one(db,"SELECT id FROM journal_records WHERE owner=? AND kind='checkin' AND deleted IS NULL AND created>=? AND created<? ORDER BY id DESC LIMIT 1",owner,day.start,day.end)).id;
    const updatedToday=!r.meta.changes&&body.updateToday===true;
    if(updatedToday)await run(db,'UPDATE journal_records SET name=?,content=?,updated=? WHERE id=? AND deleted IS NULL',f.name,f.content,now,id);
    return json({record:await record(id),viewer:viewerData(),alreadyChecked:!r.meta.changes&&!updatedToday,updatedToday},r.meta.changes?201:200,responseHeaders);
   }
   const r=await run(db,'INSERT INTO journal_records(owner,name,title,course,kind,time_ms,content,created,updated) VALUES(?,?,?,?,?,?,?,?,?)',owner,f.name,f.title,f.course,f.kind,f.time,f.content,now,now);
   return json({record:await record(r.meta.last_row_id),viewer:viewerData()},201,responseHeaders);
  }
  if(!id||!/^\d{1,12}$/.test(id)||!['records','comments'].includes(type))fail('게시물을 찾을 수 없습니다.',404);
  if(type==='records'){
   const row=await one(db,'SELECT owner,deleted,kind,created FROM journal_records WHERE id=?',id);if(!row)fail('기록을 찾을 수 없습니다.',404);
   if(method==='POST'&&action==='restore'){
    if(!viewer||row.owner!==viewer.id)fail('작성한 브라우저에서만 복구할 수 있습니다.',403);
    if(row.kind==='checkin'){const d=checkinDay(row.created);const r=await run(db,"UPDATE journal_records SET deleted=NULL WHERE id=? AND NOT EXISTS(SELECT 1 FROM journal_records WHERE owner=? AND kind='checkin' AND deleted IS NULL AND created>=? AND created<? AND id<>?)",id,viewer.id,d.start,d.end,id);if(!r.meta.changes)fail('해당 날짜의 출석이 이미 있습니다.',409);}
    else await run(db,'UPDATE journal_records SET deleted=NULL WHERE id=?',id);return json({record:await record(id)});
   }
   if(row.deleted!==null)fail('삭제된 기록입니다.',404);
   if(method==='GET'&&!action){
    const items=await all(db,`SELECT ${commentColumns} FROM journal_comments c WHERE c.record_id=? AND c.deleted IS NULL AND c.id<? ORDER BY c.id DESC LIMIT 51`,viewer?.id||'',id,before),next=items.length>50?items[49].id:null;
    return json({record:await record(id),comments:items.slice(0,50),next,viewer:viewerData()});
   }
   if(method==='POST'&&action==='comments'){
    const name=text(body.name,24,'닉네임'),content=text(body.content,1000,'댓글'),owner=await writer(name),quota=await one(db,'SELECT COUNT(*) AS n FROM journal_comments WHERE owner=? AND created>?',owner,now-60000);if(quota.n>=8)fail('댓글은 1분에 8개까지 등록할 수 있습니다.',429);
    const r=await run(db,'INSERT INTO journal_comments(record_id,owner,name,content,created,updated) VALUES(?,?,?,?,?,?)',id,owner,name,content,now,now);
    return json({comment:await comment(r.meta.last_row_id),viewer:viewerData()},201,responseHeaders);
   }
   if(action)fail('지원하지 않는 요청입니다.',404);
   if(!viewer||row.owner!==viewer.id)fail('작성한 브라우저에서만 수정·삭제할 수 있습니다.',403);
   if(method==='PATCH'){if((row.kind==='checkin')!==(body.kind==='checkin'))fail('기록 종류는 변경할 수 없습니다.');const f=fields(body,row.created);await run(db,'UPDATE journal_records SET name=?,title=?,course=?,kind=?,time_ms=?,content=?,updated=? WHERE id=?',f.name,f.title,f.course,f.kind,f.time,f.content,now,id);return json({record:await record(id)});}
   if(method==='DELETE'){await run(db,'UPDATE journal_records SET deleted=? WHERE id=?',now,id);return json({deleted:true});}
  }else{
   const row=await one(db,'SELECT owner,record_id,deleted FROM journal_comments WHERE id=?',id);if(!row)fail('댓글을 찾을 수 없습니다.',404);
   if(!viewer||row.owner!==viewer.id)fail('작성한 브라우저에서만 수정·삭제할 수 있습니다.',403);
   if(!await record(row.record_id))fail('삭제된 기록의 댓글입니다.',404);
   if(method==='POST'&&action==='restore'){await run(db,'UPDATE journal_comments SET deleted=NULL WHERE id=?',id);return json({comment:await comment(id)});}
   if(row.deleted!==null)fail('삭제된 댓글입니다.',404);
   if(method==='PATCH'&&!action){const content=text(body.content,1000,'댓글');await run(db,'UPDATE journal_comments SET content=?,updated=? WHERE id=?',content,now,id);return json({comment:await comment(id)});}
   if(method==='DELETE'&&!action){await run(db,'UPDATE journal_comments SET deleted=? WHERE id=?',now,id);return json({deleted:true});}
  }
  fail('지원하지 않는 요청입니다.',404);
 }catch(error){return json({error:error.status?error.message:'기록실 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'},error.status||500,responseHeaders);}
}
