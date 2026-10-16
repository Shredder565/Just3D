
/* ---------- grid field -> quad mesh (naive surface nets) ---------- */
function blurField(F,nx,ny,nz,passes){
 const T=new Float32Array(F.length);
 for(let p=0;p<passes;p++){
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const o=(k*ny+j)*nx;for(let i=0;i<nx;i++){const a=F[o+Math.max(0,i-1)],b=F[o+i],c=F[o+Math.min(nx-1,i+1)];T[o+i]=(a+b+c)/3}}
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=T[(k*ny+Math.max(0,j-1))*nx+i],b=T[(k*ny+j)*nx+i],c=T[(k*ny+Math.min(ny-1,j+1))*nx+i];F[(k*ny+j)*nx+i]=(a+b+c)/3}
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=F[(Math.max(0,k-1)*ny+j)*nx+i],b=F[(k*ny+j)*nx+i],c=F[(Math.min(nz-1,k+1)*ny+j)*nx+i];T[(k*ny+j)*nx+i]=(a+b+c)/3}
  F.set(T)}}
const CORN=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
const CEDGE=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
function surfaceNets(F,nx,ny,nz,h,ox,oy,oz){
 const cx=nx-1,cy=ny-1,cz=nz-1,cid=new Int32Array(cx*cy*cz).fill(-1),verts=[];
 const N=(i,j,k)=>i+nx*(j+ny*k),v8=new Float32Array(8);
 for(let k=0;k<cz;k++)for(let j=0;j<cy;j++)for(let i=0;i<cx;i++){
  let mask=0;for(let c=0;c<8;c++){const q=CORN[c],f=F[N(i+q[0],j+q[1],k+q[2])];v8[c]=f;if(f<0)mask|=1<<c}
  if(mask===0||mask===255)continue;
  let sx_=0,sy=0,sz=0,n=0;
  for(let e=0;e<12;e++){const a=CEDGE[e][0],b=CEDGE[e][1];if(((mask>>a)&1)===((mask>>b)&1))continue;
   const t=v8[a]/(v8[a]-v8[b]),pa=CORN[a],pb=CORN[b];sx_+=pa[0]+(pb[0]-pa[0])*t;sy+=pa[1]+(pb[1]-pa[1])*t;sz+=pa[2]+(pb[2]-pa[2])*t;n++}
  cid[(k*cy+j)*cx+i]=verts.length/3;
  verts.push(ox+(i+sx_/n)*h,oy+(j+sy/n)*h,oz+(k+sz/n)*h)}
 const quads=[],C=(i,j,k)=>cid[(k*cy+j)*cx+i];
 const emit=(a,b,c,d,ax,flip)=>{ /* outward = +axis when the start node is inside */
  const V=verts;const p=(q)=>[V[q*3],V[q*3+1],V[q*3+2]];
  const A=p(a),B=p(b),Cc=p(c),D=p(d);
  const d1=[Cc[0]-A[0],Cc[1]-A[1],Cc[2]-A[2]],d2=[D[0]-B[0],D[1]-B[1],D[2]-B[2]];
  const nrm=[d1[1]*d2[2]-d1[2]*d2[1],d1[2]*d2[0]-d1[0]*d2[2],d1[0]*d2[1]-d1[1]*d2[0]];
  const out=flip?-1:1;
  if(nrm[ax]*out>=0)quads.push(a,b,c,d);else quads.push(a,d,c,b)};
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const f0=F[N(i,j,k)]<0;
  if(i<nx-1&&j>0&&k>0&&j<ny-1&&k<nz-1){const f1=F[N(i+1,j,k)]<0;if(f0!==f1){ /* x edge: cells (i,j-1..j,k-1..k) */
   const a=C(i,j-1,k-1),b=C(i,j,k-1),c=C(i,j,k),d=C(i,j-1,k);if(a>=0&&b>=0&&c>=0&&d>=0)emit(a,b,c,d,0,!f0)}}
  if(j<ny-1&&i>0&&k>0&&i<nx-1&&k<nz-1){const f1=F[N(i,j+1,k)]<0;if(f0!==f1){
   const a=C(i-1,j,k-1),b=C(i,j,k-1),c=C(i,j,k),d=C(i-1,j,k);if(a>=0&&b>=0&&c>=0&&d>=0)emit(a,b,c,d,1,!f0)}}
  if(k<nz-1&&i>0&&j>0&&i<nx-1&&j<ny-1){const f1=F[N(i,j,k+1)]<0;if(f0!==f1){
   const a=C(i-1,j-1,k),b=C(i,j-1,k),c=C(i,j,k),d=C(i-1,j,k);if(a>=0&&b>=0&&c>=0&&d>=0)emit(a,b,c,d,2,!f0)}}}
 return {V:new Float32Array(verts),Q:new Int32Array(quads)}}
