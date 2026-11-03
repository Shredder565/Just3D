'use strict';
const MODE=document.body.classList.contains('ai')?'ai':'trace';
const $=id=>document.getElementById(id);
const tick=()=>new Promise(r=>setTimeout(r,0));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ROLES=['front','side','back','top'];
const RCOL={front:'#2dc4ad',side:'#f2994a',back:'#b57cf0',top:'#f2d14b',part:'#ff6fa8',skip:'#7b8794'};

/* ---------- status bar ---------- */
const Status={t0:0,timer:0,cancel:null,from:0,to:0,creep:false,pct:0,active:false,
 start(label,cancel){this.t0=performance.now();this.cancel=cancel||null;this.active=true;$('sbCancel').hidden=!cancel;
  $('sb').className='';clearInterval(this.timer);this.timer=setInterval(()=>this.onTick(),200);this.creep=false;this.set(0,label);this.onTick()},
 onTick(){$('sbTime').textContent=((performance.now()-this.t0)/1000).toFixed(1)+' s';
  if(this.creep){this.pct+=(this.to-this.pct)*0.02;this.paint()}},
 paint(){const p=clamp(this.pct,0,1);$('sbBar').firstElementChild.style.width=(p*100).toFixed(1)+'%';$('sbPct').textContent=Math.round(p*100)+'%'},
 set(f,label){this.creep=false;if(f===null){$('sb').classList.add('ind');$('sbPct').textContent=''}else{$('sb').classList.remove('ind');this.pct=f;this.paint()}
  if(label!==undefined)$('sbStage').textContent=label},
 waitFor(from,to,label){this.pct=Math.max(this.pct,from);this.to=to;this.creep=true;$('sb').classList.remove('ind');if(label!==undefined)$('sbStage').textContent=label;this.paint()},
 label(t){$('sbStage').textContent=t},
 end(cls,msg){clearInterval(this.timer);this.creep=false;this.active=false;this.cancel=null;$('sbCancel').hidden=true;
  $('sb').className=cls;if(cls==='ok'){this.pct=1;this.paint()}this.onTick();$('sbStage').textContent=msg},
 done(msg){this.end('ok',msg)},fail(msg){this.end('err',msg)},idle(msg){this.end('idle',msg||'Ready')}};
$('sbCancel').onclick=()=>{if(Status.cancel)Status.cancel()};
let JOB=null;const newJob=()=>{JOB={cancelled:false,abort:null};return JOB};
const stepCheck=async(job)=>{await tick();if(job&&job.cancelled)throw new Error('cancelled')};
function log(msg,err){const l=$('log');l.textContent=msg;l.className=err?'err':''}
async function saveFile(name,blob){
 try{if(window.claude&&window.claude.use){const d=await window.claude.use('downloads');await d.save({filename:name,data:blob});return}}catch(e){}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},2000)}
function sizeCanvas(c){const r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}return d}

/* ---------- collapsible panels ---------- */
document.querySelectorAll('section.pn>h2').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('c'));

/* ---------- sheets ---------- */
const sheets=[];let cur=-1;
const sc=$('sheetCv'),sx=sc.getContext('2d');let fitV={s:1,ox:0,oy:0,d:1};
const P={tol:30,holes:true,spk:2,useA:true,showO:true,bg:[255,255,255]};
const maskCache=new Map();
function guessRole(name){const n=name.toLowerCase();for(const r of ROLES)if(n.includes(r))return r;if(/\b(left|right|profile)\b/.test(n))return 'side';return null}
function nextRole(){const used={};for(const sh of sheets)for(const b of sh.boxes)used[b.role]=1;for(const r of ROLES)if(!used[r])return r;return 'part'}
function curSheet(){return sheets[cur]||null}
function curBox(){const s=curSheet();return s&&s.sel>=0?s.boxes[s.sel]:null}

