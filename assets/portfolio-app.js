const zh = document.body.dataset.lang === 'zh';
const label = (a,b) => zh ? a : b;
const controls = document.querySelector('[data-project-controls]');
if(controls) {
 const input=document.querySelector('#project-search'), type=document.querySelector('#project-type'),layer=document.querySelector('#project-layer');
 const buttons=[...document.querySelectorAll('[data-sector-filter]')], cards=[...document.querySelectorAll('[data-project-card]')];
 const reset=document.querySelector('#reset-projects');
 let sector='';
 const norm=s=>s.normalize('NFKC').toLocaleLowerCase();
 function read(){const q=new URLSearchParams(location.search);input.value=(q.get('q')||'').slice(0,100);type.value=q.get('type')||'';layer.value=q.get('layer')||'';sector=buttons.some(b=>b.dataset.sectorFilter===q.get('sector'))?q.get('sector'):'';}
 function update(write=true){
  const q=norm(input.value.trim());let count=0;
  cards.forEach(c=>{const visible=(!sector||c.dataset.sector===sector)&&(!type.value||c.dataset.kind===type.value)&&(!layer.value||c.dataset.layers.split(' ').includes(layer.value))&&(!q||norm(c.dataset.search).includes(q));c.hidden=!visible;if(visible)count++;});
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sectorFilter===sector)));
  document.querySelector('#project-count').textContent=`${count} ${label('个展示条目',count===1?'project & solution':'projects & solutions')}`;
  document.querySelector('#project-empty').hidden=count>0;reset.hidden=!q&&!sector&&!type.value&&!layer.value;
  if(write){const u=new URL(location.href);u.search='';if(q)u.searchParams.set('q',input.value.trim());if(sector)u.searchParams.set('sector',sector);if(type.value)u.searchParams.set('type',type.value);if(layer.value)u.searchParams.set('layer',layer.value);history.replaceState(null,'',u);}
 }
 read();update(false);
 input.addEventListener('input',()=>update());type.addEventListener('change',()=>update());layer.addEventListener('change',()=>update());
 buttons.forEach(b=>b.addEventListener('click',()=>{sector=b.dataset.sectorFilter;update();}));
 reset.addEventListener('click',()=>{input.value='';type.value='';layer.value='';sector='';update();input.focus();});
 window.addEventListener('popstate',()=>{read();update(false);});
}
document.querySelectorAll('[data-architecture]').forEach(explorer=>{
 const nodes=JSON.parse(explorer.querySelector('[data-node-data]').textContent);
 explorer.querySelectorAll('[data-node-index]').forEach(button=>button.addEventListener('click',()=>{
  const i=Number(button.dataset.nodeIndex),n=nodes[i];
  explorer.querySelectorAll('[data-node-index]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  explorer.querySelector('[data-node-title]').textContent=n.title;explorer.querySelector('[data-node-body]').textContent=n.body;
  explorer.querySelector('[data-node-counter]').textContent=`${String(i+1).padStart(2,'0')} / ${String(nodes.length).padStart(2,'0')}`;
 }));
 explorer.querySelectorAll('[data-diagram-view]').forEach(button=>button.addEventListener('click',()=>{
  explorer.querySelectorAll('[data-diagram-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  explorer.querySelector('#module-view').hidden=button.dataset.diagramView!=='modules';explorer.querySelector('#flow-view').hidden=button.dataset.diagramView!=='flow';
 }));
});
const lab=document.querySelector('[data-trade-lab]');
if(lab){
 const next=lab.querySelector('[data-trade-next]'),outcome=lab.querySelector('[data-trade-outcome]');let stage=0,terminal='';
 const codes=['READY_FOR_AUTH','AUTHORIZED','PENDING_CONFIRMATION','CONFIRMED'];
 const messages=zh?['客户端等待用户授权。','授权完成，可以准备并提交模拟交易。','已提交模拟请求，等待确认；此时不把提交当作成功。','模拟确认完成，客户端刷新持仓与账户视图。']:['The client is waiting for authorization.','Authorized. Prepare and submit the simulated transaction.','Simulated request submitted. Await confirmation before displaying success.','Simulated confirmation received. Refresh positions and account views.'];
 const actions=zh?['模拟授权','模拟提交','模拟确认','模拟已完成']:['Simulate authorization','Simulate submission','Simulate confirmation','Simulation complete'];
 function render(){
  lab.querySelectorAll('[data-trade-step]').forEach((s,i)=>{s.classList.toggle('is-active',i===stage);s.classList.toggle('is-complete',i<stage);if(i===stage)s.setAttribute('aria-current','step');else s.removeAttribute('aria-current');});
  lab.querySelector('[data-trade-code]').textContent=terminal||codes[stage];
  lab.querySelector('[data-trade-message]').textContent=terminal==='AUTH_REJECTED'?label('用户拒绝授权。客户端保留未授权状态，提示用户后续可重试。','Authorization rejected. Retain the unauthorized state and offer a later retry.'):terminal==='CONFIRMATION_TIMEOUT'?label('确认等待超时。结果仍未知，应继续查询状态，避免重复提交。','Confirmation timed out. The result remains unknown; check status before submitting again.'):messages[stage];
  next.textContent=terminal?label('请重置后重试','Reset to try again'):actions[stage];next.disabled=Boolean(terminal)||stage===3;
  lab.querySelector('.trade-readout').classList.toggle('is-warning',Boolean(terminal));
 }
 function reset(){stage=0;terminal='';render();}
 next.addEventListener('click',()=>{if(stage===0&&outcome.value==='reject')terminal='AUTH_REJECTED';else if(stage===2&&outcome.value==='timeout')terminal='CONFIRMATION_TIMEOUT';else stage=Math.min(stage+1,3);render();});
 lab.querySelector('[data-trade-reset]').addEventListener('click',reset);outcome.addEventListener('change',reset);render();
}
const inventory=document.querySelector('[data-inventory-lab]');
if(inventory){
 const stock=inventory.querySelector('[data-stock]'),threshold=inventory.querySelector('[data-threshold]'),target=inventory.querySelector('[data-target]');
 function calc(){
  const a=Number(stock.value),b=Number(threshold.value),c=Number(target.value);inventory.querySelector('[data-stock-value]').value=a;
  let message;
  if(threshold.value===''||target.value===''||!Number.isInteger(b)||!Number.isInteger(c)||b<0||b>100||c<b||c>200)message=label('请设置有效补货点（0–100），目标库存不低于补货点且不高于 200。','Use a reorder point from 0–100 and a target between that point and 200.');
  else message=a<b?label(`建议补货 ${Math.max(0,c-a)} 件 · 模拟规则结果`,`Suggested replenishment: ${Math.max(0,c-a)} units · simulated rule`):label('库存高于或等于补货点，暂不建议补货。','Stock meets the reorder point. No replenishment suggested.');
  inventory.querySelector('[data-inventory-result]').textContent=message;
 }
 [stock,threshold,target].forEach(i=>i.addEventListener('input',calc));calc();
}
const brief=document.querySelector('[data-brief-builder]');
brief?.querySelector('form').addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),direction=String(f.get('direction')),problem=String(f.get('problem')).trim();if(!problem)return;
 const subject=label('项目需求讨论：','Project discussion: ')+direction;
 const body=label(`你好 Xiaofeng，\n\n项目方向：${direction}\n需要解决的问题：${problem}\n\n当前产品或资料链接：\n希望达成的结果：\n其他约束：\n\n期待进一步沟通。`,`Hi Xiaofeng,\n\nProject direction: ${direction}\nThe challenge: ${problem}\n\nCurrent product or reference links:\nDesired outcome:\nOther constraints:\n\nI would like to discuss the next step.`);
 location.href=`mailto:f2yj20@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
