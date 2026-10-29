/* Vector comparison PDF: the new plan stays vector (recoloured as "common"), differences are overlaid. Needs PDFLib. */
const hex=h=>{const n=parseInt(h.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
export async function buildVector(L,o){const{PDFDocument,rgb,degrees,BlendMode,StandardFonts}=L,out=await PDFDocument.create();
 const R=o.R,scA=o.scA,pw=R[2]/scA,ph=R[3]/scA,hd=o.hdPx/scA,page=out.addPage([pw,ph+hd]);
 page.drawRectangle({x:0,y:0,width:pw,height:ph,color:rgb(1,1,1)});
 if(!o.noBase){const src=await PDFDocument.load(o.bBytes,{ignoreEncryption:true});if(src.getPage(o.bPage-1).getRotation().angle%360!==0)throw new Error('ROT');
  const[bp]=await out.embedPdf(src,[o.bPage-1]);if(Math.abs(bp.width-o.bW)>2||Math.abs(bp.height-o.bH)>2)throw new Error('DIM');
  const t=o.tf,r=t.r*Math.PI/180,c=Math.cos(r),s=Math.sin(r),P=(bx,by)=>{const dx=bx*o.scB-o.B.w/2,dy=(o.bH-by)*o.scB-o.B.h/2,X=o.A.w/2+t.x+t.s*(c*dx-s*dy),Y=o.A.h/2+t.y+t.s*(s*dx+c*dy);return[(X-R[0])/scA,(R[1]+R[3]-Y)/scA]};
  const p0=P(0,0),p1=P(1,0),k=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),ang=Math.atan2(p1[1]-p0[1],p1[0]-p0[0])*180/Math.PI;
  page.drawPage(bp,{x:p0[0],y:p0[1],xScale:k,yScale:k,rotate:degrees(ang)});
  if(!o.keep){const m=hex(o.cm),a=o.am,col=rgb(1-(1-m[0])*a,1-(1-m[1])*a,1-(1-m[2])*a);page.drawRectangle({x:0,y:0,width:pw,height:ph,color:col,blendMode:BlendMode.Lighten})}}
 if(o.overlayPng){const im=await out.embedPng(o.overlayPng);page.drawImage(im,{x:0,y:0,width:pw,height:ph})}
 const font=await out.embedFont(StandardFonts.HelveticaBold),fs=Math.max(7,pw/170);
 o.regs.forEach((q,i)=>{const[bx,by,bw,bh]=q.box;if(bx>R[0]+R[2]||by>R[1]+R[3]||bx+bw<R[0]||by+bh<R[1])return;const x=(bx-R[0])/scA,y=(R[1]+R[3]-by-bh)/scA,col=hex(q.color),cc=rgb(col[0],col[1],col[2]);
  page.drawRectangle({x,y,width:bw/scA,height:bh/scA,borderColor:cc,borderWidth:Math.max(.8,pw/900)});page.drawText(String(i+1),{x,y:y+bh/scA+2,size:fs,font,color:cc})});
 if(o.headerPng){const im=await out.embedPng(o.headerPng);page.drawImage(im,{x:0,y:ph,width:pw,height:hd})}
 return out}
