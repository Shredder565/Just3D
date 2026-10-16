
/* ================= shared by both programs: mesh readers, import, triangles -> pure quads at a chosen quad count ================= */

/* ---------- mesh readers: every reader returns {V:Float32Array xyz, T:Int32Array triangles} ---------- */
function triFan(idx,T){for(let k=1;k<idx.length-1;k++)T.push(idx[0],idx[k],idx[k+1])}
function parseOBJ(text){const V=[],T=[];
 for(const line of text.split(/\r?\n/)){const c=line.charCodeAt(0);
  if(c===118&&line.charCodeAt(1)===32){const w=line.trim().split(/\s+/);V.push(+w[1],+w[2],+w[3])}
  else if(c===102&&line.charCodeAt(1)===32){const w=line.trim().split(/\s+/).slice(1),n=V.length/3;
   const idx=w.map(s=>{const i=parseInt(s,10);return i<0?n+i:i-1}).filter(i=>i>=0&&i<n);if(idx.length>=3)triFan(idx,T)}}
 return{V:new Float32Array(V),T:new Int32Array(T)}}
function weldTris(P){ /* P = flat xyz per triangle corner; merge equal corners */
 const map=new Map(),V=[],T=[];
 for(let i=0;i<P.length;i+=3){const k=Math.round(P[i]*1e5)+','+Math.round(P[i+1]*1e5)+','+Math.round(P[i+2]*1e5);let id=map.get(k);
  if(id===undefined){id=V.length/3;map.set(k,id);V.push(P[i],P[i+1],P[i+2])}T.push(id)}
 return{V:new Float32Array(V),T:new Int32Array(T)}}
function parseSTL(buf){
 const dv=new DataView(buf);let binary=false;
 if(buf.byteLength>=84){const n=dv.getUint32(80,true);if(84+50*n===buf.byteLength)binary=true}
 const P=[];
 if(binary){const n=dv.getUint32(80,true);for(let t=0;t<n;t++){const o=84+t*50+12;for(let c=0;c<3;c++)for(let a=0;a<3;a++)P.push(dv.getFloat32(o+c*12+a*4,true))}}
 else{const txt=new TextDecoder().decode(buf),re=/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;let m;while((m=re.exec(txt)))P.push(+m[1],+m[2],+m[3])}
 return weldTris(P)}
const PLYT={char:['getInt8',1],int8:['getInt8',1],uchar:['getUint8',1],uint8:['getUint8',1],short:['getInt16',2],int16:['getInt16',2],ushort:['getUint16',2],uint16:['getUint16',2],int:['getInt32',4],int32:['getInt32',4],uint:['getUint32',4],uint32:['getUint32',4],float:['getFloat32',4],float32:['getFloat32',4],double:['getFloat64',8],float64:['getFloat64',8]};
function parsePLY(buf){
 const u8=new Uint8Array(buf);let he=-1;const key=[101,110,100,95,104,101,97,100,101,114]; /* end_header */
 for(let i=0;i<Math.min(u8.length,20000);i++){let ok=true;for(let k=0;k<10;k++)if(u8[i+k]!==key[k]){ok=false;break}if(ok){he=i+10;break}}
 if(he<0)throw new Error('This PLY file has no header.');
 let pos=he;while(u8[pos]!==10&&pos<u8.length)pos++;pos++;
 const head=new TextDecoder().decode(u8.subarray(0,he)).split(/\r?\n/);let fmt='ascii';const els=[];
 for(const l of head){const w=l.trim().split(/\s+/);
  if(w[0]==='format')fmt=w[1];
  else if(w[0]==='element')els.push({name:w[1],n:+w[2],props:[]});
  else if(w[0]==='property'&&els.length){if(w[1]==='list')els[els.length-1].props.push({list:true,ct:w[2],it:w[3],name:w[4]});else els[els.length-1].props.push({t:w[1],name:w[2]})}}
 const V=[],T=[];
 if(fmt==='ascii'){const toks=new TextDecoder().decode(u8.subarray(pos)).split(/\s+/).filter(s=>s.length);let q=0;
  for(const el of els)for(let r=0;r<el.n;r++){const row={};
   for(const p of el.props){if(p.list){const c=+toks[q++],a=[];for(let k=0;k<c;k++)a.push(+toks[q++]);row[p.name]=a}else row[p.name]=+toks[q++]}
   if(el.name==='vertex')V.push(row.x,row.y,row.z);else if(el.name==='face'){const f=row.vertex_indices||row.vertex_index;if(f&&f.length>=3)triFan(f,T)}}}
 else{const dv=new DataView(buf),le=fmt==='binary_little_endian';let o=pos;
  const rd=t=>{const d=PLYT[t];if(!d)throw new Error('Unsupported PLY type '+t);const v=dv[d[0]](o,le);o+=d[1];return v};
  for(const el of els)for(let r=0;r<el.n;r++){const row={};
   for(const p of el.props){if(p.list){const c=rd(p.ct),a=[];for(let k=0;k<c;k++)a.push(rd(p.it));row[p.name]=a}else row[p.name]=rd(p.t)}
   if(el.name==='vertex')V.push(row.x,row.y,row.z);else if(el.name==='face'){const f=row.vertex_indices||row.vertex_index;if(f&&f.length>=3)triFan(f,T)}}}
 return{V:new Float32Array(V),T:new Int32Array(T)}}
function m4mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function m4trs(t,q,s){const[x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
 return[(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,t[0],t[1],t[2],1]}
function parseGLB(buf){
 const dv=new DataView(buf);if(dv.getUint32(0,true)!==0x46546C67)throw new Error('Not a GLB file.');
 let off=12,json=null,bin=null;
 while(off+8<=buf.byteLength){const len=dv.getUint32(off,true),typ=dv.getUint32(off+4,true);
  if(typ===0x4E4F534A)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off+8,len)));
  else if(typ===0x004E4942&&!bin)bin=new Uint8Array(buf,off+8,len);off+=8+len+((4-len%4)%4)}
 if(!json||!bin)throw new Error('This GLB has no geometry data (an external .bin is not supported).');
 const ext=(json.extensionsRequired||[]).concat(json.extensionsUsed||[]);
 if(ext.includes('KHR_draco_mesh_compression')||ext.includes('EXT_meshopt_compression'))throw new Error('This GLB is compressed (Draco or Meshopt). Ask the service for an uncompressed GLB, or an OBJ/PLY/STL.');
 const CT={5120:[Int8Array,1],5121:[Uint8Array,1],5122:[Int16Array,2],5123:[Uint16Array,2],5125:[Uint32Array,4],5126:[Float32Array,4]},NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const readAcc=i=>{const a=json.accessors[i],bv=json.bufferViews[a.bufferView];if(a.bufferView===undefined)throw new Error('Unsupported accessor.');
  const[Ty,sz]=CT[a.componentType],nc=NC[a.type],stride=bv.byteStride||sz*nc,base=(bv.byteOffset||0)+(a.byteOffset||0),out=new Ty(a.count*nc),dvb=new DataView(bin.buffer,bin.byteOffset);
  const gm={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
  for(let n=0;n<a.count;n++)for(let c=0;c<nc;c++)out[n*nc+c]=dvb[gm](base+n*stride+c*sz,true);return out};
 const V=[],T=[];
 const doMesh=(mi,M)=>{const mesh=json.meshes[mi];if(!mesh)return;
  for(const pr of mesh.primitives||[]){if(pr.mode!==undefined&&pr.mode!==4)continue;if(pr.attributes.POSITION===undefined)continue;
   const pos=readAcc(pr.attributes.POSITION),base=V.length/3;
   for(let i=0;i<pos.length;i+=3){const x=pos[i],y=pos[i+1],z=pos[i+2];V.push(M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14])}
   if(pr.indices!==undefined){const ix=readAcc(pr.indices);for(let i=0;i+2<ix.length;i+=3)T.push(base+ix[i],base+ix[i+1],base+ix[i+2])}
   else for(let i=0;i+2<pos.length/3;i+=3)T.push(base+i,base+i+1,base+i+2)}};
 const I4=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 const walk=(ni,P)=>{const n=json.nodes[ni];const L=n.matrix?n.matrix:m4trs(n.translation||[0,0,0],n.rotation||[0,0,0,1],n.scale||[1,1,1]),M=m4mul(P,L);
  if(n.mesh!==undefined)doMesh(n.mesh,M);(n.children||[]).forEach(c=>walk(c,M))};
 if(json.nodes&&json.scenes){const sc=json.scenes[json.scene||0];(sc.nodes||[]).forEach(n=>walk(n,I4))}
 else if(json.meshes)json.meshes.forEach((_,i)=>doMesh(i,I4));
 return{V:new Float32Array(V),T:new Int32Array(T)}}
