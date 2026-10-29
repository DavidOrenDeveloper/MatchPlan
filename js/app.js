import*as pdfjs from'../lib/pdf.min.mjs';
import{parseH,findSymbols,pairText}from'./legend.js';
import{buildVector}from'./export.js';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../lib/pdf.worker.min.mjs',import.meta.url).href;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const MAX=matchMedia('(max-width:800px)').matches?3000:5000;
const ST={todo:'טרם נבדק',ok:'נבדק',ask:'דורש בירור',fp:'התראת שווא'},SC={todo:'#f2a900',ok:'#2e9f5b',ask:'#d6336c',fp:'#868e96'};
const S={sym:[],marks:[],moves:[],cur:null,crop:null,pp:[],pid:null,src:{},tf:{s:1,r:0,x:0,y:0},regs:[],excl:[],hist:[],fut:[],sel:-1,k:1,tx:0,ty:0,view:'overlay',tool:'pan',flip:false,cancel:false,
 cfg:{o:'#e5484d',n:'#1f7ae0',m:'#8a8f98',ao:.9,an:.9,am:.35,keep:false,tol:2,inv:false}};
const cv=$('#cv'),tick=()=>new Promise(r=>setTimeout(r,16));
/* ---------- files ---------- */
async function loadSrc(k,f){const e={file:f,page:1,pages:1};
 if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)){e.pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;e.pages=e.pdf.numPages}
 S.src[k]=e;$('#pg'+k).max=e.pages;$('#pg'+k).disabled=e.pages<2;$('#pg'+k).value=1;$('#nm'+k).textContent=f.name+(e.pages>1?` (${e.pages} עמודים)`:'')}
async function dims(e){if(e.pdf){const v=(await e.pdf.getPage(e.page)).getViewport({scale:1});return[v.width,v.height]}
 e.bmp=await createImageBitmap(e.file);return[e.bmp.width,e.bmp.height]}
async function render(e,sc){e.items=[];const[w,h]=e.d,c=document.createElement('canvas');c.width=Math.round(w*sc);c.height=Math.round(h*sc);
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(e.pdf){const p=await e.pdf.getPage(e.page),vp=p.getViewport({scale:sc});await p.render({canvasContext:x,viewport:vp}).promise;try{const tc=await p.getTextContent();e.items=tc.items.filter(i=>i.str.trim()).map(i=>{const m=pdfjs.Util.transform(vp.transform,i.transform);return{s:i.str,x:m[4],y:m[5],w:i.width*sc}})}catch(_){}}
 else{x.imageSmoothingQuality='high';x.drawImage(e.bmp,0,0,c.width,c.height)}return c}
/* ---------- image processing ---------- */
function warp(){const A=S.A,B=S.B,c=document.createElement('canvas');c.width=A.width;c.height=A.height;const x=c.getContext('2d'),t=S.tf;
 x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.translate(A.width/2+t.x,A.height/2+t.y);x.rotate(t.r*Math.PI/180);x.scale(t.s,t.s);x.translate(-B.width/2,-B.height/2);x.imageSmoothingQuality='high';x.drawImage(B,0,0);return c}
/* ---------- diff ---------- */
const imgd=c=>{const id=c.getContext('2d').getImageData(0,0,c.width,c.height);return{d:id.data.buffer,w:c.width,h:c.height}};
function callWorker(msg,tr){return new Promise((res,rej)=>{const w=new Worker('js/worker.js');S.abort=()=>{w.terminate();rej(0)};
 w.onmessage=e=>{if(e.data.p!=null){prog(e.data.t,e.data.p);return}w.terminate();e.data.err?rej(new Error(e.data.err)):res(e.data)};w.onerror=e=>{w.terminate();rej(new Error(e.message||'שגיאת עיבוד'))};w.postMessage(msg,tr)})}
async function diffAll(wantRegs){const W=S.A.width,H=S.A.height,n=W*H;S.Bw=warp();const a=imgd(S.A),b=imgd(S.Bw);
 const r=await callWorker({t:'diff',a,b,excl:S.excl,crop:S.crop,tol:S.cfg.tol,inv:S.cfg.inv,regs:wantRegs},[a.d,b.d]);S.f=r.f;S.q=r.q;const f=r.f;
 const mk=fn=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),im=x.createImageData(W,H);for(let i=0;i<n;i++)if(fn(i))im.data[i*4+3]=255;x.putImageData(im,0,0);return c};
 S.L={o:mk(i=>f[i]&1),n:mk(i=>f[i]&2),m:mk(i=>f[i]&4)};tint();if(r.regs)applyRegs(r.regs)}
function tint(){const c=S.cfg,W=S.A.width,H=S.A.height,t=(m,col)=>{const k=document.createElement('canvas');k.width=W;k.height=H;const x=k.getContext('2d');x.drawImage(m,0,0);x.globalCompositeOperation='source-in';x.fillStyle=col;x.fillRect(0,0,W,H);return k};
 S.T={o:t(S.L.o,c.o),n:t(S.L.n,c.n),m:t(S.L.m,c.m)};
 const k=document.createElement('canvas');k.width=W;k.height=H;const x=k.getContext('2d');x.drawImage(S.A,0,0);x.globalCompositeOperation='destination-in';x.drawImage(S.L.m,0,0);S.L.k=k}
function applyRegs(out){const iou=(p,q)=>{const w=Math.min(p[0]+p[2],q[0]+q[2])-Math.max(p[0],q[0]),h=Math.min(p[1]+p[3],q[1]+q[3])-Math.max(p[1],q[1]);if(w<=0||h<=0)return 0;const i=w*h;return i/(p[2]*p[3]+q[2]*q[3]-i)};
 for(const r of out){const p=S.regs.find(o=>!o.man&&iou(o.box,r.box)>.5);if(p){r.st=p.st;r.note=p.note}}S.regs=out.concat(S.regs.filter(r=>r.man));S.sel=-1}
/* ---------- pipeline ---------- */
const prog=(t,p)=>{$('#pt').textContent=t;$('#pb').style.width=p*100+'%'};
async function step(t,p){prog(t,p);await tick();if(S.cancel)throw 0}
async function run(o={}){S.cancel=false;$('#prog').hidden=false;
 try{if(o.render){await step('טוען קובץ קודם…',.05);S.src.A.d=await dims(S.src.A);S.src.B.d=await dims(S.src.B);
   const bothPdf=S.src.A.pdf&&S.src.B.pdf,u=bothPdf?MAX/Math.max(...S.src.A.d,...S.src.B.d):0,sc=e=>u||MAX/Math.max(...e.d);
   await step('מעבד קובץ קודם…',.15);S.sc=sc(S.src.A);S.scs={A:sc(S.src.A),B:sc(S.src.B)};S.A=await render(S.src.A,sc(S.src.A));await step('מעבד קובץ חדש…',.3);S.B=await render(S.src.B,sc(S.src.B))}
  if(o.align){await step('מיישר תוכניות…',.5);const a=imgd(S.A),b=imgd(S.B);S.tf=(await callWorker({t:'align',a,b,inv:S.cfg.inv},[a.d,b.d])).tf}
  await step('משווה…',.65);await diffAll(o.regs!==false);
  syncUI();draw();list();symUI()}
 catch(e){if(e!==0){console.error(e);alert('אירעה שגיאה בעיבוד: '+(e.message||e)+'\nנסה קובץ קטן יותר או עמוד אחר.')}else alert('העיבוד בוטל')}
 $('#prog').hidden=true;sched()}
