
/* ================= field-aligned quad remesher: edges follow the form of the model =================
   Method after "Instant Field-Aligned Meshes" (Jakob, Tarini, Panozzo, Sorkine-Hornung 2015), written from scratch here:
   1. a dense, even copy of the surface is made (the same distance-grid skin the grid remesher uses, but finer) and snapped onto the original;
   2. a smooth 4-way direction field (a "cross" at every point) is solved on it, coarse to fine; it lines up with sharp edges and with the curvature;
   3. a grid-position field is solved: every point learns where the nearest corner of a square grid of the wanted spacing is, with the grid turned to the cross;
   4. points that share a grid corner are merged, neighbouring grid corners are joined, and the faces are read off (mostly quads, a few triangles/pentagons);
   5. one split step (every n-sided face -> n quads) makes it 100% quads, then the usual snap / sharp edges / squaring finish it. */
function fmRand(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function fmUniq(a){a.sort();let m=0;for(let i=0;i<a.length;i++)if(i===0||a[i]!==a[i-1])a[m++]=a[i];return a.slice(0,m)}
function fmCSR(n,keys){const S=new Int32Array(n+1);
 for(let e=0;e<keys.length;e++){const k=keys[e],a=Math.floor(k/n),b=k-a*n;S[a+1]++;S[b+1]++}
 for(let i=0;i<n;i++)S[i+1]+=S[i];const J=new Int32Array(S[n]),f=new Int32Array(n);
 for(let e=0;e<keys.length;e++){const k=keys[e],a=Math.floor(k/n),b=k-a*n;J[S[a]+f[a]++]=b;J[S[b]+f[b]++]=a}
 return{S,J}}
/* a unit vector at right angles to n */
function fmPerp(nx,ny,nz,o,k){let ax=0,ay=0,az=0;const x=Math.abs(nx),y=Math.abs(ny),z=Math.abs(nz);if(x<=y&&x<=z)ax=1;else if(y<=z)ay=1;else az=1;
 let px=ny*az-nz*ay,py=nz*ax-nx*az,pz=nx*ay-ny*ax;const l=Math.hypot(px,py,pz)||1;o[k]=px/l;o[k+1]=py/l;o[k+2]=pz/l}
/* one coarser level: neighbours that face the same way and have similar size are paired up */
function fmCoarsen(L){
 const n=L.n,S=L.S,J=L.J,P=L.P,N=L.N,A=L.A;let ne=0;for(let i=0;i<n;i++)for(let t=S[i];t<S[i+1];t++)if(J[t]>i)ne++;
 const ea=new Int32Array(ne),eb=new Int32Array(ne),sc=new Float64Array(ne);let e=0;
 for(let i=0;i<n;i++)for(let t=S[i];t<S[i+1];t++){const j=J[t];if(j<=i)continue;ea[e]=i;eb[e]=j;
  const d=N[i*3]*N[j*3]+N[i*3+1]*N[j*3+1]+N[i*3+2]*N[j*3+2],r=A[i]>A[j]?A[j]/A[i]:A[i]/A[j];sc[e]=d*r;e++}
 const ord=new Uint32Array(ne);for(let i=0;i<ne;i++)ord[i]=i;ord.sort((x,y)=>sc[y]-sc[x]);
 const par=new Int32Array(n).fill(-1);let nc=0;
 for(let k=0;k<ne;k++){const x=ea[ord[k]],y=eb[ord[k]];if(par[x]<0&&par[y]<0){par[x]=nc;par[y]=nc;nc++}}
 for(let i=0;i<n;i++)if(par[i]<0)par[i]=nc++;
 const cP=new Float64Array(nc*3),cN=new Float64Array(nc*3),cA=new Float64Array(nc),first=new Int32Array(nc).fill(-1);
 for(let i=0;i<n;i++){const p=par[i],a=A[i]||1e-12;if(first[p]<0)first[p]=i;cA[p]+=a;for(let c=0;c<3;c++){cP[p*3+c]+=P[i*3+c]*a;cN[p*3+c]+=N[i*3+c]}}
 for(let p=0;p<nc;p++){for(let c=0;c<3;c++)cP[p*3+c]/=cA[p];const l=Math.hypot(cN[p*3],cN[p*3+1],cN[p*3+2]);
  if(l>1e-9)for(let c=0;c<3;c++)cN[p*3+c]/=l;else{const f=first[p];for(let c=0;c<3;c++)cN[p*3+c]=N[f*3+c]}}
 let cf=null,CQ=null,CA=null;
 if(L.cf){cf=new Uint8Array(nc);CQ=new Float64Array(nc*3);CA=new Float64Array(nc*3);
  for(let i=0;i<n;i++)if(L.cf[i]){const p=par[i];if(cf[p])continue;cf[p]=1;for(let c=0;c<3;c++){CQ[p*3+c]=L.CQ[i*3+c];CA[p*3+c]=L.CA[i*3+c]}}}
 const keys=new Float64Array(ne);let m=0;for(let k=0;k<ne;k++){const a=par[ea[k]],b=par[eb[k]];if(a!==b)keys[m++]=a<b?a*nc+b:b*nc+a}
 const{S:cS,J:cJ}=fmCSR(nc,fmUniq(keys.subarray(0,m)));L.parent=par;
 return{n:nc,P:cP,N:cN,A:cA,S:cS,J:cJ,cf,CQ,CA}}
function fmHierarchy(L0){const Ls=[L0];while(Ls.length<40){const L=Ls[Ls.length-1];if(L.n<48)break;const C=fmCoarsen(L);if(C.n>0.92*L.n)break;Ls.push(C)}return Ls}
/* project q into the tangent plane of point i and make it unit length */
function fmTan(Q,N,i){const nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2];let qx=Q[i*3],qy=Q[i*3+1],qz=Q[i*3+2];const d=qx*nx+qy*ny+qz*nz;qx-=d*nx;qy-=d*ny;qz-=d*nz;
 const l=Math.hypot(qx,qy,qz);if(l<1e-9)fmPerp(nx,ny,nz,Q,i*3);else{Q[i*3]=qx/l;Q[i*3+1]=qy/l;Q[i*3+2]=qz/l}}
