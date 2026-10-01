import Stripe from 'stripe';
import {period,ledger,invoiceView} from './report.js';
export async function loadReport(month,endMonth=month){
 if(!process.env.STRIPE_API_KEY)return demo(month,endMonth);
 const stripe=new Stripe(process.env.STRIPE_API_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2});
 const {start,end}=period(month,endMonth); const transactions=[];
 // Full history is needed to reconstruct historical opening/closing balances.
 for await(const t of stripe.balanceTransactions.list({created:{lt:end},limit:100,expand:['data.source']}))transactions.push(t);
 const currencies=ledger(transactions,month,endMonth); const invoiceCache=new Map();
 async function getInvoice(id){if(!invoiceCache.has(id))invoiceCache.set(id,invoiceView(await stripe.invoices.retrieve(id)));return invoiceCache.get(id);}
 for(const c of Object.values(currencies))for(const row of c.rows){
  let source=row.source; row.sourceId=typeof source==='string'?source:source?.id;
  row.description=row.description??row.type;
  if(source?.object==='refund')source=await stripe.charges.retrieve(typeof source.charge==='string'?source.charge:source.charge.id);
  if(source?.object==='charge'){
   const pi=typeof source.payment_intent==='string'?source.payment_intent:source.payment_intent?.id;
   const direct=typeof source.invoice==='string'?source.invoice:source.invoice?.id;
   if(direct)row.invoice=await getInvoice(direct);
   else if(pi){const matches=[];for await(const ip of stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:pi},status:'paid',limit:100}))matches.push(await getInvoice(typeof ip.invoice==='string'?ip.invoice:ip.invoice.id));if(matches.length===1)row.invoice=matches[0];else if(matches.length)row.invoices=matches;}
  }
  if(source?.object==='payout')row.payout={id:source.id,status:source.status,arrival:source.arrival_date,automatic:source.automatic};
  delete row.source;
 }
 const invoices=[];
 // Filter by finalization rather than creation: drafts may have been created earlier.
 for await(const i of stripe.invoices.list({created:{lt:end},limit:100}))if(i.status_transitions?.finalized_at>=start&&i.status_transitions.finalized_at<end)invoices.push(invoiceView(i));
 return {month,endMonth,demo:false,currencies,invoices,generatedAt:new Date().toISOString(),basis:'Stripe-Verrechnungskonto; Soll = Zunahme, Haben = Abnahme'};
}
function demo(month,endMonth=month){const {start}=period(month); const invoice={id:'in_demo',number:'RE-2026-001',date:start+3600,customer:'Beispiel GmbH',total:11900,net:10000,tax:1900,currency:'eur',status:'paid',url:null};const transactions=[{id:'txn_payment',created:start+7200,currency:'eur',amount:11900,fee:204,net:11696,type:'charge',description:'Kartenzahlung',invoice},{id:'txn_payout',created:start+86400,currency:'eur',amount:-11696,fee:0,net:-11696,type:'payout',description:'Auszahlung',payout:{id:'po_demo',status:'paid',arrival:start+172800}}];return {month,endMonth,demo:true,currencies:ledger(transactions,month,endMonth),invoices:[invoice],generatedAt:new Date().toISOString(),basis:'Stripe-Verrechnungskonto; Soll = Zunahme, Haben = Abnahme'};}
