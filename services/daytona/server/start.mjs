import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {openDatabase} from './sqlite.mjs';
import {roomRequest} from './room-api.mjs';
import {journalRequest} from './journal-api.mjs';

const root=path.resolve(import.meta.dirname,'..'),staticRoot=fs.realpathSync(path.resolve(process.env.STATIC_DIR||path.join(root,'public')));
const db=openDatabase(path.resolve(process.env.DATABASE_PATH||path.join(root,'data/daytona.sqlite')),path.join(root,'drizzle'));
const publicOrigin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:null;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip','.txt':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,publicOrigin||'http://'+(req.headers.host||'localhost'));
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  if(url.pathname==='/healthz'){
   const ok=db.prepare('SELECT 1 AS ok').first().ok===1;res.writeHead(ok?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok,service:'daytona',revision:process.env.SOURCE_COMMIT||null,assets:fs.existsSync(path.join(staticRoot,'racing/core.wasm'))}));return;
  }
  if(url.pathname==='/api/rooms'||url.pathname.startsWith('/api/rooms/')||url.pathname.startsWith('/api/journal/')){
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
   const body=Buffer.concat(chunks),headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
   const request=new Request(url,{method:req.method,headers,...(body.length?{body}:{} )});
   const result=await (url.pathname.startsWith('/api/journal/')?journalRequest:roomRequest)(request,db);
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  if(url.pathname==='/'||url.pathname==='/racing'){res.writeHead(302,{'Location':'/racing/','Cache-Control':'no-store'});res.end();return;}
  const pathname=decodeURIComponent(url.pathname);
  if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end();return;}
  let file=path.resolve(staticRoot,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(staticRoot+path.sep)){res.writeHead(404);res.end();return;}
  let info;try{file=await fs.promises.realpath(file);info=await fs.promises.stat(file);}catch{res.writeHead(404);res.end('Not found');return;}
  if(!file.startsWith(staticRoot+path.sep)||!info.isFile()){res.writeHead(404);res.end();return;}
  const etag='"'+info.size.toString(16)+'-'+Math.trunc(info.mtimeMs).toString(16)+'"';
  const cache=path.extname(file)==='.html'||path.extname(file)==='.json'?'no-cache':'public, max-age=300';
  res.setHeader('ETag',etag);res.setHeader('Cache-Control',cache);
  if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':info.size});
  if(req.method==='HEAD'){res.end();return;}await pipeline(fs.createReadStream(file),res);
 }catch(error){if(!res.headersSent){res.writeHead(error instanceof URIError?400:500,{'Content-Type':'text/plain; charset=utf-8'});res.end('요청을 처리하지 못했습니다.');}else res.destroy();console.error('Request failed:',error.name);}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Daytona listening on port '+server.address().port));
function stop(){server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
