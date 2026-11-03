const {chromium}=require('playwright');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-trace.html');await p.waitForTimeout(500);
const f=process.argv[2]||'real_A.obj',q=process.argv[3]||'5000';
await p.setInputFiles('#meshIn',L+'t/'+f);for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
for(const [snap,topo,rx] of [[false,false,0],[true,false,0],[true,true,90]]){
 await p.evaluate(([s,t,r,q])=>{$('aSnap').checked=s;$('aTopo').checked=t;$('aRx').value=r;$('aQ').value=q},[snap,topo,rx,q]);const t0=Date.now();await p.click('#goRemesh');
 for(let i=0;i<900;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 const d=await p.evaluate(()=>{const M=meshes.quad,O=meshes.raw,G=triGrid(O.V,O.T,0.05),m=M.Q.length/4;let s=0,mx=0;for(let q=0;q<m;q++){let x=0,y=0,z=0;for(let c=0;c<4;c++){const i=M.Q[q*4+c]*3;x+=M.V[i];y+=M.V[i+1];z+=M.V[i+2]}const dd=Math.sqrt(G.nearest(x/4,y/4,z/4));s+=dd;if(dd>mx)mx=dd}return{mean:+(s/m).toFixed(5),max:+mx.toFixed(4)}});
 console.log(snap?(topo?'snap+clean':'snap'):'plain',await p.textContent('#stats'),'| quad-centre deviation',JSON.stringify(d),((Date.now()-t0)/1000).toFixed(1)+'s');
 if(snap&&topo){await p.click('[data-v="both"]');await p.click('[data-cam="persp"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/rm5_'+f.replace('.obj','')+'.png'})}}
console.log(errs);await b.close()})();
