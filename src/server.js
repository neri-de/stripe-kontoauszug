import http from 'node:http';
import fs from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {loadReport} from './stripe.js';
import {pdf} from './pdf.js';
import {documents,dataDir} from './storage.js';
import path from 'node:path';
import {period} from './report.js';
const password=process.env.APP_PASSWORD;if(process.env.STRIPE_API_KEY&&!password)throw new Error('APP_PASSWORD für echte Daten erforderlich');
http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'");
 if(password){const expected=Buffer.from('Basic '+Buffer.from('buchhaltung:'+password).toString('base64'));const actual=Buffer.from(req.headers.authorization??'');if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Stripe-Kontoauszug", charset="UTF-8"'});return res.end('Anmeldung erforderlich');}}
 try{if(req.method!=='GET'){res.writeHead(405);return res.end();}const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/report'||url.pathname==='/api/pdf'){const month=url.searchParams.get('month');const report=await loadReport(month);const docs=await documents(month);if(url.pathname==='/api/pdf'){res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Stripe-Kontoauszug-'+month+'.pdf"'});res.end(await pdf(report,docs));}else{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({...report,documents:docs}));}return;}
 if(url.pathname==='/api/document'){const month=url.searchParams.get('month');period(month);const file=url.searchParams.get('file');const docs=await documents(month);if(!docs.some(d=>d.file===file)||!/^[-a-zA-Z0-9_.]+\.pdf$/.test(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'application/pdf'});res.end(await fs.readFile(path.join(dataDir,month,file)));return;}
 const assets={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};const asset=assets[url.pathname];if(!asset){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':asset[1]});res.end(await fs.readFile(new URL('../public/'+asset[0],import.meta.url)));}catch(e){console.error('Bericht fehlgeschlagen:',e.code??e.name);res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Bericht konnte nicht erstellt werden. Monat und Serverkonfiguration prüfen.'}));}
}).listen(Number(process.env.PORT??3100),'127.0.0.1',()=>console.log('Stripe-Kontoauszug: http://localhost:'+(process.env.PORT??3100)));

import {startScheduler} from './scheduler.js';
startScheduler();
