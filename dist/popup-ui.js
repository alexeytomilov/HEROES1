// One native-pixel renderer and geometry for every journey question/message.
(()=>{
 const defaults={width:260,height:150,padding:10,fontSize:13,lineStep:15,buttonWidth:100,buttonHeight:24,gap:8};
 const bounds={width:[180,308],height:[110,228],padding:[4,24],lineStep:[13,24],buttonWidth:[50,140],buttonHeight:[18,40],gap:[4,20]};
 const normalize=v=>{const out={...defaults};for(const [k,[a,b]]of Object.entries(bounds))out[k]=Math.round(Math.max(a,Math.min(b,Number(v?.[k])||defaults[k])));out.fontSize=Number(v?.fontSize)===16?16:13;return out;};
 let settings={...defaults};try{settings=normalize(JSON.parse(localStorage.getItem('peninsula-popup-settings')||'{}'))}catch{}
 const api=window.PeninsulaPopup={settings,defaults,bounds,normalize};
 api.update=v=>{Object.assign(settings,normalize(v));try{localStorage.setItem('peninsula-popup-settings',JSON.stringify(settings))}catch{}api.onchange?.()};
 window.addEventListener('storage',e=>{if(e.key==='peninsula-popup-settings'){try{Object.assign(settings,normalize(JSON.parse(e.newValue||'{}')));api.onchange?.()}catch{}}});
 api.draw=(c,{title='',body='',labels=['Продолжить'],choice=0}={})=>{
  const s=settings,role='question',api=PeninsulaText,fonts=currentUI.fonts,style=api.get(role),step=style.size+2;
  if(!fonts.cozette?.image)return [];
  const w=s.width,p=Math.max(s.padding,style.padding),bw=Math.min(s.buttonWidth,Math.floor((w-2*p-(labels.length-1)*s.gap)/Math.max(1,labels.length))),bh=Math.max(20,style.size+6,s.buttonHeight);
  title=currentUI.case(title);body=currentUI.case(body);if(title.trim()===body.trim())title='';
  const lines=api.lines(body,w-2*p,role,fonts),titles=api.lines(title,w-2*p,role,fonts),h=Math.min(228,Math.max(s.height,2*p+(titles.length+lines.length)*step+(titles.length?s.gap:0)+s.gap+bh));
  const x=Math.round((320-w)/2),y=Math.round((240-h)/2),by=y+h-p-bh;
  c.save();c.imageSmoothingEnabled=false;c.fillStyle='#00000099';c.fillRect(0,22,320,218);currentUI.box(c,x,y,w,h,'#11171c');
  currentUI.clip(c,x+p,y+p,w-2*p,Math.max(0,by-s.gap-y-p),()=>{let ty=y+p+style.offset;const tx=style.align==='center'?160:x+p;for(const line of titles){api.line(c,line,tx,ty,role,fonts,undefined,true);ty+=step}if(titles.length)ty+=s.gap;for(const line of lines){api.line(c,line,tx,ty,role,fonts,undefined,true);ty+=step}});
  const start=Math.round(160-(labels.length*bw+(labels.length-1)*s.gap)/2);
  const buttons=labels.map((label,i)=>{const bx=start+i*(bw+s.gap);currentUI.box(c,bx,by,bw,bh,choice===i?'#394954':'#18242b');currentUI.clip(c,bx+2,by+1,bw-4,bh-2,()=>api.line(c,label,bx+bw/2,by+Math.floor((bh-style.size)/2),role,fonts,'center'));return {label,x:bx,y:by,w:bw,h:bh}});c.restore();api.last={x,y,w,h,buttons};return buttons;
 };
 currentUI.modal=(c,title,body)=>api.draw(c,{title,body})[0];
})();
