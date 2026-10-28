import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:3005';
function client(){let cookie='';return {async request(path,method='GET',body,extra={}){const r=await fetch(base+'/api/journal/'+path,{method,headers:{...(method==='GET'?{}:{'Content-Type':'application/json','Origin':base}),...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.get('set-cookie');if(set){assert.ok(set.includes('HttpOnly'));assert.ok(set.includes('SameSite=Lax'));cookie=set.split(';')[0];}const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{throw Error(method+' '+path+' status '+r.status+': '+raw.slice(0,200));}assert.ok(!JSON.stringify(data).includes('secret'));assert.ok(!JSON.stringify(data).includes('racing_writer'));return {status:r.status,data};}};}
const alice=client(),bob=client(),reader=client();const draft={name:'LOCAL QA A',title:'로컬 기록 저장 검사',course:'beginner',kind:'lap',time:'1:23.456',content:'메모\n<script>alert("text-only")</script>'};
assert.equal((await reader.request('records')).status,200);
assert.equal((await alice.request('records','POST',{...draft,time:'1:99.000'})).status,400);
const a=await alice.request('records','POST',draft);assert.equal(a.status,201,JSON.stringify(a.data));const id=a.data.record.id;assert.equal(a.data.record.timeMs,83456);assert.equal(a.data.record.mine,1);
assert.equal((await reader.request('records/'+id)).data.record.mine,0);
assert.ok((await reader.request('records?course=beginner')).data.items.some(r=>r.id===id));
assert.ok(!(await reader.request('records?course=expert')).data.items.some(r=>r.id===id));
assert.equal((await reader.request('records/'+id)).data.record.content,draft.content);
assert.ok((await alice.request('records?scope=mine')).data.items.some(r=>r.id===id));
const comment=await bob.request('records/'+id+'/comments','POST',{name:'LOCAL QA B',content:'다른 방문자의 댓글입니다.'});assert.equal(comment.status,201,JSON.stringify(comment.data));const cid=comment.data.comment.id;
assert.equal((await alice.request('records/'+id)).data.record.commentCount,1);
assert.ok((await bob.request('records?scope=comments')).data.items.some(c=>c.id===cid&&c.recordId===id));
assert.equal((await bob.request('records/'+id,'PATCH',{...draft,title:'침입'})).status,403);
assert.equal((await reader.request('records/'+id,'DELETE')).status,403);
assert.equal((await alice.request('comments/'+cid,'DELETE')).status,403);
assert.equal((await alice.request('records/'+id,'PATCH',{...draft,title:'수정된 기록',time:''})).data.record.timeMs,null);
assert.equal((await bob.request('comments/'+cid,'PATCH',{content:'수정한 댓글'})).status,200);
assert.equal((await reader.request('records/'+id)).data.comments[0].content,'수정한 댓글');
assert.equal((await bob.request('comments/'+cid,'DELETE')).status,200);assert.equal((await reader.request('records/'+id)).data.record.commentCount,0);
assert.equal((await bob.request('comments/'+cid+'/restore','POST',{})).status,200);assert.equal((await reader.request('records/'+id)).data.record.commentCount,1);
assert.equal((await alice.request('records/'+id,'DELETE')).status,200);assert.equal((await reader.request('records/'+id)).status,404);
assert.ok(!(await bob.request('records?scope=comments')).data.items.some(c=>c.recordId===id));
assert.equal((await bob.request('records/'+id+'/restore','POST',{})).status,403);
assert.equal((await alice.request('records/'+id+'/restore','POST',{})).status,200);assert.equal((await reader.request('records/'+id)).data.comments.length,1);
// Descending cursor pagination never repeats the boundary entry.
const newest=(await reader.request('records')).data.items[0];assert.ok(!(await reader.request('records?before='+newest.id)).data.items.some(r=>r.id>=newest.id));
for(let i=0;i<7;i++)assert.equal((await bob.request('records/'+id+'/comments','POST',{name:'LOCAL QA B',content:'한도 검사 '+i})).status,201);
assert.equal((await bob.request('records/'+id+'/comments','POST',{name:'LOCAL QA B',content:'한도 초과'})).status,429);
await alice.request('records/'+id,'DELETE');
assert.equal((await alice.request('records','POST',draft,{Origin:'https://foreign.invalid'})).status,403);

const result={passed:true,persistentRecords:true,publicComments:true,ownCommentHistory:true,serverTimeParsing:true,ownershipEnforced:true,crossOriginRejected:true,softDeleteAndRestore:true,pagination:true,rateLimit:true};fs.writeFileSync('outputs/journal-api-tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
