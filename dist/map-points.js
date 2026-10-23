// Points on the big world map: size, rim width, rounding of the rim and of the point (0 — square, 100 — circle),
// rim colour and point colours for a place not yet visited, the chosen place and a visited place.
// Stored with the colour settings (exported with them); the panel «Точки на большой карте» shows on the map screen.
(()=>{
 const C=window.PeninsulaColors;if(!C)return;
 const defaults={size:7,ring:1,roundOut:0,roundIn:0,ringColor:'#000000',fill:'#d7b574',selected:'#f1d39a',visited:'#84b5a7'};
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 const n=(x,a,b,d)=>Number.isFinite(Number(x))?Math.max(a,Math.min(b,Math.round(Number(x)))):d;
 const get=()=>{const m=C.state.mapPoints||{};return {size:n(m.size,3,25,defaults.size),ring:n(m.ring,0,8,defaults.ring),roundOut:n(m.roundOut,0,100,defaults.roundOut),roundIn:n(m.roundIn,0,100,defaults.roundIn),
  ...Object.fromEntries(['ringColor','fill','selected','visited'].map(k=>[k,hex(m[k])?m[k]:defaults[k]]))}};
 // A d×d square centred on (cx, cy) with corners rounded by round % (100 = circle), in whole pixels.
 function shape(c,cx,cy,d,round,col){if(d<1)return;const h=d/2,r=round/100*h,x0=Math.round(cx-h+.5),y0=Math.round(cy-h+.5);c.fillStyle=col;
  for(let j=0;j<d;j++){let a=-1,b=-1;for(let i=0;i<d;i++){const dx=Math.max(0,Math.abs(i+.5-h)-(h-r)),dy=Math.max(0,Math.abs(j+.5-h)-(h-r));if(dx*dx+dy*dy<=r*r+.01){if(a<0)a=i;b=i}}if(a>=0)c.fillRect(x0+a,y0+j,b-a+1,1)}}
 window.PeninsulaMapPoints={defaults,get,
  draw(c,x,y,state){const m=get();shape(c,x,y,m.size,m.roundOut,m.ringColor);shape(c,x,y,m.size-2*m.ring,m.roundIn,state==='visited'?m.visited:state==='selected'?m.selected:m.fill)},
  hitSize:()=>Math.max(13,get().size+4)};
 // Panel under the colour settings, only while the map is on screen.
 const after=document.querySelector('#color-settings');if(!after)return;
 const host=document.createElement('section');host.id='map-points-settings';host.setAttribute('aria-label','Точки на большой карте');host.hidden=true;after.after(host);
 const num=(k,l,a,b)=>'<label>'+l+'<div class="texture-control"><input data-mp="'+k+'" type="range" min="'+a+'" max="'+b+'" step="1"><input aria-label="'+l+'" data-mp="'+k+'" type="number" min="'+a+'" max="'+b+'" step="1"></div></label>';
 const col=(k,l)=>'<label>'+l+'<input data-mp="'+k+'" type="color"></label>';
 host.innerHTML='<h2>Точки на большой карте</h2>'+num('size','Размер, px',3,25)+num('ring','Толщина ободка, px',0,8)+num('roundOut','Скругление ободка (квадрат — круг)',0,100)+num('roundIn','Скругление точки (квадрат — круг)',0,100)+
  col('ringColor','Цвет ободка')+col('fill','Цвет точки')+col('selected','Цвет выбранной точки')+col('visited','Цвет пройденной точки')+'<button type="button" data-mp-reset>Вернуть как было</button>';
 function sync(){const m=get();for(const e of host.querySelectorAll('[data-mp]'))if(e!==document.activeElement||e.type!=='number')e.value=m[e.dataset.mp]}
 host.addEventListener('input',e=>{const k=e.target.dataset.mp;if(!k||e.target.value==='')return;const v=JSON.parse(JSON.stringify(C.state));v.mapPoints={...get(),[k]:e.target.type==='color'?e.target.value:Number(e.target.value)};C.update(v)});
 host.addEventListener('click',e=>{if(!e.target.closest('[data-mp-reset]'))return;const v=JSON.parse(JSON.stringify(C.state));v.mapPoints={...defaults};C.update(v)});
 window.addEventListener('color-presets-change',sync);sync();
 setInterval(()=>{const on=window.journey?.snapshot?.().screen==='map';if(host.hidden===on)host.hidden=!on},400);
})();