/* the direction field: Gauss-Seidel smoothing of a 4-way cross at every point, coarse to fine */
async function fmSolveO(job,Ls,iters,rnd,tick){
 for(let l=Ls.length-1;l>=0;l--){const L=Ls[l],n=L.n,N=L.N,S=L.S,J=L.J,Q=new Float64Array(n*3),cf=L.cf;
  if(l===Ls.length-1){for(let i=0;i<n*3;i++)Q[i]=rnd()-0.5}else{const C=Ls[l+1],par=L.parent;for(let i=0;i<n;i++){const p=par[i]*3;Q[i*3]=C.Q[p];Q[i*3+1]=C.Q[p+1];Q[i*3+2]=C.Q[p+2]}}
  for(let i=0;i<n;i++){if(cf&&cf[i]){Q[i*3]=L.CQ[i*3];Q[i*3+1]=L.CQ[i*3+1];Q[i*3+2]=L.CQ[i*3+2]}fmTan(Q,N,i)}
  L.Q=Q;
  for(let it=0;it<iters;it++){
   for(let i=0;i<n;i++){if(cf&&cf[i])continue;
    const nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2];let qx=Q[i*3],qy=Q[i*3+1],qz=Q[i*3+2],w=0;
    for(let t=S[i];t<S[i+1];t++){const j=J[t]*3,mx=N[j],my=N[j+1],mz=N[j+2],px=Q[j],py=Q[j+1],pz=Q[j+2];
     const ax=ny*qz-nz*qy,ay=nz*qx-nx*qz,az=nx*qy-ny*qx,bx=my*pz-mz*py,by=mz*px-mx*pz,bz=mx*py-my*px;
     const d00=qx*px+qy*py+qz*pz,d01=qx*bx+qy*by+qz*bz,d10=ax*px+ay*py+az*pz,d11=ax*bx+ay*by+az*bz;
     let best=Math.abs(d00),A0=qx,A1=qy,A2=qz,B0=px,B1=py,B2=pz,sg=d00<0?-1:1;
     if(Math.abs(d01)>best){best=Math.abs(d01);A0=qx;A1=qy;A2=qz;B0=bx;B1=by;B2=bz;sg=d01<0?-1:1}
     if(Math.abs(d10)>best){best=Math.abs(d10);A0=ax;A1=ay;A2=az;B0=px;B1=py;B2=pz;sg=d10<0?-1:1}
     if(Math.abs(d11)>best){best=Math.abs(d11);A0=ax;A1=ay;A2=az;B0=bx;B1=by;B2=bz;sg=d11<0?-1:1}
     qx=A0*w+B0*sg;qy=A1*w+B1*sg;qz=A2*w+B2*sg;w+=1;
     const d=qx*nx+qy*ny+qz*nz;qx-=d*nx;qy-=d*ny;qz-=d*nz;const ll=Math.hypot(qx,qy,qz);if(ll>1e-12){qx/=ll;qy/=ll;qz/=ll}}
    Q[i*3]=qx;Q[i*3+1]=qy;Q[i*3+2]=qz}
   if(tick)await tick()}}}
