
/* ---------- 3-D viewer (WebGL2) ---------- */
const meshes={raw:null,quad:null};let shown='quad';
const vc=$('viewCv');let gl=null,prog=null,U={},tri={vao:null,n:0,buf:null},wire={vao:null,n:0,buf:null};
const cam={yaw:0.6,pitch:0.35,dist:8,tx:0,ty:2,tz:0,rad:3};let vmode='shaded',dirty=true;
function initGL(){
 gl=vc.getContext('webgl2',{antialias:true,alpha:false});
 if(!gl){$('viewStat').textContent='This browser has no WebGL2, so the 3-D view cannot be shown (the model can still be saved).';return}
 const vs='#version 300 es\nin vec3 p;uniform mat4 uMVP,uMV;out vec3 vv;void main(){vec4 v=uMV*vec4(p,1.0);vv=v.xyz;gl_Position=uMVP*vec4(p,1.0);}';
 const fs='#version 300 es\nprecision highp float;in vec3 vv;uniform vec3 uCol;uniform int uFlat;out vec4 o;void main(){if(uFlat==0){o=vec4(uCol,1.0);return;}vec3 n=normalize(cross(dFdx(vv),dFdy(vv)));float l=0.35+0.45*abs(n.z)+0.25*max(n.y,0.0);o=vec4(uCol*l,1.0);}';
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
 prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(prog,0,'p');gl.linkProgram(prog);
 for(const n of ['uMVP','uMV','uCol','uFlat'])U[n]=gl.getUniformLocation(prog,n);
 for(const o of [tri,wire]){o.vao=gl.createVertexArray();o.buf=gl.createBuffer();gl.bindVertexArray(o.vao);gl.bindBuffer(gl.ARRAY_BUFFER,o.buf);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0)}
 gl.bindVertexArray(null)}
function uploadMesh(M){
 if(!gl)return;
 const quad=!!M.Q,V=M.V;let tp,ep;
 if(quad){const m=M.Q.length/4;tp=new Float32Array(m*18);ep=new Float32Array(m*24);let a=0,b=0;
  for(let q=0;q<m;q++){const i=[M.Q[q*4],M.Q[q*4+1],M.Q[q*4+2],M.Q[q*4+3]];
   for(const c of [0,1,2,0,2,3]){tp[a++]=V[i[c]*3];tp[a++]=V[i[c]*3+1];tp[a++]=V[i[c]*3+2]}
   for(let c=0;c<4;c++){const s=i[c],e=i[(c+1)%4];tp;ep[b++]=V[s*3];ep[b++]=V[s*3+1];ep[b++]=V[s*3+2];ep[b++]=V[e*3];ep[b++]=V[e*3+1];ep[b++]=V[e*3+2]}}}
 else{const m=M.T.length/3;tp=new Float32Array(m*9);ep=new Float32Array(m*18);let a=0,b=0;
  for(let t=0;t<m;t++){const i=[M.T[t*3],M.T[t*3+1],M.T[t*3+2]];
   for(let c=0;c<3;c++){tp[a++]=V[i[c]*3];tp[a++]=V[i[c]*3+1];tp[a++]=V[i[c]*3+2]}
   for(let c=0;c<3;c++){const s=i[c],e=i[(c+1)%3];ep[b++]=V[s*3];ep[b++]=V[s*3+1];ep[b++]=V[s*3+2];ep[b++]=V[e*3];ep[b++]=V[e*3+1];ep[b++]=V[e*3+2]}}}
 gl.bindBuffer(gl.ARRAY_BUFFER,tri.buf);gl.bufferData(gl.ARRAY_BUFFER,tp,gl.STATIC_DRAW);tri.n=tp.length/3;
 gl.bindBuffer(gl.ARRAY_BUFFER,wire.buf);gl.bufferData(gl.ARRAY_BUFFER,ep,gl.STATIC_DRAW);wire.n=ep.length/3}
function fitCamera(M){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;const V=M.V;
 for(let i=0;i<V.length;i+=3){if(V[i]<x0)x0=V[i];if(V[i]>x1)x1=V[i];if(V[i+1]<y0)y0=V[i+1];if(V[i+1]>y1)y1=V[i+1];if(V[i+2]<z0)z0=V[i+2];if(V[i+2]>z1)z1=V[i+2]}
 cam.tx=(x0+x1)/2;cam.ty=(y0+y1)/2;cam.tz=(z0+z1)/2;cam.rad=Math.max(0.1,Math.hypot(x1-x0,y1-y0,z1-z0)/2);cam.dist=cam.rad*3.9}