function addImageFile(file){return new Promise((res)=>{
 const url=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{
  const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;
  const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0);
  const px=c.getImageData(0,0,cv.width,cv.height);let hasA=false;const d=px.data;
  for(let i=3;i<d.length;i+=4*97)if(d[i]<250){hasA=true;break}
  const sh={name:file.name||'pasted image',img:im,w:cv.width,h:cv.height,cv,px,hasAlpha:hasA,boxes:[],sel:-1};
  sheets.push(sh);cur=sheets.length-1;
  if(autoBg(sh))syncBgInput();
  maskCache.clear();
  const gr=guessRole(sh.name);autoFind(sh,gr);
  renderTabs();syncRole();drawSheet();res(sh)};
 im.onerror=()=>{log('Could not read '+(file.name||'that image')+' as a picture.',true);res(null)};
 im.src=url})}
async function addFiles(files){for(const f of files){if(f.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name))await addImageFile(f)}
 if(sheets.length)log('Check each box has the right view name, then build. Drag on the sheet to add or change a box.')}

function renderTabs(){const t=$('sheetTabs');t.innerHTML='';sheets.forEach((s,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' · '+(s.name.length>16?s.name.slice(0,15)+'…':s.name);if(i===cur)b.className='on';b.onclick=()=>{cur=i;renderTabs();syncRole();drawSheet()};t.appendChild(b)})}
function syncRole(){const b=curBox();$('role').value=b?b.role:'front';$('role').disabled=!b;
 const pr=$('partRow');if(pr){pr.hidden=!(b&&b.role==='part');if(b&&b.role==='part'){$('partName').value=b.name||'';$('partDepth').value=b.depth||'auto'}}
 if(typeof renderParts==='function')renderParts()}
function allParts(){const o=[];for(const sh of sheets)for(const b of sh.boxes)if(b.role==='part')o.push({sh,b});return o}
function renderParts(){const l=$('partList');if(!l)return;const p=allParts();l.textContent=p.length?('Parts: '+p.map(q=>q.b.name||'unnamed').join(', ')):'No parts yet.'}

/* background colour: median of the sheet's border pixels */
function autoBg(sh){const d=sh.px.data,W=sh.w,H=sh.h,rs=[],gs=[],bs=[];const add=(x,y)=>{const p=(y*W+x)*4;if(d[p+3]>40){rs.push(d[p]);gs.push(d[p+1]);bs.push(d[p+2])}};
 const stepx=Math.max(1,W>>7),stepy=Math.max(1,H>>7);
 for(let x=0;x<W;x+=stepx){add(x,0);add(x,H-1)}for(let y=0;y<H;y+=stepy){add(0,y);add(W-1,y)}
 if(!rs.length)return false;const med=a=>{a.sort((p,q)=>p-q);return a[a.length>>1]};
 P.bg=[med(rs),med(gs),med(bs)];return true}
const hex2=v=>v.toString(16).padStart(2,'0');
function syncBgInput(){$('bgc').value='#'+P.bg.map(hex2).join('')}

/* ---------- outline (mask) of one box ---------- */
function labelMask(m,w,h,minKeep){ /* 4-connected components; returns {lab,count,sizes} */
 const lab=new Int32Array(w*h),sizes=[0],st=new Int32Array(w*h);let n=0;
 for(let s=0;s<w*h;s++){if(!m[s]||lab[s])continue;n++;let sp=0,sz=0;st[sp++]=s;lab[s]=n;
  while(sp){const p=st[--sp];sz++;const x=p%w,y=(p-x)/w;
   if(x>0&&m[p-1]&&!lab[p-1]){lab[p-1]=n;st[sp++]=p-1}
   if(x<w-1&&m[p+1]&&!lab[p+1]){lab[p+1]=n;st[sp++]=p+1}
   if(y>0&&m[p-w]&&!lab[p-w]){lab[p-w]=n;st[sp++]=p-w}
   if(y<h-1&&m[p+w]&&!lab[p+w]){lab[p+w]=n;st[sp++]=p+w}}
  sizes.push(sz)}
 return {lab,count:n,sizes}}