/* the point where the two tangent planes meet that is closest to both points (from Instant Meshes) */
function fmMid(P,N,i,j,o){const n0x=N[i],n0y=N[i+1],n0z=N[i+2],n1x=N[j],n1y=N[j+1],n1z=N[j+2],p0x=P[i],p0y=P[i+1],p0z=P[i+2],p1x=P[j],p1y=P[j+1],p1z=P[j+2];
 const n0p0=n0x*p0x+n0y*p0y+n0z*p0z,n0p1=n0x*p1x+n0y*p1y+n0z*p1z,n1p0=n1x*p0x+n1y*p0y+n1z*p0z,n1p1=n1x*p1x+n1y*p1y+n1z*p1z,n0n1=n0x*n1x+n0y*n1y+n0z*n1z;
 const den=1/(1-n0n1*n0n1+1e-4),l0=2*(n0p1-n0p0-n0n1*(n1p0-n1p1))*den,l1=2*(n1p0-n1p1-n0n1*(n0p1-n0p0))*den;
 o[0]=0.5*(p0x+p1x)-0.25*(n0x*l0+n1x*l1);o[1]=0.5*(p0y+p1y)-0.25*(n0y*l0+n1y*l1);o[2]=0.5*(p0z+p1z)-0.25*(n0z*l0+n1z*l1)}
