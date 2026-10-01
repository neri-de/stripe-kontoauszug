export function period(month) {
 if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Monat muss YYYY-MM sein');
 const [year,m]=month.split('-').map(Number);
 // Berlin midnight, including daylight saving at both boundaries.
 const boundary=(y,mo)=> { const d=new Date(Date.UTC(y,mo,1)); const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Berlin',timeZoneName:'shortOffset'}).formatToParts(d); const offset=Number(parts.find(p=>p.type==='timeZoneName').value.replace('GMT','')); return d.getTime()/1000-offset*3600; };
 return {start:boundary(year,m-1),end:boundary(year,m)};
}
export function ledger(transactions,month) {
 const {start,end}=period(month); const currencies={};
 for (const t of transactions) {
  if (t.created>=end) continue;
  const c=currencies[t.currency]??={opening:0,closing:0,rows:[]};
  if (!Number.isSafeInteger(t.net)||t.net!==t.amount-t.fee) throw new Error('Ungültige Saldenbuchung '+t.id);
  c.closing+=t.net;
  if(t.created<start)c.opening+=t.net;
  else c.rows.push({...t,soll:Math.max(t.net,0),haben:Math.max(-t.net,0)});
 }
 for(const c of Object.values(currencies))c.rows.sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
 return currencies;
}
export function invoiceView(i){return {id:i.id,number:i.number,date:i.status_transitions?.finalized_at,customer:i.customer_name??i.customer_email??i.customer,total:i.total,net:i.total_excluding_tax,tax:(i.total_taxes??i.total_tax_amounts??[]).reduce((sum,t)=>sum+t.amount,0),currency:i.currency,status:i.status,url:i.invoice_pdf??i.hosted_invoice_url};}
export function previousMonth(now=new Date()) {const s=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit'}).formatToParts(now); let y=Number(s.find(p=>p.type==='year').value),m=Number(s.find(p=>p.type==='month').value)-1;if(!m){m=12;y--;}return y+'-'+String(m).padStart(2,'0');}
