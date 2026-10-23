// Independently authored, deterministic scenario engines. Synthetic fixtures only.
export const samples = {
 knowledge:{question:'How long is the return window?',role:'customer'},
 workflow:{runId:'batch-1001',amount:1200,action:'submit'},
 booking:{transcript:'Book a consultation on 2026-11-03 at 10:00',service:'consultation',action:'preview'},
 documents:{text:'INVOICE: INV-1042\nSUPPLIER: North Supply\nSUBTOTAL: 1200.00\nTAX: 120.00\nTOTAL: 1320.00',action:'validate'},
 commerce:{csv:'sku,stock,dailySales,leadDays,unitPrice,unitCost\nLAMP-01,18,6,5,49,23\nBAG-02,65,4,7,79,38\nMUG-03,8,3,4,18,7',buffer:3},
 pipeline:{csv:'name,email,budget,days,need\nOrion Retail,orion@example.org,8000,14,integration\nNorth Studio,north@example.org,1500,45,website\nOrion duplicate,orion@example.org,8000,14,integration\nVela Care,vela@example.org,5000,21,automation',minBudget:3000},
 locale:{product:'Lumen Desk Lamp',feature:'Adjustable light',locale:'de',claim:'Built for calm workspaces.'},
 metrics:{csv:'date,revenue,orders,adSpend,refunds\n2026-10-01,960,12,180,20\n2026-10-02,1040,13,190,0\n2026-10-03,1000,12,200,10\n2026-10-04,980,11,180,0\n2026-10-05,1020,13,210,20\n2026-10-06,1010,12,200,0\n2026-10-07,420,5,220,40',from:'2026-10-01',to:'2026-10-07'},
 gateway:{role:'analyst',tool:'read_metrics',prompt:'Summarize orders for anna@example.org.'},
 chain:{wallet:'0x1111111111111111111111111111111111111111',confirmations:12,head:22000100}
};
const fail=message=>{throw new Error(message)};
const text=(v,max=12000)=>{if(typeof v!=='string'||v.length>max)fail('invalid_text');return v.trim()};
const number=(v,min=0,max=1e9)=>{if(v===''||v===null||typeof v==='boolean')fail('invalid_number');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail('invalid_number');return n};
const money=n=>Math.round(n*100)/100;
const metric=(key,value)=>({key,value});
const result=(status,metrics,rows=[],notes=[])=>({status,metrics,rows,notes});
function csv(raw,required){
 const lines=text(raw).split(/\r?\n/).filter(s=>s.trim());if(lines.length<2||lines.length>101)fail('csv_rows_1_to_100');
 const header=lines[0].split(',').map(s=>s.trim());if(new Set(header).size!==header.length||required.some(k=>!header.includes(k)))fail('csv_header');
 return lines.slice(1).map((line,i)=>{const fields=line.split(',').map(s=>s.trim());if(fields.length!==header.length||fields.some(s=>s.includes('"')))fail('csv_simple_format_row_'+(i+2));return Object.fromEntries(header.map((key,j)=>[key,fields[j]]))});
}
const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const knowledge=[
 {id:'RET-01',title:'Returns policy / 退货规则',content:'Unused products can be returned within 30 days of delivery. Contact support with the order number.',terms:['return','refund','退货','退款'],role:'customer'},
 {id:'SHP-02',title:'Delivery guide / 配送说明',content:'Standard delivery takes 3–5 business days. Track the parcel using the dispatch reference.',terms:['ship','deliver','track','配送','快递'],role:'customer'},
 {id:'BIL-03',title:'Billing guide / 发票说明',content:'Download invoices from the Billing tab after an order is completed.',terms:['invoice','bill','发票','账单'],role:'customer'},
 {id:'OPS-04',title:'Internal escalation / 内部升级流程',content:'Staff review exceptions in the supervisor queue. No automatic refund is issued.',terms:['internal','supervisor','内部','主管'],role:'staff'}
];
export function createState(){return {runs:{},bookings:{},documents:{}}}
export function runScenario(id,input={},state=createState()){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid_input');
 const p=input;
 if(id==='knowledge'){
  const q=text(p.question,500).toLowerCase();if(!q)fail('question_required');if(!['customer','staff'].includes(p.role))fail('invalid_role');
  const ranked=knowledge.filter(k=>k.role==='customer'||p.role==='staff').map(k=>({...k,score:k.terms.filter(t=>q.includes(t)).length})).filter(k=>k.score>0).sort((a,b)=>b.score-a.score);
  return result(ranked.length?'answered':'handoff',[metric('visibleDocuments',p.role==='staff'?4:3),metric('matches',ranked.length)],ranked.map(({id,title,content,score})=>({source:id,title,answer:content,matches:score})),ranked.length?['lexical_retrieval_not_llm']:['no_source_handoff']);
 }
 if(id==='workflow'){
  const runId=text(p.runId,60);if(!/^[a-z0-9-]+$/i.test(runId))fail('invalid_run_id');const amount=money(number(p.amount,0.01,1000000));const action=p.action;if(!['submit','approve','reject'].includes(action))fail('invalid_action');
  let entry=state.runs[runId];let replay=false;
  if(entry){if(entry.amount!==amount)fail('idempotency_conflict');if(action==='submit')replay=true;else if(entry.status!=='pending')fail('transition_not_allowed');else entry.status=action==='approve'?'completed':'rejected'}
  else {if(action!=='submit')fail('submit_first');entry={amount,status:amount>500?'pending':'completed',events:[]};state.runs[runId]=entry}
  if(!replay)entry.events.push({step:entry.events.length+1,event:action,status:entry.status});
  return result(entry.status,[metric('amount',amount),metric('approvalThreshold',500),metric('duplicate',replay?'yes':'no')],entry.events,['local_receipt_no_external_action']);
 }
 if(id==='booking'){
  const raw=text(p.transcript,1000);const date=raw.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];const time=raw.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];
  if(!date||!time||!dateValid(date))fail('date_time_required');const service=text(p.service,40);if(!['consultation','repair'].includes(service)||!['preview','confirm'].includes(p.action))fail('invalid_booking');
  if(!['09:00','10:00','11:00','14:00','15:00','16:00'].includes(time))fail('outside_business_hours');
  const key=date+' '+time;const busy=key==='2026-11-03 11:00'||Boolean(state.bookings[key]);if(p.action==='confirm'&&busy)fail('slot_unavailable');if(p.action==='confirm')state.bookings[key]={service};
  return result(busy?'unavailable':p.action==='confirm'?'booked':'available',[metric('date',date),metric('time',time),metric('timezone','Asia/Shanghai')],[{service,date,time,status:p.action==='confirm'?'booked':busy?'unavailable':'available'}],['transcript_input_not_speech_recognition']);
 }
 if(id==='documents'){
  const raw=text(p.text,3000);const get=key=>raw.match(new RegExp('^'+key+':\\s*(.+)$','mi'))?.[1]?.trim();
  const invoice=get('INVOICE'),supplier=get('SUPPLIER');if(!invoice||!supplier||!/^INV-[a-z0-9-]+$/i.test(invoice))fail('invoice_fields_required');
  const cents=key=>{const s=get(key);if(!s||!/^\d{1,8}(\.\d{1,2})?$/.test(s))fail('amount_format');return Math.round(Number(s)*100)};
  const subtotal=cents('SUBTOTAL'),tax=cents('TAX'),total=cents('TOTAL'),delta=total-subtotal-tax;
  if(!['validate','approve'].includes(p.action))fail('invalid_action');if(p.action==='approve'&&delta!==0)fail('total_mismatch');const previous=state.documents[invoice];const signature=JSON.stringify({supplier,subtotal,tax,total});
  if(p.action==='approve'&&previous&&previous!==signature)fail('invoice_conflict');const duplicate=p.action==='approve'&&previous===signature;if(p.action==='approve')state.documents[invoice]=signature;
  return result(delta?'needs_review':p.action==='approve'?'approved':'validated',[metric('subtotal',subtotal/100),metric('tax',tax/100),metric('total',total/100),metric('difference',delta/100),metric('duplicate',duplicate?'yes':'no')],[{invoice,supplier,status:delta?'needs_review':p.action==='approve'?'approved':'validated'}],['structured_text_not_ocr']);
 }
 if(id==='commerce'){
  const buffer=number(p.buffer,0,30);const rows=csv(p.csv,['sku','stock','dailySales','leadDays','unitPrice','unitCost']);const skus=new Set();
  const output=rows.map(r=>{if(!r.sku||skus.has(r.sku))fail('duplicate_sku');skus.add(r.sku);const stock=number(r.stock),daily=number(r.dailySales),lead=number(r.leadDays,0,180),price=number(r.unitPrice),cost=number(r.unitCost);const reorderPoint=Math.ceil(daily*(lead+buffer)),reorder=Math.max(0,reorderPoint-stock);return {sku:r.sku,stock,daysCover:daily?money(stock/daily):'∞',reorderPoint,reorder,grossMargin:price?money((price-cost)/price*100)+'%':'n/a'}});
  return result('calculated',[metric('skus',rows.length),metric('reorderUnits',output.reduce((n,r)=>n+r.reorder,0)),metric('bufferDays',buffer)],output,['daily_average_rule_not_forecast']);
 }
 if(id==='pipeline'){
  const min=number(p.minBudget);const rows=csv(p.csv,['name','email','budget','days','need']);const emails=new Set();let duplicates=0;
  const output=[];for(const r of rows){const email=r.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('email_format');if(emails.has(email)){duplicates++;continue}emails.add(email);const budget=number(r.budget),days=number(r.days,1,365),score=Math.min(100,(budget>=min?40:10)+(days<=30?30:10)+(['integration','automation'].includes(r.need)?30:15));output.push({company:r.name,email,score,stage:score>=80?'priority':'review',next:score>=80?'scope_call':'clarify_need'})}
  output.sort((a,b)=>b.score-a.score);return result('qualified',[metric('uniqueLeads',output.length),metric('duplicates',duplicates),metric('priority',output.filter(r=>r.stage==='priority').length)],output,['transparent_rules_no_automatic_outreach']);
 }
 if(id==='locale'){
  const product=text(p.product,80),feature=text(p.feature,120),claim=text(p.claim,250);if(!product||!feature)fail('product_required');const locale=p.locale;if(!['en','de','ja'].includes(locale))fail('invalid_locale');
  const glossary={'Adjustable light':{de:'Einstellbares Licht',ja:'明るさを調整できるライト',en:'Adjustable light'}};
  const translated=glossary[feature]?.[locale];const blocked=/guarantee|cure|100%|治愈|保证|稳赚/i.test(claim);const title=locale==='de'?product+' – Licht für deinen Alltag':locale==='ja'?product+'｜毎日を照らすデザイン':product+' — Light for everyday work';
  const description=translated?translated+'. '+(locale==='de'?'Für deinen Arbeitsplatz.':locale==='ja'?'ワークスペースのために。':'Built for your workspace.'):'[Human translation required] '+feature;
  return result(blocked?'blocked':!translated?'needs_review':'ready',[metric('locale',locale),metric('titleCharacters',[...title].length),metric('review',blocked?'claim_blocked':translated?'glossary_matched':'translation_needed')],[{title,description,claim:blocked?'[Blocked claim]':claim}],['glossary_templates_not_live_translation']);
 }
 if(id==='metrics'){
  const from=text(p.from,10),to=text(p.to,10);if(!dateValid(from)||!dateValid(to)||from>to)fail('date_range');let rows=csv(p.csv,['date','revenue','orders','adSpend','refunds']);const dates=new Set();rows=rows.map(r=>{if(!dateValid(r.date)||dates.has(r.date))fail('duplicate_or_invalid_date');dates.add(r.date);return {date:r.date,revenue:number(r.revenue),orders:number(r.orders),adSpend:number(r.adSpend),refunds:number(r.refunds)}}).filter(r=>r.date>=from&&r.date<=to).sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)fail('empty_range');
  const values=rows.map(r=>r.revenue).sort((a,b)=>a-b),median=values[Math.floor(values.length/2)];const sum=k=>rows.reduce((n,r)=>n+r[k],0),revenue=sum('revenue'),orders=sum('orders'),spend=sum('adSpend');
  const output=rows.map(r=>({...r,signal:rows.length>=3&&r.revenue<median*.6?'review':'normal'}));const out=result('analyzed',[metric('netRevenue',money(revenue-sum('refunds'))),metric('orders',orders),metric('averageOrder',orders?money(revenue/orders):0),metric('revenueAdRatio',spend?money(revenue/spend):'n/a'),metric('anomalies',output.filter(r=>r.signal==='review').length)],output,['ratio_is_not_attribution','median_threshold_not_prediction']);out.chart=output.map(r=>({label:r.date.slice(5),value:r.revenue}));return out;
 }
 if(id==='gateway'){
  const role=p.role,tool=p.tool,prompt=text(p.prompt,2000);if(!['analyst','operator'].includes(role)||!['read_metrics','create_draft','delete_records'].includes(tool))fail('invalid_policy');
  const allowed={analyst:['read_metrics'],operator:['read_metrics','create_draft']}[role].includes(tool);const injection=/ignore (?:all |previous |system )*instructions|reveal.*(?:secret|system)|绕过|忽略.*指令/i.test(prompt);const redacted=prompt.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,'[EMAIL]').replace(/\b(?:sk|api)[_-][A-Za-z0-9_-]{8,}\b/g,'[SECRET]');const status=!allowed||injection?'blocked':tool==='create_draft'?'approval_required':'allowed';
  return result(status,[metric('role',role),metric('tool',tool),metric('redacted',redacted!==prompt?'yes':'no')],[{check:'tool_policy',status:allowed?'allowed':'blocked'},{check:'prompt_rules',status:injection?'blocked':'passed'},{check:'redaction',status:redacted}],['illustrative_rules_not_complete_security']);
 }
 if(id==='chain'){
  const wallet=text(p.wallet,42).toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(wallet))fail('wallet_format');const head=number(p.head,22000090,22001000),required=number(p.confirmations,1,64);if(!Number.isInteger(head)||!Number.isInteger(required))fail('integer_required');
  const events=[{tx:'0xsample01',block:22000080,index:0,from:wallet,to:'0x2222222222222222222222222222222222222222',raw:'125000000',decimals:6,removed:false},{tx:'0xsample02',block:22000098,index:0,from:'0x3333333333333333333333333333333333333333',to:wallet,raw:'999999999999999999',decimals:18,removed:false},{tx:'0xsample01',block:22000080,index:0,from:wallet,to:'0x2222222222222222222222222222222222222222',raw:'125000000',decimals:6,removed:false},{tx:'0xsample03',block:22000085,index:0,from:wallet,to:'0x4444444444444444444444444444444444444444',raw:'5000000',decimals:6,removed:true}];
  const seen=new Set();const output=[];let duplicates=0;for(const e of events){const key=e.tx+':'+e.index;if(seen.has(key)){duplicates++;continue}seen.add(key);const confirmations=Math.max(0,head-e.block+1);const unit=10n**BigInt(e.decimals),raw=BigInt(e.raw);const fraction=(raw%unit).toString().padStart(e.decimals,'0').replace(/0+$/,'');const amount=(raw/unit).toString()+(fraction?'.'+fraction:'');output.push({transaction:e.tx,amount,direction:e.from===wallet?'out':'in',confirmations,status:e.removed?'reorg_removed':confirmations>=required?'confirmed':'pending'})}
  return result('observed',[metric('events',output.length),metric('duplicates',duplicates),metric('confirmed',output.filter(r=>r.status==='confirmed').length),metric('reorgRemoved',output.filter(r=>r.status==='reorg_removed').length)],output,['synthetic_chain_events_no_rpc_or_wallet']);
 }
 fail('unknown_scenario');
}
