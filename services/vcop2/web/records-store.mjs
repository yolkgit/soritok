// Local records contain actual native scores. Machine states stay outside Git
// and never go to the memo/room APIs.
export function openRecords(name='vcop2-records-v1'){
 return new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);
  request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('states',{keyPath:'slot'});db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('meta');};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('다른 게임 탭을 닫고 다시 열어 주세요.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();
   function transaction(stores,mode,run){return new Promise((done,fail)=>{const tx=db.transaction(stores,mode);let value;tx.oncomplete=()=>done(value);tx.onabort=tx.onerror=()=>fail(tx.error||Error('기록을 저장하지 못했습니다.'));try{run(tx,v=>value=v);}catch(e){tx.abort();fail(e);}});}
   resolve({close:()=>db.close(),
    state:slot=>transaction(['states'],'readonly',(tx,set)=>{tx.objectStore('states').get(slot).onsuccess=e=>set(e.target.result);}),
    states:()=>transaction(['states'],'readonly',(tx,set)=>{tx.objectStore('states').getAll().onsuccess=e=>set(e.target.result);}),
    save:state=>transaction(['states'],'readwrite',tx=>tx.objectStore('states').put(state)),
    history:()=>transaction(['records','meta'],'readonly',(tx,set)=>{const result={records:[],best:[0,0]};set(result);tx.objectStore('records').getAll().onsuccess=e=>result.records=e.target.result.sort((a,b)=>b.updated-a.updated);tx.objectStore('meta').get('best').onsuccess=e=>result.best=e.target.result||[0,0];}),
    record:record=>transaction(['records','meta'],'readwrite',tx=>{const records=tx.objectStore('records'),meta=tx.objectStore('meta');records.get(record.id).onsuccess=e=>{const old=e.target.result,merged={...record,best:record.best.map((n,i)=>Math.max(n,old?.best[i]||0))};records.put(merged);meta.get('best').onsuccess=e=>{const best=e.target.result||[0,0];meta.put(best.map((n,i)=>Math.max(n,merged.best[i])),'best');};records.getAll().onsuccess=e=>{for(const old of e.target.result.sort((a,b)=>b.updated-a.updated).slice(100))records.delete(old.id);};};}),
   });};
 });
}
export function validSample(m){return !!m&&[1,2].includes(m.phase)&&[m.player,m.p2].some(v=>v===1||v===2)&&Array.isArray(m.scores)&&m.scores.length===2&&m.scores.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=0xffffffff)&&Number.isSafeInteger(m.frame);}
export function updateRecord(previous,m,now=Date.now(),id=crypto.randomUUID()){
 if(!validSample(m))return null;
 const fresh=!previous||m.frame<previous.frame||m.scores.some((v,i)=>v<previous.scores[i]);
 const record=fresh?{id,started:now,best:[0,0]}:previous;
 return {...record,updated:now,frame:m.frame,scores:[...m.scores],best:m.scores.map((v,i)=>Math.max(v,record.best[i])),phase:m.phase,players:m.p2?2:1};
}
