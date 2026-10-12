// Shared surface styles; scenery and portraits remain image assets.
(()=>{
 const key='peninsula-color-presets-v1';
 const names={heading:'Заголовок',situation:'Ситуация',buttons:'Кнопка',dialogue:'Диалог',narrator:'Текст рассказчика',default:'Дефолт',heroDescription:'Описание героя',storyImage:'Экран'};
 const defaults=Object.fromEntries(Object.keys(names).map(id=>[id,{background:['heading','situation','heroDescription'].includes(id)?'#293640':id==='buttons'?'#655848':'#11171c',textureOpacity:0,border:'#91a1ad'}]));
 const color=(v,d)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:d;
 function normalize(value={}){return Object.fromEntries(Object.entries(defaults).map(([id,d])=>{const v=value?.[id]||{};return [id,{background:color(v.background,d.background),border:color(v.border,d.border),textureOpacity:v.textureOpacity!==null&&v.textureOpacity!==undefined&&Number.isFinite(Number(v.textureOpacity))?Math.round(Math.max(0,Math.min(100,Number(v.textureOpacity)))):d.textureOpacity}]}))}
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.colors);try{const saved=localStorage.getItem(key);if(saved)state=normalize(JSON.parse(saved))}catch{}
 const texture=new Image();texture.onload=()=>window.dispatchEvent(new Event('color-presets-change'));texture.src='assets/latest-stone.png';
 const api=window.PeninsulaColors={key,names,defaults,normalize,get state(){return state},get(role){return state[role]||state.default},
  update(value){state=normalize(value);try{localStorage.setItem(key,JSON.stringify(state))}catch{}window.dispatchEvent(new Event('color-presets-change'))},
  // Geometry is a fallback for exported layout nodes without semantic names.
  role(n){const name=n.name||'';if(n.x===1&&n.y===1&&n.w===318&&n.h===152&&(n.fills||[]).some(p=>p.type==='IMAGE'))return 'storyImage';if(/Описание героя/i.test(name))return 'heroDescription';if(/Кнопка/i.test(name))return 'buttons';if(n.y<=1&&n.h<=22&&n.w>=300)return 'heading';if(/Ситуация/i.test(name)||n.x===198&&n.y===22&&n.w===115&&n.h===138)return 'situation';if(/Диалог/i.test(name)||n.x<=8&&n.y>=161&&n.w===190&&n.h>=28)return 'dialogue';if(n.x<=1&&n.y>=153&&n.w>=318&&n.h>=80)return 'narrator';if(n.x>=118&&n.x<198&&n.y>=161&&n.h<=22)return 'buttons';return 'default'},
  outline(c,x,y,w,h,role='default',weight=1){const s=api.get(role);[x,y,w,h]=[x,y,w,h].map(Math.round);c.save();c.fillStyle=s.border;c.fillRect(x,y,w,weight);c.fillRect(x,y+h-weight,w,weight);c.fillRect(x,y,weight,h);c.fillRect(x+w-weight,y,weight,h);c.restore()},
  fill(c,x,y,w,h,role='default'){const s=api.get(role);[x,y,w,h]=[x,y,w,h].map(Math.round);if(w<=0||h<=0)return;c.save();c.imageSmoothingEnabled=false;c.fillStyle=s.background;c.fillRect(x,y,w,h);if(s.textureOpacity>0&&texture.complete&&texture.naturalWidth){c.beginPath();c.rect(x,y,w,h);c.clip();c.globalAlpha*=s.textureOpacity/100;const tw=texture.naturalWidth,th=texture.naturalHeight;for(let dy=y;dy<y+h;dy+=th)for(let dx=x;dx<x+w;dx+=tw)c.drawImage(texture,dx,dy)}c.restore()},
  box(c,x,y,w,h,role='default'){api.fill(c,x,y,w,h,role);api.outline(c,x,y,w,h,role)}
 };
 window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'{}'));window.dispatchEvent(new Event('color-presets-change'))}catch{}}});
})();