function relaxQuads(M,passes){
 const n=M.V.length/3,m=M.Q.length/4;if(!passes||!m)return;
 const deg=new Int32Array(n+1);for(let q=0;q<m;q++)for(let c=0;c<4;c++)deg[M.Q[q*4+c]+1]+=2;
 for(let i=0;i<n;i++)deg[i+1]+=deg[i];
 const adj=new Int32Array(deg[n]),fill=new Int32Array(n);
 for(let q=0;q<m;q++)for(let c=0;c<4;c++){const a=M.Q[q*4+c],b=M.Q[q*4+(c+1)%4];adj[deg[a]+fill[a]++]=b;adj[deg[b]+fill[b]++]=a}
 const V=M.V,T=new Float32Array(V.length);
 const step=(lam)=>{for(let i=0;i<n;i++){const s=deg[i],e=deg[i+1];if(e===s){T[i*3]=V[i*3];T[i*3+1]=V[i*3+1];T[i*3+2]=V[i*3+2];continue}
  let ax=0,ay=0,az=0;for(let t=s;t<e;t++){const b=adj[t];ax+=V[b*3];ay+=V[b*3+1];az+=V[b*3+2]}const c=e-s;
  T[i*3]=V[i*3]+lam*(ax/c-V[i*3]);T[i*3+1]=V[i*3+1]+lam*(ay/c-V[i*3+1]);T[i*3+2]=V[i*3+2]+lam*(az/c-V[i*3+2])}V.set(T)};
 for(let p=0;p<passes;p++){step(0.5);step(-0.53)}}