function parseMesh(buf){
 const u8=new Uint8Array(buf),head=new TextDecoder().decode(u8.subarray(0,Math.min(300,u8.length)));
 let M;
 if(head.startsWith('glTF'))M=parseGLB(buf);
 else if(head.startsWith('ply'))M=parsePLY(buf);
 else if(/^\s*solid/.test(head)&&/facet/.test(new TextDecoder().decode(u8.subarray(0,Math.min(2000,u8.length))))||(buf.byteLength>=84&&new DataView(buf).getUint32(80,true)*50+84===buf.byteLength))M=parseSTL(buf);
 else if(/^\s*[\[{]/.test(head))throw new Error('The service sent JSON instead of a mesh: '+head.slice(0,160));
 else M=parseOBJ(new TextDecoder().decode(buf));
 if(!M.T.length||!M.V.length)throw new Error('No triangles were found in that file.');
 return M}

/* ---------- triangles -> quads ---------- */
function ptTri2(px,py,pz,ax,ay,az,bx,by,bz,cx,cy,cz){ /* squared distance from p to triangle abc (Ericson) */
 const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=px-ax,apy=py-ay,apz=pz-az;
 const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
 if(d1<=0&&d2<=0)return apx*apx+apy*apy+apz*apz;
 const bpx=px-bx,bpy=py-by,bpz=pz-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
 if(d3>=0&&d4<=d3)return bpx*bpx+bpy*bpy+bpz*bpz;
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3),qx=apx-v*abx,qy=apy-v*aby,qz=apz-v*abz;return qx*qx+qy*qy+qz*qz}
 const cpx=px-cx,cpy=py-cy,cpz=pz-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
 if(d6>=0&&d5<=d6)return cpx*cpx+cpy*cpy+cpz*cpz;
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6),qx=apx-w*acx,qy=apy-w*acy,qz=apz-w*acz;return qx*qx+qy*qy+qz*qz}
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6)),qx=px-(bx+w*(cx-bx)),qy=py-(by+w*(cy-by)),qz=pz-(bz+w*(cz-bz));return qx*qx+qy*qy+qz*qz}
 const den=1/(va+vb+vc),v=vb*den,w=vc*den,qx=apx-abx*v-acx*w,qy=apy-aby*v-acy*w,qz=apz-abz*v-acz*w;return qx*qx+qy*qy+qz*qz}
function orientMesh(raw,up,rotDeg,H){ /* Y up, height H, standing on y=0, centred in x and z */
 const n=raw.V.length/3,V=new Float32Array(raw.V.length),a=rotDeg*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
 for(let i=0;i<n;i++){let x=raw.V[i*3],y=raw.V[i*3+1],z=raw.V[i*3+2];
  if(up==='z'){const t=y;y=z;z=-t}
  const xr=x*ca+z*sa,zr=-x*sa+z*ca;V[i*3]=xr;V[i*3+1]=y;V[i*3+2]=zr}
 let x0=1e30,x1=-1e30,y0=1e30,y1=-1e30,z0=1e30,z1=-1e30;
 for(let i=0;i<n;i++){const x=V[i*3],y=V[i*3+1],z=V[i*3+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z}
 const k=H/Math.max(1e-9,y1-y0),cx=(x0+x1)/2,cz=(z0+z1)/2;
 for(let i=0;i<n;i++){V[i*3]=(V[i*3]-cx)*k;V[i*3+1]=(V[i*3+1]-y0)*k;V[i*3+2]=(V[i*3+2]-cz)*k}
 return{V,T:raw.T}}
/* closest point on triangle abc to p (Ericson); writes it to out and returns the squared distance */
function cpTri(px,py,pz,ax,ay,az,bx,by,bz,cx,cy,cz,out){
 const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=px-ax,apy=py-ay,apz=pz-az;
 const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;let qx,qy,qz;
 const fin=()=>{out[0]=qx;out[1]=qy;out[2]=qz;const dx=px-qx,dy=py-qy,dz=pz-qz;return dx*dx+dy*dy+dz*dz};
 if(d1<=0&&d2<=0){qx=ax;qy=ay;qz=az;return fin()}
 const bpx=px-bx,bpy=py-by,bpz=pz-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
 if(d3>=0&&d4<=d3){qx=bx;qy=by;qz=bz;return fin()}
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);qx=ax+v*abx;qy=ay+v*aby;qz=az+v*abz;return fin()}
 const cpx=px-cx,cpy=py-cy,cpz=pz-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
 if(d6>=0&&d5<=d6){qx=cx;qy=cy;qz=cz;return fin()}
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);qx=ax+w*acx;qy=ay+w*acy;qz=az+w*acz;return fin()}
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));qx=bx+w*(cx-bx);qy=by+w*(cy-by);qz=bz+w*(cz-bz);return fin()}
 const den=1/(va+vb+vc),v=vb*den,w=vc*den;qx=ax+abx*v+acx*w;qy=ay+aby*v+acy*w;qz=az+abz*v+acz*w;return fin()}
function meshArea(V,T){let s=0;for(let t=0;t<T.length;t+=3){const a=T[t]*3,b=T[t+1]*3,c=T[t+2]*3,ux=V[b]-V[a],uy=V[b+1]-V[a+1],uz=V[b+2]-V[a+2],vx=V[c]-V[a],vy=V[c+1]-V[a+1],vz=V[c+2]-V[a+2];
 const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;s+=0.5*Math.sqrt(x*x+y*y+z*z)}return s}