function rawMask(d,W,x0,y0,w,h,o){ /* d = RGBA data of a W-wide image */
 const m=new Uint8Array(w*h),bg=o.bg,t2=o.tol*o.tol,useA=o.useA;
 for(let j=0;j<h;j++){let p=((y0+j)*W+x0)*4,q=j*w;for(let i=0;i<w;i++,p+=4,q++){
  if(useA){m[q]=d[p+3]>40?1:0;continue}
  if(d[p+3]<40){m[q]=0;continue}
  const a=d[p]-bg[0],b=d[p+1]-bg[1],c=d[p+2]-bg[2];m[q]=(a*a+b*b+c*c)>t2?1:0}}
 if(o.holes){ /* background = zeros reachable from the border; the rest becomes figure */
  const reach=new Uint8Array(w*h),st=new Int32Array(w*h);let sp=0;
  const push=p=>{if(!m[p]&&!reach[p]){reach[p]=1;st[sp++]=p}};
  for(let i=0;i<w;i++){push(i);push((h-1)*w+i)}for(let j=0;j<h;j++){push(j*w);push(j*w+w-1)}
  while(sp){const p=st[--sp],x=p%w;if(x>0)push(p-1);if(x<w-1)push(p+1);if(p>=w)push(p-w);if(p<w*(h-1))push(p+w)}
  for(let p=0;p<w*h;p++)if(!reach[p])m[p]=1}
 if(o.spk>0){const L=labelMask(m,w,h);let tot=0,big=0;for(let k=1;k<=L.count;k++){tot+=L.sizes[k];if(L.sizes[k]>L.sizes[big||1])big=k}
  const lim=tot*o.spk/100;for(let p=0;p<w*h;p++){const k=L.lab[p];if(k&&k!==big&&L.sizes[k]<lim)m[p]=0}}
 return m}
function getMask(sh,b){
 const key=b;let r=maskCache.get(key);if(r)return r;
 const x=Math.max(0,Math.round(b.x)),y=Math.max(0,Math.round(b.y)),w=Math.min(sh.w-x,Math.round(b.w)),h=Math.min(sh.h-y,Math.round(b.h));
 const m=rawMask(sh.px.data,sh.w,x,y,w,h,{bg:P.bg,tol:P.tol,useA:P.useA&&sh.hasAlpha,holes:P.holes,spk:P.spk});
 let x0=w,y0=h,x1=-1,y1=-1,n=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(m[j*w+i]){n++;if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j}
 r={x,y,w,h,m,n,bb:n?{x0,y0,x1,y1}:null,ov:null};
 if(n){const oc=document.createElement('canvas');oc.width=w;oc.height=h;const oi=oc.getContext('2d').createImageData(w,h);const c=RCOL[b.role]||'#2dc4ad';
  const cr=parseInt(c.slice(1,3),16),cg=parseInt(c.slice(3,5),16),cb=parseInt(c.slice(5,7),16);
  for(let p=0;p<w*h;p++)if(m[p]){oi.data[p*4]=cr;oi.data[p*4+1]=cg;oi.data[p*4+2]=cb;oi.data[p*4+3]=110}
  oc.getContext('2d').putImageData(oi,0,0);r.ov=oc}
 maskCache.set(key,r);return r}

