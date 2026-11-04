/* Compare-mode mask computation, off the main thread. Same algorithm as the in-page diffMasks. */
function win(m,W,H,r,e){if(r<1)return m;const v0=e?1:0,n=2*r+1,t=new Uint8Array(W*H),o=new Uint8Array(W*H);
 for(let y=0;y<H;y++){const b=y*W;let c=0;for(let i=-r;i<=r;i++)c+=i<0||i>=W?v0:m[b+i];
  for(let x=0;x<W;x++){t[b+x]=e?(c===n?1:0):(c>0?1:0);const a=x+r+1,q=x-r;c+=(a>=W?v0:m[b+a])-(q<0?v0:m[b+q])}}
 const cnt=new Int32Array(W);for(let x=0;x<W;x++){let c=0;for(let i=-r;i<=r;i++)c+=i<0||i>=H?v0:t[i*W+x];cnt[x]=c}
 for(let y=0;y<H;y++){const b=y*W;for(let x=0;x<W;x++)o[b+x]=e?(cnt[x]===n?1:0):(cnt[x]>0?1:0);
  const a=y+r+1,q=y-r;for(let x=0;x<W;x++)cnt[x]+=(a>=H?v0:t[a*W+x])-(q<0?v0:t[q*W+x])}
 return o}
function despeck(m,W,H,minPx){if(minPx<2)return m;const dm=win(m,W,H,2),seen=new Uint8Array(W*H),st=new Int32Array(W*H),buf=new Int32Array(W*H);
 for(let s0=0;s0<dm.length;s0++){if(!dm[s0]||seen[s0])continue;let sp=0,bn=0,n=0;st[sp++]=s0;seen[s0]=1;
  while(sp){const p=st[--sp];buf[bn++]=p;if(m[p])n++;const x=p%W;
   if(x>0&&dm[p-1]&&!seen[p-1]){seen[p-1]=1;st[sp++]=p-1}if(x<W-1&&dm[p+1]&&!seen[p+1]){seen[p+1]=1;st[sp++]=p+1}
   if(p>=W&&dm[p-W]&&!seen[p-W]){seen[p-W]=1;st[sp++]=p-W}if(p+W<dm.length&&dm[p+W]&&!seen[p+W]){seen[p+W]=1;st[sp++]=p+W}}
  if(n<minPx)for(let i=0;i<bn;i++)m[buf[i]]=0}
 return m}
function dark(c){const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,m=new Uint8Array(W*H);for(let i=0,j=0;j<m.length;i+=4,j++)m[j]=255-((d[i]+d[i+1]+d[i+2])/3|0);return m}
function bin(d){const m=new Uint8Array(d.length);for(let i=0;i<d.length;i++)m[i]=d[i]>20?1:0;return m}
function grow(seed,mask,W,H,n){let c=seed;for(let i=0;i<Math.min(n,12);i++){const d=win(c,W,H,1),o=new Uint8Array(W*H);for(let k=0;k<o.length;k++)o[k]=d[k]&&mask[k]?1:0;c=o}return c}

function run(m){const{W,H,dA,dB}=m,n=W*H,A=bin(dA),B=bin(dB),f=m.f,s=m.s,r=v=>Math.min(30,Math.round(v*f*s)),g=Math.ceil(r(m.gap)/2),t=Math.max(m.tol>0?1:0,r(m.tol));
 let Ac=A,Bc=B;if(g>0){Ac=win(win(A,W,H,g),W,H,g,1);Bc=win(win(B,W,H,g),W,H,g,1)}
 const Ad=win(Ac,W,H,t),Bd=win(Bc,W,H,t);let R=new Uint8Array(n),D=new Uint8Array(n);
 for(let i=0;i<n;i++){R[i]=A[i]&&!Bd[i]?1:0;D[i]=B[i]&&!Ad[i]?1:0}
 const mn=Math.round(m.mn*f*s*2);despeck(R,W,H,mn);despeck(D,W,H,mn);
 /* a stroke that crosses an unchanged line stays whole: grow real changes back along ink that is not exactly on the other drawing */
 if(t>1){const A1=win(A,W,H,1),B1=win(B,W,H,1),MR=new Uint8Array(n),MD=new Uint8Array(n);for(let i=0;i<n;i++){MR[i]=A[i]&&!B1[i]?1:0;MD[i]=B[i]&&!A1[i]?1:0}R=grow(R,MR,W,H,t);D=grow(D,MD,W,H,t)}
 const bridge=(M,Src)=>{const o=M.slice();for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){const i=y*W+x;if(M[i]||!Src[i])continue;if(((M[i-1]||M[i-2]||M[i-3])&&(M[i+1]||M[i+2]||M[i+3]))||((M[i-W]||M[i-2*W]||M[i-3*W])&&(M[i+W]||M[i+2*W]||M[i+3*W])))o[i]=1}return o};
 R=bridge(R,A);D=bridge(D,B);
 return{R,D}}

onmessage=e=>{try{const r=run(e.data);postMessage({q:e.data.q,R:r.R,D:r.D},[r.R.buffer,r.D.buffer])}catch(x){postMessage({q:e.data.q,err:String(x&&x.message||x)})}};
