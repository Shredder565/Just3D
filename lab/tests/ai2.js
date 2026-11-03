const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1600,height:950}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+L+'out/just3d-ai.html');await p.waitForTimeout(400);
await p.setInputFiles('#fileIn',L+'t/sheet.png');await p.waitForTimeout(700);
await p.evaluate(()=>{sheets[0].boxes.forEach(b=>{const cx=b.x+b.w/2,cy=b.y+b.h/2;b.role=cy>330?'top':cx<370?'front':cx<740?'side':'back'});maskCache.clear()});
const done=async()=>{for(let i=0;i<200;i++){await p.waitForTimeout(250);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err'||c==='idle')return c}return 'timeout'};
// 1. cutouts
const info=await p.evaluate(async()=>{const v=await collectViews();const o={};for(const k in v){const u=URL.createObjectURL(v[k]);const im=new Image();await new Promise(r=>{im.onload=r;im.src=u});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;let a0=0,a1=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)a0++;else a1++}o[k]={w:im.width,h:im.height,size:v[k].size,transparent:a0,opaque:a1}}return o});
console.log('cutouts',JSON.stringify(info));
// 2. sync server
await p.fill('#aiUrl','http://127.0.0.1:8791/generate');
await p.click('#goAi');console.log('sync:',await done(),await p.textContent('#sbStage'),'|',await p.textContent('#stats'));
// 3. cancel in async mode
await p.fill('#aiUrl','http://127.0.0.1:8790/generate');await p.click('#goAi');await p.waitForTimeout(1800);
console.log('cancel visible',await p.isVisible('#sbCancel'));await p.click('#sbCancel');console.log('after cancel:',await done(),await p.textContent('#sbStage'),'|',await p.textContent('#log'),'| go enabled',await p.isEnabled('#goAi'));
// 4. wrong port
await p.fill('#aiUrl','http://127.0.0.1:9/generate');await p.click('#goAi');console.log('bad url:',await done(),await p.textContent('#sbStage'),'|',(await p.textContent('#log')).slice(0,120));
// 5. imports
for(const f of ['obj','ply','stl','glb']){await p.setInputFiles('#meshIn',L+'t/mock.'+f);console.log('import',f,await done(),await p.textContent('#sbStage'),'|',await p.textContent('#stats'))}
// z-up
await p.selectOption('#aUp','z');await p.setInputFiles('#meshIn',L+'t/mockz.obj');console.log('import z-up',await done(),await p.textContent('#stats'));
// 6. re-remesh with different settings, hi-res
await p.selectOption('#aUp','y');await p.evaluate(()=>{$('aRes').value=112});await p.click('#goRemesh');console.log('remesh 112',await done(),await p.textContent('#stats'));
// quads validity
console.log('mesh check',JSON.stringify(await p.evaluate(()=>{const M=meshes.quad;let bad=0,n=M.V.length/3;for(const i of M.Q)if(i<0||i>=n)bad++;const edge=new Map();for(let q=0;q<M.Q.length/4;q++)for(let c=0;c<4;c++){const a=M.Q[q*4+c],b=M.Q[q*4+(c+1)%4],k=a<b?a+'_'+b:b+'_'+a;edge.set(k,(edge.get(k)||0)+1)}let open=0,over=0;edge.forEach(v=>{if(v===1)open++;if(v>2)over++});return{quads:M.Q.length/4,badIdx:bad,openEdges:open,nonManifold:over}})));
// 7. api key
console.log('errs',errs);await b.close()})();