/* for the grid at point i (corner o, directions q and t=n x q, spacing s): the grid square under the point m; writes the 4 corners' integer index */
function fmCell(O,ox,oy,oz,qx,qy,qz,tx,ty,tz,mx,my,mz,inv,out,k){const dx=mx-ox,dy=my-oy,dz=mz-oz;out[k]=Math.floor((qx*dx+qy*dy+qz*dz)*inv);out[k+1]=Math.floor((tx*dx+ty*dy+tz*dz)*inv)}
/* the grid-position field: every point keeps the grid corner nearest to it, consistent with its neighbours' grids */
async function fmSolveP(job,Ls,iters,s,tick){
 const inv=1/s,mid=[0,0,0],ci=[0,0],cj=[0,0];
 for(let l=Ls.length-1;l>=0;l--){const L=Ls[l],n=L.n,N=L.N,P=L.P,Q=L.Q,S=L.S,J=L.J,O=new Float64Array(n*3),cf=L.cf;
  if(l===Ls.length-1)O.set(P);else{const C=Ls[l+1],par=L.parent;for(let i=0;i<n;i++){const p=par[i]*3;O[i*3]=C.O[p];O[i*3+1]=C.O[p+1];O[i*3+2]=C.O[p+2]}}
  for(let i=0;i<n;i++){const d=(O[i*3]-P[i*3])*N[i*3]+(O[i*3+1]-P[i*3+1])*N[i*3+1]+(O[i*3+2]-P[i*3+2])*N[i*3+2];O[i*3]-=d*N[i*3];O[i*3+1]-=d*N[i*3+1];O[i*3+2]-=d*N[i*3+2]}
  L.O=O;
  for(let it=0;it<iters;it++){
   for(let i=0;i<n;i++){const i3=i*3,nx=N[i3],ny=N[i3+1],nz=N[i3+2],qx=Q[i3],qy=Q[i3+1],qz=Q[i3+2],tx=ny*qz-nz*qy,ty=nz*qx-nx*qz,tz=nx*qy-ny*qx;
    let ox=O[i3],oy=O[i3+1],oz=O[i3+2],w=0;
    for(let t=S[i];t<S[i+1];t++){const j3=J[t]*3,mx=N[j3],my=N[j3+1],mz=N[j3+2],px=Q[j3],py=Q[j3+1],pz=Q[j3+2],ux=my*pz-mz*py,uy=mz*px-mx*pz,uz=mx*py-my*px;
     fmMid(P,N,i3,j3,mid);
     fmCell(O,ox,oy,oz,qx,qy,qz,tx,ty,tz,mid[0],mid[1],mid[2],inv,ci,0);fmCell(O,O[j3],O[j3+1],O[j3+2],px,py,pz,ux,uy,uz,mid[0],mid[1],mid[2],inv,cj,0);
     let bd=1e30,bax=0,bay=0,baz=0,bbx=0,bby=0,bbz=0;
     for(let a=0;a<4;a++){const ia=(ci[0]+(a&1))*s,ib=(ci[1]+(a>>1))*s,ax=ox+qx*ia+tx*ib,ay=oy+qy*ia+ty*ib,az=oz+qz*ia+tz*ib;
      for(let b=0;b<4;b++){const ja=(cj[0]+(b&1))*s,jb=(cj[1]+(b>>1))*s,bx=O[j3]+px*ja+ux*jb,by=O[j3+1]+py*ja+uy*jb,bz=O[j3+2]+pz*ja+uz*jb;
       const d=(ax-bx)*(ax-bx)+(ay-by)*(ay-by)+(az-bz)*(az-bz);if(d<bd){bd=d;bax=ax;bay=ay;baz=az;bbx=bx;bby=by;bbz=bz}}}
     ox=(bax*w+bbx)/(w+1);oy=(bay*w+bby)/(w+1);oz=(baz*w+bbz)/(w+1);w+=1;
     const d=(ox-P[i3])*nx+(oy-P[i3+1])*ny+(oz-P[i3+2])*nz;ox-=d*nx;oy-=d*ny;oz-=d*nz}
    if(cf&&cf[i]){const d=(L.CA[i3]-ox)*tx+(L.CA[i3+1]-oy)*ty+(L.CA[i3+2]-oz)*tz;ox+=d*tx;oy+=d*ty;oz+=d*tz} /* a grid line runs along the sharp edge */
    const dx=P[i3]-ox,dy=P[i3+1]-oy,dz=P[i3+2]-oz,ra=Math.round((qx*dx+qy*dy+qz*dz)*inv)*s,rb=Math.round((tx*dx+ty*dy+tz*dz)*inv)*s;
    O[i3]=ox+qx*ra+tx*rb;O[i3+1]=oy+qy*ra+ty*rb;O[i3+2]=oz+qz*ra+tz*rb}
   if(tick)await tick()}}}