function setMesh(kind,M){meshes[kind]=M;if(kind===shown||!meshes[shown]){shown=kind}showMesh(shown,true)}
function showMesh(kind,fit){shown=kind;const M=meshes[kind];if(!M){tri.n=0;wire.n=0;needDraw();return}uploadMesh(M);if(fit)fitCamera(M);
 const b1=$('showRaw'),b2=$('showQuad');if(b1){b1.classList.toggle('on',kind==='raw');b2.classList.toggle('on',kind==='quad')}needDraw()}
const m4={persp(f,a,n,fr){const t=1/Math.tan(f/2);return [t/a,0,0,0,0,t,0,0,0,0,(fr+n)/(n-fr),-1,0,0,2*fr*n/(n-fr),0]},
 look(e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
  let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  return [xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1]},
 mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}};
function needDraw(){if(dirty)return;dirty=true;requestAnimationFrame(drawView)}
function drawView(){
 dirty=false;if(!gl)return;sizeCanvas(vc);gl.viewport(0,0,vc.width,vc.height);gl.clearColor(0.043,0.059,0.078,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 if(!tri.n)return;gl.enable(gl.DEPTH_TEST);
 const cp=Math.cos(cam.pitch),e=[cam.tx+cam.dist*Math.sin(cam.yaw)*cp,cam.ty+cam.dist*Math.sin(cam.pitch),cam.tz+cam.dist*Math.cos(cam.yaw)*cp];
 const MV=m4.look(e,[cam.tx,cam.ty,cam.tz],[0,1,0]),PR=m4.persp(0.6,vc.width/vc.height,cam.rad*0.05,cam.dist+cam.rad*6),MVP=m4.mul(PR,MV);
 gl.useProgram(prog);gl.uniformMatrix4fv(U.uMV,false,MV);gl.uniformMatrix4fv(U.uMVP,false,MVP);
 if(vmode!=='wire'){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.uniform1i(U.uFlat,1);gl.uniform3f(U.uCol,0.72,0.82,0.9);gl.bindVertexArray(tri.vao);gl.drawArrays(gl.TRIANGLES,0,tri.n);gl.disable(gl.POLYGON_OFFSET_FILL)}
 if(vmode!=='shaded'){gl.uniform1i(U.uFlat,0);gl.uniform3f(U.uCol,vmode==='both'?0.07:0.35,vmode==='both'?0.2:0.85,vmode==='both'?0.25:0.75);gl.bindVertexArray(wire.vao);gl.drawArrays(gl.LINES,0,wire.n)}
 gl.bindVertexArray(null)}
let orb=null;
vc.addEventListener('pointerdown',e=>{vc.setPointerCapture(e.pointerId);orb={x:e.clientX,y:e.clientY}});
vc.addEventListener('pointermove',e=>{if(!orb)return;cam.yaw-=(e.clientX-orb.x)*0.008;cam.pitch=clamp(cam.pitch+(e.clientY-orb.y)*0.008,-1.55,1.55);orb={x:e.clientX,y:e.clientY};needDraw()});
vc.addEventListener('pointerup',()=>orb=null);
vc.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*Math.exp(e.deltaY*0.0012),cam.rad*0.4,cam.rad*20);needDraw()},{passive:false});
vc.addEventListener('dblclick',()=>{if(meshes[shown])fitCamera(meshes[shown]);cam.yaw=0.6;cam.pitch=0.35;needDraw()});
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{vmode=b.dataset.v;document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b));needDraw()});
document.querySelectorAll('[data-cam]').forEach(b=>b.onclick=()=>{const k=b.dataset.cam;
 if(k==='front'){cam.yaw=0;cam.pitch=0}else if(k==='side'){cam.yaw=Math.PI/2;cam.pitch=0}else if(k==='top'){cam.yaw=0;cam.pitch=1.55}else{cam.yaw=0.6;cam.pitch=0.35}
 if(meshes[shown])cam.dist=cam.rad*3.9;needDraw()});
if($('showRaw')){$('showRaw').onclick=()=>showMesh('raw',false);$('showQuad').onclick=()=>showMesh('quad',false)}
try{initGL()}catch(e){gl=null;$('viewStat').textContent='3-D view failed to start: '+e.message}
drawSheet();dirty=false;needDraw();
