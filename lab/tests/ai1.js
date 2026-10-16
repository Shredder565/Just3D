const {chromium}=require('playwright');const fs=require('fs');
const L='/tmp/claude-0/-home-claude-just3d/26896240-ee5c-57b7-b189-4c106f8e38c5/scratchpad/lab/';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1600,height:950}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
const mode=process.argv[2]||'ai',port=process.argv[3]||'8791';
await p.goto('file://'+L+'out/just3d-'+mode+'.html');await p.waitForTimeout(500);
await p.setInputFiles('#fileIn',L+'t/sheet.png');await p.waitForTimeout(800);
console.log('boxes',await p.evaluate(()=>sheets[0].boxes.map(b=>b.role+':'+Math.round(b.x)+','+Math.round(b.y)+' '+Math.round(b.w)+'x'+Math.round(b.h))));
// name boxes by x/y position
await p.evaluate(()=>{const bs=sheets[0].boxes;bs.forEach(b=>{const cx=b.x+b.w/2,cy=b.y+b.h/2;b.role=cy>330?'top':cx<370?'front':cx<740?'side':'back'});maskCache.clear();drawSheet()});
console.log('roles',await p.evaluate(()=>sheets[0].boxes.map(b=>b.role)));
const samples=[];
if(mode==='ai'){
 await p.fill('#aiUrl','http://127.0.0.1:'+port+'/generate');
 await p.click('#aiTest');await p.waitForTimeout(800);console.log('test:',await p.textContent('#sbStage'),'|',await p.textContent('#log'));
 await p.click('#goAi');
 const t0=Date.now();let last='';
 while(Date.now()-t0<60000){await p.waitForTimeout(350);const s={st:await p.textContent('#sbStage'),pct:await p.textContent('#sbPct'),t:await p.textContent('#sbTime'),cls:await p.getAttribute('#sb','class')};const key=s.st+'|'+s.pct;if(key!==last){samples.push(s);last=key}if(s.cls==='ok'||s.cls==='err')break}
 console.log(samples.map(s=>s.pct+' '+s.t+' '+s.st).join('\n'));
}else{
 await p.click('#goTrace');const t0=Date.now();while(Date.now()-t0<60000){await p.waitForTimeout(300);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')break}
 console.log('status',await p.textContent('#sbStage'));
}
console.log('stats',await p.textContent('#stats'));console.log('log',await p.textContent('#log'));
await p.waitForTimeout(500);await p.screenshot({path:L+'t/'+mode+'.png'});
console.log('errs',errs);await b.close()})();
