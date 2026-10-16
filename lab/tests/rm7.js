const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1700,height:980}});
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
for(const [f,q] of [['real_A.obj',5000],['bracket.obj',3000]]){
await p.setInputFiles('#meshIn',L+'t/'+f);for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
for(const [name,snap,topo,rx] of [['before',true,false,0],['after',true,true,90]]){
 await p.evaluate(([s,t,r,q])=>{$('aSnap').checked=s;$('aTopo').checked=t;$('aRx').value=r;$('aQ').value=q},[snap,topo,rx,q]);await p.click('#goRemesh');
 for(let i=0;i<900;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log(f,name,await p.textContent('#stats'));
 await p.click('[data-v="both"]');await p.click('[data-cam="persp"]');await p.waitForTimeout(500);await (await p.$('#paneView')).screenshot({path:L+'t/ba_'+f.replace('.obj','')+'_'+name+'.png'})}}
await b.close()})();
