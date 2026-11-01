import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {json} from './http.mjs';
import {createMemos} from './memo.mjs';
import {Rooms} from './rooms.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const runtime=path.resolve(process.env.VCOP2_RUNTIME_ASSETS||path.join(root,'../work/vcop2-original'));
const flat=!!process.env.VCOP2_RUNTIME_ASSETS;
const asset=(name,local)=>path.join(runtime,flat?name:local);
const aliases={
 'core.mjs':asset('core.mjs','web/core.mjs'),'core.wasm':asset('core.wasm','web/core.wasm'),
 'runtime.json':asset('runtime.json','web/runtime.json'),'manifest.json':asset('manifest.json','roms/manifest.json'),
 'vcop2.pack.gz':asset('vcop2.pack.gz','roms/vcop2.pack.gz'),
 'runtime-license.txt':asset('runtime-license.txt','vendor/sm2-emu/LICENSE'),
 'runtime-notice.txt':asset('runtime-notice.txt','vendor/sm2-emu/NOTICE'),
 'source.zip':asset('source.zip','source.zip')
};
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json','.webmanifest':'application/manifest+json','.gz':'application/gzip','.zip':'application/zip','.txt':'text/plain; charset=utf-8','.vert':'text/plain; charset=utf-8','.frag':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const revision=process.env.SOURCE_COMMIT||'local';
const ready=()=>['core.mjs','core.wasm','runtime.json','manifest.json','vcop2.pack.gz'].every(name=>fs.existsSync(aliases[name]));
const memos=createMemos(path.resolve(process.env.DATABASE_PATH||path.join(root,'../work/vcop2-original/data/vcop2.sqlite')));
let version=null;try{version=JSON.parse(fs.readFileSync(aliases['runtime.json'],'utf8')).assets['core.wasm'].sha256;}catch{}
const rooms=new Rooms(version);
const server=http.createServer(async(request,response)=>{try{
 const origin=process.env.PUBLIC_ORIGIN||'http://'+request.headers.host;
 const url=new URL(request.url,origin);
 if(url.pathname==='/vcop2/api/memos'||url.pathname.startsWith('/vcop2/api/memos/')){await memos.handle(request,response,url,origin);return;}
 if(url.pathname==='/vcop2/api/rooms'||url.pathname.startsWith('/vcop2/api/rooms/')){await rooms.handle(request,response,url,origin);return;}
 if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{Allow:'GET, HEAD'});response.end();return;}
 if(url.pathname==='/'||url.pathname==='/vcop2'){response.writeHead(302,{Location:'/vcop2/'});response.end();return;}
 if(url.pathname==='/healthz'||url.pathname==='/vcop2/healthz'){response.writeHead(ready()?200:503,{'Content-Type':'application/json','Cache-Control':'no-cache'});response.end(JSON.stringify({game:'vcop2',originalRom:true,ready:ready()&&memos.healthy(),revision,onlinePlayers:2}));return;}
 if(!url.pathname.startsWith('/vcop2/')){response.writeHead(404);response.end();return;}
 let key;try{key=decodeURIComponent(url.pathname.slice(7))||'index.html';}catch{response.writeHead(400);response.end();return;}
 if(key.includes('/')||key.includes('\\')||key==='..'){response.writeHead(404);response.end();return;}
 const file=aliases[key]||path.join(root,'web',key);
 let stat;try{stat=fs.statSync(file);}catch{response.writeHead(404);response.end('Missing build asset');return;}
 if(!stat.isFile()){response.writeHead(404);response.end();return;}
 response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,
 'Cache-Control':url.searchParams.has('v')&&['core.wasm','vcop2.pack.gz'].includes(key)?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});
 if(request.method==='HEAD'){response.end();return;}
 const stream=fs.createReadStream(file);stream.on('error',()=>response.destroy());stream.pipe(response);
}catch(e){if(!response.headersSent)json(response,e.status||500,{error:e.status?e.message:'요청을 처리하지 못했습니다.'});else response.destroy();}});
server.requestTimeout=15000;server.headersTimeout=10000;
function shutdown(){rooms.close();server.close(()=>{memos.close();process.exit(0);});setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
const port=Number(process.env.VCOP2_PORT||3018),host=process.env.VCOP2_HOST||'127.0.0.1';
server.listen(port,host,()=>console.log('Original VCOP2 ROM: http://'+host+':'+port+'/vcop2/'));
