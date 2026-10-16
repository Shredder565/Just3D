const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
for(const f of ['real_A.obj','bracket.obj']){
await p.setInputFiles('#meshIn',L+'t/'+f);for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
for(const ro of [0,0.2,0.35,0.5]){await p.evaluate(([r])=>{window.__roff=r;$('aQ').value=5000},[ro]);await p.click('#goRemesh');for(let i=0;i<900;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
console.log(f,'roff',ro,await p.textContent('#stats'))}}
await b.close()})();
