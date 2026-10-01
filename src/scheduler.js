import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {dataDir} from './storage.js';
export function startScheduler(){
 if(process.env.AUTO_SEND!=='true')return;
 let running=false,lastAttempt='';
 async function tick(){
  if(running)return;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t).value;
  const day=Number(part('day')),hour=Number(part('hour'));const today=part('year')+'-'+part('month')+'-'+part('day');
  if(day>15||hour<9||lastAttempt===today)return;
  running=true;
  try{await fs.mkdir(dataDir,{recursive:true});let saved;try{saved=JSON.parse(await fs.readFile(path.join(dataDir,'scheduler.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}if(saved?.date===today){lastAttempt=today;return;}
   await fs.writeFile(path.join(dataDir,'scheduler.json'),JSON.stringify({date:today}));lastAttempt=today;
   await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[new URL('./monthly.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],{cwd:process.cwd(),env:process.env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>{console.log('Monatsprüfung beendet, Status '+code);resolve();});});
  }catch(e){console.error('Monatsprüfung fehlgeschlagen:',e.code??e.name);}finally{running=false;}
 }
 tick();setInterval(tick,60000).unref();
}
