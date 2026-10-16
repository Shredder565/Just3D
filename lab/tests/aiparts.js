const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+L+'out/just3d-ai.html');await p.waitForTimeout(400);
for(const f of ['1_front_tpose.jpg','2_back_tpose.jpg','4_side.jpg']){await p.setInputFiles('#fileIn',L+'img/'+f);await p.waitForTimeout(600)}
await p.evaluate(()=>{const r=['front','back','side'];sheets.forEach((s,i)=>{s.boxes.forEach(b=>b.role=r[i]);s.sel=0});$('sideDir').value='0';P.spk=3;P.tol=40;$('spk').value=3;$('tol').value=40;maskCache.clear();cur=0;renderTabs();syncRole();drawSheet()});
await p.click('#autoParts');await p.waitForTimeout(400);
const jobs=await p.evaluate(async()=>{const j=await collectPartJobs(4);return j.map(q=>({n:q.name,v:Object.keys(q.views),b:q.box.map(x=>+x.toFixed(2))}))});
console.log(JSON.stringify(jobs));
await p.fill('#aiUrl','http://127.0.0.1:8790/generate');
await p.evaluate(()=>{$('aH').value=4;$('aiParts').checked=true});
await p.click('#goAi');await p.waitForTimeout(1500);await p.screenshot({path:L+'t/aiparts_mid.png'});
console.log('mid:',await p.textContent('#sbStage'));
for(let i=0;i<200;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
console.log(await p.textContent('#sbStage'),'|',await p.textContent('#stats'));console.log((await p.textContent('#log')).slice(-500));
for(const c of ['persp','front','side']){await p.click('[data-cam="'+c+'"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/aiparts_'+c+'.png'})}
const bb=await p.evaluate(()=>{const V=meshes.quad.V;let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(let i=0;i<V.length;i+=3)for(let c=0;c<3;c++){lo[c]=Math.min(lo[c],V[i+c]);hi[c]=Math.max(hi[c],V[i+c])}return{lo,hi}});console.log('bbox',JSON.stringify(bb));
// re-remesh keeps the shape
await p.click('#goRemesh');for(let i=0;i<100;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
console.log('reremesh',await p.textContent('#stats'));
console.log('errs',errs);await b.close()})();
