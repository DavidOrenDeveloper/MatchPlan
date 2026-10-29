/* Legend helpers (pure functions, no DOM): height parsing, symbol-column detection, text<->symbol pairing. */
export const HRX=/(?:(?:^|[^A-Za-z0-9])[hH]|גובה|בגובה)\s*[-–—−=:_.~]{0,2}\s*\+?(\d{1,3}(?:[.,]\d{1,2})?)\s*(ס["״]?מ|מ["״]מ|מ'|מטר|cm|mm|m\b)?|(\d{2,3})\s*[-–—−]\s*[hHמ](?![A-Za-z\u0590-\u05FF])/;
export const parseH=t=>{const m=String(t).match(HRX);return m?(m[1]||m[3])+(m[2]?' '+m[2]:''):''};
const heb=s=>(s.match(/[\u0590-\u05FF]/g)||[]).length>s.length/3;
const med=a=>{const s=[...a].sort((p,q)=>p-q);return s.length?s[s.length>>1]:0};
/* r=[x,y,w,h] in image coords: a column containing only symbols. Returns one bbox per symbol (top to bottom). */
export function findSymbols({d,w:W,h:H},r){const[rx,ry,rw,rh]=r.map(Math.round),m=new Uint8Array(rw*rh);
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const i=((ry+y)*W+rx+x)*4;m[y*rw+x]=Math.min(d[i],d[i+1],d[i+2])<200?1:0}
 for(let y=0;y<rh;y++){let s=-1;for(let x=0;x<=rw;x++){const v=x<rw&&m[y*rw+x];if(v&&s<0)s=x;if(!v&&s>=0){if(x-s>rw*.8)for(let k=s;k<x;k++)m[y*rw+k]=0;s=-1}}}
 for(let x=0;x<rw;x++){let s=-1;for(let y=0;y<=rh;y++){const v=y<rh&&m[y*rw+x];if(v&&s<0)s=y;if(!v&&s>=0){if(y-s>rh*.6)for(let k=s;k<y;k++)m[k*rw+x]=0;s=-1}}}
 const cnt=new Int32Array(rh);for(let y=0;y<rh;y++)for(let x=0;x<rw;x++)cnt[y]+=m[y*rw+x];
 const segs=T=>{const o=[];let s=-1,last=-1;for(let y=0;y<rh;y++){if(cnt[y]){if(s<0)s=y;else if(y-last>T){o.push([s,last]);s=y}last=y}}if(s>=0)o.push([s,last]);return o};
 let sg=segs(4);const T=Math.max(4,Math.round(med(sg.map(q=>q[1]-q[0]+1))*.3));sg=segs(T);const out=[];
 for(const[a,b]of sg){let x0=rw,x1=-1,c=0;for(let y=a;y<=b;y++)for(let x=0;x<rw;x++)if(m[y*rw+x]){c++;if(x<x0)x0=x;if(x>x1)x1=x}if(c<8||b-a<4||x1-x0<4)continue;const p=3;
  out.push({x0:Math.max(0,rx+x0-p),y0:Math.max(0,ry+a-p),x1:Math.min(W,rx+x1+p),y1:Math.min(H,ry+b+p)})}return out}
/* words: [{s,x0,y0,x1,y1,c?}] in the same coords. Assign each word to the nearest symbol row. */
export function pairText(G,wordsIn){const words=wordsIn.map(o=>({...o,s:String(o.s).replace(/[\u200e\u200f]/g,'').trim()})).filter(o=>o.s&&(o.c==null||o.c>=35)&&/[\w\u0590-\u05FF]/.test(o.s));
 const mh=med(words.map(o=>o.y1-o.y0))||20,cy=q=>(q.y0+q.y1)/2,gaps=G.slice(1).map((q,i)=>cy(q)-cy(G[i])).filter(v=>v>0),pitch=med(gaps)||mh*5,reach=Math.max(pitch*.55,mh*2),bk=G.map(()=>[]);
 for(const o of words){const c=cy(o);let bi=-1,bd=1e9;G.forEach((q,i)=>{const dd=Math.abs(c-cy(q));if(dd<bd){bd=dd;bi=i}});if(bd<=reach)bk[bi].push(o)}
 return G.map((q,i)=>{const ws=bk[i].sort((p,r)=>cy(p)-cy(r)),lines=[];for(const o of ws){const l=lines[lines.length-1];if(l&&Math.abs(cy(o)-l.cy)<mh*.7)l.w.push(o);else lines.push({cy:cy(o),w:[o]})}
  const txt=lines.map(l=>{const all=l.w.map(o=>o.s).join('');l.w.sort((p,r)=>p.x0-r.x0);return(heb(all)?[...l.w].reverse():l.w).map(o=>o.s).join(' ')}).join(' ');
  return{name:txt.replace(HRX,'').replace(/\s+/g,' ').replace(/^[\s\-–:.,;|]+|[\s\-–:.,;|]+$/g,'').trim(),ht:parseH(txt),box:[q.x0,q.y0,q.x1-q.x0,q.y1-q.y0]}})}
