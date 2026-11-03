/* Trace parts mode on the sample pictures. node tests/parts2.js <built dir> <out dir> [A|B]  (needs: npm i playwright) */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const B=path.resolve(process.argv[2]||path.join(__dirname,'../built')),O=path.resolve(process.argv[3]||'.'),IMG=path.join(__dirname,'../sample-images/'),sets=(process.argv[4]||'AB').split('');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for(const set of sets){
 const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+B+'/just3d-trace.html');await p.waitForTimeout(400);
 const files=set==='A'?['1_front_tpose.jpg','2_back_tpose.jpg','4_side.jpg']:['3_front_relaxed.jpg','4_side.jpg'];
 for(const f of files){await p.setInputFiles('#fileIn',IMG+f);await p.waitForTimeout(600)}
 const roles=set==='A'?['front','back','side']:['front','side'];
 await p.evaluate(r=>{sheets.forEach((s,i)=>{s.boxes.forEach(b=>b.role=r[i]);s.sel=0});$('sideDir').value='0';P.spk=3;P.tol=40;$('spk').value=3;$('tol').value=40;maskCache.clear();cur=0;renderTabs();syncRole();drawSheet()},roles);
 await p.click('#autoParts');await p.waitForTimeout(400);
 console.log(set,'parts:',await p.textContent('#log'));
 await p.evaluate(()=>{cur=0;renderTabs();syncRole();drawSheet()});await p.waitForTimeout(200);await (await p.$('#paneSheet')).screenshot({path:O+'/parts_'+set+'_sheet.png'});
 await p.evaluate(()=>{$('tRes').value=96;$('tH').value=4;$('tSm').value=1;$('tRd').value=20;$('useParts').checked=true});
 await p.click('#goTrace');for(let i=0;i<300;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log(set,await p.textContent('#sbStage'),'|',await p.textContent('#stats'),'|',await p.textContent('#log'));
 for(const cam of ['persp','front','side','back']){const e=await p.$('[data-cam="'+cam+'"]');if(!e)continue;await e.click();await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:O+'/parts_'+set+'_'+cam+'.png'})}
 fs.writeFileSync(O+'/parts_'+set+'.obj',await p.evaluate(()=>exportObj(meshes.quad,'x').text()));
 console.log(set,'page errors:',errs.length?errs:'none');await p.close()}
await b.close()})();
