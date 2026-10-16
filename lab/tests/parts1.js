const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for(const set of ['A','B']){
 const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(400);
 const files=set==='A'?['1_front_tpose.jpg','2_back_tpose.jpg','4_side.jpg']:['3_front_relaxed.jpg','4_side.jpg'];
 for(const f of files){await p.setInputFiles('#fileIn',L+'img/'+f);await p.waitForTimeout(600)}
 const roles=set==='A'?['front','back','side']:['front','side'];
 await p.evaluate(r=>{sheets.forEach((s,i)=>{s.boxes.forEach(b=>b.role=r[i]);s.sel=0});$('sideDir').value='0';P.spk=3;P.tol=40;$('spk').value=3;$('tol').value=40;maskCache.clear();cur=0;renderTabs();syncRole();drawSheet()},roles);
 await p.click('#autoParts');await p.waitForTimeout(400);
 console.log(set,'log:',await p.textContent('#log'));
 console.log(set,'parts',JSON.stringify(await p.evaluate(()=>allParts().map(q=>q.b.name+' '+Math.round(q.b.x)+','+Math.round(q.b.y)+' '+Math.round(q.b.w)+'x'+Math.round(q.b.h)+' '+q.b.depth))));
 await p.evaluate(()=>{cur=0;renderTabs();syncRole();drawSheet()});await p.waitForTimeout(200);await (await p.$('#paneSheet')).screenshot({path:L+'t/parts_'+set+'_sheet.png'});
 await p.evaluate(()=>{$('tRes').value=96;$('tH').value=4;$('tSm').value=1;$('tRd').value=20});
 await p.click('#goTrace');for(let i=0;i<300;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log(set,await p.textContent('#sbStage'),'|',await p.textContent('#stats'),'|',(await p.textContent('#log')).slice(0,200));
 for(const [name,cam] of [['persp','persp'],['front','front'],['side','side']]){await p.click('[data-cam="'+cam+'"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/parts_'+set+'_'+name+'.png'})}
 const obj=await p.evaluate(()=>exportObj(meshes.quad,'x').text());fs.writeFileSync(L+'t/parts_'+set+'.obj',obj);
 console.log(set,'errs',errs);await p.close()}
await b.close()})();
