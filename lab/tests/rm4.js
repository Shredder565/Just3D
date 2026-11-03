const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
await p.setInputFiles('#meshIn',L+'t/real_A.obj');for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
for(const r of [3]){await p.evaluate(([r,x])=>{window.__rounds=r;$('aRx').value=x;$('aQ').value=5000},[r,process.argv[2]]);const t0=Date.now();await p.click('#goRemesh');for(let i=0;i<900;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
console.log('rounds',r,await p.textContent('#stats'),((Date.now()-t0)/1000).toFixed(1)+'s')}
await b.close()})();
