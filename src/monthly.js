import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {previousMonth} from './report.js';
import {loadReport} from './stripe.js';
import {pdf} from './pdf.js';
import {documents,dataDir} from './storage.js';
const month=process.argv[2]??previousMonth();const dir=path.join(dataDir,month);await fs.mkdir(dir,{recursive:true});
let lock;try{lock=await fs.open(path.join(dir,'send.lock'),'wx');}catch(e){if(e.code==='EEXIST')throw new Error('Versand gesperrt; laufenden Job bzw. unklaren früheren Versand prüfen');throw e;}
try{let sent=false;try{await fs.access(path.join(dir,'sent.json'));sent=true;}catch(e){if(e.code!=='ENOENT')throw e;}if(sent){console.log(month+': bereits versendet');}else{
 const docs=await documents(month);if(!docs.length){console.log(month+': wartet auf Gebührenbelege');process.exitCode=2;}else{
 const report=await loadReport(month);if(report.demo)throw new Error('Kein Versand von Demodaten');
 const attachments=[];for(const d of docs){if(!/^[-a-zA-Z0-9_.]+\.pdf$/.test(d.file))throw new Error('Ungültiger Belegpfad');attachments.push({filename:d.name,path:path.join(dir,d.file)});}
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT??587),secure:process.env.SMTP_PORT==='465',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
 if(!process.env.MAIL_TO||!process.env.MAIL_FROM||!process.env.SMTP_HOST)throw new Error('E-Mail-Konfiguration fehlt');
 // Retain an intent before SMTP: uncertain delivery must be reviewed instead of resent automatically.
 await fs.writeFile(path.join(dir,'sending.json'),JSON.stringify({month,time:new Date().toISOString()}),{flag:'wx'});
 const result=await transport.sendMail({from:process.env.MAIL_FROM,to:process.env.MAIL_TO,subject:'Stripe-Kontoauszug '+month,text:'Anbei der monatliche Stripe-Kontoauszug und die Gebührenbelege.',attachments:[{filename:'Stripe-Kontoauszug-'+month+'.pdf',content:await pdf(report,docs)},...attachments]});
 await fs.writeFile(path.join(dir,'sent.json'),JSON.stringify({month,messageId:result.messageId,sentAt:new Date().toISOString()}));console.log(month+': versendet');
 }}
}finally{await lock.close();await fs.unlink(path.join(dir,'send.lock'));}
