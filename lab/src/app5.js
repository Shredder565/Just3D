
/* ================= parts: split the figure into pieces and build each one on its own ================= */
/* Auto-split (standing figure, front view): head, torso, arms (T-pose only), legs. The boxes it makes can be dragged and renamed like any others. */
function autoParts(){
 const fr=(()=>{for(const sh of sheets)for(const b of sh.boxes)if(b.role==='front')return{sh,b};return null})();
 if(!fr){log('Auto-split needs a box named “Front view” first.',true);return 0}
 const mk=getMask(fr.sh,fr.b);if(!mk.bb){log('No figure found in the front view.',true);return 0}
 const {m,w,h,bb}=mk,bw=bb.x1-bb.x0+1,bh=bb.y1-bb.y0+1;
 const rowL=new Int32Array(bh).fill(1e9),rowR=new Int32Array(bh).fill(-1),rowN=new Int32Array(bh);
 for(let j=0;j<bh;j++){const y=bb.y0+j;for(let i=bb.x0;i<=bb.x1;i++)if(m[y*w+i]){if(i<rowL[j])rowL[j]=i;if(i>rowR[j])rowR[j]=i;rowN[j]++}}
 const at=t=>clamp(Math.round(t*(bh-1)),0,bh-1);
 /* body width and centre from the belt rows */
 let sx=0,sn=0,l0=1e9,r0=-1;for(let j=at(.42);j<=at(.52);j++){for(let i=rowL[j];i<=rowR[j];i++)if(m[(bb.y0+j)*w+i]){sx+=i;sn++}if(rowL[j]<l0)l0=rowL[j];if(rowR[j]>r0)r0=rowR[j]}
 const widths=[];for(let j=at(.42);j<=at(.52);j++)widths.push(rowN[j]);widths.sort((p,q)=>p-q);const medW=widths[widths.length>>1]||bw*.2;
 const cx=sn?sx/sn:(bb.x0+bb.x1)/2,hw=Math.max(8,Math.min((r0-l0+1)/2,medW*0.75));
 /* T-pose when the rows around the shoulders are far wider than the body */
 let rA=-1,rB=-1,maxW=0;for(let j=at(.08);j<=at(.36);j++){const ww=rowR[j]-rowL[j]+1;if(ww>maxW)maxW=ww;if(ww>2*hw*1.7){if(rA<0)rA=j;rB=j}}
 const tpose=rA>=0&&maxW>bw*.7;
 /* neck: the narrowest row near the top of the figure; the crotch: where the middle column first turns to background below the belt */
 let nk=at(.17),mn=1e9;for(let j=at(.09);j<=at(.26);j++){const ww=tpose&&j>=rA&&j<=rB?1e9:rowN[j];if(ww<mn){mn=ww;nk=j}}
 if(tpose&&rA>=0)nk=Math.min(nk,rA);
 let cr=at(.55);for(let j=at(.45);j<=at(.75);j++){const i=Math.round(cx);if(!m[(bb.y0+j)*w+i]){cr=j;break}}
 const P=[];const add=(name,x0,x1,j0,j1,depth)=>{if(x1-x0<4||j1-j0<4)return;P.push({x:mk.x+x0,y:mk.y+bb.y0+j0,w:x1-x0+1,h:j1-j0+1,role:'part',name,depth:depth||'auto'})};
 let hx0=1e9,hx1=-1;for(let j=0;j<=nk;j++){if(rowL[j]<hx0)hx0=rowL[j];if(rowR[j]>hx1)hx1=rowR[j]}
 add('head',hx0,hx1,0,nk,'side');
 if(tpose){const a0=Math.max(0,rA-Math.round(bh*.015)),a1=Math.min(bh-1,rB+Math.round(bh*.04));
  const tl=Math.round(cx-hw*.95),tr=Math.round(cx+hw*.95);
  add('left arm',bb.x0,tl,a0,a1,'round');add('right arm',tr,bb.x1,a0,a1,'round');
  add('torso',tl,tr,nk+1,cr,'side')}
 else add('torso',bb.x0,bb.x1,nk+1,cr,'side');
 let lx0=1e9,lx1=-1;for(let j=cr;j<bh;j++){if(rowL[j]<lx0)lx0=rowL[j];if(rowR[j]>lx1)lx1=rowR[j]}
 const mid=Math.round(cx);add('left leg',lx0,mid,cr,bh-1,'side');add('right leg',mid+1,lx1,cr,bh-1,'side');
 fr.sh.boxes=fr.sh.boxes.filter(b=>b.role!=='part');P.forEach(b=>fr.sh.boxes.push(b));fr.sh.sel=fr.sh.boxes.length-1;
 return {n:P.length,tpose}}
$('autoParts').onclick=()=>{const r=autoParts();if(!r)return;const sh=curSheet();syncRole();drawSheet();
 log('Made '+r.n+' parts'+(r.tpose?' (T-pose: the arms are separate round parts)':' (arms hanging by the body stay with the torso; draw a box over an arm and set it to a part if you want it built on its own)')+'. Drag a box to the right place, rename it, or delete it, then build.')};
