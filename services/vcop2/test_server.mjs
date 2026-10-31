import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const server=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{env:{...process.env,VCOP2_PORT:'3019',SOURCE_COMMIT:'server-test'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 const base='http://127.0.0.1:3019';
 let r=await fetch(base+'/vcop2/healthz');assert.equal(r.status,200);const health=await r.json();assert.equal(health.revision,'server-test');assert.equal(health.ready,true);
 for(const [name,type] of [['icon.svg','image/svg+xml'],['icon-180.png','image/png'],['manifest.webmanifest','application/manifest+json'],['poly.frag','text/plain; charset=utf-8'],['core.wasm','application/wasm']]){r=await fetch(base+'/vcop2/'+name,{method:'HEAD'});assert.equal(r.status,200,name);assert.equal(r.headers.get('content-type'),type,name);assert.equal((await r.arrayBuffer()).byteLength,0);}
 r=await fetch(base+'/vcop2/core.wasm?v=hash',{method:'HEAD'});assert.match(r.headers.get('cache-control'),/immutable/);
 assert.equal((await fetch(base+'/vcop2/unknown')).status,404);
 assert.equal((await fetch(base+'/vcop2/%zz')).status,400);
 assert.equal((await fetch(base+'/vcop2/',{method:'POST',body:'x'})).status,405);
 assert.equal((await fetch(base+'/vcop2/healthz')).status,200,'Malformed requests did not stop server');
 console.log('PASS: health/revision, external asset MIME types, HEAD, cache policy, invalid paths and methods.');
}finally{server.kill();await new Promise(resolve=>server.once('exit',resolve));}
