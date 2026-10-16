const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-ai.html');await p.waitForTimeout(400);
for(const f of ['1_front_tpose.jpg','2_back_tpose.jpg','4_side.jpg']){await p.setInputFiles('#fileIn',L+'img/'+f);await p.waitForTimeout(600)}
await p.evaluate(()=>{const r=['front','back','side'];sheets.forEach((s,i)=>{s.boxes.forEach(b=>b.role=r[i]);s.sel=0});P.spk=3;P.tol=40;$('spk').value=3;$('tol').value=40;maskCache.clear();cur=0;renderTabs();drawSheet()});
// cutouts that would be sent
const cut=await p.evaluate(async()=>{const v=await collectViews();const o={};for(const k in v){o[k]=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(v[k])})}return o});
for(const k in cut)fs.writeFileSync(L+'t/cut_'+k+'.png',Buffer.from(cut[k].split(',')[1],'base64'));
console.log('cutouts',Object.keys(cut));
// generate against the example server, grab status bar mid-run
await p.fill('#aiUrl','http://127.0.0.1:8790/generate');
await p.click('#goAi');await p.waitForTimeout(2600);await p.screenshot({path:L+'t/real_ai_midrun.png'});
for(let i=0;i<100;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
console.log('mock run:',await p.textContent('#sbStage'),'|',await p.textContent('#stats'));
await (await p.$('#paneView')).screenshot({path:L+'t/real_ai_mock.png'});
// import the Trace mesh and remesh it hi-res
for(const set of ['A','B']){
 await p.evaluate(()=>{$('aRes').value=112;$('aRx').value=2});
 await p.setInputFiles('#meshIn',L+'t/real_'+set+'.obj');
 for(let i=0;i<200;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log('import trace '+set+':',await p.textContent('#sbStage'),'|',await p.textContent('#stats'));
 await p.click('[data-cam="persp"]');await p.click('[data-v="both"]');await p.waitForTimeout(500);
 await p.screenshot({path:L+'t/real_ai_remesh_'+set+'.png'});
}
console.log('errs',errs);await b.close()})();