/* read the grid off the dense surface: merged points become the new points, unit grid steps become edges */
function fmExtract(L,s){
 const n=L.n,P=L.P,N=L.N,Q=L.Q,O=L.O,S=L.S,J=L.J,inv=1/s,mid=[0,0,0],ci=[0,0],cj=[0,0];
 const uf=new Int32Array(n);for(let i=0;i<n;i++)uf[i]=i;const find=x=>{while(uf[x]!==x){uf[x]=uf[uf[x]];x=uf[x]}return x};
 const E=[];
 for(let i=0;i<n;i++){const i3=i*3,nx=N[i3],ny=N[i3+1],nz=N[i3+2],qx=Q[i3],qy=Q[i3+1],qz=Q[i3+2],tx=ny*qz-nz*qy,ty=nz*qx-nx*qz,tz=nx*qy-ny*qx;
  for(let t=S[i];t<S[i+1];t++){const j=J[t];if(j<=i)continue;const j3=j*3,mx=N[j3],my=N[j3+1],mz=N[j3+2];
   /* turn j's cross so it matches i's */
   let px=Q[j3],py=Q[j3+1],pz=Q[j3+2];const ux0=my*pz-mz*py,uy0=mz*px-mx*pz,uz0=mx*py-my*px,d0=qx*px+qy*py+qz*pz,d1=qx*ux0+qy*uy0+qz*uz0;
   if(Math.abs(d1)>Math.abs(d0)){const sg=d1<0?-1:1;px=ux0*sg;py=uy0*sg;pz=uz0*sg}else if(d0<0){px=-px;py=-py;pz=-pz}
   const ux=my*pz-mz*py,uy=mz*px-mx*pz,uz=mx*py-my*px;
   fmMid(P,N,i3,j3,mid);
   fmCell(O,O[i3],O[i3+1],O[i3+2],qx,qy,qz,tx,ty,tz,mid[0],mid[1],mid[2],inv,ci,0);fmCell(O,O[j3],O[j3+1],O[j3+2],px,py,pz,ux,uy,uz,mid[0],mid[1],mid[2],inv,cj,0);
   let bd=1e30,ba=0,bb=0;
   for(let a=0;a<4;a++){const ia=(ci[0]+(a&1))*s,ib=(ci[1]+(a>>1))*s,ax=O[i3]+qx*ia+tx*ib,ay=O[i3+1]+qy*ia+ty*ib,az=O[i3+2]+qz*ia+tz*ib;
    for(let b=0;b<4;b++){const ja=(cj[0]+(b&1))*s,jb=(cj[1]+(b>>1))*s,bx=O[j3]+px*ja+ux*jb,by=O[j3+1]+py*ja+uy*jb,bz=O[j3+2]+pz*ja+uz*jb;
     const d=(ax-bx)*(ax-bx)+(ay-by)*(ay-by)+(az-bz)*(az-bz);if(d<bd){bd=d;ba=a;bb=b}}}
   if(bd>0.25*s*s)continue; /* the two grids disagree here (near a singular point): no evidence either way */
   const dx=(ci[0]+(ba&1))-(cj[0]+(bb&1)),dy=(ci[1]+(ba>>1))-(cj[1]+(bb>>1)),ad=Math.abs(dx)+Math.abs(dy);
   if(ad===0){const ex=O[i3]-O[j3],ey=O[i3+1]-O[j3+1],ez=O[i3+2]-O[j3+2];if(ex*ex+ey*ey+ez*ez<0.25*s*s){const a=find(i),b=find(j);if(a!==b)uf[a]=b}}
   else if(ad===1&&Math.abs(dx)<=1&&Math.abs(dy)<=1)E.push(i,j)}}
 const cluster=()=>{const id=new Int32Array(n).fill(-1);let C=0;for(let i=0;i<n;i++){const r=find(i);if(id[r]<0)id[r]=C++;}
  const CP=new Float64Array(C*3),CN=new Float64Array(C*3),cnt=new Float64Array(C);
  for(let i=0;i<n;i++){const c=id[find(i)];cnt[c]++;for(let k=0;k<3;k++){CP[c*3+k]+=O[i*3+k];CN[c*3+k]+=N[i*3+k]}}
  for(let c=0;c<C;c++){for(let k=0;k<3;k++)CP[c*3+k]/=cnt[c];const l=Math.hypot(CN[c*3],CN[c*3+1],CN[c*3+2])||1;for(let k=0;k<3;k++)CN[c*3+k]/=l}
  return{id,C,CP,CN}};
 let K=cluster();
 /* grid corners that ended up almost on top of each other are one corner */
 let merged=0;for(let e=0;e<E.length;e+=2){const a=K.id[find(E[e])],b=K.id[find(E[e+1])];if(a===b)continue;
  const d=Math.hypot(K.CP[a*3]-K.CP[b*3],K.CP[a*3+1]-K.CP[b*3+1],K.CP[a*3+2]-K.CP[b*3+2]);if(d<0.3*s){const x=find(E[e]),y=find(E[e+1]);if(x!==y){uf[x]=y;merged++}}}
 if(merged)K=cluster();
 const keys=[];for(let e=0;e<E.length;e+=2){const a=K.id[find(E[e])],b=K.id[find(E[e+1])];if(a===b)continue;
  const d=Math.hypot(K.CP[a*3]-K.CP[b*3],K.CP[a*3+1]-K.CP[b*3+1],K.CP[a*3+2]-K.CP[b*3+2]);if(d>1.9*s)continue;keys.push(a<b?a*K.C+b:b*K.C+a)}
 return{C:K.C,CP:K.CP,CN:K.CN,keys:fmUniq(Float64Array.from(keys))}}