function meshStats(M){const n=M.V.length/3,m=M.Q.length/4;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
 for(let i=0;i<n;i++){const x=M.V[i*3],y=M.V[i*3+1],z=M.V[i*3+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z}
 return {n,m,x0,x1,y0,y1,z0,z1}}
function smax(a,b,k){if(k<=0)return Math.max(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*0.25}

/* cut thin pieces off a part's front outline: what an opening (erode then dilate) with radius r removes. Each piece comes back with a strip of the
   body it hangs from, so its tube does not pinch to nothing where it joins. Returns {body, pieces:[mask...]} */
function splitThin(m,w,h,r,minA){
 const bg=new Uint8Array(w*h);for(let p=0;p<w*h;p++)bg[p]=m[p]?0:1;
 const dIn=edt2(bg,w,h),core=new Uint8Array(w*h);let nc=0;for(let p=0;p<w*h;p++)if(m[p]&&dIn[p]>=r){core[p]=1;nc++}
 if(!nc)return{body:m,pieces:[]};
 const dC=edt2(core,w,h),thin=new Uint8Array(w*h);let nt=0;for(let p=0;p<w*h;p++)if(m[p]&&dC[p]>r+0.75){thin[p]=1;nt++}
 if(!nt)return{body:m,pieces:[]};
 const comps=maskComponents(thin,w,h,minA),body=Uint8Array.from(m),pieces=[];
 for(const c of comps){ /* a piece must be long, not a sliver shaved off a corner */
  let a0=1e9,a1=-1,c0=1e9,c1=-1;for(const p of c){const x=p%w,y=(p-x)/w;if(x<a0)a0=x;if(x>a1)a1=x;if(y<c0)c0=y;if(y>c1)c1=y}
  const len=Math.max(a1-a0,c1-c0)+1;if(len<1.3*r)continue;
  const inC=new Uint8Array(w*h);for(const p of c)inC[p]=1;
  if(!sticksOut(c,inC,m,w,h,len))continue; /* a strip along the side, or a stray bit of another part: leave it where it is */
  const pm=new Uint8Array(w*h);for(const p of c){pm[p]=1;body[p]=0}
  const dP=edt2(pm,w,h);for(let p=0;p<w*h;p++)if(m[p]&&!pm[p]&&dP[p]<=r)pm[p]=1;
  pieces.push(pm)}
 return{body,pieces}}
/* does this piece stick out of the body (a tail, an ear, a hanging arm) rather than run along it (a strip of the side)?
   It sticks out when it reaches away from the rest of the outline by at least 1.5 times its own thickness. */
function sticksOut(c,inC,m,w,h,len){
 const rest=new Uint8Array(w*h);let any=0;for(let p=0;p<w*h;p++)if(m[p]&&!inC[p]){rest[p]=1;any=1}if(!any)return false;
 const dR=edt2(rest,w,h);let reach=0,touch=false;for(const p of c){if(dR[p]>reach)reach=dR[p];if(dR[p]<1.5)touch=true}
 if(!touch)return false; /* not joined to the body at all: a stray bit of another part */
 const bg=new Uint8Array(w*h);for(let p=0;p<w*h;p++)bg[p]=inC[p]?0:1;const d=edt2(bg,w,h);let R=0;for(const p of c)if(d[p]>R)R=d[p];
 return reach>=1.5*2*R}
function maskComponents(mk,w,h,minA){const seen=new Uint8Array(w*h),out=[];
 for(let s=0;s<w*h;s++){if(!mk[s]||seen[s])continue;const st=[s],c=[];seen[s]=1;
  while(st.length){const p=st.pop();c.push(p);const x=p%w,y=(p-x)/w;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const q=Y*w+X;if(mk[q]&&!seen[q]){seen[q]=1;st.push(q)}}}
  if(c.length>=minA)out.push(c)}
 return out}
/* turns the part boxes into things the solid builder can use: a cut-out silhouette per part, its 3-D box, and for round parts the tube radius.
   Thin pieces inside a body part (a headband tail, an ear, a hanging arm) and bits of the outline that no box covers are built as extra round parts. */
async function prepParts(job,S,views,sf,sS,sideSign){
 const out=[],fr=views.front;out.notes=[];if(!fr)return out;
 const mkF=S.front.mk,bbF=mkF.bb,bwF=S.front.bw,bhF=S.front.bh,W=mkF.w,Hh=mkF.h;
 const list=[];for(const sh of sheets)if(sh===fr.sh)for(const b of sh.boxes)if(b.role==='part')list.push(b);
 const thinOn=!$('tThin')||$('tThin').checked,covered=new Uint8Array(W*Hh),minA=Math.max(30,Math.round(mkF.n*0.0015));
 const partFromMask=(name,m,mode)=>{let n=0,a0=1e9,a1=-1,c0=1e9,c1=-1;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++)if(m[y*W+x]){n++;if(x<a0)a0=x;if(x>a1)a1=x;if(y<c0)c0=y;if(y>c1)c1=y}
  if(n<40)return null;
  const bb={x0:a0,y0:c0,x1:a1,y1:c1},v=makeView({bb,m,w:mkF.w,h:mkF.h});
   let R=0;for(let i=0;i<v.d.length;i++)if(-v.d[i]>R)R=-v.d[i];
   /* where the body is in depth at the part's rows, so a round arm sits in the middle of the shoulder rather than at the figure's centre */
   let zc=0;
   if(mode==='round'&&S.side){const sm=S.side.mk,sb=sm.bb;let sum=0,cnt=0;
    for(let my=c0;my<=c1;my+=2){const yy=(bbF.y0+bhF-1-my)*sf,r=Math.round(sb.y0+(S.side.bh-1)-yy/sS);if(r<sb.y0||r>sb.y1)continue;
     let l=1e9,rr=-1;for(let i=sb.x0;i<=sb.x1;i++)if(sm.m[r*sm.w+i]){if(i<l)l=i;if(i>rr)rr=i}
     if(rr>=0){sum+=((l+rr)/2-sb.x0-(S.side.bw-1)/2)*sS*sideSign;cnt++}}
    if(cnt)zc=sum/cnt}
   /* per-row middle and half-width in the front mask and in the side view, for the oval cross-section */
   let rows=null;
   if(mode==='side'&&S.side){const sm=S.side.mk,sb=sm.bb,nr=c1-c0+1;rows={c0,xc:new Float32Array(nr),hx:new Float32Array(nr),zc:new Float32Array(nr),hz:new Float32Array(nr)};
    for(let my=c0;my<=c1;my++){const q=my-c0;let l=1e9,r=-1;for(let x=a0;x<=a1;x++)if(m[my*mkF.w+x]){if(x<l)l=x;if(x>r)r=x}
     if(r>=0){rows.xc[q]=((l+r)/2-bbF.x0-(bwF-1)/2)*sf;rows.hx[q]=(r-l+1)/2*sf}
     const yy=(bbF.y0+bhF-1-my)*sf,rr=Math.round(sb.y0+(S.side.bh-1)-yy/sS);
     if(rr>=sb.y0&&rr<=sb.y1){let ls=1e9,rs=-1;for(let i=sb.x0;i<=sb.x1;i++)if(sm.m[rr*sm.w+i]){if(i<ls)ls=i;if(i>rs)rs=i}
      if(rs>=0){rows.zc[q]=((ls+rs)/2-sb.x0-(S.side.bw-1)/2)*sS*sideSign;rows.hz[q]=(rs-ls+1)/2*sS}}}}
   out.push({name,round:mode==='round',R,v,bb,bbF,zc,rows,
    x0:(a0-bbF.x0-(bwF-1)/2-1)*sf,x1:(a1+1-bbF.x0-(bwF-1)/2)*sf,y0:(bbF.y0+bhF-1-c1-1)*sf,y1:(bbF.y0+bhF-1-c0+1)*sf});
  return out[out.length-1]};
 const owner=new Int16Array(W*Hh).fill(-1),boxM=[];
 list.forEach((b,bi)=>{const x0=clamp(Math.round(b.x-mkF.x),0,W),x1=clamp(Math.round(b.x+b.w-mkF.x),0,W),y0=clamp(Math.round(b.y-mkF.y),0,Hh),y1=clamp(Math.round(b.y+b.h-mkF.y),0,Hh);
  const m=new Uint8Array(W*Hh);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){covered[y*W+x]=1;if(mkF.m[y*W+x]){m[y*W+x]=1;if(owner[y*W+x]<0)owner[y*W+x]=bi}}boxM.push(m)});
 /* the outline outside every part box: a strip along a part joins that part; a piece that sticks out becomes its own round tube */
 const tubes=[];
 if(thinOn&&list.length){const left=new Uint8Array(W*Hh);let nl=0;for(let p=0;p<W*Hh;p++)if(mkF.m[p]&&!covered[p]){left[p]=1;nl++}
  if(nl)for(const c of maskComponents(left,W,Hh,minA)){let a0=1e9,a1=-1,c0=1e9,c1=-1;for(const p of c){const x=p%W,y=(p-x)/W;if(x<a0)a0=x;if(x>a1)a1=x;if(y<c0)c0=y;if(y>c1)c1=y}
   const inC=new Uint8Array(W*Hh);for(const p of c)inC[p]=1;
   if(sticksOut(c,inC,mkF.m,W,Hh,Math.max(a1-a0,c1-c0)+1))tubes.push(c);
   else{const votes=new Map();for(const p of c){const x=p%W,y=(p-x)/W;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=Hh)continue;const o=owner[Y*W+X];if(o>=0)votes.set(o,(votes.get(o)||0)+1)}}
    let bo=-1,bv=0;for(const [o,v] of votes)if(v>bv){bv=v;bo=o}
    if(bo>=0){for(const p of c)boxM[bo][p]=1;out.notes.merged=(out.notes.merged||0)+1}}}}
 for(let bi=0;bi<list.length;bi++){const b=list[bi],m=boxM[bi];let n=0;for(let p=0;p<W*Hh;p++)if(m[p])n++;
  if(n<40)continue;
  const name=b.name||'part';let mode=b.depth||'auto';
  if(mode==='auto')mode=/arm|hand|finger|tail|ear|horn|wing|antenna|rope|cable|hair/i.test(name)?'round':'side';
  if(mode==='side'&&!S.side&&!S.top)mode='round';
  let body=m;
  if(thinOn&&mode==='side'){let R=0;{const bg=new Uint8Array(W*Hh);for(let p=0;p<W*Hh;p++)bg[p]=m[p]?0:1;const d=edt2(bg,W,Hh);for(let p=0;p<W*Hh;p++)if(m[p]&&d[p]>R)R=d[p]}
   const sp=splitThin(m,W,Hh,Math.max(3,0.4*R),minA);body=sp.body;
   sp.pieces.forEach((pm,k)=>{if(partFromMask(name+' piece '+(k+1),pm,'round'))out.notes.push('a thin piece of “'+name+'”')})}
  partFromMask(name,body,mode);await stepCheck(job)}
 if(tubes.length){let k=0;
  for(const c of tubes){const pm=new Uint8Array(W*Hh);for(const p of c)pm[p]=1;
   const bg=new Uint8Array(W*Hh);for(let p=0;p<W*Hh;p++)bg[p]=pm[p]?0:1;const dI=edt2(bg,W,Hh);let R=0;for(const p of c)if(dI[p]>R)R=dI[p];
   const dP=edt2(pm,W,Hh),grow=Math.max(4,2*R);for(let p=0;p<W*Hh;p++)if(mkF.m[p]&&!pm[p]&&dP[p]<=grow)pm[p]=1; /* reach into the part it touches */
   if(partFromMask('extra '+(++k),pm,'round'))await stepCheck(job)}
  if(k)out.notes.push(k+' piece'+(k>1?'s':'')+' sticking out of the part boxes')}
 window.lastParts=out; /* for tests */
 return out}
