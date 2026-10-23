// Shared surface styles; scenery and portraits remain image assets.
// Each background zone is built bottom-up: its colour, up to four tiled texture layers (any file, shifted
// by x/y, each with its own opacity and blend mode), a colour overlay and a two-colour gradient overlay.
// The same settings hold the adjustments (levels, hue/saturation) for the textures of the walks and races.
(()=>{
 const key='peninsula-color-presets-v1';
 const names={heading:'Заголовок',storyImage:'Экран картинка',narrator:'Экран текст',situation:'Ситуация',dialogue:'Диалог',question:'Вопрос',buttons:'Кнопки интерфейса',tabs:'Вкладки',power:'Power',stats:'Характеристики',inventory:'Инвентарь',default:'Дефолт'};
 // New zones start from the surface they were drawn with before, so saved colors are kept.
 const inherits={question:'dialogue',tabs:'buttons',power:'default',stats:'default',inventory:'default'};
 // Texture files in assets/ that can be picked for a layer; uploaded files are added to the state.
 const textures={'latest-stone':'Камень (интерфейс)','stone-granite':'Гранит','stone-slate':'Сланец','walk-wall':'Стена','walk-floor':'Пол','walk-cliff':'Скала','walk-road':'Дорога','bear-wall':'Лес: стена','bear-floor':'Лес: земля','shore-ground':'Берег','ground-tundra':'Тундра','ground-path':'Тропа'};
 const blends={'source-over':'Обычный','multiply':'Умножение','screen':'Экран','overlay':'Перекрытие','soft-light':'Мягкий свет','hard-light':'Жёсткий свет','color-dodge':'Осветление основы','color-burn':'Затемнение основы','darken':'Замена тёмным','lighten':'Замена светлым','hue':'Цветовой тон','saturation':'Насыщенность','color':'Цветность','luminosity':'Яркость'};
 const adjustGroups={walk:'Бродилки',race:'Гонки'};
 const adjustDefaults={hue:0,saturation:0,lightness:0,black:0,white:255,gamma:100};
 const MAX_LAYERS=4;
 const defaults=Object.fromEntries(Object.keys(names).map(id=>[id,{background:['heading','situation'].includes(id)?'#293640':['buttons','tabs'].includes(id)?'#655848':'#11171c',border:'#91a1ad',layers:[],overlay:{color:'#000000',opacity:0,blend:'source-over'},gradient:{a:'#ffffff',b:'#000000',aPos:0,bPos:100,dir:'v',opacity:0,blend:'soft-light'}}]));
 const color=(v,d)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:d;
 const num=(v,a,b,d)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.round(Math.max(a,Math.min(b,Number(v)))):d;
 const blend=(v,d)=>blends[v]?v:d;
 let files={};
 const fileOk=f=>typeof f==='string'&&(textures[f]||f.startsWith('up:')&&files[f.slice(3)]);
 function normalizeZone(v,d){
  // Old saves had one stone texture with an opacity; it becomes the first layer.
  const legacy=!Array.isArray(v.layers)&&num(v.textureOpacity,0,100,0)>0?[{file:'latest-stone',opacity:num(v.textureOpacity,0,100,0)}]:[];
  const layers=(Array.isArray(v.layers)?v.layers:legacy).filter(l=>l&&fileOk(l.file)).slice(0,MAX_LAYERS).map(l=>({file:l.file,opacity:num(l.opacity,0,100,100),x:num(l.x,-999,999,0),y:num(l.y,-999,999,0),blend:blend(l.blend,'source-over')}));
  const o=v.overlay||{},g=v.gradient||{};
  return {background:color(v.background,d.background),border:color(v.border,d.border),layers,
   overlay:{color:color(o.color,d.overlay.color),opacity:num(o.opacity,0,100,0),blend:blend(o.blend,'source-over')},
   gradient:{a:color(g.a,d.gradient.a),b:color(g.b,d.gradient.b),aPos:num(g.aPos,0,100,0),bPos:num(g.bPos,0,100,100),dir:g.dir==='h'?'h':'v',opacity:num(g.opacity,0,100,0),blend:blend(g.blend,'soft-light')}};
 }
 function normalize(value={}){
  value=value&&typeof value==='object'?value:{};
  files={};for(const [id,f]of Object.entries(value.files||{}))if(/^[\w-]{1,40}$/.test(id)&&f&&typeof f.data==='string'&&/^data:image\/(png|gif|webp|jpeg);base64,/.test(f.data))files[id]={name:String(f.name||id).slice(0,60),data:f.data};
  const out=Object.fromEntries(Object.entries(defaults).map(([id,d])=>[id,normalizeZone(value[id]||value[inherits[id]]||{},d)]));
  out.files=files;
  // Saturation per screen picture (key of the screen), -100 grey .. +100 twice as vivid.
  out.pictures={};for(const [k,v]of Object.entries(value.pictures||{}))if(/^[\w.-]{1,40}$/.test(k)&&num(v,-100,100,0))out.pictures[k]=num(v,-100,100,0);
  // One saturation for every screen picture; a picture's own value is added on top.
  out.pictureSaturation=num(value.pictureSaturation,-100,100,0);
  out.adjust=Object.fromEntries(Object.keys(adjustGroups).map(g=>{const a=value.adjust?.[g]||{};return [g,{hue:num(a.hue,-180,180,0),saturation:num(a.saturation,-100,100,0),lightness:num(a.lightness,-100,100,0),black:num(a.black,0,254,0),white:num(a.white,1,255,255),gamma:num(a.gamma,10,300,100)}]}));
  return out;
 }
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.colors);try{const saved=localStorage.getItem(key);if(saved)state=normalize(JSON.parse(saved))}catch{}
 const changed=()=>window.dispatchEvent(new Event('color-presets-change'));
 const images={};
 function image(file){
  const src=textures[file]?'assets/'+file+'.png':file?.startsWith('up:')&&state.files[file.slice(3)]?.data;if(!src)return null;
  if(!images[file]||images[file].src.slice(-src.length)!==src.slice(-src.length)){const im=new Image;im.onload=changed;im.src=src;images[file]=im}
  return images[file].complete&&images[file].naturalWidth?images[file]:null;
 }
 // ---- adjustments: levels, then hue / saturation / lightness, applied to a copy of the image
 let adjustVersion=0;const adjusted=new WeakMap(),pictures=new Map();
 const isNeutral=a=>Object.entries(adjustDefaults).every(([k,v])=>a[k]===v);
 function adjustData(d,a){
  const lut=new Uint8ClampedArray(256),range=Math.max(1,a.white-a.black),gamma=100/a.gamma;
  for(let i=0;i<256;i++)lut[i]=Math.round(255*Math.pow(Math.max(0,Math.min(1,(i-a.black)/range)),gamma));
  const hs=a.hue/360,sat=a.saturation/100,lig=a.lightness/100,hsl=a.hue||a.saturation||a.lightness;
  for(let i=0;i<d.length;i+=4){
   let r=lut[d[i]]/255,g=lut[d[i+1]]/255,b=lut[d[i+2]]/255;
   if(hsl){
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
    if(mx!==mn){const dd=mx-mn;s=l>.5?dd/(2-mx-mn):dd/(mx+mn);h=mx===r?(g-b)/dd+(g<b?6:0):mx===g?(b-r)/dd+2:(r-g)/dd+4;h/=6}
    h=(h+hs+1)%1;s=Math.max(0,Math.min(1,sat<0?s*(1+sat):s+(1-s)*sat*s));l=lig<0?l*(1+lig):l+(1-l)*lig;
    if(s===0)r=g=b=l;else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p};r=f(h+1/3);g=f(h);b=f(h-1/3)}
   }
   d[i]=r*255;d[i+1]=g*255;d[i+2]=b*255;
  }
  return d;
 }
 // Which roles were drawn on the current screen: tagged with the screen counter of the top window (settings-relevance.js).
 const used={},epoch=()=>{try{return window.top.PeninsulaUsageEpoch||0}catch{return 0}};
 const api=window.PeninsulaColors={key,names,used,defaults,normalize,textures,blends,adjustGroups,adjustDefaults,MAX_LAYERS,image,
  // Background zones drawn on visible canvases, so text edit mode can point at them.
  zones:[],get state(){return state},get(role){used[names[role]?role:'default']=epoch();return state[role]||state.default},
  get adjustVersion(){return adjustVersion},
  update(value){const before=JSON.stringify(state.adjust);state=normalize(value);if(JSON.stringify(state.adjust)!==before)adjustVersion++;try{localStorage.setItem(key,JSON.stringify(state))}catch{alert('Не удалось сохранить: файлы текстур слишком большие для браузера.')}changed()},
  // An image or canvas with the walk/race adjustments applied; the original when they are neutral.
  adjust(img,group){const a=state.adjust[group];if(!img||!a||isNeutral(a))return img;const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!w||!h)return img;
   const hit=adjusted.get(img);if(hit&&hit.group===group&&hit.version===adjustVersion)return hit.canvas;
   const c=document.createElement('canvas');c.width=w;c.height=h;const q=c.getContext('2d');q.drawImage(img,0,0);try{const data=q.getImageData(0,0,w,h);adjustData(data.data,a);q.putImageData(data,0,0)}catch{return img}
   adjusted.set(img,{group,version:adjustVersion,canvas:c});return c},
  // A screen picture with its own saturation; remembers which picture is on screen for the settings panel.
  // Pictures also count as the «Экран картинка» zone, so its settings show on screens that draw one.
  pictureValue:k=>Math.max(-100,Math.min(100,state.pictureSaturation+(state.pictures[k]||0))),
  // The same saturation as a canvas filter, for animated layers such as the sea on the map.
  pictureFilter:k=>{const v=api.pictureValue(k);return v?'saturate('+(1+v/100)+')':'none'},
  currentPicture:null,picture(img,pictureKey){api.currentPicture=pictureKey;used.storyImage=epoch();const v=api.pictureValue(pictureKey);if(!img||!v)return img;const hit=pictures.get(pictureKey);if(hit&&hit.img===img&&hit.v===v)return hit.canvas;const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,c=document.createElement('canvas');c.width=w;c.height=h;const q=c.getContext('2d');q.drawImage(img,0,0);try{const d=q.getImageData(0,0,w,h);adjustData(d.data,{...adjustDefaults,saturation:v});q.putImageData(d,0,0)}catch{return img}pictures.set(pictureKey,{img,v,canvas:c});return c},
  adjustPixels(data,group){const a=state.adjust[group];if(a&&!isNeutral(a))adjustData(data,a);return data},
  // Geometry is a fallback for exported layout nodes without semantic names.
  role(n){const name=n.name||'';if(n.x===1&&n.y===1&&n.w===318&&n.h===152&&(n.fills||[]).some(p=>p.type==='IMAGE'))return 'storyImage';if(/Описание героя/i.test(name))return 'narrator';if(n.w===28&&n.h===28||n.x===197&&n.w===117&&(n.y===175&&n.h===59||n.y===73&&n.h===88))return 'inventory';if(n.x===198&&n.y===161&&n.w===115&&n.h===14)return 'power';if(n.x===6&&n.y===22&&n.w===192&&n.h===140)return 'stats';if(n.w===57&&n.h===16)return 'tabs';if(/Кнопка/i.test(name))return 'buttons';if(n.y<=1&&n.h<=22&&n.w>=300)return 'heading';if(/Ситуация/i.test(name)||n.x===198&&n.y===22&&n.w===115&&n.h===138)return 'situation';if(/Диалог/i.test(name)||n.x<=8&&n.y>=161&&n.w===190&&n.h>=28)return 'dialogue';if(n.x<=1&&n.y>=153&&n.w>=318&&n.h>=80)return 'narrator';if(n.x>=118&&n.x<198&&n.y>=161&&n.h<=22)return 'buttons';return 'default'},
  outline(c,x,y,w,h,role='default',weight=1){const s=api.get(role);[x,y,w,h]=[x,y,w,h].map(Math.round);c.save();c.fillStyle=s.border;c.fillRect(x,y,w,weight);c.fillRect(x,y+h-weight,w,weight);c.fillRect(x,y,weight,h);c.fillRect(x+w-weight,y,weight,h);c.restore()},
  fill(c,x,y,w,h,role='default'){const s=api.get(role);[x,y,w,h]=[x,y,w,h].map(Math.round);if(w<=0||h<=0)return;if(c?.canvas){if(w>=300&&h>=200){window.PeninsulaText?.forget?.(c.canvas);api.zones=api.zones.filter(z=>z.canvas!==c.canvas)}api.zones.push({canvas:c.canvas,role:names[role]?role:'default',x,y,w,h});if(api.zones.length>600)api.zones.splice(0,api.zones.length-600)}
   c.save();c.imageSmoothingEnabled=false;c.fillStyle=s.background;c.fillRect(x,y,w,h);c.beginPath();c.rect(x,y,w,h);c.clip();const alpha=c.globalAlpha;
   for(const l of s.layers){const im=image(l.file);if(!im||l.opacity<=0)continue;c.globalAlpha=alpha*l.opacity/100;c.globalCompositeOperation=l.blend;const tw=im.naturalWidth,th=im.naturalHeight,sx=x+((l.x%tw)+tw)%tw-tw,sy=y+((l.y%th)+th)%th-th;for(let dy=sy;dy<y+h;dy+=th)for(let dx=sx;dx<x+w;dx+=tw)c.drawImage(im,dx,dy)}
   if(s.overlay.opacity>0){c.globalAlpha=alpha*s.overlay.opacity/100;c.globalCompositeOperation=s.overlay.blend;c.fillStyle=s.overlay.color;c.fillRect(x,y,w,h)}
   const g=s.gradient;if(g.opacity>0){const gr=g.dir==='h'?c.createLinearGradient(x,0,x+w,0):c.createLinearGradient(0,y,0,y+h),a=Math.min(g.aPos,g.bPos),b=Math.max(g.aPos,g.bPos),[ca,cb]=g.aPos<=g.bPos?[g.a,g.b]:[g.b,g.a];gr.addColorStop(a/100,ca);gr.addColorStop(b/100,cb);c.globalAlpha=alpha*g.opacity/100;c.globalCompositeOperation=g.blend;c.fillStyle=gr;c.fillRect(x,y,w,h)}
   c.restore()},
  box(c,x,y,w,h,role='default'){api.fill(c,x,y,w,h,role);api.outline(c,x,y,w,h,role)}
 };
 window.addEventListener('storage',e=>{if(e.key===key){try{const before=JSON.stringify(state.adjust);state=normalize(JSON.parse(e.newValue||'{}'));if(JSON.stringify(state.adjust)!==before)adjustVersion++;changed()}catch{}}});
})();