/* edges -> faces: neighbours are sorted around each point, and faces are traced by always turning the same way.
   That always gives a closed, two-sided surface; dangling edges and points with only two edges are removed first. */
function fmFaces(G){
 const C=G.C,CP=G.CP,CN=G.CN,nb=new Array(C);for(let i=0;i<C;i++)nb[i]=[];
 for(const k of G.keys){const a=Math.floor(k/C),b=k-a*C;nb[a].push(b);nb[b].push(a)}
 const del=(a,b)=>{const l=nb[a],i=l.indexOf(b);if(i>=0){l[i]=l[l.length-1];l.pop()}};
 const tmp=[0,0,0];let faces=null;
 for(let round=0;round<50;round++){
  /* prune: no dangling edges, no two-edge points */
  const st=[];for(let i=0;i<C;i++)if(nb[i].length>0&&nb[i].length<3)st.push(i);
  while(st.length){const v=st.pop(),d=nb[v].length;if(d===0||d>=3)continue;
   if(d===1){const a=nb[v][0];nb[v]=[];del(a,v);if(nb[a].length<3)st.push(a)}
   else{const a=nb[v][0],b=nb[v][1];nb[v]=[];del(a,v);del(b,v);if(nb[a].indexOf(b)<0){nb[a].push(b);nb[b].push(a)}if(nb[a].length<3)st.push(a);if(nb[b].length<3)st.push(b)}}
  /* sort neighbours counter-clockwise seen from outside */
  for(let v=0;v<C;v++){const l=nb[v];if(l.length<3)continue;const nx=CN[v*3],ny=CN[v*3+1],nz=CN[v*3+2];fmPerp(nx,ny,nz,tmp,0);
   const b1x=tmp[0],b1y=tmp[1],b1z=tmp[2],b2x=ny*b1z-nz*b1y,b2y=nz*b1x-nx*b1z,b2z=nx*b1y-ny*b1x;
   const ang=new Map();for(const u of l){const dx=CP[u*3]-CP[v*3],dy=CP[u*3+1]-CP[v*3+1],dz=CP[u*3+2]-CP[v*3+2];ang.set(u,Math.atan2(dx*b2x+dy*b2y+dz*b2z,dx*b1x+dy*b1y+dz*b1z))}
   l.sort((a,b)=>ang.get(a)-ang.get(b))}
  const pos=new Map();for(let v=0;v<C;v++){const l=nb[v];for(let k=0;k<l.length;k++)pos.set(v*C+l[k],k)}
  const fid=new Map();faces=[];
  for(let u=0;u<C;u++)for(const v0 of nb[u]){if(fid.has(u*C+v0))continue;const f=[],F=faces.length;let a=u,b=v0,guard=0;
   while(!fid.has(a*C+b)&&guard++<100000){fid.set(a*C+b,F);f.push(a);const l=nb[b],k=pos.get(b*C+a);const w=l[(k-1+l.length)%l.length];a=b;b=w}
   faces.push(f)}
  /* an edge with the same face on both sides is a bridge or a spike: remove it and trace again */
  let bad=0;for(let u=0;u<C;u++)for(const v of nb[u])if(u<v&&fid.get(u*C+v)===fid.get(v*C+u)){del(u,v);del(v,u);bad++}
  if(!bad)break}
 return faces}
/* two triangles side by side become one quad when that quad is a reasonable shape */
function fmMergeTris(faces,P){
 const ang=(a,b,c)=>{const ux=P[a*3]-P[b*3],uy=P[a*3+1]-P[b*3+1],uz=P[a*3+2]-P[b*3+2],vx=P[c*3]-P[b*3],vy=P[c*3+1]-P[b*3+1],vz=P[c*3+2]-P[b*3+2];
  return Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy+uz*vz)/Math.max(1e-12,Math.hypot(ux,uy,uz)*Math.hypot(vx,vy,vz)))))*180/Math.PI};
 const he=new Map(),C=P.length/3;faces.forEach((f,fi)=>{if(f.length!==3)return;for(let k=0;k<3;k++)he.set(f[k]*C+f[(k+1)%3],fi)});
 const cand=[];faces.forEach((f,fi)=>{if(f.length!==3)return;for(let k=0;k<3;k++){const u=f[k],v=f[(k+1)%3],x=f[(k+2)%3],g=he.get(v*C+u);if(g===undefined||g<=fi)continue;
  const h=faces[g];let y=-1;for(let m=0;m<3;m++)if(h[m]===v&&h[(m+1)%3]===u)y=h[(m+2)%3];if(y<0||y===x)continue;
  const q=[u,y,v,x];let dev=0;for(let m=0;m<4;m++)dev=Math.max(dev,Math.abs(ang(q[(m+3)%4],q[m],q[(m+1)%4])-90));if(dev<55)cand.push([dev,fi,g,q])}});
 cand.sort((a,b)=>a[0]-b[0]);const used=new Uint8Array(faces.length),out=[];let merged=0;
 for(const [d,a,b,q] of cand){if(used[a]||used[b])continue;used[a]=used[b]=1;out.push(q);merged++}
 faces.forEach((f,i)=>{if(!used[i])out.push(f)});return{faces:out,merged}}