/* a bucket grid of the triangles so "closest point on the original surface" is quick */
function triGrid(V,T,bs){
 let x0=1e30,y0=1e30,z0=1e30,x1=-1e30,y1=-1e30,z1=-1e30;for(let i=0;i<V.length;i+=3){if(V[i]<x0)x0=V[i];if(V[i]>x1)x1=V[i];if(V[i+1]<y0)y0=V[i+1];if(V[i+1]>y1)y1=V[i+1];if(V[i+2]<z0)z0=V[i+2];if(V[i+2]>z1)z1=V[i+2]}
 x0-=bs*2;y0-=bs*2;z0-=bs*2;const nx=Math.ceil((x1-x0)/bs)+3,ny=Math.ceil((y1-y0)/bs)+3,nz=Math.ceil((z1-z0)/bs)+3,nt=T.length/3,cnt=new Int32Array(nx*ny*nz+1);
 const rng=t=>{const a=T[t*3]*3,b=T[t*3+1]*3,c=T[t*3+2]*3,m=(k)=>Math.min(V[a+k],V[b+k],V[c+k]),M=(k)=>Math.max(V[a+k],V[b+k],V[c+k]);
  return[Math.floor((m(0)-x0)/bs),Math.floor((M(0)-x0)/bs),Math.floor((m(1)-y0)/bs),Math.floor((M(1)-y0)/bs),Math.floor((m(2)-z0)/bs),Math.floor((M(2)-z0)/bs)]};
 for(let t=0;t<nt;t++){const r=rng(t);for(let k=r[4];k<=r[5];k++)for(let j=r[2];j<=r[3];j++)for(let i=r[0];i<=r[1];i++)cnt[1+i+nx*(j+ny*k)]++}
 for(let i=0;i<nx*ny*nz;i++)cnt[i+1]+=cnt[i];
 const list=new Int32Array(cnt[nx*ny*nz]),fill=new Int32Array(nx*ny*nz);
 for(let t=0;t<nt;t++){const r=rng(t);for(let k=r[4];k<=r[5];k++)for(let j=r[2];j<=r[3];j++)for(let i=r[0];i<=r[1];i++){const q=i+nx*(j+ny*k);list[cnt[q]+fill[q]++]=t}}
 const out=[0,0,0];
 return{nearest(px,py,pz){ /* writes the closest point to this.p and returns squared distance */
  const ci=Math.floor((px-x0)/bs),cj=Math.floor((py-y0)/bs),ck=Math.floor((pz-z0)/bs);let best=1e30,bx=px,by=py,bz=pz;
  for(let r=1;r<=8;r++){
   for(let k=Math.max(0,ck-r);k<=Math.min(nz-1,ck+r);k++)for(let j=Math.max(0,cj-r);j<=Math.min(ny-1,cj+r);j++)for(let i=Math.max(0,ci-r);i<=Math.min(nx-1,ci+r);i++){
    if(Math.max(Math.abs(i-ci),Math.abs(j-cj),Math.abs(k-ck))!==r&&r>1)continue;
    const q=i+nx*(j+ny*k);for(let s=cnt[q];s<cnt[q+1];s++){const t=list[s],a=T[t*3]*3,b=T[t*3+1]*3,c=T[t*3+2]*3;
     const d=cpTri(px,py,pz,V[a],V[a+1],V[a+2],V[b],V[b+1],V[b+2],V[c],V[c+1],V[c+2],out);if(d<best){best=d;bx=out[0];by=out[1];bz=out[2]}}}
   if(best<1e30&&Math.sqrt(best)<=r*bs)break}
  this.p=[bx,by,bz];return best}}}

/* sharp edges and corners of the source mesh, so the new quads keep them sharp instead of rounding them off */
function findFeatures(V,T,deg){
 const nt=T.length/3,nv=V.length/3,cosT=Math.cos(deg*Math.PI/180),N=new Float32Array(nt*3);
 for(let t=0;t<nt;t++){const a=T[t*3]*3,b=T[t*3+1]*3,c=T[t*3+2]*3,ux=V[b]-V[a],uy=V[b+1]-V[a+1],uz=V[b+2]-V[a+2],vx=V[c]-V[a],vy=V[c+1]-V[a+1],vz=V[c+2]-V[a+2];
  let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;const l=Math.hypot(x,y,z)||1;N[t*3]=x/l;N[t*3+1]=y/l;N[t*3+2]=z/l}
 const em=new Map();
 for(let t=0;t<nt;t++)for(let c=0;c<3;c++){const a=T[t*3+c],b=T[t*3+(c+1)%3],k=a<b?a*nv+b:b*nv+a;const l=em.get(k);if(l)l.push(t);else em.set(k,[t])}
 const segs=[],fdeg=new Int32Array(nv),nb=new Array(nv);
 em.forEach((ts,k)=>{if(ts.length!==2)return;const t1=ts[0],t2=ts[1];if(N[t1*3]*N[t2*3]+N[t1*3+1]*N[t2*3+1]+N[t1*3+2]*N[t2*3+2]>cosT)return;
  const a=Math.floor(k/nv),b=k-a*nv;segs.push(a,b);fdeg[a]++;fdeg[b]++;(nb[a]||(nb[a]=[])).push(b);(nb[b]||(nb[b]=[])).push(a)});
 const corners=[];
 for(let i=0;i<nv;i++){if(!fdeg[i])continue;let isC=fdeg[i]!==2;
  if(!isC){const p=nb[i],ax=V[p[0]*3]-V[i*3],ay=V[p[0]*3+1]-V[i*3+1],az=V[p[0]*3+2]-V[i*3+2],bx=V[p[1]*3]-V[i*3],by=V[p[1]*3+1]-V[i*3+1],bz=V[p[1]*3+2]-V[i*3+2];
   const c=(ax*bx+ay*by+az*bz)/Math.max(1e-12,Math.hypot(ax,ay,az)*Math.hypot(bx,by,bz));if(c>-0.64)isC=true} /* the edge line bends by more than about 50 degrees */
  if(isC)corners.push([V[i*3],V[i*3+1],V[i*3+2]])}
 const S=new Float32Array(segs.length*3);for(let i=0;i<segs.length;i+=2){const a=segs[i]*3,b=segs[i+1]*3;S.set([V[a],V[a+1],V[a+2]],i*3);S.set([V[b],V[b+1],V[b+2]],i*3+3)}
 return{S,ns:segs.length/2,corners}}
