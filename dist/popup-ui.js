// One native-pixel renderer and geometry for every journey question/message.
// Button size, gap and a shift of the button row (x, y) are set in the settings panel.
// The scene behind stays as it is (no dimming), and the chosen button has no extra inner frame.
(()=>{
 const defaults={width:260,height:150,padding:10,fontSize:13,lineStep:15,buttonWidth:100,buttonHeight:24,gap:8,buttonX:0,buttonY:0};
 const bounds={width:[120,318],height:[60,228],padding:[4,24],lineStep:[13,24],buttonWidth:[50,140],buttonHeight:[12,60],gap:[0,120],buttonX:[-150,150],buttonY:[-220,220]};
 // Width and height are set in game pixels and drawn exactly as set.
 // A window saved with the former "small" size keeps its 200×110 look.
 const normalize=v=>{const out={...defaults};if(v?.size==='small')v={...v,width:200,height:110,size:undefined};for(const [k,[a,b]]of Object.entries(bounds))out[k]=Math.round(Math.max(a,Math.min(b,v?.[k]!==undefined&&v[k]!==''&&Number.isFinite(Number(v[k]))?Number(v[k]):defaults[k])));out.fontSize=Number(v?.fontSize)===16?16:13;return out;};
 let settings=normalize(window.PENINSULA_PROJECT_CONFIG?.popup);try{const saved=localStorage.getItem('peninsula-popup-settings');if(saved)settings=normalize(JSON.parse(saved))}catch{}
 const api=window.PeninsulaPopup={settings,defaults,bounds,normalize,visible:false};
 api.update=v=>{Object.assign(settings,normalize(v));try{localStorage.setItem('peninsula-popup-settings',JSON.stringify(settings))}catch{}api.onchange?.()};
 window.addEventListener('storage',e=>{if(e.key==='peninsula-popup-settings'){try{Object.assign(settings,normalize(JSON.parse(e.newValue||'{}')));api.onchange?.()}catch{}}});
 api.draw=(c,{title='',body='',labels=['Продолжить'],choice=0}={})=>{
  window.PeninsulaPopup.visible=true;const s=settings,role='question',api=PeninsulaText,fonts=currentUI.fonts,style=api.get(role),buttonStyle=api.get('buttons'),step=style.size+style.lineSpacing;
  if(!fonts.cozette?.image)return [];
  const w=s.width,p=Math.max(s.padding,style.padding),bw=Math.min(s.buttonWidth,Math.floor((w-2*p-(labels.length-1)*s.gap)/Math.max(1,labels.length))),bh=Math.max(buttonStyle.size+2,s.buttonHeight);
  const originalTitle=title,originalBody=body;title=currentUI.case(api.text(title));body=currentUI.case(api.text(body));if(title.trim()===body.trim())title='';
  // Blank lines at the start or end of a message only add empty space.
  const trim=rows=>{while(rows.length&&!rows[0].trim())rows.shift();while(rows.length&&!rows.at(-1).trim())rows.pop();return rows};
  const lines=trim(api.lines(body,w-2*p,role,fonts)),titles=trim(api.lines(title,w-2*p,role,fonts)),h=Math.min(228,s.height);
  // The chosen height is exact: low windows shrink the vertical padding, and text that still does not fit is clipped.
  const pv=Math.min(p,Math.max(2,Math.floor((h-bh)/4))),x=Math.round((320-w)/2),y=Math.round((240-h)/2),by=y+h-pv-bh,btnY=Math.max(y+1,Math.min(y+h-bh-1,by+s.buttonY));
  c.save();c.imageSmoothingEnabled=false;currentUI.box(c,x,y,w,h,'#11171c','question');
  {const th=Math.max(0,by-Math.min(s.gap,pv)-y-pv);if(titles.length)api.record(c,originalTitle,x+p,y+pv,w-2*p,Math.min(th,titles.length*step));api.record(c,originalBody,x+p,y+pv+(titles.length?titles.length*step+s.gap:0),w-2*p,Math.max(step,th-(titles.length?titles.length*step+s.gap:0)))}currentUI.clip(c,x+p,y+pv,w-2*p,Math.max(0,by-Math.min(s.gap,pv)-y-pv),()=>{let ty=y+pv+style.offset;const tx=style.align==='center'?160:x+p;for(const line of titles){api.line(c,line,tx,ty,role,fonts,undefined,true);ty+=step}if(titles.length)ty+=s.gap;for(const line of lines){api.line(c,line,tx,ty,role,fonts,undefined,true);ty+=step}});
  const start=Math.round(160-(labels.length*bw+(labels.length-1)*s.gap)/2)+s.buttonX;
  const buttons=labels.map((label,i)=>{const bx=start+i*(bw+s.gap);const by=btnY;currentUI.box(c,bx,by,bw,bh,'#18242b','buttons');currentUI.clip(c,bx+2,by+1,bw-4,bh-2,()=>api.block(c,label,bx,by+Math.floor((bh-buttonStyle.size)/2),bw,bh-Math.floor((bh-buttonStyle.size)/2),'buttons',fonts));return {label,x:bx,y:by,w:bw,h:bh}});c.restore();window.PeninsulaPopup.last={x,y,w,h,buttons};return buttons;
 };
 currentUI.modal=(c,title,body)=>api.draw(c,{title,body})[0];
})();