/* every n-sided face -> n quads (one split step); the result is 100% quads and keeps the edge flow */
function fmSplit(faces,P){
 const C=P.length/3,emap=new Map();let nv=C;const V=[];for(let i=0;i<P.length;i++)V.push(P[i]);
 const mid=(a,b)=>{const k=a<b?a*C+b:b*C+a;let m=emap.get(k);if(m===undefined){m=nv++;emap.set(k,m);V.push((P[a*3]+P[b*3])/2,(P[a*3+1]+P[b*3+1])/2,(P[a*3+2]+P[b*3+2])/2)}return m};
 const Q=[];for(const f of faces){const k=f.length,c=nv++;let x=0,y=0,z=0;for(const v of f){x+=P[v*3];y+=P[v*3+1];z+=P[v*3+2]}V.push(x/k,y/k,z/k);
  for(let i=0;i<k;i++){const a=f[i],b=f[(i+1)%k],p=f[(i+k-1)%k];Q.push(a,mid(a,b),c,mid(p,a))}}
 /* drop points no quad uses */
 const used=new Int32Array(nv).fill(-1);let m=0;for(const v of Q)if(used[v]<0)used[v]=m++;
 const nV=new Float32Array(m*3);for(let i=0;i<nv;i++)if(used[i]>=0){nV[used[i]*3]=V[i*3];nV[used[i]*3+1]=V[i*3+1];nV[used[i]*3+2]=V[i*3+2]}
 return{V:nV,Q:Int32Array.from(Q,v=>used[v])}}
