// «Точки на карте телефона»: its own panel under the race colours, shown while a race is open. Size, rim width,
// rounding of the rim and of the inner point (0 — square, 100 — circle), and the rim and point colours of the two
// points on the phone map. Stored with the race edits, so the race page updates at once and the export keeps them.
(()=>{
 const R=window.PeninsulaRace,extra=document.querySelector('#race-extra');if(!R||!extra)return;
 const host=document.createElement('section');host.id='phone-map-settings';host.className='phone-map-settings';host.setAttribute('aria-label','Точки на карте телефона');extra.after(host);
 const num=(k,l,a,b)=>'<label>'+l+'<div class="texture-control"><input data-mk="'+k+'" type="range" min="'+a+'" max="'+b+'" step="1"><input aria-label="'+l+'" data-mk="'+k+'" type="number" min="'+a+'" max="'+b+'" step="1"></div></label>';
 const col=(i,k,l)=>'<label class="race-color">'+l+'<input data-mk="points.'+i+'.'+k+'" type="color"></label>';
 host.innerHTML='<h2>Точки на карте телефона</h2>'+num('size','Размер, px',3,21)+num('ring','Толщина ободка, px',0,8)+num('roundOut','Скругление ободка (квадрат — круг)',0,100)+num('roundIn','Скругление точки (квадрат — круг)',0,100)+
  [0,1].map(i=>'<h3>Точка '+(i+1)+'</h3>'+col(i,'ring','Цвет ободка')+col(i,'fill','Цвет точки')).join('')+'<button type="button" data-mk-reset>Вернуть как было</button>';
 const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
 function sync(){const m=R.markers();for(const e of host.querySelectorAll('[data-mk]'))if(e!==document.activeElement||e.type!=='number')e.value=get(m,e.dataset.mk)}
 host.addEventListener('input',e=>{const p=e.target.dataset.mk;if(!p||e.target.value==='')return;const v=JSON.parse(JSON.stringify(R.state));const keys=p.split('.'),last=keys.pop(),o=keys.reduce((a,k)=>a[k],v.markers);o[last]=e.target.type==='color'?e.target.value:Number(e.target.value);R.update(v)});
 host.addEventListener('click',e=>{if(!e.target.closest('[data-mk-reset]'))return;const v=JSON.parse(JSON.stringify(R.state));v.markers=JSON.parse(JSON.stringify(R.markerDefaults));R.update(v)});
 window.addEventListener('race-edits-change',sync);sync();
 // Shown together with the race colours panel.
 setInterval(()=>{if(host.hidden!==extra.hidden)host.hidden=extra.hidden},400);
})();
