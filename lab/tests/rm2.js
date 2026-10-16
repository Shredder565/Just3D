const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
await p.setInputFiles('#meshIn',L+'t/cube.obj');for(let i=0;i<50;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
await p.fill('#aQ','1500');await p.click('#goRemesh');for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
console.log(await p.textContent('#stats'));
await p.click('[data-v="both"]');await p.click('[data-cam="persp"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/rm_cube.png'});console.log(errs);await b.close()})();