function syncUI(){const t=S.tf;$('#as').value=(t.s*100).toFixed(2);$('#ar').value=t.r;$('#ax').value=Math.round(t.x);$('#ay').value=Math.round(t.y);
 const q=Math.round(S.q*100),bad=S.q<.6;$('#qual').textContent=`התאמה: ${q}%`;$('#q').textContent=bad?`⚠ איכות יישור נמוכה (${q}%) – בדוק יישור לפני הסתמכות על התוצאות`:`התאמת קווים: ${q}%`;$('#q').className=bad?'bad':'';
 $('#exl').innerHTML=S.excl.length?S.excl.map((r,i)=>`<button data-x="${i}">✕ ${i+1}</button>`).join(' '):'אין';}
/* ---------- drawing ---------- */
function lay(x,c,a){x.globalAlpha=a;x.drawImage(c,0,0);x.globalAlpha=1}
function scene(x,m){const W=S.A.width,H=S.A.height,c=S.cfg;x.fillStyle='#fff';x.fillRect(0,0,W,H);
 if(m==='o')x.drawImage(S.A,0,0);else if(m==='n')x.drawImage(S.Bw,0,0);else if(m==='flip')x.drawImage(S.flip?S.Bw:S.A,0,0);
 else{x.globalCompositeOperation='multiply';if(m==='overlay')lay(x,c.keep?S.L.k:S.T.m,c.am);lay(x,S.T.o,c.ao);lay(x,S.T.n,c.an);x.globalCompositeOperation='source-over'}}
function boxes(x,k){S.regs.forEach((r,i)=>{x.strokeStyle=SC[r.st];x.lineWidth=(i===S.sel?5:2.5)/k;x.strokeRect(...r.box);x.fillStyle=SC[r.st];const s=14/k;x.fillRect(r.box[0],r.box[1]-s*1.2,s*1.6*String(i+1).length+s*.6,s*1.2);x.fillStyle='#fff';x.font=`bold ${s}px sans-serif`;x.fillText(i+1,r.box[0]+s*.3,r.box[1]-s*.2)})}
function extra(x,m){const k=S.k;if($('#shm').checked)S.marks.forEach(q=>{if(q.off||(S.view==='side'&&(q.side==='o')!==(m==='o')))return;x.strokeStyle=q.side==='o'?'#e5484d':'#1f7ae0';x.lineWidth=3/k;x.beginPath();x.arc(q.x,q.y,q.r,0,7);x.stroke();if(q.h){x.fillStyle=x.strokeStyle;x.font=`bold ${14/k}px sans-serif`;x.fillText('H='+q.h,q.x+q.r,q.y-q.r)}});
 if(S.crop){x.strokeStyle='#1f7ae0';x.lineWidth=3/k;x.setLineDash([12/k,8/k]);x.strokeRect(...S.crop);x.setLineDash([])}
 if(S.view==='side')S.pp.forEach((p,i)=>{if((i%2===0)===(m==='o')){x.strokeStyle='#d6336c';x.lineWidth=3/k;x.beginPath();x.arc(p.x,p.y,10/k,0,7);x.moveTo(p.x-18/k,p.y);x.lineTo(p.x+18/k,p.y);x.moveTo(p.x,p.y-18/k);x.lineTo(p.x,p.y+18/k);x.stroke()}})}
function draw(){if(S.view==='legend'&&S.leg){drawLeg();return}if(!S.L)return;const x=cv.getContext('2d'),d=devicePixelRatio||1,w=cv.width/d,side=S.view==='side',hw=side?w/2:w;
 x.setTransform(1,0,0,1,0,0);x.fillStyle='#c9ced6';x.fillRect(0,0,cv.width,cv.height);
 for(const[ox,m]of side?[[w/2,'o'],[0,'n']]:[[0,S.view]]){x.save();x.beginPath();x.rect(ox*d,0,hw*d,cv.height);x.clip();x.setTransform(d*S.k,0,0,d*S.k,d*(ox+S.tx),d*S.ty);
  scene(x,m);boxes(x,S.k);extra(x,m);if(S.rect){x.strokeStyle={excl:'#c0262d',crop:'#1f7ae0'}[S.tool]||'#2e9f5b';x.setLineDash([8/S.k,6/S.k]);x.lineWidth=2/S.k;x.strokeRect(...S.rect);x.setLineDash([])}x.restore()}}
function size(){const d=devicePixelRatio||1,s=$('#stage');cv.width=s.clientWidth*d;cv.height=s.clientHeight*d;draw()}
function fit(box){const w=cv.width/(devicePixelRatio||1)/(S.view==='side'?2:1),h=cv.height/(devicePixelRatio||1);
 if(!box)box=[0,0,S.A.width,S.A.height];const k=Math.min(w/box[2]/(box===0?1:1.3),h/box[3]/1.3,box[2]<S.A.width?8:99);
 S.k=Math.min(k,8);S.tx=w/2-(box[0]+box[2]/2)*S.k;S.ty=h/2-(box[1]+box[3]/2)*S.k;draw()}
function zoomAt(px,py,f){const nk=Math.min(40,Math.max(.02,S.k*f));S.tx=px-(px-S.tx)*nk/S.k;S.ty=py-(py-S.ty)*nk/S.k;S.k=nk;draw()}
/* ---------- interaction ---------- */
const P=new Map();let G=null;const hw=()=>cv.clientWidth/(S.view==='side'?2:1);
const toImg=(px,py)=>{let ox=0;if(S.view==='side'&&px>cv.clientWidth/2)ox=cv.clientWidth/2;return[(px-ox-S.tx)/S.k,(py-S.ty)/S.k]};
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.offsetX,e.offsetY]);G={x:e.offsetX,y:e.offsetY,m:0,s:toImg(e.offsetX,e.offsetY)};if(P.size===2)G.m=9};
cv.onpointermove=e=>{if(!P.has(e.pointerId)||!G)return;const o=P.get(e.pointerId),n=[e.offsetX,e.offsetY];
 if(P.size===2){const[p,q]=[...P.values()],d0=Math.hypot(p[0]-q[0],p[1]-q[1]);P.set(e.pointerId,n);const[p2,q2]=[...P.values()],d1=Math.hypot(p2[0]-q2[0],p2[1]-q2[1]);
  S.tx+=n[0]-o[0];S.ty+=n[1]-o[1];if(d0)zoomAt((p2[0]+q2[0])/2,(p2[1]+q2[1])/2,d1/d0);else draw();return}
 P.set(e.pointerId,n);G.m+=Math.abs(n[0]-o[0])+Math.abs(n[1]-o[1]);
 if(S.tool==='pan'||S.tool==='pts'||S.tool==='cnt'){S.tx+=n[0]-o[0];S.ty+=n[1]-o[1];draw()}else{const c=toImg(...n);S.rect=[Math.min(G.s[0],c[0]),Math.min(G.s[1],c[1]),Math.abs(c[0]-G.s[0]),Math.abs(c[1]-G.s[1])];draw()}};
