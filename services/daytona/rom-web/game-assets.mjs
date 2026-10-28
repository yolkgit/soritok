const sha256=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');

// Content-addressed, device-local game assets. A denied/full cache is optional;
// both downloaded and cached bytes must pass the supplied build's integrity check.
export async function loadGameAssets(manifest,{url=new URL('./rom/daytona.pack.gz',import.meta.url).href,fetcher=fetch,storage=globalThis.caches,onProgress=()=>{}}={}){
 const key=new URL(url);key.searchParams.set('sha256',manifest.packSha256);
 let cache;
 try{cache=await storage?.open('daytona-web-assets-v1');}catch{}
 try{
  const hit=await cache?.match(key.href);
  if(hit){const bytes=new Uint8Array(await hit.arrayBuffer());if(bytes.length===manifest.packedBytes&&await sha256(bytes)===manifest.packSha256){onProgress(100);return {bytes,cached:true};}await cache.delete(key.href);}
 }catch{/* A cache read failure must not prevent ordinary web play. */}
 const response=await fetcher(key.href);
 if(!response.ok)throw Error('게임 데이터를 받지 못했습니다. ('+response.status+')');
 let bytes;
 if(response.body?.getReader){
  const reader=response.body.getReader(),parts=[];let received=0;
  while(true){const {done,value}=await reader.read();if(done)break;parts.push(value);received+=value.length;onProgress(Math.min(99,Math.round(received/manifest.packedBytes*100)));}
  bytes=new Uint8Array(received);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 }else bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length!==manifest.packedBytes||await sha256(bytes)!==manifest.packSha256)throw Error('게임 데이터 확인에 실패했습니다. 다시 시도해 주세요.');
 try{await cache?.put(key.href,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch{}
 onProgress(100);return {bytes,cached:false};
}