/* the whole field-aligned path: triangles -> quads that follow the form. o.keep / o.keepAngle = line the field up with sharp edges */
async function fieldQuads(job,V,T,H,o,target,prog,G){
 const A=meshArea(V,T);let x0=1e30,x1=-1e30,y0=1e30,y1=-1e30,z0=1e30,z1=-1e30;
 for(let i=0;i<V.length;i+=3){if(V[i]<x0)x0=V[i];if(V[i]>x1)x1=V[i];if(V[i+1]<y0)y0=V[i+1];if(V[i+1]>y1)y1=V[i+1];if(V[i+2]<z0)z0=V[i+2];if(V[i+2]>z1)z1=V[i+2]}
 let s=Math.sqrt(4*A/target)*0.97;
 /* dense copy: about 4 points per grid step, limited by what the browser can hold */
 let h=s/4;const vol=(x1-x0+10*h)*(Math.max(H,y1)+10*h)*(z1-z0+10*h);if(vol/(h*h*h)>16e6)h=Math.cbrt(vol/16e6);
 if(h>s/2.2)log('So many quads leaves little room for the shape-following field; the edge flow will be rougher. Ask for fewer quads for the best flow.');
 const D=await sdfQuads(job,V,T,H,{sm:0},h,(f,l)=>prog(0.3*f,'Dense copy: '+l));
 const n=D.V.length/3,m=D.Q.length/4;prog(0.3,'Snapping the dense copy onto the surface');await stepCheck(job);
 const P=new Float64Array(n*3),Nn=new Float64Array(n*3),Ar=new Float64Array(n),deg=new Int32Array(n);
 for(let i=0;i<n;i++){G.nearest(D.V[i*3],D.V[i*3+1],D.V[i*3+2]);P[i*3]=G.p[0];P[i*3+1]=G.p[1];P[i*3+2]=G.p[2];if((i&16383)===16383)await stepCheck(job)}
 const keys=new Float64Array(m*6);let kk=0;
 for(let q=0;q<m;q++){const id=[D.Q[q*4],D.Q[q*4+1],D.Q[q*4+2],D.Q[q*4+3]];
  const x1_=P[id[2]*3]-P[id[0]*3],y1_=P[id[2]*3+1]-P[id[0]*3+1],z1_=P[id[2]*3+2]-P[id[0]*3+2],x2=P[id[3]*3]-P[id[1]*3],y2=P[id[3]*3+1]-P[id[1]*3+1],z2=P[id[3]*3+2]-P[id[1]*3+2];
  const nx=y1_*z2-z1_*y2,ny=z1_*x2-x1_*z2,nz=x1_*y2-y1_*x2,ar=0.5*Math.hypot(nx,ny,nz);
  for(const v of id){Nn[v*3]+=nx;Nn[v*3+1]+=ny;Nn[v*3+2]+=nz;Ar[v]+=ar/4;deg[v]++}
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[0,2],[1,3]]){const u=id[a],w=id[b];if(u!==w)keys[kk++]=u<w?u*n+w:w*n+u}}
 for(let i=0;i<n;i++){const l=Math.hypot(Nn[i*3],Nn[i*3+1],Nn[i*3+2]);if(l>0){Nn[i*3]/=l;Nn[i*3+1]/=l;Nn[i*3+2]/=l}else Nn[i*3+1]=1;if(!Ar[i])Ar[i]=h*h*1e-3}
 const{S,J}=fmCSR(n,fmUniq(keys.subarray(0,kk)));
 const L0={n,P,N:Nn,A:Ar,S,J,cf:null,CQ:null,CA:null};
 /* sharp edges steer the field: points on a crease get the crease direction and a grid line through the crease */
 if(o.keep){const FT=filterFeatures(findFeatures(V,T,o.keepAngle||40),1.5*s);if(FT.ns){const FG=segGrid(FT,Math.max(2*h,1e-6));L0.cf=new Uint8Array(n);L0.CQ=new Float64Array(n*3);L0.CA=new Float64Array(n*3);let nc=0;
  for(let i=0;i<n;i++){const d=FG.nearest(P[i*3],P[i*3+1],P[i*3+2],0.75*h);if(d>=0){L0.cf[i]=1;L0.CQ.set(FG.dir,i*3);L0.CA.set(FG.p,i*3);nc++}}
  if(!nc)L0.cf=null}}
 prog(0.34,'Building the coarse-to-fine levels');await stepCheck(job);
 const Ls=fmHierarchy(L0),rnd=fmRand(12345);
 let ticks=0;const tick=async()=>{if((++ticks&3)===0)await stepCheck(job)};
 prog(0.38,'Solving the direction field (which way the edges should run)');await stepCheck(job);
 await fmSolveO(job,Ls,o.fieldIters||16,rnd,tick);
 let best=null;
 for(let pass=0;pass<3;pass++){
  prog(0.55+pass*0.12,'Solving the grid positions'+(pass?' (adjusting the quad count, try '+(pass+1)+')':''));await stepCheck(job);
  await fmSolveP(job,Ls,o.fieldIters||16,s,tick);
  prog(0.6+pass*0.12,'Reading the quads off the grid');await stepCheck(job);
  const Gx=fmExtract(L0,s),faces0=fmFaces(Gx),mt=fmMergeTris(faces0,Gx.CP),faces=mt.faces;
  let got=0,qn=0;for(const f of faces){got+=f.length;if(f.length===4)qn++}
  const cand={faces,G:Gx,got,quadFaces:qn,s};
  if(!best||Math.abs(got-target)<Math.abs(best.got-target))best=cand;
  if(Math.abs(got-target)/target<=0.05||!got)break;
  s*=Math.sqrt(got/target)}
 if(!best.faces.length)throw new Error('The shape-following remesher found no faces. Try the regular grid edge flow.');
 const M=fmSplit(best.faces,best.G.CP);M.fieldStats={faces:best.faces.length,quadFaces:best.quadFaces,dense:n,levels:Ls.length};
 return M}