cv.onpointerup=e=>{P.delete(e.pointerId);if(!G||P.size)return;const g=G;G=null;
 if(S.rect){const r=S.rect.map(Math.round);S.rect=null;if(r[2]>8&&r[3]>8){if(S.tool==='lg')lgRect(r);else if(S.tool==='mark')act(()=>S.regs.push({box:r,o:1,n:1,st:'todo',note:'',man:1}));else if(S.tool==='sym')defSym(r);else if(S.tool==='crop')act(()=>S.crop=r,true);else act(()=>S.excl.push(r),true)}else draw();return}
 if(g.m<6&&S.tool==='cnt'){cntClick(g);return}
 if(g.m<6&&S.tool==='pts'){addPt(g);return}
 if(g.m<6&&S.tool==='pan'){const[ix,iy]=toImg(g.x,g.y);let h=-1;S.regs.forEach((r,i)=>{if(ix>=r.box[0]&&iy>=r.box[1]&&ix<=r.box[0]+r.box[2]&&iy<=r.box[1]+r.box[3])h=i});S.sel=h;list();draw();if(h>=0)document.querySelector(`.it[data-i="${h}"]`)?.scrollIntoView({block:'nearest'})}};
cv.onwheel=e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,e.deltaY<0?1.15:1/1.15)};
/* ---------- undo / redo ---------- */
const snap=()=>JSON.stringify({r:S.regs,x:S.excl,c:S.crop,y:S.sym,m:S.marks,v:S.moves});
function act(fn,re){S.hist.push(snap());if(S.hist.length>100)S.hist.shift();S.fut=[];fn();if(re)run({regs:false});else{list();draw();sched();symUI()}}
async function restore(s){const o=JSON.parse(s),ch=JSON.stringify([o.x,o.c||null])!==JSON.stringify([S.excl,S.crop]);S.regs=o.r;S.excl=o.x;S.crop=o.c||null;S.sym=o.y||[];S.marks=o.m||[];S.moves=o.v||[];if(ch)await run({regs:false});else{list();draw();syncUI();symUI()}}
const undo=()=>{if(!S.hist.length)return;S.fut.push(snap());restore(S.hist.pop())},redo=()=>{if(!S.fut.length)return;S.hist.push(snap());restore(S.fut.pop())};
/* ---------- list ---------- */
function list(){const el=$('#list'),f=$('#flt').value;el.innerHTML='';const c={};S.regs.forEach(r=>c[r.st]=(c[r.st]||0)+1);
 $('#sum').textContent=S.regs.length?`${S.regs.length} אזורי שינוי (אינו מספר האביזרים) · ${c.todo||0} טרם נבדקו`:'לא נמצאו הבדלים מעבר לסבילות שנבחרה. זה אינו מבטיח שאין שינויים קטנים יותר.';
 S.regs.forEach((r,i)=>{if(f!=='all'&&r.st!==f)return;const d=document.createElement('div');d.className='it'+(i===S.sel?' on':'');d.dataset.i=i;
  d.innerHTML=`<b style="background:${SC[r.st]}">${i+1}</b><span>${r.man?'סימון ידני':r.o&&r.n?'שינוי':r.o?'קיים רק בקודמת':'קיים רק בחדשה'} ${r.man?'<button data-del="1">מחק</button>':''}</span><select>${Object.entries(ST).map(([k,v])=>`<option value="${k}"${k===r.st?' selected':''}>${v}</option>`).join('')}</select><input placeholder="הערה">`;
  const inp=d.querySelector('input');inp.value=r.note;inp.onchange=()=>act(()=>r.note=inp.value);d.querySelector('select').onchange=e=>act(()=>r.st=e.target.value);
  d.onclick=e=>{if(e.target.dataset.del){act(()=>S.regs.splice(i,1));return}if(['INPUT','SELECT'].includes(e.target.tagName))return;S.sel=i;fit(r.box);list();if(innerWidth<=800)$('#side').classList.remove('open')};el.appendChild(d)})}
