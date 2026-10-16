
/* ================= AI program: mesh readers, service client, remesh ================= */


/* ---------- cut the views out of the sheet, ready to send ---------- */
function cropBlob(sh,mk,mArr,bb){return new Promise(res=>{
 const bw=bb.x1-bb.x0+1,bh=bb.y1-bb.y0+1,side0=Math.max(bw,bh),side=Math.round(side0*1.16),sc2=Math.min(1,1024/side),S=Math.max(16,Math.round(side*sc2));
 const src=document.createElement('canvas');src.width=bw;src.height=bh;const sctx=src.getContext('2d');
 const id=sctx.createImageData(bw,bh),d=sh.px.data,alpha=$('aiAlpha').checked;
 for(let j=0;j<bh;j++)for(let i=0;i<bw;i++){const mp=(bb.y0+j)*mk.w+bb.x0+i,sp=((mk.y+bb.y0+j)*sh.w+mk.x+bb.x0+i)*4,q=(j*bw+i)*4;
  id.data[q]=d[sp];id.data[q+1]=d[sp+1];id.data[q+2]=d[sp+2];id.data[q+3]=alpha?(mArr[mp]?255:0):255}
 sctx.putImageData(id,0,0);
 const cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
 if(!alpha){c.fillStyle='rgb('+P.bg.join(',')+')';c.fillRect(0,0,S,S)}
 c.imageSmoothingQuality='high';const k=S/side;c.drawImage(src,(S-bw*k)/2,(S-bh*k)/2,bw*k,bh*k);
 cv.toBlob(bl=>res(bl),'image/png')})}
function viewBlob(sh,b){const mk=getMask(sh,b);if(!mk.bb)return Promise.resolve(null);return cropBlob(sh,mk,mk.m,mk.bb)}
async function collectViews(){
 const views={};for(const sh of sheets)for(const b of sh.boxes)if(b.role!=='skip'&&!views[b.role])views[b.role]={sh,b};
 const out={};for(const r of ROLES)if(views[r]){const bl=await viewBlob(views[r].sh,views[r].b);if(bl)out[r]=bl}
 return out}

/* ---------- talking to the service ---------- */
const sleep=(ms,job)=>new Promise((res,rej)=>{const t=setTimeout(()=>{if(job&&job.cancelled)rej(new Error('cancelled'));else res()},ms);if(job)job.wake=()=>{clearTimeout(t);rej(new Error('cancelled'))}});
function xhr(job,method,url,key,body,cb){return new Promise((res,rej)=>{
 const x=new XMLHttpRequest();job.abort=()=>x.abort();x.open(method,url);x.responseType='arraybuffer';
 if(key)x.setRequestHeader('Authorization','Bearer '+key);
 if(cb&&cb.up&&x.upload){x.upload.onprogress=e=>{if(e.lengthComputable)cb.up(e.loaded/e.total)};x.upload.onload=()=>cb.up(1,true)}
 if(cb&&cb.down)x.onprogress=e=>cb.down(e.loaded,e.lengthComputable?e.total:0);
 x.onload=()=>res({status:x.status,buf:x.response,type:(x.getResponseHeader('content-type')||'').toLowerCase()});
 x.onerror=()=>rej(new Error('Could not reach the AI service at '+url+'.\nNothing is answering at that address. This program does not make 3D shapes by itself: it needs an image-to-3D service running (see README, "Plugging in an AI service"). To try the program without one, set the endpoint to demo:// (a placeholder figure that ignores your pictures).\nIf you do have a service, check that it is running and the address is right. If this page was opened from a web link, the browser may block calls to your own computer; use the downloaded program or HTML file instead.'));
 x.ontimeout=()=>rej(new Error('The AI service did not answer in time.'));
 x.onabort=()=>rej(new Error('cancelled'));
 x.send(body||null)})}
const asText=buf=>new TextDecoder().decode(buf);
function looksJson(r){return r.type.includes('json')||(r.buf.byteLength&&new Uint8Array(r.buf)[0]===123)}
function httpFail(r){return new Error('The AI service answered '+r.status+(r.buf&&r.buf.byteLength?': '+asText(r.buf).slice(0,300):''))}
const DONE=['done','succeeded','success','complete','completed','finished','ready'],FAIL=['failed','error','errored','cancelled','canceled'];

