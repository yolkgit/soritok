import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function openDatabase(filename,migrationsDirectory){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const native=new DatabaseSync(filename);
 native.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 native.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)');
 for(const name of fs.readdirSync(migrationsDirectory).filter(n=>n.endsWith('.sql')).sort()){
  const sql=fs.readFileSync(path.join(migrationsDirectory,name),'utf8'),sha=createHash('sha256').update(sql).digest('hex');
  const old=native.prepare('SELECT sha256 FROM app_migrations WHERE name=?').get(name);
  if(old){if(old.sha256!==sha)throw Error('Changed migration: '+name);continue;}
  native.exec('BEGIN IMMEDIATE');
  try{native.exec(sql);native.prepare('INSERT INTO app_migrations VALUES(?,?)').run(name,sha);native.exec('COMMIT');}
  catch(error){native.exec('ROLLBACK');throw error;}
 }
 function prepare(sql){
  const statement=native.prepare(sql);
  const bind=(...values)=>({
   first(column){const row=statement.get(...values);return row?(column?row[column]:{...row}):null;},
   all(){return {success:true,results:statement.all(...values).map(row=>({...row}))};},
   run(){const result=statement.run(...values);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  });
  return {bind,...bind()};
 }
 return {prepare,batch(statements){native.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.run());native.exec('COMMIT');return result;}catch(error){native.exec('ROLLBACK');throw error;}},close(){native.close();},native};
}