/* ---------- points alignment ---------- */
function setView(v){S.view=v;$$('#views button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));fit()}
function setTool(t){S.tool=t;$$('#tools button').forEach(x=>x.classList.toggle('on',x.dataset.t===t))}
function addPt(g){if(S.view!=='side')return;const right=g.x>cv.clientWidth/2,need=S.pp.length%2===0;
 if(right!==need){$('#q').textContent=need?'לחץ על נקודה בתוכנית הקודמת (ימין)':'לחץ על הנקודה התואמת בתוכנית החדשה (שמאל)';return}
 S.pp.push({x:g.s[0],y:g.s[1]});$('#q').textContent=`נקודות: ${S.pp.length}/4`;draw();if(S.pp.length===4)solvePts()}
function solvePts(){const[a1,b1,a2,b2]=S.pp,t=S.tf,A=S.A,B=S.B,r=t.r*Math.PI/180,
 inv=p=>{const dx=p.x-A.width/2-t.x,dy=p.y-A.height/2-t.y,c=Math.cos(-r),s=Math.sin(-r);return{x:(dx*c-dy*s)/t.s+B.width/2,y:(dx*s+dy*c)/t.s+B.height/2}};
 const q1=inv(b1),q2=inv(b2),vx=q2.x-q1.x,vy=q2.y-q1.y,wx=a2.x-a1.x,wy=a2.y-a1.y,d=vx*vx+vy*vy;S.pp=[];setTool('pan');if(!d)return;
 const zr=(wx*vx+wy*vy)/d,zi=(wy*vx-wx*vy)/d,s=Math.hypot(zr,zi),rr=Math.atan2(zi,zr),tx=a1.x-(zr*q1.x-zi*q1.y),ty=a1.y-(zi*q1.x+zr*q1.y);
 S.tf={s,r:rr*180/Math.PI,x:tx-A.width/2+(zr*B.width/2-zi*B.height/2),y:ty-A.height/2+(zi*B.width/2+zr*B.height/2)};run({regs:false})}
/* ---------- export ---------- */
const typ=r=>r.man?'סימון ידני':r.o&&r.n?'שינוי':r.o?'קיים רק בקודמת':'קיים רק בחדשה';
function headerCanvas(rw){const f=Math.max(18,Math.round(rw/90)),hd=Math.round(f*4.4),g=id=>$(id).value||'—',c=document.createElement('canvas');c.width=rw;c.height=hd;const x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,rw,hd);x.direction='rtl';x.textAlign='right';x.fillStyle='#16324f';x.font=`bold ${f*1.25}px sans-serif`;
 x.fillText(`פרויקט: ${g('#fp')} · בניין: ${g('#fb')} · דירה: ${g('#fa')}`,rw-f,f*1.5);x.font=`${f}px sans-serif`;
 x.fillText(`קודמת: ${g('#fo')} (${S.src.A.file.name})   |   חדשה: ${g('#fn')} (${S.src.B.file.name})`,rw-f,f*2.8);
 let px=rw-f;[['o','קיים רק בקודמת'],['n','קיים רק בחדשה'],['m','משותף']].forEach(([k,t])=>{x.fillStyle=S.cfg[k];x.fillRect(px-f*1.1,f*3.2,f*1.1,f*.7);x.fillStyle='#222';x.fillText(t,px-f*1.4,f*3.9);px-=x.measureText(t).width+f*3});return c}
const exportRegion=()=>$('#xs').value==='area'&&S.crop?S.crop.map(Math.round):[0,0,S.A.width,S.A.height];
function exportCanvas(){const A=S.A,R=exportRegion(),rw=R[2],rh=R[3],h=headerCanvas(rw),c=document.createElement('canvas');c.width=rw;c.height=rh+h.height;const x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(h,0,0);x.save();x.translate(-R[0],h.height-R[1]);x.beginPath();x.rect(R[0],R[1],rw,rh);x.clip();scene(x,['side','flip'].includes(S.view)?'overlay':S.view);boxes(x,Math.max(.5,A.width/1800));x.restore();return c}
async function withHi(f,fn){const sv={A:S.A,B:S.B,Bw:S.Bw,L:S.L,T:S.T,f:S.f,q:S.q,tf:S.tf,regs:S.regs,excl:S.excl,crop:S.crop,sc:S.sc},tol=S.cfg.tol;
 try{prog('מרנדר באיכות גבוהה…',.3);await tick();S.A=await render(S.src.A,S.scs.A*f);S.B=await render(S.src.B,S.scs.B*f);S.tf={...sv.tf,x:sv.tf.x*f,y:sv.tf.y*f};
  S.regs=sv.regs.map(r=>({...r,box:r.box.map(v=>v*f)}));S.excl=sv.excl.map(r=>r.map(v=>v*f));S.crop=sv.crop&&sv.crop.map(v=>v*f);S.sc=sv.sc*f;S.cfg.tol=Math.round(tol*f);
  prog('משווה באיכות גבוהה…',.5);await tick();await diffAll(false);return await fn()}finally{Object.assign(S,sv);S.cfg.tol=tol}}
async function imgCanvas(){const q=+$('#xq').value;if(q<=1)return exportCanvas();const lim=matchMedia('(max-width:800px)').matches?25e6:60e6,f=Math.min(q,Math.sqrt(lim/(S.A.width*S.A.height)));
 if(f<1.15){S.note='אין מספיק זיכרון ברנדר גבוה יותר, לכן הייצוא ברזולוציית המסך.';return exportCanvas()}return withHi(f,async()=>exportCanvas())}
async function vectorDoc(){const B=S.src.B;if(!B.pdf)throw new Error('הקובץ החדש אינו PDF');const pg=await B.pdf.getPage(B.page);if(pg.rotate%360)throw new Error('ROT');
 const A=S.A,R=exportRegion(),h=headerCanvas(R[2]),oc=document.createElement('canvas');oc.width=R[2];oc.height=R[3];const x=oc.getContext('2d');x.translate(-R[0],-R[1]);lay(x,S.T.o,S.cfg.ao);lay(x,S.T.n,S.cfg.an);
 const png=async c=>new Uint8Array(await(await blob(c)).arrayBuffer());
 return buildVector(PDFLib,{bBytes:new Uint8Array(await B.file.arrayBuffer()),bPage:B.page,bW:B.d[0],bH:B.d[1],R,scA:S.scs.A,scB:S.scs.B,tf:S.tf,A:{w:A.width,h:A.height},B:{w:S.B.width,h:S.B.height},noBase:S.view==='changes',keep:S.cfg.keep,cm:S.cfg.m,am:S.cfg.am,overlayPng:await png(oc),regs:S.regs.map(r=>({box:r.box,color:SC[r.st]})),hdPx:h.height,headerPng:await png(h)})}
function listPages(){const W=1240,H=1754,rows=36,out=[];
 for(let p=0;p*rows<Math.max(1,S.regs.length);p++){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.direction='rtl';x.textAlign='right';x.fillStyle='#16324f';x.font='bold 34px sans-serif';
  x.fillText(`רשימת שינויים – ${$('#fp').value||''} ${$('#fb').value||''} ${$('#fa').value||''}`,W-60,70);x.font='20px sans-serif';x.fillStyle='#555';x.fillText('מספר אזורי השינוי אינו מספר האביזרים שהשתנו',W-60,104);
  S.regs.slice(p*rows,p*rows+rows).forEach((r,i)=>{const y=160+i*44;x.fillStyle=SC[r.st];x.fillRect(W-100,y-26,40,34);x.fillStyle='#fff';x.textAlign='center';x.font='bold 20px sans-serif';x.fillText(p*rows+i+1,W-80,y);x.textAlign='right';x.fillStyle='#222';x.font='22px sans-serif';x.fillText(`${typ(r)} · ${ST[r.st]}${r.note?' · '+r.note.slice(0,70):''}`,W-120,y)});out.push(c)}return out}
const blob=c=>new Promise(r=>c.toBlob(r,'image/png'));
const dl=(b,ext,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(name||`השוואה_${$('#fp').value||'תוכנית'}`)+'.'+ext;a.click()};
async function exportPDF(){const{PDFDocument}=PDFLib,mode=$('#xm').value;let d=null,why='';S.note='';
 if(mode!=='img'){try{d=await vectorDoc()}catch(e){why={DIM:'מידות העמוד אינן תואמות לקובץ המקור',ROT:'העמוד שמור כמסובב'}[e.message]||e.message}}
 const add=async(doc,cv,w,h)=>{const im=await doc.embedPng(await(await blob(cv)).arrayBuffer());doc.addPage([w,h]).drawImage(im,{x:0,y:0,width:w,height:h})};
 if(!d){d=await PDFDocument.create();const c=await imgCanvas(),R=exportRegion(),keep=$('#xz').checked&&S.src.A.pdf&&S.sc,k=keep?(R[2]/S.sc)/c.width:842/c.width;await add(d,c,c.width*k,c.height*k)}
 if($('#xl').checked)for(const l of extraPages())await add(d,l,595,842);
 dl(new Blob([await d.save()],{type:'application/pdf'}),'pdf');
 const n=[why&&`ה-PDF יוצא כתמונה כי הייצוא הוקטורי לא התאפשר (${why}).`,S.note].filter(Boolean).join(' ');if(n)alert(n)}
async function guard(fn){$('#ex').close();$('#prog').hidden=false;prog('מייצא…',.5);await tick();try{await fn()}catch(e){alert('הייצוא נכשל: '+(e.message||e)+'\nנסה איכות תמונה "כמו במסך" או אזור קטן יותר.')}$('#prog').hidden=true}
$('#xpdf').onclick=()=>guard(exportPDF);
$('#xpng').onclick=()=>guard(async()=>{S.note='';dl(await blob(await imgCanvas()),'png');if(S.note)alert(S.note)});
$('#xprt').onclick=()=>guard(async()=>{S.note='';const pa=$('#pa');pa.innerHTML='';for(const c of[await imgCanvas(),...($('#xl').checked?extraPages():[])]){const im=new Image();im.src=c.toDataURL('image/png');pa.appendChild(im)}await tick();await tick();window.print();setTimeout(()=>pa.innerHTML='',1000)});
$('#exp').onclick=()=>{$('#xs').querySelector('[value=area]').disabled=!S.crop;if(!S.crop)$('#xs').value='full';const B=S.src.B;let t=B.pdf?'PDF וקטורי: התוכנית החדשה נשארת וקטורית וצבע ה"משותף" נקבע לפי ההגדרות שלך. "רק בקודמת" ו"רק בחדשה" מצוירים כשכבת הדגשה בצבעים שבחרת. ':'הקובץ החדש אינו PDF, ולכן ייצוא וקטורי לא זמין ויוצא תמונה באיכות גבוהה. ';
 if(B.pdf&&S.cfg.keep)t+='שים לב: "צבע מקור למשותף" שומר את צבעי הקובץ החדש. ';$('#xn').textContent=t;$('#ex').showModal()};
$('#xx').onclick=()=>$('#ex').close();
/* ---------- projects ---------- */
const db=()=>new Promise((res,rej)=>{const r=indexedDB.open('goldin',1);r.onupgradeneeded=()=>r.result.createObjectStore('p',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=async(m,f)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('p',m),q=f(t.objectStore('p'));t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error)})};
const getProj=()=>({id:S.pid,upd:Date.now(),fp:$('#fp').value,fb:$('#fb').value,fa:$('#fa').value,fo:$('#fo').value,fn:$('#fn').value,pa:S.src.A.page,pb:S.src.B.page,na:S.src.A.file.name,nb:S.src.B.file.name,ta:S.src.A.file.type,tb:S.src.B.file.type,tf:S.tf,regs:S.regs,excl:S.excl,crop:S.crop,cfg:S.cfg,sym:S.sym,marks:S.marks,moves:S.moves,files:{A:S.src.A.file,B:S.src.B.file}});
async function saveProj(){if(!S.pid||!S.L)return;await tx('readwrite',s=>s.put(getProj()))}
let st;const sched=()=>{clearTimeout(st);st=setTimeout(()=>saveProj().catch(()=>{}),1500)};
$('#sv').onclick=async()=>{try{await saveProj();$('#q').textContent='נשמר במכשיר ✓';$('#q').className=''}catch(e){alert('השמירה נכשלה: '+e.message)}};
async function pack(p){const h=new TextEncoder().encode(JSON.stringify({...p,files:undefined,la:p.files.A.size,lb:p.files.B.size})),n=new Uint8Array(4);new DataView(n.buffer).setUint32(0,h.length);return new Blob([n,h,p.files.A,p.files.B],{type:'application/octet-stream'})}
async function unpack(f){const b=await f.arrayBuffer(),n=new DataView(b).getUint32(0),p=JSON.parse(new TextDecoder().decode(new Uint8Array(b,4,n))),o=4+n;
 p.files={A:new Blob([b.slice(o,o+p.la)],{type:p.ta}),B:new Blob([b.slice(o+p.la,o+p.la+p.lb)],{type:p.tb})};return p}