/* ---------- Trace: outlines -> quad model ---------- */
async function buildTrace(){
 const job=newJob();
 const views={};for(const sh of sheets)for(const b of sh.boxes){if(b.role!=='skip'&&!views[b.role])views[b.role]={sh,b}}
 if(!views.front||(!views.side&&!views.top)){log('Needs at least a front view and a side view (or a top view). Give each box a view name.',true);return}
 const H=+$('tH').value,res=+$('tRes').value,sm=+$('tSm').value,rd=+$('tRd').value,rx=+$('tRx').value;
 Status.start('Reading outlines',()=>{job.cancelled=true});$('goTrace').disabled=true;
 try{
  const S={};let any=false;
  for(const r of ROLES){const v=views[r];if(!v)continue;const mk=getMask(v.sh,v.b);
   if(!mk.bb)throw new Error('No figure found in the '+r+' view. Adjust the background colour or tolerance.');
   S[r]=makeView(mk);S[r].mk=mk;any=true;await stepCheck(job)}
  Status.set(0.08,'Aligning views');
  const sf=H/S.front.bh,sB=S.back?H/S.back.bh:0,sS=S.side?H/S.side.bh:0;
  const sT=S.top?(S.front.bw*sf)/S.top.bw:0;
  const sideSign=$('sideDir').value==='1'?1:-1,topSign=$('topDir').value==='1'?1:-1;
  let hx=S.front.bw*sf/2,hz=0;
  if(S.back)hx=Math.max(hx,S.back.bw*sB/2);
  if(S.top){hx=Math.max(hx,S.top.bw*sT/2);hz=Math.max(hz,S.top.bh*sT/2)}
  if(S.side)hz=Math.max(hz,S.side.bw*sS/2);
  const cell=Math.max(2*hx,H,2*hz)/res,pad=3;
  const nx=Math.ceil(2*hx/cell)+2*pad+1,ny=Math.ceil(H/cell)+2*pad+1,nz=Math.ceil(2*hz/cell)+2*pad+1;
  const ox=-hx-pad*cell,oy=-pad*cell,oz=-hz-pad*cell;
  const k_=(rd/100)*0.35*Math.min(2*hx,2*hz||2*hx);
  const F=new Float32Array(nx*ny*nz),Fr=S.front,Bk=S.back,Sd=S.side,Tp=S.top;
  const fU=Fr.PAD+(Fr.bw-1)/2,fV=Fr.PAD+(Fr.bh-1);
  const parts=$('useParts')&&$('useParts').checked?await prepParts(job,S,views,sf,sS,sideSign):[];
  if(parts.length){
   const csV=(+$('tCs').value)/100,csN=csV>0?2+(1-csV)*6:0;F.fill(1e9);const kJ=(+$('tJn').value/100)*H,sminf=(a,b,k)=>-smax(-a,-b,k);
   for(let pi=0;pi<parts.length;pi++){const P=parts[pi],mg=3*cell+kJ+cell;
    const i0=Math.max(0,Math.floor((P.x0-mg-ox)/cell)),i1=Math.min(nx-1,Math.ceil((P.x1+mg-ox)/cell)),j0=Math.max(0,Math.floor((P.y0-mg-oy)/cell)),j1=Math.min(ny-1,Math.ceil((P.y1+mg-oy)/cell));
    for(let k=0;k<nz;k++){const z=oz+k*cell;
     for(let j=j0;j<=j1;j++){const y=oy+j*cell;
      for(let i=i0;i<=i1;i++){const x=ox+i*cell;
       const mx=P.bbF.x0+(Fr.bw-1)/2+x/sf-P.bbF.x0+P.bbF.x0,my=P.bbF.y0+(Fr.bh-1)-y/sf; /* pixel in the front mask */
       const dP=sampV(P.v,P.v.PAD+(mx-P.bb.x0),P.v.PAD+(my-P.bb.y0))*sf;let d;
       if(P.round){const din=-dP/sf,hh=din>0?Math.sqrt(Math.max(0,Math.min(din,P.R)*(2*P.R-Math.min(din,P.R)))):0;d=smax(dP,Math.abs(z-P.zc)-hh*sf,k_*.5)}
       else{d=dP;
        if(Bk)d=smax(d,sampV(Bk,Bk.PAD+(Bk.bw-1)/2-x/sB,Bk.PAD+(Bk.bh-1)-y/sB)*sB,k_);
        if(Sd)d=smax(d,sampV(Sd,Sd.PAD+(Sd.bw-1)/2+sideSign*z/sS,Sd.PAD+(Sd.bh-1)-y/sS)*sS,k_);
        if(Tp)d=smax(d,sampV(Tp,Tp.PAD+(Tp.bw-1)/2+x/sT,Tp.PAD+(Tp.bh-1)/2-topSign*z/sT)*sT,k_);
        if(csN&&P.rows){const R_=P.rows,q2=clamp(Math.round(my)-R_.c0,0,R_.hx.length-1),hx=R_.hx[q2],hz=R_.hz[q2];
         if(hx>0&&hz>0){const aa=Math.abs((x-R_.xc[q2])/hx),bb2=Math.abs((z-R_.zc[q2])/hz),sq=Math.pow(Math.pow(aa,csN)+Math.pow(bb2,csN),1/csN);d=smax(d,(sq-1)*Math.min(hx,hz),k_)}}}
       const q=i+nx*(j+ny*k);F[q]=F[q]>=1e8?d:sminf(F[q],d,kJ)}}}
    Status.set(0.1+0.6*(pi+1)/parts.length,'Building part '+(pi+1)+' of '+parts.length+': '+P.name);await stepCheck(job)}
  }else{
  for(let k=0;k<nz;k++){
   const z=oz+k*cell;
   for(let j=0;j<ny;j++){const y=oy+j*cell;
    for(let i=0;i<nx;i++){const x=ox+i*cell;
     let d=sampV(Fr,fU+x/sf,fV-y/sf)*sf;
     if(Bk)d=smax(d,sampV(Bk,Bk.PAD+(Bk.bw-1)/2-x/sB,Bk.PAD+(Bk.bh-1)-y/sB)*sB,k_);
     if(Sd)d=smax(d,sampV(Sd,Sd.PAD+(Sd.bw-1)/2+sideSign*z/sS,Sd.PAD+(Sd.bh-1)-y/sS)*sS,k_);
     if(Tp)d=smax(d,sampV(Tp,Tp.PAD+(Tp.bw-1)/2+x/sT,Tp.PAD+(Tp.bh-1)/2-topSign*z/sT)*sT,k_);
     F[i+nx*(j+ny*k)]=d}}
   if((k&3)===3){Status.set(0.1+0.6*k/nz,'Combining the views into a solid ('+Math.round(100*k/nz)+'%)');await stepCheck(job)}}}
  Status.set(0.72,'Smoothing');await stepCheck(job);
  if(sm>0)blurField(F,nx,ny,nz,sm);
  Status.set(0.8,'Building the quad surface');await stepCheck(job);
  const M=surfaceNets(F,nx,ny,nz,cell,ox,oy,oz);
  if(!M.Q.length)throw new Error('The views do not overlap, so no solid was produced. Check the view names and the side/top directions.');
  Status.set(0.92,'Relaxing the mesh');await stepCheck(job);
  relaxQuads(M,rx);
  setMesh('quad',M);const st=meshStats(M);
  $('stats').textContent=st.m.toLocaleString()+' quads · '+st.n.toLocaleString()+' points · size '+(st.x1-st.x0).toFixed(2)+' × '+(st.y1-st.y0).toFixed(2)+' × '+(st.z1-st.z0).toFixed(2);
  $('exp').disabled=false;
  Status.done('Done: '+st.m.toLocaleString()+' quads');log('Built a quad model from '+Object.keys(S).join(', ')+' views'+(parts.length?' and '+parts.length+' parts':'')+'.'+(parts.notes&&parts.notes.length?' Built as extra round tubes: '+parts.notes.join(', ')+'.':'')+' Change a slider and build again to compare.')
 }catch(e){if(e.message==='cancelled'){Status.idle('Cancelled');log('Cancelled.')}else{Status.fail('Failed');log(e.message,true);console.error(e)}}
 finally{$('goTrace').disabled=false;JOB=null}}
if($('goTrace'))$('goTrace').onclick=buildTrace;

/* ---------- OBJ export ---------- */
function exportObj(M,name){const n=M.V.length/3,m=M.Q.length/4,out=['# Just3D '+MODE+' test export, all quads','o '+name];
 for(let i=0;i<n;i++)out.push('v '+M.V[i*3].toFixed(5)+' '+M.V[i*3+1].toFixed(5)+' '+M.V[i*3+2].toFixed(5));
 for(let q=0;q<m;q++)out.push('f '+(M.Q[q*4]+1)+' '+(M.Q[q*4+1]+1)+' '+(M.Q[q*4+2]+1)+' '+(M.Q[q*4+3]+1));
 return new Blob([out.join('\n')+'\n'],{type:'text/plain'})}
$('exp').onclick=()=>{if(!meshes.quad)return;saveFile('just3d-'+MODE+'-model.obj',exportObj(meshes.quad,'just3d_'+MODE));log('Saved just3d-'+MODE+'-model.obj')};
