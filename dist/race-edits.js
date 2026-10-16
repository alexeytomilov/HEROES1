// Edits for the races: the shape of the road (bends and hills drawn per stretch), the colours of the road
// and the land, and an image file in place of any drawn sprite. Stored in the browser, part of the
// settings export; the race page reads them live through the storage event.
(()=>{
 const key='peninsula-race-edits-v1',COLUMNS=48;
 const modes={sredny:'Гонка 1.1 · Полуостров Средний',fog:'Гонка 4.1 · Туман',home:'Гонка 5.2 · Дорога домой'};
 // Every colour the road renderer uses; the striped "light" segments are a touch brighter than these.
 const colors={
  coastGround:['Берег: земля','#707650'],coastRoad:['Берег: дорога','#a49e90'],coastEdge:['Берег: обочина','#686958'],coastTrack:['Берег: колеи','#908b7c'],
  detour:['Объезд: полоса','#7b7d59'],detourRut:['Объезд: колеи','#96916b'],
  ground:['Тундра: земля','#4e5046'],road:['Тундра: дорога','#86827a'],edge:['Тундра: обочина','#44453e'],track:['Тундра: колеи','#76736b'],
  forestGround:['Лес: земля','#4b6536'],forestRoad:['Лес: дорога','#806d59'],forestEdge:['Лес: обочина','#3e4f2e'],forestTrack:['Лес: колеи','#715f4c'],
  meadow:['Луг','#668542'],lake:['Озеро','#8a9a9d'],cliffEdge:['Край обрыва','#9a968b'],abyss:['Обрыв','#b6babd'],fog:['Туман','#c8cbcd']
 };
 const sprites={jeep:'Джип',hiker:'Турист',goat:'Козёл',car:'Машина',pine:'Ель',birch:'Берёза',ypine:'Ёлочка',hole:'Яма',rock:'Камень',boulder:'Валун',tuft:'Трава',bollard:'Столбик',hut:'Домик'};
 // The radio portrait of the mage: which pixels show, typing speed of the radio text and how the portrait
 // blows away like pixel sand (start offset from the end of typing, how long it takes, wind strength and direction).
 const radioDefaults={pixels:'light',typing:30,offset:.4,vanish:1.6,wind:45,angle:0};
 const radioLimits={typing:[4,120],offset:[-5,5],vanish:[.2,6],wind:[0,100],angle:[0,359]};
 const clampF=(v,[a,b],d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 const clampN=(v,a,b)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Math.round(Number(v)))):0;
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 function normalize(v={}){
  v=v&&typeof v==='object'?v:{};const out={modes:{},colors:{},sprites:{},radio:{}};
  for(const m of Object.keys(modes)){const p=v.modes?.[m]?.profile;out.modes[m]={profile:p&&Array.isArray(p.curve)&&Array.isArray(p.hill)?{curve:Array.from({length:COLUMNS},(_,i)=>clampN(p.curve[i],-30,30)),hill:Array.from({length:COLUMNS},(_,i)=>clampN(p.hill[i],-10,10))}:null}}
  for(const [k,c]of Object.entries(v.colors||{}))if(colors[k]&&hex(c))out.colors[k]=c;
  const rv=v.radio||{};out.radio.pixels=rv.pixels==='dark'?'dark':'light';for(const k of Object.keys(radioLimits))out.radio[k]=clampF(rv[k],radioLimits[k],radioDefaults[k]);
  for(const [k,s]of Object.entries(v.sprites||{}))if(sprites[k]&&typeof s==='string'&&(/^asset:[\w.-]+$/.test(s)||/^data:image\/(png|gif|webp);base64,/.test(s)))out.sprites[k]=s;
  return out;
 }
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.race);try{const s=localStorage.getItem(key);if(s)state=normalize(JSON.parse(s))}catch{}
 const changed=()=>window.dispatchEvent(new Event('race-edits-change'));
 function update(value){window.PeninsulaUndo?.record('race',state);state=normalize(value);try{localStorage.setItem(key,JSON.stringify(state))}catch(e){alert('Не удалось сохранить: файл спрайта слишком большой для браузера.')}changed()}
 window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'{}'));changed()}catch{}}});
 const shade=(c,f)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(c.slice(i,i+2),16)*f))).toString(16).padStart(2,'0')).join('');
 const images={};
 function spriteImage(id){
  const s=state.sprites[id];if(!s)return null;
  if(!images[s]){const im=new Image;im.onload=changed;im.src=s.startsWith('asset:')?'assets/'+s.slice(6):s;images[s]=im}
  return images[s].complete&&images[s].naturalWidth?images[s]:null;
 }
 window.PeninsulaRace={key,COLUMNS,modes,colors,sprites,normalize,update,spriteImage,radioDefaults,radioLimits,
  get state(){return state},
  color:(k,light=false)=>{const c=state.colors[k]||colors[k][1];return light?shade(c,1.04):c},
  profile:m=>state.modes[m]?.profile||null};
})();