$('#xgo').onclick=async()=>{$('#ex').close();dl(await pack(getProj()),'goldin',$('#fp').value||'פרויקט')};
const extraPages=()=>{const l=listPages();if(S.sym.length)l.push(qtyPage());return l};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function loadHome(){let l=[];try{l=await tx('readonly',s=>s.getAll())}catch(e){}l.sort((a,b)=>b.upd-a.upd);const el=$('#plist');el.innerHTML=l.length?'':'<small>אין פרויקטים שמורים במכשיר</small>';
 l.forEach(p=>{const d=document.createElement('div');d.className='pj';d.innerHTML=`<span>${esc(p.fp||'ללא שם')} · ${esc(p.fb)} ${esc(p.fa)}<small>${new Date(p.upd).toLocaleString('he-IL')} · ${p.regs.filter(r=>r.st==='todo').length} טרם נבדקו</small></span><button>פתח</button><button>.goldin</button><button>מחק</button>`;
  const[b1,b2,b3]=d.querySelectorAll('button');b1.onclick=()=>openProj(p);b2.onclick=async()=>dl(await pack(p),'goldin',p.fp||'פרויקט');
  b3.onclick=async()=>{if(confirm('למחוק את הפרויקט מהמכשיר?')){await tx('readwrite',s=>s.delete(p.id));loadHome()}};el.appendChild(d)})}
function cfgUI(c){Object.assign(S.cfg,c);[['co','o'],['cn','n'],['cm','m'],['ao','ao'],['an','an'],['am','am']].forEach(([i,k])=>$('#'+i).value=S.cfg[k]);$('#keep').checked=S.cfg.keep;$('#inv').checked=S.cfg.inv;$('#tol').value=S.cfg.tol;$('#tov').textContent=S.cfg.tol}
async function start(p){S.regs=p?p.regs:[];S.excl=p?p.excl:[];S.crop=p?p.crop:null;S.sym=p&&p.sym||[];S.marks=p&&p.marks||[];S.moves=p&&p.moves||[];S.hist=[];S.fut=[];S.pp=[];S.tf=p?p.tf:{s:1,r:0,x:0,y:0};
 $('#home').hidden=true;$('#work').hidden=false;size();navigator.storage?.persist?.();await run({render:true,align:!p,regs:!p});if(S.L)fit()}
async function openProj(p){try{S.pid=p.id;for(const[k,n,t,pg]of[['A',p.na,p.ta,p.pa],['B',p.nb,p.tb,p.pb]]){await loadSrc(k,new File([p.files[k]],n,{type:t}));S.src[k].page=pg;$('#pg'+k).value=pg}
 for(const k of['fp','fb','fa','fo','fn'])$('#'+k).value=p[k]||'';cfgUI(p.cfg);await start(p)}catch(e){alert('לא ניתן לפתוח את הפרויקט: '+e.message)}}