/* keep only real creases: connected crease lines shorter than minLen are faceting noise (common on scanned / generated / traced meshes) */
function filterFeatures(F,minLen){if(!F.ns)return F;
 const S=F.S,ns=F.ns,key=(i)=>Math.round(S[i]*1e5)+','+Math.round(S[i+1]*1e5)+','+Math.round(S[i+2]*1e5),pid=new Map(),ends=new Int32Array(ns*2);
 for(let s=0;s<ns;s++)for(let e=0;e<2;e++){const k=key(s*6+e*3);let id=pid.get(k);if(id===undefined){id=pid.size;pid.set(k,id)}ends[s*2+e]=id}
 const uf=new Int32Array(pid.size);for(let i=0;i<uf.length;i++)uf[i]=i;const fd=x=>{while(uf[x]!==x){uf[x]=uf[uf[x]];x=uf[x]}return x};
 for(let s=0;s<ns;s++){const a=fd(ends[s*2]),b=fd(ends[s*2+1]);if(a!==b)uf[a]=b}
 const len=new Map();for(let s=0;s<ns;s++){const r=fd(ends[s*2]),b=s*6,l=Math.hypot(S[b+3]-S[b],S[b+4]-S[b+1],S[b+5]-S[b+2]);len.set(r,(len.get(r)||0)+l)}
 const keep=[];for(let s=0;s<ns;s++)if(len.get(fd(ends[s*2]))>=minLen)keep.push(s);
 const S2=new Float32Array(keep.length*6);keep.forEach((s,i)=>S2.set(S.subarray(s*6,s*6+6),i*6));
 const kept=new Set();for(const s of keep)for(let e=0;e<2;e++)kept.add(key(s*6+e*3));
 const corners=F.corners.filter(c=>kept.has(Math.round(c[0]*1e5)+','+Math.round(c[1]*1e5)+','+Math.round(c[2]*1e5)));
 return{S:S2,ns:keep.length,corners}}
function segGrid(F,bs){
 const ns=F.ns,S=F.S;let x0=1e30,y0=1e30,z0=1e30,x1=-1e30,y1=-1e30,z1=-1e30;
 for(let i=0;i<S.length;i+=3){if(S[i]<x0)x0=S[i];if(S[i]>x1)x1=S[i];if(S[i+1]<y0)y0=S[i+1];if(S[i+1]>y1)y1=S[i+1];if(S[i+2]<z0)z0=S[i+2];if(S[i+2]>z1)z1=S[i+2]}
 x0-=bs*2;y0-=bs*2;z0-=bs*2;const nx=Math.ceil((x1-x0)/bs)+3,ny=Math.ceil((y1-y0)/bs)+3,nz=Math.ceil((z1-z0)/bs)+3,cells=new Map();
 for(let s=0;s<ns;s++){const b=s*6,i0=Math.floor((Math.min(S[b],S[b+3])-x0)/bs),i1=Math.floor((Math.max(S[b],S[b+3])-x0)/bs),j0=Math.floor((Math.min(S[b+1],S[b+4])-y0)/bs),j1=Math.floor((Math.max(S[b+1],S[b+4])-y0)/bs),k0=Math.floor((Math.min(S[b+2],S[b+5])-z0)/bs),k1=Math.floor((Math.max(S[b+2],S[b+5])-z0)/bs);
  for(let k=k0;k<=k1;k++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const key=i+nx*(j+ny*k);const l=cells.get(key);if(l)l.push(s);else cells.set(key,[s])}}
 return{nearest(px,py,pz,maxd){ /* closest point on any sharp edge within maxd; returns squared distance or -1 (point in this.p) */
  const r=Math.ceil(maxd/bs),ci=Math.floor((px-x0)/bs),cj=Math.floor((py-y0)/bs),ck=Math.floor((pz-z0)/bs);let best=maxd*maxd,found=false;
  for(let k=ck-r;k<=ck+r;k++)for(let j=cj-r;j<=cj+r;j++)for(let i=ci-r;i<=ci+r;i++){const l=cells.get(i+nx*(j+ny*k));if(!l)continue;
   for(const s of l){const b=s*6,ax=S[b],ay=S[b+1],az=S[b+2],dx=S[b+3]-ax,dy=S[b+4]-ay,dz=S[b+5]-az,L2=dx*dx+dy*dy+dz*dz||1e-12;
    let t=((px-ax)*dx+(py-ay)*dy+(pz-az)*dz)/L2;t=t<0?0:t>1?1:t;const qx=ax+t*dx,qy=ay+t*dy,qz=az+t*dz,d=(px-qx)*(px-qx)+(py-qy)*(py-qy)+(pz-qz)*(pz-qz);
    if(d<best){best=d;found=true;this.p=[qx,qy,qz];const il=1/Math.sqrt(L2);this.dir=[dx*il,dy*il,dz*il]}}}
  return found?best:-1}}}
function quadAdjacency(M){const n=M.V.length/3,m=M.Q.length/4,deg=new Int32Array(n+1);
 for(let q=0;q<m;q++)for(let c=0;c<4;c++)deg[M.Q[q*4+c]+1]+=2;for(let i=0;i<n;i++)deg[i+1]+=deg[i];
 const adj=new Int32Array(deg[n]),fill=new Int32Array(n);
 for(let q=0;q<m;q++)for(let c=0;c<4;c++){const a=M.Q[q*4+c],b=M.Q[q*4+(c+1)%4];adj[deg[a]+fill[a]++]=b;adj[deg[b]+fill[b]++]=a}
 return{deg,adj}}

/* how square are the quads? a quad counts as a clean square when all four corners are within 15 degrees of a right angle and its longest side is at most 1.35 times its shortest */
function quadQuality(M){const V=M.V,Q=M.Q,m=Q.length/4;let good=0,devSum=0;const e=[0,0,0,0],ang=[0,0,0,0];
 for(let q=0;q<m;q++){let ok=true,mn=1e30,mx=0,dv=0;
  for(let k=0;k<4;k++){const i=Q[q*4+k]*3,j=Q[q*4+(k+1)%4]*3,h=Q[q*4+(k+3)%4]*3,ux=V[j]-V[i],uy=V[j+1]-V[i+1],uz=V[j+2]-V[i+2],wx=V[h]-V[i],wy=V[h+1]-V[i+1],wz=V[h+2]-V[i+2];
   const lu=Math.hypot(ux,uy,uz),lw=Math.hypot(wx,wy,wz);e[k]=lu;if(lu<mn)mn=lu;if(lu>mx)mx=lu;
   const c=(ux*wx+uy*wy+uz*wz)/Math.max(1e-12,lu*lw),ag=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;dv=Math.max(dv,Math.abs(ag-90));if(Math.abs(ag-90)>15)ok=false}
  if(mx/Math.max(1e-12,mn)>1.35)ok=false;if(ok)good++;devSum+=dv}
 return{pct:100*good/Math.max(1,m),meanDev:devSum/Math.max(1,m)}}
