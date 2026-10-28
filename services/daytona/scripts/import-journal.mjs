import fs from 'node:fs';
import path from 'node:path';
import {openDatabase} from '../server/sqlite.mjs';
const filename=process.argv[2];if(!filename)throw Error('Usage: node scripts/import-journal.mjs /private/journal-export.json');
const data=JSON.parse(fs.readFileSync(filename,'utf8')),root=path.resolve(import.meta.dirname,'..');
const db=openDatabase(path.resolve(process.env.DATABASE_PATH||'data/daytona.sqlite'),path.join(root,'drizzle'));
try{
 if(db.prepare('SELECT COUNT(*) AS n FROM journal_records').first().n||db.prepare('SELECT COUNT(*) AS n FROM journal_writers').first().n)throw Error('Import requires an empty destination; never overwrites existing user data.');
 const allowed={journal_writers:['id','secret','name','created'],journal_records:['id','owner','name','title','course','kind','time_ms','content','created','updated','deleted'],journal_comments:['id','record_id','owner','name','content','created','updated','deleted']};
 const statements=[];
 for(const [table,columns] of Object.entries(allowed))for(const row of data[table]||[])statements.push(db.prepare('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')').bind(...columns.map(c=>row[c]??null)));
 db.batch(statements);console.log('Imported journal rows: '+statements.length);
}finally{db.close();}