/* ---------- auto-find the views on a sheet ---------- */
function autoFind(sh,forceRole){
 const mx=480,sc2=Math.min(1,mx/Math.max(sh.w,sh.h)),w=Math.max(8,Math.round(sh.w*sc2)),h=Math.max(8,Math.round(sh.h*sc2));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(sh.cv,0,0,w,h);
 const d=c.getImageData(0,0,w,h).data;
 const m=rawMask(d,w,0,0,w,h,{bg:P.bg,tol:P.tol,useA:P.useA&&sh.hasAlpha,holes:false,spk:0});
 const r=Math.max(2,Math.round(0.025*Math.max(w,h)));
 const dil=new Uint8Array(w*h),tmp=new Uint8Array(w*h);
 for(let j=0;j<h;j++){let run=-1e9;for(let i=0;i<w;i++){if(m[j*w+i])run=i;tmp[j*w+i]=(i-run<=r)?1:0}run=1e9;for(let i=w-1;i>=0;i--){if(m[j*w+i])run=i;if(run-i<=r)tmp[j*w+i]=1}}
 for(let i=0;i<w;i++){let run=-1e9;for(let j=0;j<h;j++){if(tmp[j*w+i])run=j;dil[j*w+i]=(j-run<=r)?1:0}run=1e9;for(let j=h-1;j>=0;j--){if(tmp[j*w+i])run=j;if(run-j<=r)dil[j*w+i]=1}}
 const L=labelMask(dil,w,h),bbs=[];
 for(let k=0;k<L.count;k++)bbs.push({x0:w,y0:h,x1:-1,y1:-1,n:0});
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const p=j*w+i;if(m[p]){const k=L.lab[p]-1,q=bbs[k];q.n++;if(i<q.x0)q.x0=i;if(i>q.x1)q.x1=i;if(j<q.y0)q.y0=j;if(j>q.y1)q.y1=j}}
 let list=bbs.filter(q=>q.n>=0.004*w*h);list.sort((a,b)=>a.x0-b.x0);
 sh.boxes=[];sh.sel=-1;maskCache.clear();
 const used={};for(const o of sheets)if(o!==sh)for(const b of o.boxes)used[b.role]=1;
 list.forEach((q,i)=>{const mg=Math.round(0.01*Math.max(w,h))+1;const x=Math.max(0,q.x0-mg)/sc2,y=Math.max(0,q.y0-mg)/sc2,x2=Math.min(w,q.x1+1+mg)/sc2,y2=Math.min(h,q.y1+1+mg)/sc2;
  let role;if(forceRole&&list.length===1)role=forceRole;else{role=ROLES.find(rr=>!used[rr])||'skip';used[role]=1}
  sh.boxes.push({x,y,w:x2-x,h:y2-y,role})});
 if(sh.boxes.length)sh.sel=0;
 return sh.boxes.length}

/* ---------- sheet canvas ---------- */
let dragBox=null;
function drawSheet(){
 const d=sizeCanvas(sc);sx.setTransform(1,0,0,1,0,0);sx.fillStyle='#0b0f14';sx.fillRect(0,0,sc.width,sc.height);
 const sh=curSheet();
 if(!sh){sx.fillStyle='#5f7186';sx.font=(14*d)+'px system-ui';sx.textAlign='center';sx.fillText('Drop, paste or add your model sheet here',sc.width/2,sc.height/2);$('sheetStat').textContent='';return}
 const W=sc.width,H=sc.height,s=Math.min((W-24*d)/sh.w,(H-70*d)/sh.h);fitV={s,ox:(W-sh.w*s)/2,oy:(H-sh.h*s)/2+18*d,d};
 sx.fillStyle='#1b2430';sx.fillRect(fitV.ox,fitV.oy,sh.w*s,sh.h*s);
 sx.imageSmoothingEnabled=true;sx.drawImage(sh.cv,fitV.ox,fitV.oy,sh.w*s,sh.h*s);
 sh.boxes.forEach((b,i)=>{
  if(P.showO&&b.role!=='skip'&&b.role!=='part'){const mk=getMask(sh,b);if(mk.ov)sx.drawImage(mk.ov,fitV.ox+mk.x*s,fitV.oy+mk.y*s,mk.w*s,mk.h*s)}
  sx.lineWidth=(i===sh.sel?3:1.5)*d;sx.strokeStyle=RCOL[b.role]||'#fff';sx.strokeRect(fitV.ox+b.x*s,fitV.oy+b.y*s,b.w*s,b.h*s);
  sx.font=(12*d)+'px system-ui';sx.textAlign='left';const t=b.role==='skip'?'ignored':b.role==='part'?(b.name||'part'):b.role;const tw=sx.measureText(t).width+8*d;
  sx.fillStyle=RCOL[b.role]||'#fff';sx.fillRect(fitV.ox+b.x*s,fitV.oy+b.y*s-16*d,tw,16*d);sx.fillStyle='#04120f';sx.fillText(t,fitV.ox+b.x*s+4*d,fitV.oy+b.y*s-4*d)});
 if(dragBox){sx.setLineDash([6*d,4*d]);sx.strokeStyle='#fff';sx.lineWidth=1.5*d;
  sx.strokeRect(fitV.ox+dragBox.x*s,fitV.oy+dragBox.y*s,dragBox.w*s,dragBox.h*s);sx.setLineDash([])}
 const b=curBox();let info=sh.name+' · '+sh.w+'×'+sh.h;
 if(b&&b.role!=='skip'){const mk=getMask(sh,b);info+=mk.bb?' · figure '+(mk.bb.x1-mk.bb.x0+1)+'×'+(mk.bb.y1-mk.bb.y0+1)+' px':' · no figure found (adjust background colour / tolerance)'}
 $('sheetStat').textContent=info}