/* one squaring pass: every quad is pulled toward the nearest perfect square (same centre, equal sides, right angles, similar size to its neighbours) */
function squareStep(M,lam,mu){const V=M.V,Q=M.Q,m=Q.length/4,n=V.length/3,acc=new Float64Array(n*3),cnt=new Float64Array(n);
 let areaSum=0;for(let q=0;q<m;q++){const a=Q[q*4]*3,b=Q[q*4+1]*3,c=Q[q*4+2]*3,d=Q[q*4+3]*3,x1=V[c]-V[a],y1=V[c+1]-V[a+1],z1=V[c+2]-V[a+2],x2=V[d]-V[b],y2=V[d+1]-V[b+1],z2=V[d+2]-V[b+2];
  const nx=y1*z2-z1*y2,ny=z1*x2-x1*z2,nz=x1*y2-y1*x2;areaSum+=0.5*Math.hypot(nx,ny,nz)}
 const rt=Math.sqrt(areaSum/m/2),W=[[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
 for(let q=0;q<m;q++){const id=[Q[q*4]*3,Q[q*4+1]*3,Q[q*4+2]*3,Q[q*4+3]*3];
  let cx=0,cy=0,cz=0;for(let k=0;k<4;k++){cx+=V[id[k]];cy+=V[id[k]+1];cz+=V[id[k]+2]}cx/=4;cy/=4;cz/=4;
  const x1=V[id[2]]-V[id[0]],y1=V[id[2]+1]-V[id[0]+1],z1=V[id[2]+2]-V[id[0]+2],x2=V[id[3]]-V[id[1]],y2=V[id[3]+1]-V[id[1]+1],z2=V[id[3]+2]-V[id[1]+2];
  let nx=y1*z2-z1*y2,ny=z1*x2-x1*z2,nz=x1*y2-y1*x2;const nl=Math.hypot(nx,ny,nz);if(nl<1e-14)continue;nx/=nl;ny/=nl;nz/=nl;
  let ax=0,ay=0,az=0;
  for(let k=0;k<4;k++){let wx=V[id[k]]-cx,wy=V[id[k]+1]-cy,wz=V[id[k]+2]-cz;const dn=wx*nx+wy*ny+wz*nz;wx-=dn*nx;wy-=dn*ny;wz-=dn*nz;
   for(let t=0;t<k;t++){const rx=wy*nz-wz*ny,ry=wz*nx-wx*nz,rz=wx*ny-wy*nx;wx=rx;wy=ry;wz=rz} /* rotate back by -90 degrees, k times */
   ax+=wx;ay+=wy;az+=wz}
  ax/=4;ay/=4;az/=4;const r=Math.hypot(ax,ay,az);if(r<1e-14)continue;const s=1+mu*(rt/r-1);ax*=s;ay*=s;az*=s;
  let wx=ax,wy=ay,wz=az;
  for(let k=0;k<4;k++){const i=id[k]/3;acc[i*3]+=cx+wx;acc[i*3+1]+=cy+wy;acc[i*3+2]+=cz+wz;cnt[i]++;
   const rx=ny*wz-nz*wy,ry=nz*wx-nx*wz,rz=nx*wy-ny*wx;wx=rx;wy=ry;wz=rz}}
 for(let i=0;i<n;i++)if(cnt[i]){V[i*3]+=lam*(acc[i*3]/cnt[i]-V[i*3]);V[i*3+1]+=lam*(acc[i*3+1]/cnt[i]-V[i*3+1]);V[i*3+2]+=lam*(acc[i*3+2]/cnt[i]-V[i*3+2])}}

/* clean up the quad connectivity: move or remove the irregular points (points with 3, 5, 6... quads around them instead of 4).
   Two local moves, both keep the mesh all-quad: rotate the edge shared by two quads, or collapse a quad's diagonal. A move is kept only if it lowers
   the total irregularity and keeps the new quads convex and facing the same way. */
function irregularCount(M){const n=M.V.length/3,deg=new Int32Array(n);for(let i=0;i<M.Q.length;i++)deg[M.Q[i]]++;let c=0,u=0;for(let i=0;i<n;i++)if(deg[i]){u++;if(deg[i]!==4)c++}return{irr:c,used:u,pct:100*c/Math.max(1,u)}}
function topoOptimize(M,sweeps){
 const f=v=>(v-4)*(v-4);let V=M.V,Q=Int32Array.from(M.Q),moves=0;
 const cross=(p,q,r)=>[(q[1]-p[1])*(r[2]-q[2])-(q[2]-p[2])*(r[1]-q[1]),(q[2]-p[2])*(r[0]-q[0])-(q[0]-p[0])*(r[2]-q[2]),(q[0]-p[0])*(r[1]-q[1])-(q[1]-p[1])*(r[0]-q[0])];
 const P=i=>[V[i*3],V[i*3+1],V[i*3+2]];
 const convexOK=(ids,nrm)=>{const p=ids.map(P);for(let k=0;k<4;k++){const c=cross(p[k],p[(k+1)%4],p[(k+2)%4]);if(c[0]*nrm[0]+c[1]*nrm[1]+c[2]*nrm[2]<=1e-12)return false}return true};
 const quadNormal=ids=>{const p=ids.map(P),d1=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]],d2=[p[3][0]-p[1][0],p[3][1]-p[1][1],p[3][2]-p[1][2]];
  const n=[d1[1]*d2[2]-d1[2]*d2[1],d1[2]*d2[0]-d1[0]*d2[2],d1[0]*d2[1]-d1[1]*d2[0]],l=Math.hypot(n[0],n[1],n[2])||1;return[n[0]/l,n[1]/l,n[2]/l]};
 let dead=new Uint8Array(Q.length/4);
 for(let sw=0;sw<sweeps;sw++){
  const n=V.length/3,m=Q.length/4,vq=new Array(n);for(let i=0;i<n;i++)vq[i]=[];
  for(let q=0;q<m;q++)if(!dead[q])for(let c=0;c<4;c++)vq[Q[q*4+c]].push(q);
  const val=new Int32Array(n);for(let i=0;i<n;i++)val[i]=vq[i].length;
  const em=new Map();for(let q=0;q<m;q++)if(!dead[q])for(let c=0;c<4;c++){const a=Q[q*4+c],b=Q[q*4+(c+1)%4],k=a<b?a*n+b:b*n+a;const l=em.get(k);if(l)l.push(q);else em.set(k,[q])}
  const vt=new Uint8Array(n),qt=new Uint8Array(m);let changed=0;
  const touchQ=q=>{qt[q]=1;for(let c=0;c<4;c++)vt[Q[q*4+c]]=1};
  const adjacent=(a,b)=>{for(const q of vq[a])for(let c=0;c<4;c++)if(Q[q*4+c]===b)return true;return false};
  const nbrs=a=>{const s=new Set();for(const q of vq[a])for(let c=0;c<4;c++){const v=Q[q*4+c];if(v!==a)s.add(v)}return s};
  /* edge rotations */
  for(const [key,qs] of em){if(qs.length!==2)continue;const q1=qs[0],q2=qs[1];if(qt[q1]||qt[q2]||dead[q1]||dead[q2])continue;
   const a=Math.floor(key/n),b=key-a*n;let A=a,B=b,i1=-1;
   for(let c=0;c<4;c++)if(Q[q1*4+c]===A&&Q[q1*4+(c+1)%4]===B){i1=c;break}
   if(i1<0){A=b;B=a;for(let c=0;c<4;c++)if(Q[q1*4+c]===A&&Q[q1*4+(c+1)%4]===B){i1=c;break}}
   if(i1<0)continue;let i2=-1;for(let c=0;c<4;c++)if(Q[q2*4+c]===B&&Q[q2*4+(c+1)%4]===A){i2=c;break}
   if(i2<0)continue;
   const c1=Q[q1*4+(i1+2)%4],d1=Q[q1*4+(i1+3)%4],c2=Q[q2*4+(i2+2)%4],d2=Q[q2*4+(i2+3)%4],h=[A,c2,d2,B,c1,d1];
   if(new Set(h).size!==6)continue;let skip=false;for(const v of h)if(vt[v]){skip=true;break}if(skip)continue;
   let best=null,bd=1e9;
   for(const o of [1,2]){const x=h[o],y=h[o+3];if(val[A]-1<3||val[B]-1<3)continue;if(adjacent(x,y))continue;
    const dE=f(val[A]-1)+f(val[B]-1)+f(val[x]+1)+f(val[y]+1)-f(val[A])-f(val[B])-f(val[x])-f(val[y]);
    const diffuse=dE===0&&sw<8&&((q1*7+q2*13+sw)%5===0);
    if((dE<0||diffuse)&&dE<bd){
     const nA=[h[o],h[(o+1)%6],h[(o+2)%6],h[(o+3)%6]],nB=[h[(o+3)%6],h[(o+4)%6],h[(o+5)%6],h[o]];
     const o1=quadNormal([Q[q1*4],Q[q1*4+1],Q[q1*4+2],Q[q1*4+3]]),o2=quadNormal([Q[q2*4],Q[q2*4+1],Q[q2*4+2],Q[q2*4+3]]),nr=[o1[0]+o2[0],o1[1]+o2[1],o1[2]+o2[2]];
     if(convexOK(nA,nr)&&convexOK(nB,nr)){best={o,nA,nB};bd=dE}}}
   if(best){Q.set(best.nA,q1*4);Q.set(best.nB,q2*4);const o=best.o,x=h[o],y=h[o+3];val[A]--;val[B]--;val[x]++;val[y]++;touchQ(q1);touchQ(q2);for(const v of h)vt[v]=1;changed++}}
  /* diagonal collapses */
  for(let q=0;q<m;q++){if(dead[q]||qt[q])continue;const id=[Q[q*4],Q[q*4+1],Q[q*4+2],Q[q*4+3]];let skip=false;for(const v of id)if(vt[v]){skip=true;break}if(skip)continue;
   for(const [i0,i1] of [[0,2],[1,3]]){const a=id[i0],c=id[i1],b=id[(i0+1)%4],d=id[(i0+3)%4];
    const mv=val[a]+val[c]-2;if(mv<3||val[b]-1<3||val[d]-1<3)continue;
    const dE=f(mv)+f(val[b]-1)+f(val[d]-1)-f(val[a])-f(val[c])-f(val[b])-f(val[d]);if(dE>=0)continue;
    let bad=false;const ring=new Set([...vq[a],...vq[c]]);for(const r of ring){if(qt[r]){bad=true;break}for(let k=0;k<4;k++)if(vt[Q[r*4+k]]){bad=true;break}if(bad)break}if(bad)continue;
    const na=nbrs(a),nc=nbrs(c);let common=0;for(const v of na)if(nc.has(v))common++;if(common!==2)continue;
    /* geometry: the merged point sits between the two; the quads around it must stay convex and facing the same way */
    const mid=[(V[a*3]+V[c*3])/2,(V[a*3+1]+V[c*3+1])/2,(V[a*3+2]+V[c*3+2])/2];const sa=[V[a*3],V[a*3+1],V[a*3+2]],sc=[V[c*3],V[c*3+1],V[c*3+2]];
    V[a*3]=mid[0];V[a*3+1]=mid[1];V[a*3+2]=mid[2];let ok=true;
    const trial=[];for(const r of ring){if(r===q)continue;const ids=[Q[r*4],Q[r*4+1],Q[r*4+2],Q[r*4+3]].map(v=>v===c?a:v);trial.push([r,ids])}
    V[a*3]=sa[0];V[a*3+1]=sa[1];V[a*3+2]=sa[2];
    for(const [r,ids] of trial){const old=quadNormal([Q[r*4],Q[r*4+1],Q[r*4+2],Q[r*4+3]]);V[a*3]=mid[0];V[a*3+1]=mid[1];V[a*3+2]=mid[2];const nn=quadNormal(ids);const okc=convexOK(ids,old);V[a*3]=sa[0];V[a*3+1]=sa[1];V[a*3+2]=sa[2];if(!okc||nn[0]*old[0]+nn[1]*old[1]+nn[2]*old[2]<0.5){ok=false;break}}
    if(!ok)continue;
    V[a*3]=mid[0];V[a*3+1]=mid[1];V[a*3+2]=mid[2];for(const [r,ids] of trial){Q.set(ids,r*4);touchQ(r)}dead[q]=1;touchQ(q);
    val[a]=mv;val[b]--;val[d]--;val[c]=0;vt[c]=1;changed++;break}}
  moves+=changed;if(!changed&&sw>=6)break}
 /* drop dead quads and unused points */
 const keep=[];for(let q=0;q<Q.length/4;q++)if(!dead[q])keep.push(q);
 const used=new Int32Array(V.length/3).fill(-1);let nn=0;for(const q of keep)for(let c=0;c<4;c++){const v=Q[q*4+c];if(used[v]<0)used[v]=nn++}
 const nV=new Float32Array(nn*3),nQ=new Uint32Array(keep.length*4);
 for(let i=0;i<used.length;i++)if(used[i]>=0){nV[used[i]*3]=V[i*3];nV[used[i]*3+1]=V[i*3+1];nV[used[i]*3+2]=V[i*3+2]}
 keep.forEach((q,k)=>{for(let c=0;c<4;c++)nQ[k*4+c]=used[Q[q*4+c]]});
 M.V=nV;M.Q=nQ;return moves}
