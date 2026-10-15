// Edits for the walk levels (camp, bear, house, village): drawn walls, a texture per wall cell,
// level floor/wall textures, sprite replacements and the look of the minimap. Stored in the browser,
// included in the settings export; levels read them live (embedded levels through the storage event).
(()=>{
 const key='peninsula-walk-edits-v1';
 const levels={coast:'Лагерь',bear:'Медведь',house:'Заброшка',village:'Поиск лавки'};
 const base={coast:{wall:'walk_cliff',floor:'shore_ground',sky:'shore_north',water:'shore_west'},bear:{wall:'bear_wall',floor:'bear_floor',sky:'shore_north',water:'shore_west'},house:{wall:'walk_wall',floor:'walk_floor',sky:'shore_north',water:'shore_west'},village:{wall:'walk_cliff',floor:'shore_ground',sky:'shore_north',water:'shore_west'}};
 const textures={walk_cliff:'Скала',walk_wall:'Стена дома',bear_wall:'Лес',latest_stone:'Камень',shore_ground:'Земля',bear_floor:'Лесной пол',walk_floor:'Доски',shore_north:'Небо',shore_west:'Море',shore_south:'Берег юг',shore_east:'Берег восток',shore_eastfar:'Даль',mountains_far:'Горы вдали',mountains_near:'Горы'};
 const sprites={shore_tourists:'Туристы',shore_wet:'Мокрое место',camp_tent:'Палатка',camp_bottle:'Бутылка',camp_wrapper:'Обёртка',camp_good:'Стоянка',camp_wet:'Сырая стоянка',camp_inland:'Поляна',camp_tourists:'Лагерь туристов',bear_repeller:'Отпугиватель',bear_dagger:'Нож',walk_table:'Стол',walk_shelf:'Полка',walk_chair:'Стул'};
 const levelSprites={coast:['shore_tourists','camp_bottle','camp_wrapper','camp_tent'],bear:['bear_repeller'],house:['walk_shelf','walk_table','walk_chair'],village:['walk_table','walk_shelf']};
 const grids={
  bear:['#########','#.......#','#..b....#','#.#..#..#','#.......#','#.......#','#########'],
  house:['#############','#.....#.....#','#.....#.....#','#...........#','#.....#.....#','###.#####.###','#.....#.....#','#...........#','#.....#.....#','#.....#.....#','#############'],
  village:['~########','~....t..#','~..c....#','~....w..#','~.......#','~.......#','~~~~~~~~~']
 };
 const starts={coast:null,bear:null,house:null,village:null};
 const ready=fetch('rpg-map.json?v=2').then(r=>r.json()).then(m=>{grids.coast=m.grid.slice();starts.coast=m.start}).catch(()=>{});
 // Cells that can become walls or floor; letters like t, c, r, b are level sites and stay as they are.
 const paintable=c=>c==='#'||c==='.'||c==='='||c==='~';
 const minimapDefaults={texture:'none',textureAmount:40,noise:0,darkness:0,falloff:0};
 const clamp=(v,d)=>Number.isFinite(Number(v))?Math.round(Math.max(0,Math.min(100,Number(v)))):d;
 function normalizeLevel(id,v={}){
  v=v&&typeof v==='object'?v:{};
  const grid=Array.isArray(v.grid)&&v.grid.every(r=>typeof r==='string')?v.grid.slice():null;
  // A wall texture is kept per cell ("x,y") or per side of a cell ("x,y,n" / e / s / w).
  const walls={};for(const [k,t]of Object.entries(v.walls||{}))if(/^\d+,\d+(,[nesw])?$/.test(k)&&textures[t])walls[k]=t;
  const sp={};for(const [a,t]of Object.entries(v.sprites||{}))if(sprites[a]&&sprites[t])sp[a]=t;
  const pick=f=>textures[v[f]]?v[f]:base[id][f];
  return {grid,walls,wall:pick('wall'),floor:pick('floor'),sky:pick('sky'),water:pick('water'),sprites:sp};
 }
 function normalize(v={}){
  v=v&&typeof v==='object'?v:{};const m=v.minimap||{};
  return {levels:Object.fromEntries(Object.keys(levels).map(id=>[id,normalizeLevel(id,v.levels?.[id])])),
   minimap:{texture:m.texture==='noise'||textures[m.texture]?m.texture:'none',textureAmount:clamp(m.textureAmount,minimapDefaults.textureAmount),noise:clamp(m.noise,0),darkness:clamp(m.darkness,0),falloff:clamp(m.falloff,0)}};
 }
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.walk);try{const s=localStorage.getItem(key);if(s)state=normalize(JSON.parse(s))}catch{}
 const changed=()=>window.dispatchEvent(new Event('walk-edits-change'));
 function update(value){state=normalize(value);try{localStorage.setItem(key,JSON.stringify(state))}catch{}minimapCache.clear();changed()}
 window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'{}'));minimapCache.clear();changed()}catch{}}});
 // Textures and sprites load straight from assets/, so every page (also embedded levels) can use the whole library.
 const images={};
 function image(k){if(!k)return null;if(!images[k]){const im=new Image;im.onload=()=>{minimapCache.clear();changed()};im.src='assets/'+k.replace(/_/g,'-')+'.png';images[k]=im}return images[k].complete&&images[k].naturalWidth?images[k]:null}
 const api={key,levels,base,textures,sprites,levelSprites,ready,paintable,normalize,update,image,
  get state(){return state},
  level:id=>state.levels[id],
  baseGrid:id=>grids[id]||null,
  start:id=>starts[id],
  // The edited plan keeps the size of the original; anything that does not match falls back to it.
  grid(id,fallback){const g=state.levels[id]?.grid,b=fallback||grids[id];if(!g||!b||g.length!==b.length||g.some((r,i)=>r.length!==b[i].length))return b;return g},
  // Lays the drawn walls and floor over a live plan (which may hold runtime marks like tourists).
  merge(id,current,original){const b=original||grids[id],g=api.grid(id,b);if(g===b)return current;return current.map((row,y)=>[...row].map((c,x)=>g[y][x]!==b[y][x]&&paintable(c)?g[y][x]:c).join(''))},
  wallTexture:(id,x,y,face)=>(face&&state.levels[id]?.walls[x+','+y+','+face])||state.levels[id]?.walls[x+','+y]||state.levels[id]?.wall||base[id]?.wall,
  skyTexture:id=>state.levels[id]?.sky||base[id]?.sky,
  waterTexture:id=>state.levels[id]?.water||base[id]?.water,
  floorTexture:id=>state.levels[id]?.floor||base[id]?.floor,
  spriteImage(id,asset){const t=state.levels[id]?.sprites[asset];return t?image(t):null}
 };
 // Minimap look: a texture or noise laid over the tiles, darkness, and a falloff from the centre to the edges.
 const minimapCache=new Map();
 function overlay(w,h){
  const m=state.minimap,k=m.texture+':'+w+'x'+h;if(m.texture==='none')return null;if(minimapCache.has(k))return minimapCache.get(k);
  const out=new Float32Array(w*h);
  if(m.texture==='noise'){let s=12345;for(let i=0;i<out.length;i++){s=(s*1103515245+12345)&0x7fffffff;out[i]=(s/0x7fffffff)*2}}
  else{const im=image(m.texture);if(!im)return null;const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');for(let y=0;y<h;y+=im.height)for(let x=0;x<w;x+=im.width)g.drawImage(im,x,y);const d=g.getImageData(0,0,w,h).data;for(let i=0;i<out.length;i++)out[i]=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)/128}
  minimapCache.set(k,out);return out;
 }
 api.decorateMinimap=function(ctx,x,y,w,h){
  const m=state.minimap;if(m.texture==='none'&&!m.noise&&!m.darkness)return;
  const img=ctx.getImageData(x,y,w,h),d=img.data,tex=overlay(w,h),ta=m.textureAmount/100,na=m.noise/100,dark=m.darkness/100,fall=m.falloff/100;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
   const i=py*w+px,o=i*4;let f=1;
   if(tex)f*=1+(tex[i]-1)*ta;
   if(na){const n=Math.sin((x+px)*12.9898+(y+py)*78.233)*43758.5453;f*=1+((n-Math.floor(n))-.5)*na;}
   if(dark){const rx=(px+.5-w/2)/(w/2),ry=(py+.5-h/2)/(h/2),r=Math.min(1,Math.hypot(rx,ry)/Math.SQRT2*1.25);f*=1-dark*((1-fall)+fall*r*r);}
   d[o]=Math.min(255,d[o]*f);d[o+1]=Math.min(255,d[o+1]*f);d[o+2]=Math.min(255,d[o+2]*f);
  }
  ctx.putImageData(img,x,y);
 };
 window.PeninsulaWalk=api;
})();
