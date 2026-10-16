const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for(const which of ['trace','ai']){
const p=await b.newPage({viewport:{width:1700,height:980}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-'+which+'.html');await p.waitForTimeout(500);
for(const [q,snap] of which==='trace'?[[5000,true],[20000,true]]:[[10000,true]]){
 await p.setInputFiles('#meshIn',L+'t/real_A.obj');
 for(let i=0;i<100;i++){await p.waitForTimeout(300);if(await p.getAttribute('#sb','class')==='ok')break}
 await p.fill('#aQ',String(q));await p.evaluate(s=>{$('aSnap').checked=s;},snap);
 const t0=Date.now();await p.click('#goRemesh');
 for(let i=0;i<600;i++){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 const info=await p.evaluate(()=>{const M=meshes.quad,Q=M.Q,m=Q.length/4,E=new Map();for(let q=0;q<m;q++)for(let c=0;c<4;c++){const a=Q[q*4+c],b=Q[q*4+(c+1)%4],k=a<b?a+'_'+b:b+'_'+a;E.set(k,(E.get(k)||0)+1)}let open=0,nm=0;E.forEach(v=>{if(v===1)open++;if(v>2)nm++});
  /* distance of output vertices to the source surface */
  const R=SRC,G=triGrid(R.V,R.T,0.05);const O=meshes.raw;let s=0,mx=0,n=M.V.length/3;const T=O.T,V=O.V,G2=triGrid(V,T,0.05);for(let i=0;i<n;i+=3){const d=Math.sqrt(G2.nearest(M.V[i*3],M.V[i*3+1],M.V[i*3+2]));s+=d;if(d>mx)mx=d}
  return{quads:m,open,nm,meanDist:+(s/(n/3)).toFixed(5),maxDist:+mx.toFixed(4)}});
 console.log(which,q,snap?'snap':'nosnap',await p.textContent('#sbStage'),'|',await p.textContent('#stats'),JSON.stringify(info),((Date.now()-t0)/1000).toFixed(1)+'s');
 if(snap&&q===5000||which==='ai'){for(const v of ['both']){await p.click('[data-v="'+v+'"]');}await p.click('[data-cam="persp"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:L+'t/rm_'+which+'_'+q+'.png'})}
}
console.log(which,'errs',errs);await p.close()}
await b.close()})();
