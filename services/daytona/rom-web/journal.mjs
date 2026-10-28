const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(className)e.className=className;return e;};
const button=(text,run)=>{const e=node('button',text);e.type='button';e.onclick=run;return e;};
const iconPaths={edit:'M15 4l5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5',trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7',comment:'M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z',info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',enter:'M19 4v9H5m5-5-5 5 5 5'};
function iconButton(label,icon,run){const b=button('',run),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');b.className='note-icon';b.title=label;b.setAttribute('aria-label',label);svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d',iconPaths[icon]);svg.append(path);b.append(svg);return b;}
export function formatTime(ms){if(ms==null)return '';return String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
const date=at=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(at));
function noteLine(name,text,created){const row=node('div',null,'checkin-line'),author=node('strong',name,'checkin-name'),message=node('p',text,'checkin-message'),stamp=node('time',date(created).replace(/\.\s*/g,'.').replace(/\.(?=\d{2}:)/,' '),'checkin-date');author.title=name;message.title=text;message.tabIndex=0;stamp.dateTime=new Date(created).toISOString();stamp.title=new Date(created).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});row.append(author,message,stamp);return row;}
export function initJournal({onFocus=()=>{}}={}){
 const $=id=>document.getElementById(id),board=$('race-journal');if(!board)return;
 let viewer=null,today=null,editing=null,cursor=null,sequence=0,dirty=false;
 const status=(message,error=false)=>{$('journal-status').textContent=message;$('journal-status').dataset.error=String(error);$('journal-status').classList.toggle('visually-hidden',!error);};
 async function api(path,method='GET',body){
  let r;try{r=await fetch('/api/journal/'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw Error('연결을 확인하고 다시 시도해 주세요.');}
  let data;try{data=await r.json();}catch{throw Error('잠시 후 다시 시도해 주세요.');}if(!r.ok)throw Error(data.error||'저장하지 못했습니다.');
  if('viewer' in data){viewer=data.viewer;if(viewer&&!$('record-name').value)$('record-name').value=viewer.name;}return data;
 }
 const attempt=run=>async()=>{try{await run();}catch(e){status(e.message,true);}};
 function updateForm(){if(editing)return;$('checkin-submit').setAttribute('aria-label',today?.mine?'메모 저장':'출석 기록');if(!dirty)$('checkin-content').value=today?.mine?.content||'';}
 function resetForm(){editing=null;dirty=false;$('checkin-cancel').hidden=true;$('record-name').value=viewer?.name||$('record-name').value;updateForm();}
 function edit(r){editing=r;dirty=false;$('record-name').value=r.name;$('checkin-content').maxLength=r.kind==='checkin'?200:2000;$('checkin-content').value=r.content;$('checkin-submit').setAttribute('aria-label','메모 저장');$('checkin-cancel').hidden=false;$('checkin-content').focus();$('record-form').scrollIntoView({block:'nearest',behavior:'smooth'});}
 function notice(text,undo){const n=$('journal-notice');n.hidden=false;n.classList.toggle('visually-hidden',!undo);n.replaceChildren(node('span',text));if(undo)n.append(button('삭제 취소',attempt(async()=>{await undo();n.hidden=true;})));}
 function removePrompt(container,kind,id,after){
  const box=node('div',null,'journal-confirm');box.append(node('span','삭제할까요?'),button('삭제',attempt(async()=>{await api(kind+'/'+id,'DELETE');await after();notice('삭제했습니다.',async()=>{await api(kind+'/'+id+'/restore','POST',{});await after();});})),button('취소',()=>box.remove()));container.append(box);
 }
 function replyItem(c,refresh){
  const article=node('div',null,'checkin-reply'),row=noteLine(c.name,c.content,c.created);article.append(row);
  if(c.mine){const actions=node('div',null,'note-actions');actions.append(iconButton('댓글 수정','edit',()=>{
   const form=node('form',null,'journal-form'),input=node('textarea');input.value=c.content;input.required=true;input.maxLength=1000;input.setAttribute('aria-label','댓글 수정');const save=node('button','저장');save.type='submit';form.append(input,save,button('취소',()=>form.remove()));form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await api('comments/'+c.id,'PATCH',{content:input.value});await refresh();}catch(error){status(error.message,true);}finally{save.disabled=false;}};article.append(form);input.focus();
  }),iconButton('댓글 삭제','trash',()=>removePrompt(article,'comments',c.id,refresh)));row.append(actions);}return article;
 }
 function card(r){
  const article=node('article',null,'checkin-entry');article.dataset.recordId=r.id;
  const row=noteLine(r.name,r.content||(r.kind==='checkin'?'출석했습니다!':r.title),r.created);article.append(row);
  if(r.kind!=='checkin'){const old=node('details',null,'checkin-legacy');old.append(node('summary','이전 주행 기록 보기','visually-hidden'),node('p',r.title+' · '+({beginner:'초급',advanced:'중급',expert:'상급'}[r.course]||'')+' · '+(r.kind==='lap'?'한 바퀴':'전체 레이스')+(r.timeMs!=null?' · '+formatTime(r.timeMs):'')));const info=iconButton('이전 주행 기록 보기','info',()=>{old.open=!old.open;});info.setAttribute('aria-expanded','false');old.ontoggle=()=>info.setAttribute('aria-expanded',String(old.open));row.append(info);article.append(old);}
  const replies=node('details',null,'checkin-comments'),summary=node('summary','댓글 '+r.commentCount,'visually-hidden'),toggle=iconButton('댓글 '+r.commentCount,'comment',()=>{replies.open=!replies.open;});replies.id='note-comments-'+r.id;toggle.setAttribute('aria-controls',replies.id);toggle.setAttribute('aria-expanded','false');replies.append(summary);row.append(toggle);let loaded=false;
  if(r.mine){const actions=node('div',null,'note-actions');if(r.kind==='checkin')actions.append(iconButton('메모 수정','edit',()=>edit(r)));actions.append(iconButton('메모 삭제','trash',()=>removePrompt(article,'records',r.id,async()=>{resetForm();await load();})));row.append(actions);}
  async function refresh(){
   const d=await api('records/'+r.id);summary.textContent='댓글 '+d.record.commentCount;toggle.title='댓글 '+d.record.commentCount;toggle.setAttribute('aria-label',toggle.title);const content=node('div'),list=node('div');for(const c of d.comments)list.append(replyItem(c,refresh));content.append(list);if(d.next){let before=d.next;const more=button('이전 댓글 더 보기',attempt(async()=>{more.disabled=true;try{const page=await api('records/'+r.id+'?before='+before);for(const c of page.comments)list.append(replyItem(c,refresh));before=page.next;more.hidden=!before;}finally{more.disabled=false;}}));content.append(more);}
   const form=node('form',null,'checkin-reply-form'),input=node('input');input.required=true;input.maxLength=1000;input.placeholder='댓글';input.setAttribute('aria-label','댓글');const save=iconButton('댓글 남기기','enter',null);save.type='submit';form.append(input,save);
   form.onsubmit=async e=>{e.preventDefault();const name=$('record-name').value.trim();if(!name){$('record-name').focus();status('닉네임을 입력해 주세요.',true);return;}save.disabled=true;try{await api('records/'+r.id+'/comments','POST',{name,content:input.value});await refresh();status('댓글을 남겼습니다.');}catch(error){status(error.message,true);}finally{save.disabled=false;}};
   content.append(form);for(const child of [...replies.children])if(child!==summary)child.remove();replies.append(content);
  }
  replies.ontoggle=()=>{toggle.setAttribute('aria-expanded',String(replies.open));if(replies.open&&!loaded){loaded=true;void refresh().catch(e=>{loaded=false;status(e.message,true);});}};article.append(replies);return article;
 }
 async function load(append=false){
  const ticket=++sequence;try{const d=await api('records'+(append&&cursor?'?before='+cursor:''));if(ticket!==sequence)return;
   today=d.today;$('checkin-today').textContent=today?today.date.slice(5).replace('-','.')+' · 오늘 출석 '+today.count:'';updateForm();$('checkin-submit').disabled=false;
   if(!append)$('record-list').replaceChildren();for(const r of d.items)$('record-list').append(card(r));cursor=d.next;$('records-more').hidden=!cursor;
   $('journal-refresh').hidden=true;
   status(today?.mine?'오늘 출석 완료! 메모는 언제든 수정할 수 있어요.':'닉네임만 적고 출석해도 좋아요.');
  }catch(e){if(ticket===sequence){status(e.message,true);$('journal-refresh').hidden=false;}}
 }
 board.addEventListener('focusin',onFocus);board.addEventListener('pointerdown',e=>{if(!e.target.closest('input,textarea,select,button,a,summary'))board.focus({preventScroll:true});});
 $('checkin-content').oninput=()=>{dirty=true;};$('checkin-cancel').onclick=()=>{resetForm();$('checkin-content').maxLength=200;};
 $('record-form').addEventListener('keydown',e=>{if(e.key!=='Enter'||!e.target.matches('input')||e.isComposing||e.keyCode===229)return;e.preventDefault();if(!e.repeat&&!$('checkin-submit').disabled)$('record-form').requestSubmit();});
 $('record-form').onsubmit=async e=>{
  e.preventDefault();const save=$('checkin-submit');if(save.disabled)return;save.disabled=true;$('record-name').readOnly=$('checkin-content').readOnly=true;const name=$('record-name').value.trim(),content=$('checkin-content').value,target=editing;
  const payload={name,content,kind:'checkin',updateToday:!target};
  try{const d=await api(target?'records/'+target.id:'records',target?'PATCH':'POST',payload);resetForm();$('checkin-content').maxLength=200;await load();notice(d.alreadyChecked?'오늘은 이미 출석했어요. 메모를 수정할 수 있습니다.':target||d.updatedToday?'메모를 저장했습니다.':'출석 완료! 반가워요.');}catch(error){status(error.message,true);}finally{save.disabled=false;$('record-name').readOnly=$('checkin-content').readOnly=false;}
 };
 $('journal-refresh').onclick=()=>void load();$('records-more').onclick=()=>void load(true);
 const linked=new URL(location.href).searchParams.get('record');
 void load().then(async()=>{if(!linked||!/^\d{1,12}$/.test(linked))return;try{let entry=$('record-list').querySelector('[data-record-id="'+linked+'"]');if(!entry){const d=await api('records/'+linked);entry=card(d.record);$('record-list').prepend(entry);}entry.querySelector('.checkin-comments').open=true;entry.scrollIntoView({block:'nearest'});}catch(error){status(error.message,true);}});
}
