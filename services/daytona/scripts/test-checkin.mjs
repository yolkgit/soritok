import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkinDay} from '../server/journal-api.mjs';
assert.equal(checkinDay(Date.parse('2026-10-26T14:59:59Z')).date,'2026-10-26');
assert.equal(checkinDay(Date.parse('2026-10-26T15:00:00Z')).date,'2026-10-27');
const base=process.argv[2]||'http://127.0.0.1:3005';let cookie='';
async function api(path,method='GET',body){const r=await fetch(base+'/api/journal/'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json()};}
const body={name:'LOCAL CHECKIN QA',kind:'checkin',content:'오늘도 출석!'};
const first=await api('records','POST',body);assert.equal(first.status,201,JSON.stringify(first.data));const id=first.data.record.id;
assert.equal(first.data.record.timeMs,null);assert.equal(first.data.record.course,'checkin');assert.equal(first.data.record.title,checkinDay(Date.now()).date+' 출석');
const repeated=await Promise.all(Array.from({length:4},()=>api('records','POST',body)));for(const r of repeated){assert.equal(r.status,200);assert.equal(r.data.record.id,id);assert.equal(r.data.alreadyChecked,true);}
const changed=await api('records/'+id,'PATCH',{...body,content:'수정한 한 줄'});assert.equal(changed.status,200);assert.equal(changed.data.record.created,first.data.record.created);
assert.equal((await api('records')).data.today.mine.content,'수정한 한 줄');
const upsert=await api('records','POST',{...body,updateToday:true,content:'서버 날짜 기준 메모 저장'});assert.equal(upsert.status,200);assert.equal(upsert.data.updatedToday,true);assert.equal(upsert.data.record.id,id);assert.equal(upsert.data.record.created,first.data.record.created);
assert.equal((await api('records','POST',{...body,content:'x'.repeat(201)})).status,400);
await api('records/'+id,'DELETE');const newer=await api('records','POST',{...body,content:''});assert.equal(newer.status,201);assert.equal(newer.data.record.content,'');
assert.equal((await api('records/'+id+'/restore','POST',{})).status,409);
await api('records/'+newer.data.record.id,'DELETE');assert.equal((await api('records/'+id+'/restore','POST',{})).status,200);
await api('records/'+id,'DELETE');
const result={passed:true,koreaDateBoundary:true,nicknameAndOptionalMemoOnly:true,oneDailyEntryEvenWithConcurrentRequests:true,memoEditable:true,emptyMemoAllowed:true,restoreCannotDuplicateDay:true};fs.writeFileSync('outputs/checkin-tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