/* one pass: triangles -> signed distance on a grid of this cell size -> all-quad surface */
async function sdfQuads(job,V,T,H,o,cell,prog){const lo=0;
 const nt=T.length/3;let x0=1e30,x1=-1e30,z0=1e30,z1=-1e30,y1=-1e30;for(let i=0;i<V.length;i+=3){if(V[i]<x0)x0=V[i];if(V[i]>x1)x1=V[i];if(V[i+2]<z0)z0=V[i+2];if(V[i+2]>z1)z1=V[i+2];if(V[i+1]>y1)y1=V[i+1]}
 const sx=x1-x0,sz=z1-z0,pad=4,nx=Math.ceil(sx/cell)+2*pad+1,ny=Math.ceil(Math.max(H,y1)/cell)+2*pad+1,nz=Math.ceil(sz/cell)+2*pad+1;
 const ox=x0-pad*cell,oy=-pad*cell,oz=z0-pad*cell,N=nx*ny*nz;
 if(N>20e6)throw new Error('That many quads needs a grid of '+N.toLocaleString()+' cells, which is more than a browser can hold. Ask for fewer quads.');
 const r=0.75*cell,band=r+1.5*cell,band2=band*band,D=new Float32Array(N).fill(band);
 prog(lo,'Measuring distance to the surface (0%)');
 for(let t=0;t<nt;t++){
  const a=T[t*3]*3,b=T[t*3+1]*3,c=T[t*3+2]*3,ax=V[a],ay=V[a+1],az=V[a+2],bx=V[b],by=V[b+1],bz=V[b+2],cx=V[c],cy=V[c+1],cz=V[c+2];
  const i0=Math.max(0,Math.floor((Math.min(ax,bx,cx)-band-ox)/cell)),i1=Math.min(nx-1,Math.ceil((Math.max(ax,bx,cx)+band-ox)/cell));
  const j0=Math.max(0,Math.floor((Math.min(ay,by,cy)-band-oy)/cell)),j1=Math.min(ny-1,Math.ceil((Math.max(ay,by,cy)+band-oy)/cell));
  const k0=Math.max(0,Math.floor((Math.min(az,bz,cz)-band-oz)/cell)),k1=Math.min(nz-1,Math.ceil((Math.max(az,bz,cz)+band-oz)/cell));
  for(let k=k0;k<=k1;k++){const pz=oz+k*cell;for(let j=j0;j<=j1;j++){const py=oy+j*cell;let q=i0+nx*(j+ny*k);for(let i=i0;i<=i1;i++,q++){
   const d2=ptTri2(ox+i*cell,py,pz,ax,ay,az,bx,by,bz,cx,cy,cz);if(d2<band2){const d=Math.sqrt(d2);if(d<D[q])D[q]=d}}}}
  if((t&8191)===8191){prog(lo+0.45*t/nt,'Measuring distance to the surface ('+Math.round(100*t/nt)+'%)');await stepCheck(job)}}
 prog(lo+0.45,'Finding inside and outside');await stepCheck(job);
 const state=new Uint8Array(N);for(let q=0;q<N;q++)if(D[q]<r)state[q]=1;
 const st=new Int32Array(N);let sp=0;const push=q=>{if(state[q]===0){state[q]=2;st[sp++]=q}};
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(i===0||j===0||k===0||i===nx-1||j===ny-1||k===nz-1)push(i+nx*(j+ny*k))}
 while(sp){const q=st[--sp],i=q%nx,j=((q-i)/nx)%ny,k=(q-i-nx*j)/(nx*ny);
  if(i>0)push(q-1);if(i<nx-1)push(q+1);if(j>0)push(q-nx);if(j<ny-1)push(q+nx);if(k>0)push(q-nx*ny);if(k<nz-1)push(q+nx*ny)}
 const F=new Float32Array(N);let inside=0;
 /* true signed distance: outside cells are +, enclosed cells are -, and the cells right at the surface get the sign of the nearest classified cell */
 const sg=new Int8Array(N);for(let q=0;q<N;q++){if(state[q]===2)sg[q]=1;else if(state[q]===0){sg[q]=-1;inside++}}
 let frontier=[];
 for(let q=0;q<N;q++)if(state[q]===1){const i=q%nx,j=((q-i)/nx)%ny,k=(q-i-nx*j)/(nx*ny);let v=0;
  if(i>0)v+=sg[q-1];if(i<nx-1)v+=sg[q+1];if(j>0)v+=sg[q-nx];if(j<ny-1)v+=sg[q+nx];if(k>0)v+=sg[q-nx*ny];if(k<nz-1)v+=sg[q+nx*ny];
  if(v!==0)frontier.push(q,v>0?1:-1)}
 /* settle the first ring only after all of them are read, so the order does not matter; then grow inward through the wall layer by layer */
 for(let t=0;t<frontier.length;t+=2)sg[frontier[t]]=frontier[t+1];
 for(let layer=0;layer<8;layer++){const nf=[];
  for(let q=0;q<N;q++)if(state[q]===1&&sg[q]===0){const i=q%nx,j=((q-i)/nx)%ny,k=(q-i-nx*j)/(nx*ny);let v=0;
   if(i>0)v+=sg[q-1];if(i<nx-1)v+=sg[q+1];if(j>0)v+=sg[q-nx];if(j<ny-1)v+=sg[q+nx];if(k>0)v+=sg[q-nx*ny];if(k<nz-1)v+=sg[q+nx*ny];
   if(v!==0)nf.push(q,v>0?1:-1)}
  if(!nf.length)break;for(let t=0;t<nf.length;t+=2)sg[nf[t]]=nf[t+1]}
 const roff=0.2*cell; /* a small outward offset so features thinner than a quad are not lost; the snap step brings the points back onto the true surface */for(let q=0;q<N;q++)F[q]=(sg[q]||1)*D[q]-roff;
 if(inside===0)log('The mesh looks open (it has holes), so the result is a thin shell rather than a solid. It still works as a quad surface.');
 prog(lo+0.5,'Building the quad surface');await stepCheck(job);
 if(o.sm>0)blurField(F,nx,ny,nz,o.sm);
 const M=surfaceNets(F,nx,ny,nz,cell,ox,oy,oz);
 if(!M.Q.length)throw new Error('No surface was produced from this mesh.');
 return M}