$('#imp').onchange=async e=>{try{const p=await unpack(e.target.files[0]);p.id=crypto.randomUUID();await tx('readwrite',s=>s.put(p));loadHome()}catch(x){alert('קובץ פרויקט לא תקין')}e.target.value=''};
/* ---------- symbols & quantities (experimental) ---------- */
const cnt=(sid,side)=>S.marks.filter(k=>k.sid===sid&&k.side===side&&!k.off).length;
function defSym(r){const side=$('#cs').value,src=side==='o'?S.A:S.Bw,name=prompt('שם הסמל (למשל: שקע כפול)');if(!name){draw();return}const unit=prompt('יחידת ספירה','יח׳')||'יח׳',c=document.createElement('canvas');c.width=r[2];c.height=r[3];
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,r[2],r[3]);x.drawImage(src,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);const id='s'+Date.now();act(()=>{S.sym.push({id,name,unit,tpl:c.toDataURL('image/png'),w:r[2],h:r[3]});S.cur=id});symUI()}
async function detect(id){const s=S.sym.find(x=>x.id===id);if(!s)return;S.cancel=false;$('#prog').hidden=false;prog('מזהה סמלים…',.05);
 try{const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=s.tpl}),tc=document.createElement('canvas');tc.width=s.w;tc.height=s.h;tc.getContext('2d').drawImage(im,0,0);
  const t=imgd(tc),a=imgd(S.A),b=imgd(S.Bw),r=await callWorker({t:'detect',a,b,tpl:t,inv:S.cfg.inv,rec:+$('#rec').value,mirror:$('#mir').checked,sc:$('#sr').value,ang:$('#ang').value},[t.d,a.d,b.d]);
  act(()=>{S.marks=S.marks.filter(k=>k.sid!==id||k.man);for(const side of['o','n'])for(const p of r[side])S.marks.push({sid:id,side,x:p.x,y:p.y,r:p.r||Math.max(s.w,s.h)*.6,man:0,off:0,h:heightNear(side,p)});S.moves=S.moves.filter(v=>v.sid!==id)})}
 catch(e){if(e!==0)alert('הזיהוי נכשל: '+(e.message||e))}$('#prog').hidden=true;symUI()}
function cntClick(g){const[ix,iy]=g.s;let b=null,bd=1e9;S.marks.forEach(k=>{if(S.view==='side'&&(g.x>cv.clientWidth/2)!==(k.side==='o'))return;const d=Math.hypot(k.x-ix,k.y-iy);if(d<k.r&&d<bd){bd=d;b=k}});
 if(b)act(()=>b.off=b.off?0:1);else{const s=S.sym.find(x=>x.id===S.cur);if(s)act(()=>S.marks.push({sid:s.id,side:$('#cs').value,x:ix,y:iy,r:Math.max(s.w,s.h)*.6,man:1,off:0}));else alert('בחר סמל ברשימה כדי להוסיף')}symUI()}
function suggest(){const old=S.moves;S.moves=[];for(const s of S.sym){const R=Math.max(s.w,s.h),idx=S.marks.map((k,i)=>[k,i]).filter(([k])=>k.sid===s.id&&!k.off),O=idx.filter(([k])=>k.side==='o'),N=idx.filter(([k])=>k.side==='n'),
 near=(k,L)=>L.some(([q])=>Math.hypot(q.x-k.x,q.y-k.y)<R),rem=O.filter(([k])=>!near(k,N)),add=N.filter(([k])=>!near(k,O)),used=new Set();
 for(const[k,i]of rem){let b=null,bd=1e18;for(const[q,j]of add){if(used.has(j))continue;const d=Math.hypot(q.x-k.x,q.y-k.y);if(d<bd){bd=d;b=j}}if(b!=null){used.add(b);const p=old.find(v=>v.a===i&&v.b===b);S.moves.push({sid:s.id,a:i,b,ok:p?p.ok:0})}}}}
function symUI(){const L=$('#syml');if(!L)return;L.innerHTML=S.sym.length?'':'<small>אין סמלים. בחר כלי "הגדרת סמל" וגרור על סמל בתוכנית.</small>';
 S.sym.forEach(s=>{const d=document.createElement('div');d.className='sy';d.innerHTML=`<input type="radio" name="cs"${s.id===S.cur?' checked':''}><img src="${s.tpl}" height="28"><input value="${esc(s.name)}"><input value="${esc(s.unit)}" size="4"><input value="${esc(s.ht||'')}" size="7" placeholder="גובה"><button>זהה</button><button>✕</button>`;
  const[r,n,u,hh]=d.querySelectorAll('input'),[b1,b2]=d.querySelectorAll('button');r.onchange=()=>S.cur=s.id;hh.onchange=()=>act(()=>s.ht=hh.value);n.onchange=()=>act(()=>s.name=n.value);u.onchange=()=>act(()=>s.unit=u.value);b1.onclick=()=>detect(s.id);
  b2.onclick=()=>{if(confirm('למחוק את הסמל ואת הסימונים שלו?')){act(()=>{S.sym=S.sym.filter(x=>x!==s);S.marks=S.marks.filter(k=>k.sid!==s.id);S.moves=S.moves.filter(v=>v.sid!==s.id)})}};L.appendChild(d)});
 $('#qty').innerHTML=S.sym.length?`<table><tr><th>סמל</th><th>קודמת</th><th>חדשה</th><th>הפרש</th><th>הועברו</th><th>גובה</th></tr>${S.sym.map(s=>{const o=cnt(s.id,'o'),n=cnt(s.id,'n');return`<tr><td>${esc(s.name)} (${esc(s.unit)})</td><td>${o}</td><td>${n}</td><td>${n-o>0?'+':''}${n-o}</td><td>${S.moves.filter(v=>v.sid===s.id&&v.ok).length}</td><td>${esc(s.ht||'—')}${ovr(s)?` (+${ovr(s)} עם גובה בתוכנית)`:''}</td></tr>`}).join('')}</table><small>ספירה אוטומטית בהתאמת תבנית: יש לאמת ולתקן ידנית.</small>`:'';
 const M=$('#mvs');M.innerHTML='';S.moves.forEach(v=>{const a=S.marks[v.a],b=S.marks[v.b],s=S.sym.find(x=>x.id===v.sid);if(!a||!b||!s)return;const d=document.createElement('div');d.className='sy';
  d.innerHTML=`<span>${esc(s.name)}: הוסר ב(${Math.round(a.x)},${Math.round(a.y)}) ונוסף ב(${Math.round(b.x)},${Math.round(b.y)})</span><button>${v.ok?'✓ הועבר':'אשר העברה'}</button><button>הצג</button>`;
  const[p,q]=d.querySelectorAll('button');p.onclick=()=>act(()=>v.ok=v.ok?0:1);q.onclick=()=>fit([Math.min(a.x,b.x)-150,Math.min(a.y,b.y)-150,Math.abs(a.x-b.x)+300,Math.abs(a.y-b.y)+300]);M.appendChild(d)})}
function qtyPage(){const W=1240,c=document.createElement('canvas');c.width=W;c.height=1754;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,1754);x.direction='rtl';x.textAlign='right';x.fillStyle='#16324f';x.font='bold 34px sans-serif';x.fillText('טבלת כמויות (זיהוי בהתאמת תבנית, לאימות ידני)',W-60,70);
 x.font='22px sans-serif';x.fillStyle='#222';x.fillText('סמל · קודמת · חדשה · הפרש · הועברו · גובה',W-60,120);S.sym.forEach((s,i)=>{const o=cnt(s.id,'o'),n=cnt(s.id,'n');x.fillText(`${s.name} (${s.unit}) · ${o} · ${n} · ${n-o} · ${S.moves.filter(v=>v.sid===s.id&&v.ok).length} · ${s.ht||'—'}${ovr(s)?' (+'+ovr(s)+' בתוכנית)':''}`,W-60,170+i*44)});return c}
