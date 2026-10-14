// Pixel cursors at the game's own resolution: one cursor pixel is one game pixel at the current scale.
// Sets --px-arrow, --px-hand, --px-wheel and --px-wait on the page; game CSS and levels use them as cursor values.
(()=>{
 const colors={k:'#000000',w:'#ffffff',g:'#a8b0b8',d:'#3a3a3a',y:'#e8c060'};
 const art={
  arrow:{hot:[0,0],fallback:'default',rows:[
   'k.........',
   'kk........',
   'kwk.......',
   'kwwk......',
   'kwwwk.....',
   'kwwwwk....',
   'kwwwwwk...',
   'kwwwwwwk..',
   'kwwwwwwwk.',
   'kwwwwwkkkk',
   'kwwkwwk...',
   'kwk.kwwk..',
   'kk..kwwk..',
   'k....kwwk.',
   '.....kwwk.',
   '......kk..']},
  hand:{hot:[5,0],fallback:'pointer',rows:[
   '.....kk.......',
   '....kwwk......',
   '....kwwk......',
   '....kwwk......',
   '....kwwkkk....',
   '....kwwkwwkk..',
   '..kkkwwkwwkwk.',
   '.kwwkwwwwwkwwk',
   '.kwwwwwwwwwwwk',
   '..kwwwwwwwwwwk',
   '...kwwwwwwwwwk',
   '...kwwwwwwwwk.',
   '....kwwwwwwwk.',
   '....kkkkkkkkk.']},
  wheel:{hot:[6,6],fallback:'pointer',rows:[
   '....kkkkk....',
   '..kkdddddkk..',
   '.kdddddddddk.',
   '.kddgggggddk.',
   'kddgwgkgwgddk',
   'kddggkkkggddk',
   'kddgkkwkkgddk',
   'kddggkkkggddk',
   'kddgwgkgwgddk',
   '.kddgggggddk.',
   '.kdddddddddk.',
   '..kkdddddkk..',
   '....kkkkk....']},
  wait:{hot:[5,8],fallback:'wait',rows:[
   'kkkkkkkkkkk',
   'kwwwwwwwwwk',
   '.kkkkkkkkk.',
   '.kwyyyyywk.',
   '.kwwyyywwk.',
   '..kwwywwk..',
   '...kwywk...',
   '....kyk....',
   '...kwywk...',
   '..kwwywwk..',
   '.kwwwywwwk.',
   '.kwwyyywwk.',
   '.kwyyyyywk.',
   '.kkkkkkkkk.',
   'kwwwwwwwwwk',
   'kkkkkkkkkkk']}
 };
 // CSS pixels per game pixel: the full game's frame, the parent frame for an embedded level, or the canvas itself.
 function gamePixel(){
  try{const frame=window.frameElement?.closest?.('#frame')||document.querySelector('#frame');if(frame){const v=parseFloat(getComputedStyle(frame).getPropertyValue('--game-pixel'));return v>0?v:frame.getBoundingClientRect().width/320}}catch{}
  const c=document.querySelector('canvas'),w=c?.getBoundingClientRect().width;return w?w/c.width:1;
 }
 function value(kind,device,dpr){
  const a=art[kind],w=Math.max(...a.rows.map(r=>r.length)),h=a.rows.length,c=document.createElement('canvas');
  c.width=w*device;c.height=h*device;const g=c.getContext('2d');
  a.rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(colors[ch]){g.fillStyle=colors[ch];g.fillRect(x*device,y*device,device,device)}}));
  const url='url("'+c.toDataURL()+'")',hx=Math.round(a.hot[0]*device/dpr),hy=Math.round(a.hot[1]*device/dpr);
  // image-set keeps every cursor pixel on whole screen pixels on high-density displays.
  for(const v of ['image-set('+url+' '+dpr+'x) '+hx+' '+hy+', '+a.fallback,'-webkit-image-set('+url+' '+dpr+'x) '+hx+' '+hy+', '+a.fallback])if(window.CSS?.supports?.('cursor',v))return v;
  return url+' '+Math.round(a.hot[0]*device)+' '+Math.round(a.hot[1]*device)+', '+a.fallback;
 }
 let key='';
 function update(){
  const dpr=window.devicePixelRatio||1,gp=gamePixel(),device=Math.max(1,Math.min(Math.floor(128*dpr/16),Math.round(gp*dpr))),next=device+'@'+dpr;
  if(next===key)return;key=next;
  for(const kind of Object.keys(art))document.documentElement.style.setProperty('--px-'+kind,value(kind,device,dpr));
 }
 // While the full game loads a level or travels, the cursor over the game is an hourglass.
 function busy(){document.documentElement.classList.toggle('game-busy',!!window.peninsulaBusy?.())}
 const css=document.createElement('style');
 css.textContent='#frame,#frame canvas,#controls,canvas{cursor:var(--px-arrow,default)}'+
  '#controls .hotspot{cursor:var(--px-hand,pointer)}#controls .hotspot.map-point{cursor:var(--px-wheel,pointer)}#controls .hotspot.hotspot-full{cursor:var(--px-arrow,default)}'+
  'html.game-busy #frame,html.game-busy #frame *{cursor:var(--px-wait,wait)!important}';
 document.head.append(css);
 update();setInterval(()=>{update();busy()},250);window.addEventListener('resize',update);
 window.PeninsulaCursor={update,art};
})();
