const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
await p.setInputFiles('#meshIn',L+'t/'+(process.argv[3]||'real_A.obj'));for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
for(const rx of (process.argv[2]||'0,20,80').split(',')){
 await p.fill('#aQ','5000');await p.evaluate(r=>{$('aRx').value=r},rx);await p.click('#goRemesh');for(let i=0;i<600;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log('rx',rx,await p.textContent('#stats'));
 const val=await p.evaluate(()=>{const M=meshes.quad,n=M.V.length/3,m=M.Q.length/4,deg=new Int32Array(n);for(let i=0;i<M.Q.length;i++)deg[M.Q[i]]++;const h={};for(let i=0;i<n;i++)h[deg[i]]=(h[deg[i]]||0)+1;return h});console.log(' valence histogram (quads per vertex)',JSON.stringify(val));
}
await p.click('[data-v="both"]');await p.click('[data-cam="persp"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/rm3.png'});console.log(errs);await b.close()})();
