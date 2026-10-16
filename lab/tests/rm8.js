/* field-aligned vs grid remesh in the real page. node tests/rm8.js <built dir> <out dir>   (needs: npm i playwright) */
const {chromium}=require('playwright'),path=require('path');
const B=path.resolve(process.argv[2]||path.join(__dirname,'../built')),O=path.resolve(process.argv[3]||'.'),T=__dirname;
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1700,height:980}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+B+'/just3d-trace.html');await p.waitForTimeout(500);
const wait=async()=>{for(let i=0;i<1200;i++){await p.waitForTimeout(250);const c=await p.getAttribute('#sb','class');if(c==='ok'||c==='err')return c}};
for(const [f,q] of [['real_A.obj',5000],['bracket.obj',3000]]){
 await p.evaluate(q=>{$('aQ').value=q},q);await p.setInputFiles('#meshIn',T+'/'+f);await wait();
 for(const flow of ['grid','field']){
  await p.evaluate(fl=>{$('aFlow').value=fl},flow);const t0=Date.now();await p.click('#goRemesh');const c=await wait();
  console.log(f,flow,c,((Date.now()-t0)/1000).toFixed(1)+'s',await p.textContent('#stats'));
  await p.click('[data-cam="persp"]');await p.waitForTimeout(400);await (await p.$('#paneView')).screenshot({path:O+'/page_'+f.replace('.obj','')+'_'+flow+'.png'})}}
console.log('page errors:',errs.length?errs:'none');await b.close()})();