$('#sgm').onclick=()=>act(suggest);$('#shm').onchange=draw;
/* ---------- legend: you mark the symbol column, then its text area; text comes from the PDF text layer or OCR ---------- */
const ovr=s=>S.marks.filter(k=>k.sid===s.id&&!k.off&&k.h).length;
function heightNear(side,p){const E=side==='o'?S.src.A:S.src.B;if(!E||!E.items)return'';let best='',bd=(p.r||60)*3;
 for(const it of E.items){const h=parseH(it.s);if(!h)continue;let x=it.x+it.w/2,y=it.y;if(side==='n'){const t=S.tf,r=t.r*Math.PI/180,c=Math.cos(r),sn=Math.sin(r),dx=x-S.B.width/2,dy=y-S.B.height/2;x=S.A.width/2+t.x+t.s*(c*dx-sn*dy);y=S.A.height/2+t.y+t.s*(sn*dx+c*dy)}
  const d=Math.hypot(x-p.x,y-p.y);if(d<bd){bd=d;best=h}}return best}
const absURL=p=>new URL(p,location.href).href;
const loadScript=src=>new Promise((res,rej)=>{if(window.Tesseract)return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('לא ניתן לטעון את רכיב ה-OCR (בדוק שתיקיית lib/tess הועלתה)'));document.head.appendChild(s)});
async function ocr(){if(S.ocr)return S.ocr;await loadScript('lib/tess/tesseract.min.js');
 S.ocr=await Tesseract.createWorker('heb+eng',1,{workerPath:absURL('lib/tess/worker.min.js'),corePath:absURL('lib/tess'),langPath:absURL('lib/tess'),gzip:false,cacheMethod:'none',logger:m=>{if(m.status==='recognizing text')prog('קורא טקסט (OCR)…',.2+.7*m.progress)}});
 await S.ocr.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});return S.ocr}
async function ocrRegion(r){const L=S.leg,f=Math.max(1,Math.min(2.2,3600/Math.max(r[2],r[3]))),c=document.createElement('canvas');c.width=Math.round(r[2]*f);c.height=Math.round(r[3]*f);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(L.p)await L.p.render({canvasContext:x,viewport:L.p.getViewport({scale:L.sc*f}),transform:[1,0,0,1,-r[0]*f,-r[1]*f]}).promise;else{x.imageSmoothingQuality='high';x.drawImage(L.c,r[0],r[1],r[2],r[3],0,0,c.width,c.height)}
 const w=await ocr(),res=await w.recognize(c,{},{blocks:true}),out=[];
 for(const b of res.data.blocks||[])for(const p of b.paragraphs)for(const l of p.lines)for(const q of l.words)out.push({s:q.text,x0:q.bbox.x0/f+r[0],y0:q.bbox.y0/f+r[1],x1:q.bbox.x1/f+r[0],y1:q.bbox.y1/f+r[1],c:q.confidence});return out}
function lgHint(){const n=(S.lg.G||[]).length;$('#lgh').textContent=S.lg.sym?`נמצאו ${n} סמלים. שלב 2: גרור מלבן על אזור הטקסט שלהם.`:'שלב 1: גרור מלבן על עמודת הסמלים בלבד (בלי הטקסט). שתי אצבעות: זום והזזה.'}
function fitLeg(){const w=cv.clientWidth,h=cv.clientHeight,L=S.leg;S.k=Math.min(w/L.c.width,h/L.c.height);S.tx=(w-L.c.width*S.k)/2;S.ty=(h-L.c.height*S.k)/2;draw()}
function drawLeg(){const x=cv.getContext('2d'),d=devicePixelRatio||1,L=S.leg,lw=2.5/S.k;x.setTransform(1,0,0,1,0,0);x.fillStyle='#c9ced6';x.fillRect(0,0,cv.width,cv.height);x.setTransform(d*S.k,0,0,d*S.k,d*S.tx,d*S.ty);x.drawImage(L.c,0,0);
 if(S.lg.sym){x.strokeStyle='#2e9f5b';x.lineWidth=lw;x.strokeRect(...S.lg.sym)}
 (S.lg.G||[]).forEach((g,i)=>{x.strokeStyle='#d6336c';x.lineWidth=lw;x.strokeRect(g.x0,g.y0,g.x1-g.x0,g.y1-g.y0);x.fillStyle='#d6336c';x.font=`bold ${16/S.k}px sans-serif`;x.fillText(i+1,g.x0,g.y0-3/S.k)});
 if(S.rect){x.strokeStyle='#1f7ae0';x.setLineDash([8/S.k,6/S.k]);x.lineWidth=lw;x.strokeRect(...S.rect);x.setLineDash([])}}
async function openLegend(){const fl=$('#lgf').files[0],pg=Math.max(1,+$('#lgp').value||1);S.cancel=false;$('#prog').hidden=false;prog('טוען מקרא…',.3);await tick();
 try{let L;if(fl&&!(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name))){const bmp=await createImageBitmap(fl),sc=MAX/Math.max(bmp.width,bmp.height),c=document.createElement('canvas');c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height);L={c,sc,items:[]}}
  else{const pdf=fl?await pdfjs.getDocument({data:await fl.arrayBuffer()}).promise:S.src.A&&S.src.A.pdf;if(!pdf)throw new Error('בחר קובץ מקרא (PDF או תמונה)');
   const p=await pdf.getPage(Math.min(pg,pdf.numPages)),v0=p.getViewport({scale:1}),sc=MAX/Math.max(v0.width,v0.height),vp=p.getViewport({scale:sc}),c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
   const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await p.render({canvasContext:x,viewport:vp}).promise;let items=[];
   try{const tc=await p.getTextContent();items=tc.items.filter(i=>i.str.trim()).map(i=>{const m=pdfjs.Util.transform(vp.transform,i.transform),h=Math.max(6,Math.hypot(m[2],m[3]));return{s:i.str,x0:m[4],y0:m[5]-h,x1:m[4]+i.width*sc,y1:m[5]+h*.2}})}catch(_){}L={c,p,sc,items}}
  L.img=L.c.getContext('2d').getImageData(0,0,L.c.width,L.c.height);S.leg=L;S.lg={};S.prevView=S.view;S.view='legend';S.tool='lg';$('#lgt').textContent='מצב: בחירה';$('#lgbar').hidden=false;lgHint();size();fitLeg()}
 catch(e){alert(e.message||e)}$('#prog').hidden=true}