/* built-in demo "service": no AI at all. It ignores the pictures and answers with a made-up figure (or, for a part request, one ellipsoid) so the whole pipe can be tried with nothing installed. */
function demoMesh(part){
 const V=[],T=[],ell=(c,r)=>{const nu=24,nv=16,o=V.length/3;
  for(let j=0;j<=nv;j++){const th=Math.PI*j/nv;for(let i=0;i<nu;i++){const ph=2*Math.PI*i/nu;V.push(c[0]+r[0]*Math.sin(th)*Math.cos(ph),c[1]+r[1]*Math.cos(th),c[2]+r[2]*Math.sin(th)*Math.sin(ph))}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*nu+i,b=j*nu+(i+1)%nu,c2=(j+1)*nu+i,d=(j+1)*nu+(i+1)%nu;if(j>0)T.push(a+o,c2+o,b+o);if(j<nv-1)T.push(b+o,c2+o,d+o)}};
 if(part)ell([0,0,0],[.5,.5,.5]);
 else[[[0,1.55,0],[.45,.62,.3]],[[0,2.45,0],[.3,.32,.3]],[[-.62,1.55,0],[.14,.55,.14]],[[.62,1.55,0],[.14,.55,.14]],[[-.22,.55,0],[.17,.55,.19]],[[.22,.55,0],[.17,.55,.19]]].forEach(q=>ell(q[0],q[1]));
 let s='';for(let i=0;i<V.length;i+=3)s+='v '+V[i].toFixed(5)+' '+V[i+1].toFixed(5)+' '+V[i+2].toFixed(5)+'\n';
 for(let i=0;i<T.length;i+=3)s+='f '+(T[i]+1)+' '+(T[i+1]+1)+' '+(T[i+2]+1)+'\n';
 return new TextEncoder().encode(s).buffer}