/* triangles -> pure quads: o.quads = how many quads, o.snap = pull every point back onto the original surface (keeps the detail) */
async function remeshTris(job,raw,o,p0,p1){
 const prog=(f,l)=>Status.set(p0+(p1-p0)*f,l);
 const M0=o.skipOrient?{V:raw.V,T:raw.T}:orientMesh(raw,o.up,o.rot,o.H),V=M0.V,T=M0.T,H=o.H;
 const A=meshArea(V,T),target=Math.max(50,o.quads|0),tEff=o.snap&&o.topo?target*1.045:target; /* the layout clean-up removes about 4% of the quads */
 prog(0,'Measuring the mesh');
 const pp=(a,b)=>(f,l)=>prog(a+(b-a)*(f/0.55),l);
 let cell=Math.sqrt(1.6*A/tEff),M,got;
 if(o.flow==='field'){ /* edges follow the form (app7.js) */
  const Gd=triGrid(V,T,Math.max(cell,1e-6));M=await fieldQuads(job,V,T,H,o,o.topo?target*1.02:target,(f,l)=>prog(0.85*f,l),Gd);got=M.Q.length/4;o.snap=true}
 else{M=await sdfQuads(job,V,T,H,o,cell,pp(0,0.42));got=M.Q.length/4}
 if(o.flow!=='field'&&Math.abs(got-tEff)/tEff>0.06){ /* the count scales with 1/cell^2: correct the cell size once and go again */
  const k=got*cell*cell/A;cell=Math.sqrt(k*A/tEff);prog(0.42,'Adjusting to reach '+target.toLocaleString()+' quads (first try gave '+got.toLocaleString()+')');await stepCheck(job);
  M=await sdfQuads(job,V,T,H,o,cell,pp(0.42,0.85));got=M.Q.length/4}
 if(o.snap){
  prog(0.86,'Snapping to the original surface');await stepCheck(job);
  const G=triGrid(V,T,Math.max(cell*2,1e-6));
  const FT=o.keep?filterFeatures(findFeatures(V,T,o.keepAngle||40),3*cell):null,FG=FT&&FT.ns?segGrid(FT,Math.max(cell*2,1e-6)):null,thr=0.55*cell;
  const proj=()=>{const Vv=M.V,n=Vv.length/3,locked=FG?new Uint8Array(n):null;
   if(FG){ /* corners first: the nearest point of the mesh is pinned exactly on each sharp corner (at most 400 corners) */
    const cs=FT.corners.length<=400?FT.corners:[];for(const c of cs){let bi=-1,bd=thr*thr*2.2;for(let i=0;i<n;i++){const d=(Vv[i*3]-c[0])**2+(Vv[i*3+1]-c[1])**2+(Vv[i*3+2]-c[2])**2;if(d<bd){bd=d;bi=i}}
     if(bi>=0&&!locked[bi]){Vv[bi*3]=c[0];Vv[bi*3+1]=c[1];Vv[bi*3+2]=c[2];locked[bi]=2}}}
   if(FG){ /* points close to a sharp edge: only the one nearest the edge (across it) sits on the edge; its neighbours stay on the surface */
    const dF=new Float32Array(n).fill(1e9),pt=new Float32Array(n*3),dr=new Float32Array(n*3),big=1.0*cell;
    for(let i=0;i<n;i++){if(locked[i]===2)continue;const d=FG.nearest(Vv[i*3],Vv[i*3+1],Vv[i*3+2],big);if(d>=0){dF[i]=Math.sqrt(d);pt.set(FG.p,i*3);dr.set(FG.dir,i*3)}}
    const {deg,adj}=quadAdjacency(M);
    for(let i=0;i<n;i++){if(dF[i]>=1e8)continue;let ok=true;
     for(let t=deg[i];t<deg[i+1]&&ok;t++){const w=adj[t];if(dF[w]<dF[i]-1e-7){const ex=Vv[w*3]-Vv[i*3],ey=Vv[w*3+1]-Vv[i*3+1],ez=Vv[w*3+2]-Vv[i*3+2],l=Math.hypot(ex,ey,ez)||1;
       if(Math.abs(ex*dr[i*3]+ey*dr[i*3+1]+ez*dr[i*3+2])<0.7*l)ok=false}}
     if(ok)locked[i]=1}
    for(let i=0;i<n;i++)if(locked[i]===1){Vv[i*3]=pt[i*3];Vv[i*3+1]=pt[i*3+1];Vv[i*3+2]=pt[i*3+2]}}
   for(let i=0;i<n;i++){if(locked&&locked[i])continue;
    G.nearest(Vv[i*3],Vv[i*3+1],Vv[i*3+2]);const p=G.p;Vv[i*3]=p[0];Vv[i*3+1]=p[1];Vv[i*3+2]=p[2]}};
  proj();M.q0=quadQuality(M);M.i0=irregularCount(M);
  const total=Math.max(0,o.rx|0),rounds=o.topo?3:0,per=Math.min(10,Math.max(4,Math.floor(total/4)));let done=0;
  const squareRun=async(k)=>{for(let i=0;i<k;i++){squareStep(M,0.9,0.3);if(i%3===2||i===k-1)proj();done++;if((i&3)===3){prog(0.9+0.09*Math.min(1,done/(total+rounds*per)),'Making the quads square');await stepCheck(job)}}};
  for(let r=0;r<rounds;r++){prog(0.9,'Cleaning up the quad layout ('+(r+1)+' of '+rounds+')');await stepCheck(job);topoOptimize(M,24);await squareRun(per)}
  await squareRun(Math.max(0,total-done));
  M.q1=quadQuality(M);M.i1=irregularCount(M);
 }else{
  prog(0.9,'Relaxing the mesh');await stepCheck(job);relaxQuads(M,o.rx);
  const s0=meshStats(M),k=H/Math.max(1e-9,s0.y1-s0.y0),cxm=(s0.x0+s0.x1)/2,czm=(s0.z0+s0.z1)/2;
  for(let i=0;i<s0.n;i++){M.V[i*3]=(M.V[i*3]-cxm)*k;M.V[i*3+1]=(M.V[i*3+1]-s0.y0)*k;M.V[i*3+2]=(M.V[i*3+2]-czm)*k}}
 M.target=target;return{M,oriented:M0}}

