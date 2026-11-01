import {randomBytes,createHash} from 'node:crypto';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new HttpError(status,message);};
export function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
export async function bytes(req,limit=12000){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)fail(413,'요청이 너무 큽니다.');chunks.push(chunk);}return Buffer.concat(chunks);}
export async function body(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'요청 형식을 확인해 주세요.');try{const value=JSON.parse((await bytes(req)).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'요청을 확인해 주세요.');return value;}catch(e){if(e.status)throw e;fail(400,'요청을 확인해 주세요.');}}
export function sameOrigin(req,origin){if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')fail(403,'이 사이트에서 요청해 주세요.');}
export const token=()=>randomBytes(32).toString('base64url');
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function cookie(req,name){return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);}
export function clientIp(req){return String(req.headers['x-real-ip']||req.socket.remoteAddress||'').slice(0,100);}
export class RateLimit{
 constructor(){this.items=new Map();}
 take(key,max,ms){const now=Date.now();let item=this.items.get(key);if(!item||item.until<=now){item={count:0,until:now+ms};this.items.set(key,item);}if(++item.count>max)fail(429,'요청이 많습니다. 잠시 후 다시 시도해 주세요.');if(this.items.size>5000)for(const [k,v]of this.items)if(v.until<=now)this.items.delete(k);}
}