async function generateMesh(job,views,H,opt){
 opt=opt||{};const p0=opt.p0||0,p1=opt.p1===undefined?0.8:opt.p1,pre=opt.label?opt.label+': ':'';
 const mp=f=>p0+(p1-p0)*(f/0.8),SS=(f,l)=>Status.set(mp(f),pre+l),WF=(a,b,l)=>Status.waitFor(mp(a),mp(b),pre+l);
 const url=$('aiUrl').value.trim(),key=$('aiKey').value.trim();
 if(/^demo:/i.test(url)){const isPart=!!(opt.fields&&opt.fields.part),names=['Reading the views','Sculpting','Texturing','Finishing'];
  for(let i=0;i<4;i++){SS(0.1+0.14*i,'Demo service (no AI, placeholder shape): '+names[i]);await sleep(isPart?120:350,job)}
  SS(0.8,'Reading the model');return demoMesh(isPart)}
 if(!/^https?:\/\//i.test(url))throw new Error('The endpoint must start with http:// or https:// (or demo:// for the built-in placeholder).');
 const fd=new FormData();const roles=Object.keys(views);
 roles.forEach(r=>fd.append(r,views[r],r+'.png'));
 const best=views.front||views[roles[0]];fd.append('image',best,'image.png');
 fd.append('views',JSON.stringify(roles));fd.append('height',String(H));if(opt.fields)for(const k in opt.fields)fd.append(k,opt.fields[k]);
 const mb=roles.reduce((a,r)=>a+views[r].size,0)/1048576;
 SS(0.01,'Uploading '+roles.length+' view'+(roles.length>1?'s':'')+' ('+mb.toFixed(1)+' MB)');
 let r=await xhr(job,'POST',url,key,fd,{up:(f,done)=>{if(done){WF(0.1,0.68,'Waiting for the AI service to build the model')}else SS(0.01+0.09*f,'Uploading views ('+Math.round(f*100)+'%)')}});
 if(r.status>=400)throw httpFail(r);
 if(looksJson(r)){
  let j;try{j=JSON.parse(asText(r.buf))}catch(e){throw new Error('The service sent JSON that could not be read.')}
  if(j.error)throw new Error('The AI service reported: '+(j.error.message||j.error));
  const resUrl=j.result_url||j.model_url||j.url||j.download_url;
  const statusUrl=j.status_url||(j.job_id||j.id?new URL('jobs/'+(j.job_id||j.id),url).href:null);
  let finalUrl=null;
  if(resUrl&&(!j.status||DONE.includes(String(j.status).toLowerCase())))finalUrl=new URL(resUrl,url).href;
  else if(statusUrl){
   const su=new URL(statusUrl,url).href,t0=performance.now();let p=0;
   for(;;){await sleep(1000,job);if(performance.now()-t0>20*60*1000)throw new Error('The AI service took longer than 20 minutes.');
    const s=await xhr(job,'GET',su,key,null);if(s.status>=400)throw httpFail(s);
    let q;try{q=JSON.parse(asText(s.buf))}catch(e){throw new Error('The status reply could not be read.')}
    const st=String(q.status||q.state||'').toLowerCase();
    if(FAIL.includes(st))throw new Error('The AI service failed: '+(q.error&&(q.error.message||q.error)||q.message||st));
    let pr=q.progress;if(typeof pr==='string')pr=parseFloat(pr);if(typeof pr==='number'&&pr>1)pr/=100;
    const msg=q.message||q.stage||(st?st.charAt(0).toUpperCase()+st.slice(1):'Working');
    if(typeof pr==='number'&&isFinite(pr)){p=Math.max(p,clamp(pr,0,1));SS(0.1+0.58*p,'AI service: '+msg+' ('+Math.round(p*100)+'%)')}
    else WF(0.1,0.68,'AI service: '+msg);
    if(DONE.includes(st)){const ru=q.result_url||q.model_url||q.url||q.download_url||(statusUrl.replace(/\/$/,'')+'/result');finalUrl=new URL(ru,su).href;break}}}
  else throw new Error('The service sent JSON with no model and no job to follow: '+asText(r.buf).slice(0,200));
  SS(0.7,'Downloading the model');
  r=await xhr(job,'GET',finalUrl,key,null,{down:(l,t)=>{if(t)SS(0.7+0.1*l/t,'Downloading the model ('+(l/1048576).toFixed(1)+' of '+(t/1048576).toFixed(1)+' MB)');else Status.label(pre+'Downloading the model ('+(l/1048576).toFixed(1)+' MB)')}});
  if(r.status>=400)throw httpFail(r)}
 SS(0.8,'Reading the model');
 return r.buf}

/* ---------- parts: cut every part out of every view, with its place in the model ---------- */
function rectCrop(sh,mk,i0,i1,r0,r1){ /* keep only the mask inside a rectangle (mask coordinates) */
 i0=clamp(Math.floor(i0),0,mk.w-1);i1=clamp(Math.ceil(i1),0,mk.w-1);r0=clamp(Math.floor(r0),0,mk.h-1);r1=clamp(Math.ceil(r1),0,mk.h-1);
 const m=new Uint8Array(mk.w*mk.h);let n=0,a0=1e9,a1=-1,c0=1e9,c1=-1;
 for(let y=r0;y<=r1;y++)for(let x=i0;x<=i1;x++)if(mk.m[y*mk.w+x]){m[y*mk.w+x]=1;n++;if(x<a0)a0=x;if(x>a1)a1=x;if(y<c0)c0=y;if(y>c1)c1=y}
 if(n<30)return Promise.resolve(null);
 return cropBlob(sh,mk,m,{x0:a0,y0:c0,x1:a1,y1:c1})}
async function collectPartJobs(H){
 const V={};for(const sh of sheets)for(const b of sh.boxes)if(b.role!=='skip'&&b.role!=='part'&&!V[b.role])V[b.role]={sh,b,mk:getMask(sh,b)};
 const fr=V.front;if(!fr||!fr.mk.bb)return[];
 const mkF=fr.mk,bbF=mkF.bb,bwF=bbF.x1-bbF.x0+1,bhF=bbF.y1-bbF.y0+1,sf=H/bhF;
 const side=V.side&&V.side.mk.bb?V.side:null,back=V.back&&V.back.mk.bb?V.back:null;
 const sS=side?H/(side.mk.bb.y1-side.mk.bb.y0+1):0,sB=back?H/(back.mk.bb.y1-back.mk.bb.y0+1):0;
 const sideSign=$('sideDir')&&$('sideDir').value==='1'?1:-1;
 const out=[];
 for(const q of allParts()){ if(q.sh!==fr.sh)continue;const b=q.b;
  const x0=clamp(Math.round(b.x-mkF.x),0,mkF.w),x1=clamp(Math.round(b.x+b.w-mkF.x),0,mkF.w),y0=clamp(Math.round(b.y-mkF.y),0,mkF.h),y1=clamp(Math.round(b.y+b.h-mkF.y),0,mkF.h);
  const m=new Uint8Array(mkF.w*mkF.h);let n=0,a0=1e9,a1=-1,c0=1e9,c1=-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(mkF.m[y*mkF.w+x]){m[y*mkF.w+x]=1;n++;if(x<a0)a0=x;if(x>a1)a1=x;if(y<c0)c0=y;if(y>c1)c1=y}
  if(n<40)continue;
  const views={},fb=await cropBlob(fr.sh,mkF,m,{x0:a0,y0:c0,x1:a1,y1:c1});if(!fb)continue;views.front=fb;
  const bx0=(a0-bbF.x0-(bwF-1)/2-1)*sf,bx1=(a1+1-bbF.x0-(bwF-1)/2)*sf,by0=(bbF.y0+bhF-1-c1-1)*sf,by1=(bbF.y0+bhF-1-c0+1)*sf;
  let bz0=-(bx1-bx0)/2,bz1=(bx1-bx0)/2;
  if(side){const sm=side.mk,sb=sm.bb,sbh=sb.y1-sb.y0+1,sbw=sb.x1-sb.x0+1;
   const rowOf=y=>sb.y0+(sbh-1)-y/sS,r0=rowOf(by1),r1=rowOf(by0);
   let l=1e9,r=-1;for(let y=clamp(Math.floor(r0),0,sm.h-1);y<=clamp(Math.ceil(r1),0,sm.h-1);y++)for(let x=sb.x0;x<=sb.x1;x++)if(sm.m[y*sm.w+x]){if(x<l)l=x;if(x>r)r=x}
   if(r>=0){const za=(l-sb.x0-(sbw-1)/2)*sS*sideSign,zb=(r+1-sb.x0-(sbw-1)/2)*sS*sideSign;bz0=Math.min(za,zb);bz1=Math.max(za,zb)}
   const sbl=await rectCrop(side.sh,sm,sb.x0,sb.x1,r0,r1);if(sbl)views.side=sbl}
  if(back){const bm=back.mk,bb=bm.bb,bbw=bb.x1-bb.x0+1,bbh=bb.y1-bb.y0+1;
   const colOf=x=>bb.x0+(bbw-1)/2-x/sB,rowOf=y=>bb.y0+(bbh-1)-y/sB;
   const bl=await rectCrop(back.sh,bm,colOf(bx1),colOf(bx0),rowOf(by1),rowOf(by0));if(bl)views.back=bl}
  out.push({name:b.name||'part',views,box:[bx0,by0,bz0,bx1,by1,bz1]});await Promise.resolve()}
 return out}
/* stretch a returned part so its bounding box matches the place it should take in the model */
function fitToBox(M,box){
 const V=M.V,n=V.length/3;let lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
 for(let i=0;i<n;i++)for(let c=0;c<3;c++){const v=V[i*3+c];if(v<lo[c])lo[c]=v;if(v>hi[c])hi[c]=v}
 const o=new Float32Array(V.length);
 for(let i=0;i<n;i++)for(let c=0;c<3;c++){const t=(V[i*3+c]-lo[c])/Math.max(1e-9,hi[c]-lo[c]);o[i*3+c]=box[c]+t*(box[c+3]-box[c])}
 return{V:o,T:M.T}}
function mergeMeshes(list){let nv=0,nt=0;for(const M of list){nv+=M.V.length;nt+=M.T.length}
 const V=new Float32Array(nv),T=new Uint32Array(nt);let vo=0,to=0;
 for(const M of list){V.set(M.V,vo);const base=vo/3;for(let i=0;i<M.T.length;i++)T[to+i]=M.T[i]+base;vo+=M.V.length;to+=M.T.length}
 return{V,T}}

/* ---------- buttons ---------- */
async function generateByParts(job){
 const H=+$('aH').value,o=remeshOpts(),jobs=await collectPartJobs(H);
 if(!jobs.length)throw new Error('No part boxes were found on the front view. Draw a box around each part, or use "Auto-split", and make sure a front view box exists too.');
 await stepCheck(job);const list=[],n=jobs.length;
 for(let i=0;i<n;i++){const pj=jobs[i],lab='Part '+(i+1)+' of '+n+': '+pj.name;
  log('Sending '+lab+' ('+Object.keys(pj.views).join(', ')+')…');
  const buf=await generateMesh(job,pj.views,H,{p0:0.8*i/n,p1:0.8*(i+1)/n,label:lab,
   fields:{part:pj.name,bbox:JSON.stringify(pj.box.map(v=>+v.toFixed(4))),parts_total:String(n),part_index:String(i)}});
  const M=parseMesh(buf);await stepCheck(job);
  const O=orientMesh(M,o.up,o.rot,1);list.push(fitToBox(O,pj.box))}
 const merged=mergeMeshes(list);setMesh('raw',merged);$('goRemesh').disabled=false;
 log('Joined '+n+' parts into '+(merged.T.length/3).toLocaleString()+' triangles. Remeshing to quads…');
 SRC=merged;SRCPRE=true;const st=await runRemesh(job,0.82,1);
 Status.done('Done: '+st.m.toLocaleString()+' quads from '+n+' parts · '+((performance.now()-Status.t0)/1000).toFixed(1)+' s');
 log('Done. The parts are joined into one model.')}
$('goAi').onclick=()=>guarded('Preparing the views',async job=>{
 if($('aiParts')&&$('aiParts').checked&&allParts().length){await generateByParts(job);return}
 const views=await collectViews();
 if(!views.front&&!Object.keys(views).length)throw new Error('Add a model sheet and name at least one view (front is best).');
 await stepCheck(job);
 const buf=await generateMesh(job,views,+$('aH').value);
 const M=parseMesh(buf);await stepCheck(job);
 SRC=M;SRCPRE=false;setMesh('raw',M);$('goRemesh').disabled=false;
 log('The AI service returned '+(M.T.length/3).toLocaleString()+' triangles. Remeshing to quads…');
 const st=await runRemesh(job,0.82,1);
 Status.done('Done: '+st.m.toLocaleString()+' quads · '+((performance.now()-Status.t0)/1000).toFixed(1)+' s');
 log('Done. Use "Remesh to quads" to try other settings on the same AI mesh.')});
$('aiTest').onclick=async()=>{
 const url=$('aiUrl').value.trim();if(/^demo:/i.test(url)){log('demo:// is the built-in placeholder; there is nothing to connect to. It ignores your pictures and returns a made-up figure.');return}
 if(!/^https?:\/\//i.test(url)){log('The endpoint must start with http:// or https://',true);return}
 const job=newJob();Status.start('Testing the connection',()=>{job.cancelled=true;if(job.abort)job.abort()});Status.set(null);
 try{const h=new URL('health',url).href;let r=await xhr(job,'GET',h,$('aiKey').value.trim(),null);let info='';
  try{const j=JSON.parse(asText(r.buf));info=j.name?(' · '+j.name+(j.version?' '+j.version:'')):''}catch(e){}
  if(r.status<400){Status.done('Connected'+info);log('The AI service answered at '+h+info)}
  else{Status.done('Reachable');log('Something answered at '+h+' (status '+r.status+'). That is enough to know the address works; the real test is "Generate".')}}
 catch(e){if(e.message==='cancelled'){Status.idle('Cancelled')}else{Status.fail('Not reachable');log(e.message,true)}}
 finally{JOB=null}};

