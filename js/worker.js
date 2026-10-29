const P=(p,t)=>postMessage({p,t});
const inkOf=(d,n,inv)=>{const m=new Uint8Array(n);for(let i=0,j=0;i<n;i++,j+=4)m[i]=inv?(Math.max(d[j],d[j+1],d[j+2])>80?1:0):(Math.min(d[j],d[j+1],d[j+2])<225?1:0);return m};
function dil(m,w,h,r){if(!r)return m;const t=new Uint8Array(m.length),o=new Uint8Array(m.length),p=new Int32Array(Math.max(w,h)+1);
 for(let y=0;y<h;y++){const b=y*w;for(let x=0;x<w;x++)p[x+1]=p[x]+m[b+x];for(let x=0;x<w;x++)t[b+x]=p[Math.min(w,x+r+1)]-p[Math.max(0,x-r)]>0?1:0}
 for(let x=0;x<w;x++){for(let y=0;y<h;y++)p[y+1]=p[y]+t[y*w+x];for(let y=0;y<h;y++)o[y*w+x]=p[Math.min(h,y+r+1)]-p[Math.max(0,y-r)]>0?1:0}return o}
/* auto-align: scale + translation from row/column ink profiles (no rotation, no local warping) */
function prof(m,w,h){const a=new Float32Array(w),b=new Float32Array(h);for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++)if(m[i]){a[x]++;b[y]++}return[a,b]}
const dec=(a,f)=>{const o=new Float32Array(Math.ceil(a.length/f));for(let i=0;i<a.length;i++)o[i/f|0]+=a[i];return o};
function norm(a){let s=0;for(const v of a)s+=v;s/=a.length;let q=0;const o=a.map(v=>v-s);for(const v of o)q+=v*v;q=Math.sqrt(q)||1;return o.map(v=>v/q)}
function rs(b,cB,cA,s,n){const o=new Float32Array(n);for(let x=0;x<n;x++){const u=(x-cA)/s+cB,i=Math.floor(u),f=u-i;o[x]=(i>=0&&i<b.length?b[i]*(1-f):0)+(i+1>=0&&i+1<b.length?b[i+1]*f:0)}return o}
function xc(a,b,lo,hi){let best=-1e18,bd=0;for(let d=lo;d<=hi;d++){let s=0;const l=Math.max(0,d),h=Math.min(a.length,b.length+d);for(let x=l;x<h;x++)s+=a[x]*b[x-d];if(s>best){best=s;bd=d}}return[bd,best]}
function align(m){const A={width:m.a.w,height:m.a.h},B={width:m.b.w,height:m.b.h},[ax,ay]=prof(inkOf(new Uint8ClampedArray(m.a.d),A.width*A.height,m.inv),A.width,A.height),[bx,by]=prof(inkOf(new Uint8ClampedArray(m.b.d),B.width*B.height,m.inv),B.width,B.height),F=2;
 const cAx=A.width/2,cAy=A.height/2,cBx=B.width/2,cBy=B.height/2,ax2=norm(dec(ax,F)),ay2=norm(dec(ay,F)),bx2=dec(bx,F),by2=dec(by,F);
 let best={sc:-1e9,s:1,dx:0,dy:0};
 for(let i=-25;i<=25;i++){const s=1+i*.01,rx=norm(rs(bx2,cBx/F,cAx/F,s,ax2.length)),ry=norm(rs(by2,cBy/F,cAy/F,s,ay2.length)),
  [dx,sx]=xc(ax2,rx,-Math.round(ax2.length*.15),Math.round(ax2.length*.15)),[dy,sy]=xc(ay2,ry,-Math.round(ay2.length*.15),Math.round(ay2.length*.15));
  if(sx+sy>best.sc)best={sc:sx+sy,s,dx:dx*F,dy:dy*F}}
 const axn=norm(ax),ayn=norm(ay);let fb={sc:-1e9};
 for(let i=-4;i<=4;i++){const s=best.s+i*.0025,rx=norm(rs(bx,cBx,cAx,s,ax.length)),ry=norm(rs(by,cBy,cAy,s,ay.length)),
  [dx,sx]=xc(axn,rx,best.dx-4,best.dx+4),[dy,sy]=xc(ayn,ry,best.dy-4,best.dy+4);if(sx+sy>fb.sc)fb={sc:sx+sy,s,dx,dy}}
 return{s:fb.s,r:0,x:fb.dx,y:fb.dy}}