function imgPt(e){const r=sc.getBoundingClientRect(),d=fitV.d;return {x:((e.clientX-r.left)*d-fitV.ox)/fitV.s,y:((e.clientY-r.top)*d-fitV.oy)/fitV.s}}
let down=null;
sc.addEventListener('pointerdown',e=>{const sh=curSheet();if(!sh)return;sc.setPointerCapture(e.pointerId);const p=imgPt(e);down={p,sx:e.clientX,sy:e.clientY,moved:false}});
sc.addEventListener('pointermove',e=>{if(!down)return;const sh=curSheet();const p=imgPt(e);
 if(Math.hypot(e.clientX-down.sx,e.clientY-down.sy)>4)down.moved=true;
 if(down.moved){const x0=clamp(Math.min(down.p.x,p.x),0,sh.w),y0=clamp(Math.min(down.p.y,p.y),0,sh.h),x1=clamp(Math.max(down.p.x,p.x),0,sh.w),y1=clamp(Math.max(down.p.y,p.y),0,sh.h);dragBox={x:x0,y:y0,w:x1-x0,h:y1-y0};drawSheet()}});
sc.addEventListener('pointerup',e=>{const sh=curSheet();if(!down||!sh){down=null;return}
 if(down.moved&&dragBox&&dragBox.w>8&&dragBox.h>8){sh.boxes.push({x:dragBox.x,y:dragBox.y,w:dragBox.w,h:dragBox.h,role:nextRole()});sh.sel=sh.boxes.length-1;syncRole()}
 else if(!down.moved){const p=down.p;let hit=-1;for(let i=sh.boxes.length-1;i>=0;i--){const b=sh.boxes[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){hit=i;break}}sh.sel=hit;syncRole()}
 dragBox=null;down=null;drawSheet()});
window.addEventListener('resize',()=>{drawSheet();needDraw()});

/* ---------- sidebar wiring (sheet + outline panels) ---------- */
$('addImg').onclick=()=>$('fileIn').click();
$('fileIn').onchange=e=>{addFiles([...e.target.files]);e.target.value=''};
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();addFiles([...e.dataTransfer.files])});
window.addEventListener('paste',e=>{const fs=[];for(const it of e.clipboardData.items)if(it.type.startsWith('image/')){const f=it.getAsFile();if(f)fs.push(f)}if(fs.length)addFiles(fs)});
$('autoFind').onclick=()=>{const sh=curSheet();if(!sh)return;const n=autoFind(sh);syncRole();drawSheet();log(n?('Found '+n+' view'+(n>1?'s':'')+'. Check the names, drag a new box for anything missed.'):'No figures found. Try the Auto button for the background colour, or a different tolerance.',!n)};
$('delBox').onclick=()=>{const sh=curSheet();if(sh&&sh.sel>=0){sh.boxes.splice(sh.sel,1);sh.sel=-1;syncRole();drawSheet()}};
$('delSheet').onclick=()=>{if(cur<0)return;sheets.splice(cur,1);cur=sheets.length?Math.min(cur,sheets.length-1):-1;maskCache.clear();renderTabs();syncRole();drawSheet()};
$('role').onchange=()=>{const b=curBox();if(b){b.role=$('role').value;if(b.role==='part'&&!b.name)b.name='part '+(allParts().length);maskCache.delete(b);syncRole();drawSheet()}};
$('partName').oninput=e=>{const b=curBox();if(b){b.name=e.target.value;renderParts();drawSheet()}};
$('partDepth').onchange=e=>{const b=curBox();if(b)b.depth=e.target.value};
$('clearParts').onclick=()=>{for(const sh of sheets){sh.boxes=sh.boxes.filter(b=>b.role!=='part');sh.sel=-1}syncRole();drawSheet();log('Parts cleared.')};
const upd=()=>{maskCache.clear();drawSheet()};
$('bgc').oninput=e=>{const v=e.target.value;P.bg=[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));upd()};
$('bgAuto').onclick=()=>{const sh=curSheet();if(sh&&autoBg(sh)){syncBgInput();upd()}};
$('tol').oninput=e=>{P.tol=+e.target.value;$('tolV').textContent=P.tol;upd()};
$('spk').oninput=e=>{P.spk=+e.target.value;$('spkV').textContent=P.spk;upd()};
$('holes').onchange=e=>{P.holes=e.target.checked;upd()};
$('useA').onchange=e=>{P.useA=e.target.checked;upd()};
$('showO').onchange=e=>{P.showO=e.target.checked;drawSheet()};
function bindRange(id,lab){const el=$(id);if(!el)return;el.addEventListener('input',()=>$(lab).textContent=el.value)}
['tJn:tJnV','tCs:tCsV','tH:tHv','tRes:tResV','tSm:tSmV','tRd:tRdV','tRx:tRxV','aH:aHv','aRes:aResV','aSm:aSmV','aRx:aRxV'].forEach(s=>{const [a,b]=s.split(':');bindRange(a,b)});