async function lgRect(r){const L=S.leg;
 if(!S.lg.sym){const G=findSymbols({d:L.img.data,w:L.img.width,h:L.img.height},r);if(!G.length){alert('לא נמצאו סמלים במלבן. סמן עמודה שמכילה סמלים בלבד.');return}S.lg={sym:r,G};lgHint();draw();return}
 S.cancel=false;$('#prog').hidden=false;prog('קורא טקסט…',.1);await tick();
 try{let words=L.items.filter(i=>i.x0>=r[0]-2&&i.x1<=r[0]+r[2]+2&&i.y0>=r[1]-2&&i.y1<=r[1]+r[3]+2).map(i=>({s:i.s,x0:i.x0,y0:i.y0,x1:i.x1,y1:i.y1}));
  if(words.length<3)words=await ocrRegion(r);
  const res=pairText(S.lg.G,words),made=[];
  res.forEach((e,i)=>{const[bx,by,bw,bh]=e.box,t=document.createElement('canvas');t.width=bw;t.height=bh;const x=t.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,bw,bh);x.drawImage(L.c,bx,by,bw,bh,0,0,bw,bh);
   made.push({id:'s'+Date.now()+'_'+i,name:e.name||`סמל ${i+1}`,unit:'יח׳',ht:e.ht,tpl:t.toDataURL('image/png'),w:bw,h:bh})});
  act(()=>{for(const s of made)S.sym.push(s)});S.lg={};lgHint();draw();
  alert(`נוספו ${made.length} סמלים. בדוק שמות וגבהים ברשימה (קריאת טקסט אוטומטית עלולה לטעות). אפשר להמשיך לקופסה הבאה במקרא.`)}
 catch(e){if(e!==0)alert('הקריאה נכשלה: '+(e.message||e))}$('#prog').hidden=true;symUI()}
$('#lgb').onclick=openLegend;
$('#lgt').onclick=()=>{S.tool=S.tool==='lg'?'pan':'lg';$('#lgt').textContent=S.tool==='lg'?'מצב: בחירה':'מצב: הזזה'};
$('#lgr').onclick=()=>{S.lg={};lgHint();draw()};
$('#lgc').onclick=()=>{S.leg=null;S.view=S.prevView||'overlay';setTool('pan');$('#lgbar').hidden=true;size();fit()};
/* ---------- wiring ---------- */
['A','B'].forEach(k=>$('#f'+k).onchange=async e=>{try{$('#err').textContent='';await loadSrc(k,e.target.files[0])}catch(x){$('#err').textContent='לא ניתן לקרוא את הקובץ: '+x.message}});
$('#go').onclick=async()=>{const e=$('#err');if(!S.src.A||!S.src.B){e.textContent='יש לבחור קובץ קודם וקובץ חדש';return}
 S.src.A.page=Math.min(S.src.A.pages,Math.max(1,+$('#pgA').value||1));S.src.B.page=Math.min(S.src.B.pages,Math.max(1,+$('#pgB').value||1));
 e.textContent='';S.pid=crypto.randomUUID();await start()};
$('#back').onclick=async()=>{try{await saveProj()}catch(e){}$('#work').hidden=true;$('#home').hidden=false;loadHome()};
$$('#views button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$$('#tools button').forEach(b=>b.onclick=()=>{setTool(b.dataset.t);S.pp=[];if(b.dataset.t==='pts'){setView('side');$('#q').textContent='לחץ על נקודה בתוכנית הקודמת (ימין)'}else draw()});
$('#clrcrop').onclick=()=>{if(S.crop)act(()=>S.crop=null,true)};
loadHome();
$('#un').onclick=undo;$('#re').onclick=redo;$('#lst').onclick=()=>$('#side').classList.toggle('open');$('#flt').onchange=list;
addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||['INPUT','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redo()}});
$('#auto').onclick=()=>run({align:true,regs:false});
['as','ar','ax','ay'].forEach(i=>$('#'+i).onchange=()=>{S.tf={s:(+$('#as').value||100)/100,r:+$('#ar').value||0,x:+$('#ax').value||0,y:+$('#ay').value||0};run({regs:false})});
$('#exl').onclick=e=>{const i=e.target.dataset.x;if(i!=null)act(()=>S.excl.splice(+i,1),true)};
const cfg=(id,key,num)=>$('#'+id).oninput=e=>{S.cfg[key]=num?+e.target.value:e.target.value;if(S.L){if(!num||key==='keep')tint();draw()}};
cfg('co','o');cfg('cn','n');cfg('cm','m');cfg('ao','ao',1);cfg('an','an',1);cfg('am','am',1);
$('#keep').onchange=e=>{S.cfg.keep=e.target.checked;draw()};
let tt;$('#tol').oninput=e=>{$('#tov').textContent=e.target.value;clearTimeout(tt);tt=setTimeout(()=>{S.cfg.tol=+e.target.value;run({})},350)};
$('#inv').onchange=e=>{S.cfg.inv=e.target.checked;run({})};
let bl;$('#blink').onchange=e=>{clearInterval(bl);if(e.target.checked){S.view='flip';$$('#views button').forEach(x=>x.classList.toggle('on',x.dataset.v==='flip'));bl=setInterval(()=>{S.flip=!S.flip;draw()},700)}};
$('#views [data-v=flip]').addEventListener('click',()=>{S.flip=!S.flip;draw()});
$('#pc').onclick=()=>{S.cancel=true;S.abort&&S.abort()};
new ResizeObserver(size).observe($('#stage'));
/* ---------- updates ---------- */
let reg,wait;const setSt=t=>$('#ust').textContent=t;
function showUpd(w){wait=w;$('#upd').hidden=false}
async function initSW(){if(!('serviceWorker'in navigator))return;
 try{reg=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
  if(reg.waiting&&navigator.serviceWorker.controller)showUpd(reg.waiting);
  reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpd(w)})});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(S.updating)location.reload()});
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.ver)$('#uver').textContent=e.data.ver});
  reg.update().catch(()=>{});const r=await navigator.serviceWorker.ready;r.active.postMessage({t:'ver'})}catch(e){}}
$('#updgo').onclick=()=>{if(!$('#work').hidden&&!confirm('עבודה שלא יוצאה תאבד (שמירת פרויקט תתווסף בגרסה הבאה). לעדכן עכשיו?'))return;S.updating=1;wait.postMessage({t:'skip'})};
$('#updx').onclick=()=>$('#upd').hidden=true;
const openSet=()=>{$('#set').showModal();navigator.serviceWorker?.ready.then(r=>r.active.postMessage({t:'ver'}))};
$('#gear').onclick=openSet;$('#gear2').onclick=openSet;$('#setx').onclick=()=>$('#set').close();
$('#chk').onclick=async()=>{setSt('בודק…');try{const r=reg||await navigator.serviceWorker.getRegistration();await r.update();await new Promise(x=>setTimeout(x,2000));
 if(r.waiting){showUpd(r.waiting);setSt('נמצאה גרסה חדשה – לחץ "עדכן" בהודעה');$('#set').close()}else if(r.installing)setSt('מוריד גרסה חדשה… בדוק שוב בעוד רגע');else setSt('הגרסה העדכנית מותקנת')}catch(e){setSt('הבדיקה נכשלה (אין חיבור או שאין שירות עדכונים)')}};
$('#hard').onclick=async()=>{if(!confirm('לנקות מטמון ולטעון מחדש?'))return;try{for(const k of await caches.keys())await caches.delete(k);for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}catch(e){}location.reload()};
addEventListener('load',initSW);
