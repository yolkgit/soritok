import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),assets=path.resolve(process.env.ROM_WEB_ARTIFACTS||path.join(root,'.rom-build'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'rom-web/build-manifest.json'),'utf8'));
for(const [name,expected] of Object.entries(manifest.assets)){
 const bytes=await fs.readFile(path.join(assets,name));
 if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('Invalid private runtime asset: '+name);
}
const out=path.join(root,'public/racing');await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'rom-web'),out,{recursive:true});
for(const name of Object.keys(manifest.assets)){await fs.mkdir(path.dirname(path.join(out,name)),{recursive:true});await fs.copyFile(path.join(assets,name),path.join(out,name));}
await fs.copyFile(path.join(out,'sw.js'),path.join(root,'public/sw.js'));
await fs.copyFile(path.join(out,'favicon.ico'),path.join(root,'public/favicon.ico'));
console.log('Built racing assets; all private runtime digests verified.');