function regions(f,W,H){const C=24,cw=Math.ceil(W/C),ch=Math.ceil(H/C),g=new Uint8Array(cw*ch);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=f[y*W+x]&3;if(v)g[(y/C|0)*cw+(x/C|0)]|=v}
 const id=new Int32Array(g.length).fill(-1),out=[];
 for(let s=0;s<g.length;s++){if(!g[s]||id[s]>=0)continue;const q=[s];id[s]=out.length;let x0=1e9,y0=1e9,x1=-1,y1=-1,o=0,n=0;
  while(q.length){const c=q.pop(),cx=c%cw,cy=c/cw|0;x0=Math.min(x0,cx);x1=Math.max(x1,cx);y0=Math.min(y0,cy);y1=Math.max(y1,cy);o|=g[c]&1;n|=g[c]>>1&1;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;const j=ny*cw+nx;if(g[j]&&id[j]<0){id[j]=out.length;q.push(j)}}}
  out.push({box:[x0*C-6,y0*C-6,(x1-x0+1)*C+12,(y1-y0+1)*C+12],o,n,st:'todo',note:''})}
 const rb=H/20;out.sort((p,q)=>Math.round(p.box[1]/rb)-Math.round(q.box[1]/rb)||q.box[0]-p.box[0]);
 return out}

function diff(m){const W=m.a.w,H=m.a.h,n=W*H;P(.1,'מחשב קווים…');const a=inkOf(new Uint8ClampedArray(m.a.d),n,m.inv),b=inkOf(new Uint8ClampedArray(m.b.d),n,m.inv);
 for(const[x0,y0,w,h]of m.excl)for(let y=Math.max(0,y0|0);y<Math.min(H,y0+h);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x0+w);x++){a[y*W+x]=0;b[y*W+x]=0}
 if(m.crop){const[cx,cy,cw,ch]=m.crop;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x<cx||y<cy||x>cx+cw||y>cy+ch){a[y*W+x]=0;b[y*W+x]=0}}
 P(.35,'מחשב סבילות…');const t=m.tol,ad=dil(a,W,H,t),bd=dil(b,W,H,t),f=new Uint8Array(n);let ta=0,ma=0,tb=0,mb=0;
 for(let i=0;i<n;i++){if(a[i]){ta++;if(bd[i]){ma++;f[i]|=4}else f[i]|=1}if(b[i]){tb++;if(ad[i])mb++;else f[i]|=2}}
 P(.7,'מקבץ אזורי שינוי…');return{f,q:ta+tb?(ma+mb)/(ta+tb):1,regs:m.regs?regions(f,W,H):null}}
