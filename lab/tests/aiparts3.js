const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-ai.html');await p.waitForTimeout(400);
for(const f of ['1_front_tpose.jpg','4_side.jpg']){await p.setInputFiles('#fileIn',L+'img/'+f);await p.waitForTimeout(600)}
await p.evaluate(()=>{const r=['front','side'];sheets.forEach((s,i)=>{s.boxes.forEach(b=>b.role=r[i]);s.sel=0});$('sideDir').value='0';P.spk=3;P.tol=40;maskCache.clear();cur=0;renderTabs();drawSheet()});
await p.click('#autoParts');await p.waitForTimeout(300);
await p.fill('#aiUrl','http://127.0.0.1:8791/generate');await p.evaluate(()=>{$('aiParts').checked=true});
await p.click('#goAi');await p.waitForTimeout(1800);console.log('before cancel:',await p.textContent('#sbStage'));
await p.click('#sbCancel').catch(async()=>{await p.click('text=Cancel')});await p.waitForTimeout(600);
console.log('after:',await p.textContent('#sbStage'),'| goAi disabled:',await p.getAttribute('#goAi','disabled'),'| errs',errs);await b.close()})();