/* ---------- 2-D signed distance of a mask ---------- */
function dt1(f,n,d,v,z){let k=0;v[0]=0;z[0]=-1e30;z[1]=1e30;
 for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);
  while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}
  k++;v[k]=q;z[k]=s;z[k+1]=1e30}
 k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;const p=v[k];d[q]=(q-p)*(q-p)+f[p]}}
function edt2(src,w,h){ /* src: 1 where the source is; returns distance (pixels) to the nearest source pixel */
 const INF=1e12,n=Math.max(w,h),f=new Float64Array(n),d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1),out=new Float64Array(w*h);
 for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=src[y*w+x]?0:INF;dt1(f,h,d,v,z);for(let y=0;y<h;y++)out[y*w+x]=d[y]}
 for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=out[y*w+x];dt1(f,w,d,v,z);for(let x=0;x<w;x++)out[y*w+x]=Math.sqrt(d[x])}
 return out}
function makeView(mk){ /* crop to the figure plus a 3 px margin, then signed distance (negative inside) */
 const bb=mk.bb,PAD=3,bw=bb.x1-bb.x0+1,bh=bb.y1-bb.y0+1,w=bw+2*PAD,h=bh+2*PAD,fg=new Uint8Array(w*h),bgm=new Uint8Array(w*h);
 for(let j=0;j<bh;j++)for(let i=0;i<bw;i++)if(mk.m[(bb.y0+j)*mk.w+bb.x0+i])fg[(j+PAD)*w+i+PAD]=1;
 for(let p=0;p<w*h;p++)bgm[p]=fg[p]?0:1;
 const dOut=edt2(fg,w,h),dIn=edt2(bgm,w,h),d=new Float32Array(w*h);
 for(let p=0;p<w*h;p++)d[p]=fg[p]?-(dIn[p]-0.5):(dOut[p]-0.5);
 return {w,h,d,bw,bh,PAD}}
function sampV(S,u,v){const cu=clamp(u,0,S.w-1),cv=clamp(v,0,S.h-1),ex=u-cu,ey=v-cv;
 const i=Math.min(S.w-2,Math.floor(cu)),j=Math.min(S.h-2,Math.floor(cv)),fx=cu-i,fy=cv-j,w=S.w,D=S.d,p=j*w+i;
 let r=(D[p]*(1-fx)+D[p+1]*fx)*(1-fy)+(D[p+w]*(1-fx)+D[p+w+1]*fx)*fy;
 if(ex||ey)r+=Math.sqrt(ex*ex+ey*ey);return r}
