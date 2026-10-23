// Shared bitmap text presets for the journey and embedded levels.
(()=>{
 const key='peninsula-text-presets-v1';
 const names={large:'Большой текст',small:'Малый текст',technical:'Технический текст',heading:'Заголовок',dialog:'Диалог',buttons:'Кнопки интерфейса',tabs:'Вкладки',data:'Power',stats:'Характеристики',heroDescription:'Описание героя',question:'Вопрос'};
 // Text types follow the game zones: screens, character creation, RPG, map and questions.
 const roles={heading:'Заголовок',narrator:'Экран текст',firstScreen:'Текст на первом экране',heroDescription:'Описание героя',stats:'Характеристики',situation:'Ситуация',dialogue:'Диалог',question:'Вопрос',buttons:'Кнопки интерфейса',tabs:'Вкладки',data:'Power',mapFooter:'Текст карты'};
 const defaults={assignments:{heading:'heading',narrator:'large',firstScreen:'large',heroDescription:'heroDescription',stats:'stats',situation:'small',dialogue:'dialog',question:'question',buttons:'buttons',tabs:'tabs',data:'data',mapFooter:'small'},presets:{}};
 for(const [id,size]of Object.entries({large:13,small:10,technical:8,heading:16,dialog:13,buttons:10,tabs:10,data:13,stats:13,heroDescription:10,question:13}))defaults.presets[id]={size,align:['heading','buttons','tabs'].includes(id)?'center':'left',padding:['buttons','tabs'].includes(id)?2:5,offset:['buttons','tabs','data'].includes(id)?1:0,uppercase:false,color:'#bec4c9',letterSpacing:0,lineSpacing:id==='stats'?0:2};
 // New presets start from the preset their zone used before, so saved looks are kept.
 const inherits={tabs:'buttons'};
 // Bitmap pixel fonts by default; a preset can instead use a decorative web font with Cyrillic, drawn crisp
 // (alpha cut at half, no smoothing), optionally in gold with a dark outline (text-fonts at the end of this file).
 const FONTS={pixel:['Пиксельный',null],ruslan:['Вязь','Ruslan Display'],marck:['Рукописный','Marck Script'],lobster:['Каллиграфия','Lobster'],yeseva:['Антиква','Yeseva One'],cormorant:['Узкая антиква','Cormorant SC']};
 const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.round(Math.max(a,Math.min(b,Number(v)))):d;
 function normalize(value={}){const out=JSON.parse(JSON.stringify(defaults));for(const id of Object.keys(roles))if(names[value.assignments?.[id]])out.assignments[id]=value.assignments[id];for(const id of Object.keys(names)){const v=value.presets?.[id]||value.presets?.[inherits[id]]||{},d=out.presets[id];Object.assign(d,{size:clamp(v.size,5,32,d.size),align:v.align==='center'?'center':v.align==='left'?'left':d.align,padding:clamp(v.padding,0,40,d.padding),offset:clamp(v.offset,-60,60,d.offset),letterSpacing:clamp(v.letterSpacing,0,12,d.letterSpacing),lineSpacing:clamp(v.lineSpacing,0,32,d.lineSpacing),uppercase:v.uppercase===true,color:/^#[0-9a-f]{6}$/i.test(v.color)?v.color:d.color,font:FONTS[v.font]?v.font:'pixel',gold:v.gold===true})}
  // Questions used to borrow "Большой текст". Older saves move to their own "Вопрос" preset, which starts as a copy of
  // the big text, so nothing changes on screen but the two can now be set apart.
  if(!value.questionOwn&&(value.assignments?.question||'large')==='large'){out.assignments.question='question';out.presets.question={...out.presets.large}}
  out.questionOwn=true;return out}
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.textPresets);try{const saved=localStorage.getItem(key);if(saved)state=normalize(JSON.parse(saved))}catch{}
 // Which roles were drawn on the current screen: tagged with the screen counter of the top window (settings-relevance.js).
 const used={},epoch=()=>{try{return window.top.PeninsulaUsageEpoch||0}catch{return 0}};
 const api=window.PeninsulaText={names,roles,defaults,normalize,used,FONTS,get state(){return state},get(role){used[role]=epoch();return state.presets[state.assignments[role]||role]||state.presets.technical},update(value){state=normalize(value);try{localStorage.setItem(key,JSON.stringify(state))}catch{}window.dispatchEvent(new Event('text-presets-change'))},format(s,role){s=String(s);if(api.get(role).uppercase)return s.toLocaleUpperCase('ru');return s.toLocaleLowerCase('ru').replace(/(^|\n|[.!?]\s+)([«"'(\[]*)([а-яёa-z])/g,(_,start,quote,ch)=>start+quote+ch.toLocaleUpperCase('ru'))},metrics(role,fonts){const s=api.get(role),f=fonts[s.size>=16?'unifont':'cozette'];return {s,f,ratio:s.size/f.height,step:s.size+s.lineSpacing}},measure(s,role,fonts,prepared=false){const {s:style,f,ratio}=api.metrics(role,fonts),chars=[...(prepared?String(s):api.format(s,role))];return chars.reduce((n,ch)=>n+Math.max(1,Math.round((f.glyphs[ch]?.w||6)*ratio)),0)+Math.max(0,chars.length-1)*style.letterSpacing},lines(s,w,role,fonts){const result=[];for(const para of api.format(s,role).split('\n')){let line='';for(const word of para.split(/\s+/)){if(line&&api.measure(line+' '+word,role,fonts,true)>w){result.push(line);line=''}for(const ch of (line?' ':'')+word){if(line&&api.measure(line+ch,role,fonts,true)>w){result.push(line);line=''}line+=ch}}result.push(line)}return result},line(c,text,x,y,role,fonts,align,prepared=false){const {s,f,ratio}=api.metrics(role,fonts);if(!f.image)return;const original=text;if(!prepared)text=api.text(text);const cache=f.presetAtlases||(f.presetAtlases=new Map());let atlas=cache.get(s.color);if(!atlas){atlas=document.createElement('canvas');atlas.width=f.image.width;atlas.height=f.image.height;const g=atlas.getContext('2d');g.drawImage(f.image,0,0);g.globalCompositeOperation='source-in';g.fillStyle=s.color;g.fillRect(0,0,atlas.width,atlas.height);if(cache.size>32)cache.clear();cache.set(s.color,atlas)}text=prepared?String(text):api.format(text,role);align=align||s.align;let ox=Math.round(x-(align==='center'?api.measure(text,role,fonts,true)/2:align==='right'?api.measure(text,role,fonts,true):0));if(!prepared)api.record(c,original,ox,Math.round(y),api.measure(text,role,fonts,true),s.size,role);c.imageSmoothingEnabled=false;for(const ch of text){const g=f.glyphs[ch]||f.glyphs['?'];if(g&&ch!==' ')c.drawImage(atlas,g.x,g.y,10,f.height,ox,Math.round(y),Math.max(1,Math.round(10*ratio)),s.size);ox+=Math.max(1,Math.round((g?.w||6)*ratio))+s.letterSpacing}},block(c,text,x,y,w,h,role,fonts){api.record(c,text,x,y,w,h,role);text=api.text(text);const {s,step}=api.metrics(role,fonts),pad=Math.min(s.padding,Math.max(0,Math.floor((w-1)/2)));const rows=api.lines(text,w-pad*2,role,fonts);c.save();c.beginPath();c.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));c.clip();rows.forEach((line,i)=>api.line(c,line,s.align==='center'?x+w/2:x+pad,y+s.offset+i*step,role,fonts,undefined,true));c.restore();return rows.length}};
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
// Decorative fonts for text presets: measured and drawn with the canvas text engine, then cut to hard pixels.
(()=>{
 const api=window.PeninsulaText,FONTS=api.FONTS;if(!FONTS)return;
 if(!document.querySelector('link[data-peninsula-fonts]')){const l=document.createElement('link');l.rel='stylesheet';l.dataset.peninsulaFonts='';l.href='https://fonts.googleapis.com/css2?family=Cormorant+SC:wght@700&family=Lobster&family=Marck+Script&family=Ruslan+Display&family=Yeseva+One&display=swap';document.head.append(l)}
 const probe=document.createElement('canvas').getContext('2d'),cache=new Map(),loading=new Set();
 const family=s=>FONTS[s.font]?.[1];
 const cssFont=s=>(s.font==='cormorant'?'700 ':'')+Math.round(s.size*1.25)+'px "'+family(s)+'"';
 // Until a web font has arrived the pixel font is used, then everything is redrawn once. A load asked before the
 // font stylesheet has arrived finds no faces and is simply tried again.
 function ready(s){const f=cssFont(s);if(document.fonts.check(f,'АаЯяAz'))return true;if(!loading.has(f)){loading.add(f);document.fonts.load(f,'АаЯяAz').then(list=>{if(!list.length){setTimeout(()=>loading.delete(f),500);return}cache.clear();window.dispatchEvent(new Event('text-presets-change'))}).catch(()=>setTimeout(()=>loading.delete(f),2000))}return false}
 const width=(t,s)=>{probe.font=cssFont(s);return Math.ceil(probe.measureText(t).width)+Math.max(0,[...t].length-1)*s.letterSpacing};
 const mix=(c,t,k)=>[1,3,5].map(i=>Math.round(parseInt(c.slice(i,i+2),16)*(1-k)+t*k));
 function bitmap(t,s){const key=[t,s.font,s.size,s.color,s.gold,s.letterSpacing].join('|');let b=cache.get(key);if(b)return b;
  const w=width(t,s)+4,top=Math.ceil(s.size*.45),h=Math.ceil(s.size*1.9)+4,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.font=cssFont(s);g.textBaseline='alphabetic';if('letterSpacing'in g)g.letterSpacing=s.letterSpacing+'px';g.fillStyle='#fff';g.fillText(t,2,top+Math.round(s.size*.95));
  const d=g.getImageData(0,0,w,h),px=d.data,solid=new Uint8Array(w*h);let y0=h,y1=0;
  for(let i=0;i<w*h;i++)if(px[i*4+3]>=110){solid[i]=1;const y=Math.floor(i/w);if(y<y0)y0=y;if(y>y1)y1=y}
  const base=mix(s.color,0,0),light=mix(s.color,255,.65),dark=mix(s.color,0,.55),outline=mix(s.color,0,.85);
  for(let i=0;i<w*h;i++){const o=i*4;if(solid[i]){let col=base;if(s.gold){const y=Math.floor(i/w),k=(y-y0)/Math.max(1,y1-y0);col=k<.45?mix('#'+base.map(v=>v.toString(16).padStart(2,'0')).join(''),255,.65*(1-k/.45)):mix('#'+base.map(v=>v.toString(16).padStart(2,'0')).join(''),0,.55*(k-.45)/.55);if(i>=w&&!solid[i-w])col=mix('#'+col.map(v=>v.toString(16).padStart(2,'0')).join(''),255,.5)}px[o]=col[0];px[o+1]=col[1];px[o+2]=col[2];px[o+3]=255}
   else{const x=i%w,near=s.gold&&((x>0&&solid[i-1])||(x<w-1&&solid[i+1])||(i>=w&&solid[i-w])||(i<w*h-w&&solid[i+w]));if(near){px[o]=outline[0];px[o+1]=outline[1];px[o+2]=outline[2];px[o+3]=255}else px[o+3]=0}}
  g.putImageData(d,0,0);b={canvas:c,top};if(cache.size>300)cache.clear();cache.set(key,b);return b}
 const measure=api.measure,line=api.line;
 api.measure=(t,role,fonts,prepared=false)=>{const s=api.get(role);if(!family(s)||!ready(s))return measure(t,role,fonts,prepared);return width(prepared?String(t):api.format(t,role),s)};
 api.line=(c,text,x,y,role,fonts,align,prepared=false)=>{const s=api.get(role);if(!family(s)||!ready(s))return line(c,text,x,y,role,fonts,align,prepared);
  const original=text;if(!prepared)text=api.text(text);text=prepared?String(text):api.format(text,role);align=align||s.align;const w=width(text,s);
  const ox=Math.round(x-(align==='center'?w/2:align==='right'?w:0));if(!prepared)api.record(c,original,ox,Math.round(y),w,s.size,role);
  const b=bitmap(text,s);c.imageSmoothingEnabled=false;c.drawImage(b.canvas,ox-2,Math.round(y)-b.top)};
})();
