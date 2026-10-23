// Shared bitmap text presets for the journey and embedded levels.
(()=>{
 const key='peninsula-text-presets-v1';
 const names={large:'Большой текст',small:'Малый текст',technical:'Технический текст',heading:'Заголовок',dialog:'Диалог',buttons:'Кнопки интерфейса',tabs:'Вкладки',data:'Power',stats:'Характеристики',heroDescription:'Описание героя',question:'Вопрос',menu:'Меню'};
 // Text types follow the game zones: screens, character creation, RPG, map and questions.
 const roles={heading:'Заголовок',narrator:'Экран текст',firstScreen:'Текст на первом экране',heroDescription:'Описание героя',stats:'Характеристики',situation:'Ситуация',dialogue:'Диалог',question:'Вопрос',buttons:'Кнопки интерфейса',tabs:'Вкладки',data:'Power',mapFooter:'Текст карты',menu:'Меню'};
 const defaults={assignments:{heading:'heading',narrator:'large',firstScreen:'large',heroDescription:'heroDescription',stats:'stats',situation:'small',dialogue:'dialog',question:'question',buttons:'buttons',tabs:'tabs',data:'data',mapFooter:'small',menu:'menu'},presets:{}};
 for(const [id,size]of Object.entries({large:13,small:10,technical:8,heading:16,dialog:13,buttons:10,tabs:10,data:13,stats:13,heroDescription:10,question:13,menu:10}))defaults.presets[id]={size,align:['heading','buttons','tabs','menu'].includes(id)?'center':'left',padding:['buttons','tabs','menu'].includes(id)?2:5,offset:['buttons','tabs','data'].includes(id)?1:0,uppercase:false,color:'#bec4c9',letterSpacing:0,lineSpacing:id==='stats'?0:2};
 // New presets start from the preset their zone used before, so saved looks are kept.
 const inherits={tabs:'buttons',menu:'buttons'};
 const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.round(Math.max(a,Math.min(b,Number(v)))):d;
 function normalize(value={}){const out=JSON.parse(JSON.stringify(defaults));for(const id of Object.keys(roles))if(names[value.assignments?.[id]])out.assignments[id]=value.assignments[id];for(const id of Object.keys(names)){const v=value.presets?.[id]||value.presets?.[inherits[id]]||{},d=out.presets[id];Object.assign(d,{size:clamp(v.size,5,32,d.size),align:v.align==='center'?'center':v.align==='left'?'left':d.align,padding:clamp(v.padding,0,40,d.padding),offset:clamp(v.offset,-60,60,d.offset),letterSpacing:clamp(v.letterSpacing,0,12,d.letterSpacing),lineSpacing:clamp(v.lineSpacing,-20,32,d.lineSpacing),uppercase:v.uppercase===true,color:/^#[0-9a-f]{6}$/i.test(v.color)?v.color:d.color,gold:v.gold===true,engrave:v.engrave===true,shine:v.shine===true})}
  // Questions used to borrow "Большой текст". Older saves move to their own "Вопрос" preset, which starts as a copy of
  // the big text, so nothing changes on screen but the two can now be set apart.
  if(!value.questionOwn&&(value.assignments?.question||'large')==='large'){out.assignments.question='question';out.presets.question={...out.presets.large}}
  // The title menu is written in capitals with no extra space between its lines; applied once to older saves.
  if(!value.menuCaps){out.presets.menu.uppercase=true;out.presets.menu.lineSpacing=0}
  out.menuCaps=true;
  out.questionOwn=true;return out}
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.textPresets);try{const saved=localStorage.getItem(key);if(saved)state=normalize(JSON.parse(saved))}catch{}
 // Which roles were drawn on the current screen: tagged with the screen counter of the top window (settings-relevance.js).
 const used={},epoch=()=>{try{return window.top.PeninsulaUsageEpoch||0}catch{return 0}};
 const api=window.PeninsulaText={REVEAL_GAP:.7,REVEAL_FADE:.5,names,roles,defaults,normalize,used,get state(){return state},get(role){used[role]=epoch();return state.presets[state.assignments[role]||role]||state.presets.technical},update(value){state=normalize(value);try{localStorage.setItem(key,JSON.stringify(state))}catch{}window.dispatchEvent(new Event('text-presets-change'))},format(s,role){s=String(s);if(api.get(role).uppercase)return s.toLocaleUpperCase('ru');return s.toLocaleLowerCase('ru').replace(/(^|\n|[.!?]\s+)([«"'(\[]*)([а-яёa-z])/g,(_,start,quote,ch)=>start+quote+ch.toLocaleUpperCase('ru'))},metrics(role,fonts){const s=api.get(role),f=fonts[s.size>=16?'unifont':'cozette'];return {s,f,ratio:s.size/f.height,step:Math.max(1,s.size+s.lineSpacing)}},measure(s,role,fonts,prepared=false){const {s:style,f,ratio}=api.metrics(role,fonts),chars=[...(prepared?String(s):api.format(s,role))];return chars.reduce((n,ch)=>n+Math.max(1,Math.round((f.glyphs[ch]?.w||6)*ratio)),0)+Math.max(0,chars.length-1)*style.letterSpacing},lines(s,w,role,fonts){const result=[];for(const para of api.format(s,role).split('\n')){let line='';for(const word of para.split(/\s+/)){if(line&&api.measure(line+' '+word,role,fonts,true)>w){result.push(line);line=''}for(const ch of (line?' ':'')+word){if(line&&api.measure(line+ch,role,fonts,true)>w){result.push(line);line=''}line+=ch}}result.push(line)}return result},line(c,text,x,y,role,fonts,align,prepared=false){const {s,f,ratio}=api.metrics(role,fonts);if(!f.image)return;const original=text;if(!prepared)text=api.text(text);const cache=f.presetAtlases||(f.presetAtlases=new Map());let atlas=cache.get(s.color);if(!atlas){atlas=document.createElement('canvas');atlas.width=f.image.width;atlas.height=f.image.height;const g=atlas.getContext('2d');g.drawImage(f.image,0,0);g.globalCompositeOperation='source-in';g.fillStyle=s.color;g.fillRect(0,0,atlas.width,atlas.height);if(cache.size>32)cache.clear();cache.set(s.color,atlas)}text=prepared?String(text):api.format(text,role);align=align||s.align;let ox=Math.round(x-(align==='center'?api.measure(text,role,fonts,true)/2:align==='right'?api.measure(text,role,fonts,true):0));if(!prepared)api.record(c,original,ox,Math.round(y),api.measure(text,role,fonts,true),s.size,role);c.imageSmoothingEnabled=false;for(const ch of text){const g=f.glyphs[ch]||f.glyphs['?'];if(g&&ch!==' ')c.drawImage(atlas,g.x,g.y,10,f.height,ox,Math.round(y),Math.max(1,Math.round(10*ratio)),s.size);ox+=Math.max(1,Math.round((g?.w||6)*ratio))+s.letterSpacing}},block(c,text,x,y,w,h,role,fonts,reveal=null){api.record(c,text,x,y,w,h,role);text=api.text(text);const {s,step}=api.metrics(role,fonts),pad=Math.min(s.padding,Math.max(0,Math.floor((w-1)/2)));const rows=api.lines(text,w-pad*2,role,fonts);c.save();c.beginPath();c.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));c.clip();const alpha=c.globalAlpha;
  // reveal = seconds since the text appeared: each line then floats up and fades in after the one before.
  rows.forEach((line,i)=>{let rise=0;if(reveal!==null){const a=Math.max(0,Math.min(1,(reveal-i*api.REVEAL_GAP)/api.REVEAL_FADE));if(a<=0)return;c.globalAlpha=alpha*a;rise=Math.round((1-a)*4)}api.line(c,line,s.align==='center'?x+w/2:x+pad,y+s.offset+i*step+rise,role,fonts,undefined,true)});c.restore();return rows.length}};
 // Words changed in the text edit mode replace the original string wherever it is drawn.
 const overridesKey='peninsula-text-overrides-v1';
 const normalizeOverrides=v=>Object.fromEntries(Object.entries(v&&typeof v==='object'?v:{}).filter(([k,t])=>typeof t==='string'&&k.length<=4000&&t.length<=4000));
 let overrides=normalizeOverrides(window.PENINSULA_PROJECT_CONFIG?.textOverrides);try{const saved=localStorage.getItem(overridesKey);if(saved)overrides=normalizeOverrides(JSON.parse(saved))}catch{}
 Object.assign(api,{overridesKey,normalizeOverrides,
  text:s=>{s=String(s);return Object.prototype.hasOwnProperty.call(overrides,s)?overrides[s]:s},
  setOverrides(v){overrides=normalizeOverrides(v);try{localStorage.setItem(overridesKey,JSON.stringify(overrides))}catch{}window.dispatchEvent(new Event('text-presets-change'))},
  setOverride(original,value){const next={...overrides};if(value===null||value===original)delete next[original];else next[original]=value;api.setOverrides(next)},
  // Where each original string was last drawn; a full repaint of a canvas forgets its older positions.
  hits:[],record(c,original,x,y,w,h,role){if(!c?.canvas||!String(original).trim())return;api.hits.push({canvas:c.canvas,original:String(original),x,y,w,h,role});if(api.hits.length>600)api.hits.splice(0,api.hits.length-600)},
  forget(canvas){api.hits=api.hits.filter(h=>h.canvas!==canvas)}});
 Object.defineProperty(api,'overrides',{get:()=>overrides});
 window.addEventListener('storage',e=>{if(e.key===overridesKey){try{overrides=normalizeOverrides(JSON.parse(e.newValue||'{}'));window.dispatchEvent(new Event('text-presets-change'))}catch{}}});
 window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'{}'));window.dispatchEvent(new Event('text-presets-change'))}catch{}}});
})();
// Gold, engraving and a moving shine on the pixel font: the line is drawn as usual into a small canvas,
// then its letter pixels are recoloured top to bottom (light, base colour, dark) with a dark outline,
// "engraved" puts a shadow above-left and a light edge below-right around the letters as if cut into stone,
// and the shine is a soft diagonal light band crossing the letters every few seconds.
(()=>{
 const api=window.PeninsulaText,line=api.line,cache=new Map();
 const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
 const mix=(a,t,k)=>a.map(v=>Math.round(v*(1-k)+t*k));
 function fx(text,role,fonts){const s=api.get(role),key=[text,s.size,s.color,s.letterSpacing,s.gold,s.engrave,role].join('|');let b=cache.get(key);if(b)return b;
  const w=api.measure(text,role,fonts,true)+6,h=s.size+6,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');line(g,text,3,3,role,fonts,'left',true);
  const d=g.getImageData(0,0,w,h),px=d.data,solid=new Uint8Array(w*h);let y0=h,y1=0;
  for(let i=0;i<w*h;i++)if(px[i*4+3]>0){solid[i]=1;const y=i/w|0;y0=Math.min(y0,y);y1=Math.max(y1,y)}
  const base=hex(s.color),out=mix(base,0,.82),at=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&solid[y*w+x];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,o=i*4;let col=null,a=255;
   if(solid[i]){col=base;if(s.gold){const k=(y-y0)/Math.max(1,y1-y0);col=k<.45?mix(base,255,.6*(1-k/.45)):mix(base,0,.5*(k-.45)/.55);if(!at(x,y-1))col=mix(col,255,.45)}}
   else if(s.gold&&(at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1)))col=out;
   else if(s.engrave&&(at(x+1,y+1)||at(x+1,y)||at(x,y+1))){col=[0,0,0];a=120}
   else if(s.engrave&&(at(x-1,y-1)||at(x-1,y)||at(x,y-1))){col=[255,255,255];a=60}
   if(col){px[o]=col[0];px[o+1]=col[1];px[o+2]=col[2];px[o+3]=a}else px[o+3]=0}
  g.putImageData(d,0,0);const mask=document.createElement('canvas');mask.width=w;mask.height=h;const m=mask.getContext('2d'),md=m.createImageData(w,h);for(let i=0;i<w*h;i++)if(solid[i]){md.data[i*4]=md.data[i*4+1]=md.data[i*4+2]=255;md.data[i*4+3]=255}m.putImageData(md,0,0);
  b={canvas:c,mask,w,h};if(cache.size>300)cache.clear();cache.set(key,b);return b}
 const band=document.createElement('canvas'),bg=band.getContext('2d');
 api.line=(c,text,x,y,role,fonts,align,prepared=false)=>{const s=api.get(role);if(!s.gold&&!s.engrave&&!s.shine||!fonts?.cozette?.image)return line(c,text,x,y,role,fonts,align,prepared);
  const original=text;if(!prepared)text=api.text(text);text=prepared?String(text):api.format(text,role);align=align||s.align;const tw=api.measure(text,role,fonts,true);
  const ox=Math.round(x-(align==='center'?tw/2:align==='right'?tw:0));if(!prepared)api.record(c,original,ox,Math.round(y),tw,s.size,role);
  const b=fx(text,role,fonts);c.imageSmoothingEnabled=false;c.drawImage(b.canvas,ox-3,Math.round(y)-3);
  if(s.shine){band.width=b.w;band.height=b.h;bg.clearRect(0,0,b.w,b.h);bg.globalCompositeOperation='source-over';bg.drawImage(b.mask,0,0);bg.globalCompositeOperation='source-in';
   // Every 4 s a band about one letter wide crosses the line at its own pace on screen (screen x), so lines shine in turn.
   const t=performance.now()/4000%1,pos=(t*1.6-.3)*320-(ox-3),wd=s.size*1.2;for(let k=0;k<3;k++){bg.fillStyle='rgba(255,255,240,'+[.22,.5,.22][k]+')';bg.beginPath();const x0=pos+(k-1)*wd/3;bg.moveTo(x0,0);bg.lineTo(x0+wd/3,0);bg.lineTo(x0+wd/3-b.h*.6,b.h);bg.lineTo(x0-b.h*.6,b.h);bg.fill()}
   c.drawImage(band,ox-3,Math.round(y)-3)}};
 // A moving shine needs the picture redrawn even when nothing else moves.
 // Only the full game page does this; embedded levels already redraw every frame.
 if(window.parent===window)setInterval(()=>{if(document.hidden||!Object.values(api.state.presets).some(p=>p.shine)||typeof window.render!=='function')return;try{window.render()}catch{}},120);
})();