function showQuadStats(M){const st=meshStats(M);
 $('stats').textContent=st.m.toLocaleString()+' quads'+(M.target?' (asked for '+M.target.toLocaleString()+')':'')+(M.q1?' · '+M.q1.pct.toFixed(0)+'% clean squares (was '+M.q0.pct.toFixed(0)+'%) · '+M.i1.pct.toFixed(0)+'% irregular points (was '+M.i0.pct.toFixed(0)+'%)':'')+' · '+st.n.toLocaleString()+' points · size '+(st.x1-st.x0).toFixed(2)+' × '+(st.y1-st.y0).toFixed(2)+' × '+(st.z1-st.z0).toFixed(2);return st}
function remeshOpts(){return{flow:$('aFlow')?$('aFlow').value:'grid',H:+$('aH').value,quads:Math.round(+$('aQ').value||5000),sm:+$('aSm').value,rx:+$('aRx').value,up:$('aUp').value,rot:+$('aRot').value,snap:$('aSnap').checked,topo:$('aTopo').checked,keep:$('aKeep').checked}}
let SRC=null,SRCPRE=false;
async function runRemesh(job,p0,p1){
 const raw=SRC||meshes.raw;if(!raw)throw new Error('There is no AI mesh to remesh yet.');
 const o=remeshOpts();if(SRCPRE)o.skipOrient=true;const res=await remeshTris(job,raw,o,p0,p1);
 setMesh('raw',res.oriented);setMesh('quad',res.M);showMesh('quad',true);
 const st=showQuadStats(res.M);$('exp').disabled=false;return st}


async function guarded(label,fn){
 const job=newJob();Status.start(label,()=>{job.cancelled=true;if(job.abort)job.abort();if(job.wake)job.wake()});
 ['goAi','goRemesh','impMesh','goTrace'].forEach(i=>{if($(i))$(i).disabled=true});
 try{await fn(job)}
 catch(e){if(e.message==='cancelled'){Status.idle('Cancelled');log('Cancelled.')}else{Status.fail('Failed');log(e.message,true);console.error(e)}}
 finally{['goAi','goTrace'].forEach(i=>{if($(i))$(i).disabled=false});$('impMesh').disabled=false;$('goRemesh').disabled=!SRC&&!meshes.raw;JOB=null}}

$('goRemesh').onclick=()=>guarded('Remeshing',async job=>{const st=await runRemesh(job,0,1);Status.done('Done: '+st.m.toLocaleString()+' quads');log('Remeshed the AI mesh to '+st.m.toLocaleString()+' quads.')});
$('impMesh').onclick=()=>$('meshIn').click();
$('meshIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 guarded('Reading '+f.name,async job=>{const M=parseMesh(await f.arrayBuffer());SRC=M;SRCPRE=false;setMesh('raw',M);showMesh('raw',true);$('goRemesh').disabled=false;
  log('Imported '+f.name+': '+(M.T.length/3).toLocaleString()+' triangles. Remeshing to quads…');
  const st=await runRemesh(job,0.1,1);Status.done('Done: '+st.m.toLocaleString()+' quads');log('Imported '+f.name+' and remeshed it to '+st.m.toLocaleString()+' quads.')})};
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('aQ').value=b.dataset.q});