function xf(mk,w,h,s,th,fl){const c=Math.cos(th),sn=Math.sin(th),W=Math.ceil((Math.abs(w*c)+Math.abs(h*sn))*s)+1,H=Math.ceil((Math.abs(w*sn)+Math.abs(h*c))*s)+1,o=new Uint8Array(W*H),q=[-.25,.25];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let v=0;for(const a of q)for(const b of q){const dx=(x+.5+a-W/2)/s,dy=(y+.5+b-H/2)/s;let sx=c*dx+sn*dy+w/2;const sy=-sn*dx+c*dy+h/2;if(fl)sx=w-sx;const ix=sx|0,iy=sy|0;if(sx>=0&&sy>=0&&ix<w&&iy<h&&mk[iy*w+ix])v=1}o[y*W+x]=v}return[o,W,H]}
function detect(m){const SC0={'1':1,m:.75,w:.5}[m.sc]||1,f=Math.min(3,Math.max(2,Math.floor(Math.min(m.tpl.w,m.tpl.h)*SC0/10))),tp=inkOf(new Uint8ClampedArray(m.tpl.d),m.tpl.w*m.tpl.h,m.inv);
 const pool=(mk,w,h)=>{const W=Math.ceil(w/f),H=Math.ceil(h/f),o=new Uint8Array(W*H);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mk[y*w+x])o[(y/f|0)*W+(x/f|0)]=1;return[o,W,H]};
 if(tp.reduce((s,v)=>s+v,0)<12)return{err:'הסמל שנבחר ריק או קטן מדי'};
 const SC={'1':[1],m:[.75,.87,1,1.15,1.33],w:[.5,.6,.7,.85,1,1.2,1.4,1.7,2]}[m.sc]||[1],AN=m.ang==='30'?[0,30,60,90,120,150,180,210,240,270,300,330]:[0,90,180,270],vars=[],seen=new Set();
 for(const s of SC)for(const a of AN)for(const fl of m.mirror?[0,1]:[0]){const[xm,xw,xh]=xf(tp,m.tpl.w,m.tpl.h,s,a*Math.PI/180,fl),[T,W,H]=pool(xm,xw,xh),k=W+'x'+H+':'+T.join('');if(seen.has(k))continue;seen.add(k);const pts=[];for(let i=0;i<T.length;i++)if(T[i])pts.push([i%W,i/W|0]);if(pts.length>=12&&Math.min(W,H)>=4)vars.push({w:W,h:H,pts,rad:Math.max(W,H)*.7})}
 const go=(img,lab)=>{P(lab,'מזהה סמלים…');const[I0,W,H]=pool(inkOf(new Uint8ClampedArray(img.d),img.w*img.h,m.inv),img.w,img.h),I=dil(I0,W,H,1),ii=new Int32Array((W+1)*(H+1));
  for(let y=0;y<H;y++){let s=0;for(let x=0;x<W;x++){s+=I0[y*W+x];ii[(y+1)*(W+1)+x+1]=ii[y*(W+1)+x+1]+s}}
  const cand=[];vars.forEach((v,vi)=>{if(vi%8===0)P(lab+.35*vi/vars.length,'מזהה סמלים…');const{w,h,pts}=v,n=pts.length;for(let y=0;y+h<=H;y++)for(let x=0;x+w<=W;x++){const tot=ii[(y+h)*(W+1)+x+w]-ii[y*(W+1)+x+w]-ii[(y+h)*(W+1)+x]+ii[y*(W+1)+x];if(tot<n*.6||tot>n*1.8)continue;
   let hit=0;for(const[px,py]of pts)hit+=I[(y+py)*W+x+px];const sc=hit/n;if(sc>=m.rec)cand.push([sc-Math.abs(tot-n)/n*.3,x+w/2,y+h/2,v.rad,Math.max(w,h)])}});
  const mr=Math.max(1,...vars.map(v=>v.rad));cand.sort((p,q)=>Math.round(q[3]*2/mr*8)-Math.round(p[3]*2/mr*8)||q[0]-p[0]);const out=[];for(const c of cand){if(out.some(p=>Math.hypot(p.cx-c[1],p.cy-c[2])<p.rad))continue;out.push({cx:c[1],cy:c[2],rad:c[3],x:c[1]*f,y:c[2]*f,r:c[4]*f*.6})}return out};
 return{o:go(m.a,.1),n:go(m.b,.55)}}
onmessage=e=>{const m=e.data;try{if(m.t==='align')postMessage({tf:align(m)});else if(m.t==='detect')postMessage(detect(m));else{const r=diff(m);postMessage(r,[r.f.buffer])}}catch(x){postMessage({err:String(x&&x.message||x)})}};
