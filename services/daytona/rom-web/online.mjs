export class OnlineRoom {
 constructor(events={}){this.events=events;this.peers=new Map();this.after=0;this.closed=false;this.signalQueue=Promise.resolve();this.booted=false;this.played=false;this.connectedSent=false;}
 async api(path='',body){const response=await fetch('/api/rooms'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(this.player?{'X-Room-Token':this.player.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});let result;try{result=await response.json();}catch{throw Error('온라인 서버에 연결할 수 없습니다.');}if(!response.ok)throw Error(result.error||'온라인 요청 실패');return result;}
 async create(name){this.checkSupport();const result=await this.api('',{name});this.attach(result);return result;}
 async join(code,name){this.checkSupport();const result=await this.api('/'+code.toUpperCase()+'/join',{name});this.attach(result);return result;}
 checkSupport(){if(!globalThis.RTCPeerConnection)throw Error('이 브라우저는 온라인 연결을 지원하지 않습니다.');}
 attach(result){this.player=result.player;this.room=result.room;this.events.state?.(this.room,this.player);void this.poll();}
 async ready(value){const result=await this.api('/'+this.room.code+'/ready',{ready:value});this.update(result.room);}
 async launch(){await this.api('/'+this.room.code+'/launch',{});}
 async cabinetReady(count){await this.api('/'+this.room.code+'/cabinet',{count});}
 signal(to,payload){this.signalQueue=this.signalQueue.then(()=>this.api('/'+this.room.code+'/signal',{to,payload}));this.signalQueue.catch(e=>this.fail(e));return this.signalQueue;}
 async poll(){
  while(!this.closed){
   try{const result=await this.api('/'+this.room.code+'?after='+this.after);this.clockOffset=result.serverTime-Date.now();this.update(result.room);for(const signal of result.signals){await this.receiveSignal(signal.sender,signal.payload);this.after=Math.max(this.after,signal.id);}}
   catch(error){this.fail(error);return;}
   await new Promise(resolve=>setTimeout(resolve,this.room?.phase==='playing'?1500:400));
  }
 }
 update(room){
  this.room=room;this.events.state?.(room,this.player);
  if(room.phase==='closed'){this.fail(Error('참가자가 나가 방이 종료됐습니다. 새 방에서 다시 시작해 주세요.'));return;}
  if(room.phase==='connecting'&&!this.connecting){this.connecting=true;for(const p of room.players)if(p.id!==this.player.id)this.peer(p.id);this.connectTimer=setTimeout(()=>{if(!this.connectedSent)this.fail(Error('직접 연결에 실패했습니다. 다른 네트워크로 시도해 주세요. 방화벽 환경에서는 TURN 중계 서버가 필요할 수 있습니다.'));},25000);}
  if(room.phase==='booting'&&!this.booted){this.booted=true;clearTimeout(this.connectTimer);const delay=Math.max(0,room.start_at-Date.now()-(this.clockOffset||0));this.bootTimer=setTimeout(()=>this.events.boot?.({seat:this.player.seat,count:room.players.length}),delay);}
  if(room.phase==='playing'&&!this.played){this.played=true;const delay=Math.max(0,room.play_at-Date.now()-(this.clockOffset||0));this.playTimer=setTimeout(()=>this.events.play?.(),delay);}
 }
 peer(id){
  if(this.peers.has(id))return this.peers.get(id);
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]}),entry={pc,candidates:[],channel:null};this.peers.set(id,entry);
  pc.onicecandidate=e=>{if(e.candidate)void this.signal(id,{type:'candidate',candidate:e.candidate.toJSON()});};
  pc.ondatachannel=e=>this.channel(id,e.channel);
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)&&!this.closed)this.fail(Error('참가자 연결이 끊겼습니다. 방에 다시 참여해 주세요.'));};
  const remote=this.room.players.find(p=>p.id===id);
  if(this.player.seat<remote.seat){this.channel(id,pc.createDataChannel('cabinet',{ordered:true}));void (async()=>{await pc.setLocalDescription(await pc.createOffer());await this.signal(id,{type:'offer',sdp:pc.localDescription.sdp});})().catch(e=>this.fail(e));}
  return entry;
 }
 channel(id,channel){
  const entry=this.peers.get(id);entry.channel=channel;channel.binaryType='arraybuffer';
  channel.onopen=()=>{if(!this.connectedSent&&this.peers.size===this.room.players.length-1&&[...this.peers.values()].every(p=>p.channel?.readyState==='open')){this.connectedSent=true;clearTimeout(this.connectTimer);void this.api('/'+this.room.code+'/connected',{}).catch(e=>this.fail(e));}this.events.connection?.(this.peers.size);};
  channel.onclose=()=>{if(!this.closed)this.fail(Error('플레이어 연결이 종료됐습니다.'));};
  channel.onmessage=event=>{
   if(typeof event.data==='string'){try{const message=JSON.parse(event.data);if(message.ping)channel.send(JSON.stringify({pong:message.ping}));if(message.pong)this.events.latency?.(Math.max(0,Date.now()-message.pong));}catch{}return;}
   const index=this.room.players.findIndex(p=>p.id===this.player.id),previous=this.room.players[(index+this.room.players.length-1)%this.room.players.length];
   if(id===previous.id)this.events.packet?.(event.data);
  };
 }
 async receiveSignal(id,message){
  if(this.closed)return;const entry=this.peer(id),pc=entry.pc;
  if(message.type==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(message.candidate);else entry.candidates.push(message.candidate);return;}
  if(message.type==='offer'){await pc.setRemoteDescription({type:'offer',sdp:message.sdp});await pc.setLocalDescription(await pc.createAnswer());await this.signal(id,{type:'answer',sdp:pc.localDescription.sdp});}
  else if(message.type==='answer')await pc.setRemoteDescription({type:'answer',sdp:message.sdp});
  for(const candidate of entry.candidates.splice(0))await pc.addIceCandidate(candidate);
 }
 send(buffer){
  if(this.closed||!this.room)return;const index=this.room.players.findIndex(p=>p.id===this.player.id),next=this.room.players[(index+1)%this.room.players.length],channel=this.peers.get(next.id)?.channel;
  if(channel?.readyState!=='open'){this.fail(Error('레이스 연결이 끊겼습니다.'));return;}
  if(channel.bufferedAmount>2097152){this.fail(Error('네트워크가 느려 레이스를 중단했습니다.'));return;}
  const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)channel.send(bytes.slice(i,i+32768));
 }
 fail(error){if(this.closed)return;this.events.error?.(error.message||String(error));void this.leave(true);}
 async leave(abort=false){
  if(this.closed)return;this.closed=true;clearTimeout(this.connectTimer);clearTimeout(this.bootTimer);clearTimeout(this.playTimer);
  for(const {pc,channel} of this.peers.values()){if(channel)channel.onclose=null;pc.onconnectionstatechange=null;pc.close();}this.peers.clear();
  if(this.room&&this.player)try{await this.api('/'+this.room.code+(abort?'/abort':'/leave'),{});}catch{}
  this.events.left?.();
 }
}
