// Walk level editor (right panel): a plan of the level where walls are placed and removed like blocks,
// a texture for every wall, level floor/wall textures and sprite replacements; the minimap look has its own panel.
(()=>{
 const W=window.PeninsulaWalk,host=document.querySelector('#walk-editor'),mini=document.querySelector('#minimap-settings');if(!W||!host||!mini)return;
 const screenLevel={camp1:'coast',bear2:'bear',house2:'house',village3:'village'};
 let level='coast',tool='wall',brush='walk_cliff',painting=null,lastNode=null;
 const opt=(lib,value)=>Object.entries(lib).map(([k,n])=>'<option value="'+k+'"'+(k===value?' selected':'')+'>'+n+'</option>').join('');
 const range=(field,label)=>'<label class="walk-range">'+label+'<span><input data-mini="'+field+'" type="range" min="0" max="100" step="1"><output data-mini-out="'+field+'"></output></span></label>';
 host.innerHTML='<h2>Редактор бродилок</h2>'+
  '<label>Уровень<select data-walk-level>'+opt(W.levels,level)+'</select></label>'+
  '<div class="walk-tools" role="radiogroup" aria-label="Инструмент">'+[['wall','Стена'],['floor','Убрать'],['paint','Текстура']].map(([k,n])=>'<button type="button" role="radio" data-walk-tool="'+k+'">'+n+'</button>').join('')+'</div>'+
  '<div class="walk-palette" role="listbox" aria-label="Текстура стены"></div>'+
  '<canvas class="walk-plan" aria-label="План уровня"></canvas>'+
  '<p class="walk-hint">Стена — ставит стену выбранной текстурой, Убрать — делает клетку проходимой, Текстура — меняет текстуру у стоящих стен. Можно вести мышью. Буквы — места уровня, их не трогаем; жёлтый треугольник — старт.</p>'+
  '<label>Стены уровня<select data-walk-field="wall"></select></label><label>Пол уровня<select data-walk-field="floor"></select></label>'+
  '<h3>Спрайты</h3><div class="walk-sprites"></div>'+
  '<button type="button" class="walk-reset" data-walk-act="reset">Сбросить уровень</button>';
 mini.innerHTML='<h2>Мини-карта</h2><p class="walk-hint">Мини-карта справа в бродилках: всё, что ниже, меняет её вид во всех уровнях.</p>'+
  '<label>Текстура<select data-mini="texture"><option value="none">Нет</option><option value="noise">Шум</option>'+opt(W.textures)+'</select></label>'+
  range('textureAmount','Сила текстуры')+range('noise','Зерно')+range('darkness','Темнота')+range('falloff','Спад от центра к краям');
 const plan=host.querySelector('.walk-plan'),pg=plan.getContext('2d');
 const clone=()=>JSON.parse(JSON.stringify(W.state));
 const lv=()=>W.level(level),gridNow=()=>W.grid(level);
 function setState(fn){const s=clone();fn(s,s.levels[level]);W.update(s)}
 function palette(){
  host.querySelector('.walk-palette').innerHTML=Object.entries(W.textures).map(([k,n])=>'<button type="button" role="option" data-brush="'+k+'" title="'+n+'" aria-selected="'+(k===brush)+'"><canvas width="16" height="16"></canvas><span>'+n+'</span></button>').join('');
  for(const b of host.querySelectorAll('[data-brush]')){const im=W.image(b.dataset.brush),g=b.querySelector('canvas').getContext('2d');g.imageSmoothingEnabled=false;if(im)g.drawImage(im,0,0,im.width,im.height,0,0,16,16);else{g.fillStyle='#333';g.fillRect(0,0,16,16)}}
 }
 const cellColors={'~':'#426988','=':'#a4b19a',t:'#ad83bc',c:'#d2ad73',r:'#df493d',b:'#d2ad73',w:'#8fb5c9'};
 let cs=12;
 function drawPlan(){
  const g=gridNow();if(!g){plan.width=10;plan.height=10;return}
  const rows=g.length,cols=g[0].length;cs=Math.max(6,Math.min(18,Math.floor(276/cols)));plan.width=cols*cs;plan.height=rows*cs;pg.imageSmoothingEnabled=false;
  const floorIm=W.image(W.floorTexture(level));
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const c=g[y][x],px=x*cs,py=y*cs;
   if(c==='#'){const im=W.image(W.wallTexture(level,x,y));if(im)pg.drawImage(im,0,0,im.width,im.height,px,py,cs,cs);else{pg.fillStyle='#535967';pg.fillRect(px,py,cs,cs)}continue}
   if(c==='~'){pg.fillStyle=cellColors['~'];pg.fillRect(px,py,cs,cs);continue}
   if(floorIm){pg.drawImage(floorIm,(x*16)%floorIm.width,(y*16)%floorIm.height,16,16,px,py,cs,cs)}else{pg.fillStyle='#657651';pg.fillRect(px,py,cs,cs)}
   pg.fillStyle='#00000066';pg.fillRect(px,py,cs,cs);
   if(c==='='){pg.fillStyle='#a4b19a55';pg.fillRect(px,py,cs,cs)}
   if(cellColors[c]&&c!=='='){pg.fillStyle=cellColors[c];pg.fillRect(px+2,py+2,cs-4,cs-4);pg.fillStyle='#11171c';pg.font=(cs-4)+'px monospace';pg.textAlign='center';pg.textBaseline='middle';pg.fillText(c,px+cs/2,py+cs/2+1)}
  }
  pg.strokeStyle='#ffffff14';pg.lineWidth=1;for(let x=1;x<cols;x++){pg.beginPath();pg.moveTo(x*cs+.5,0);pg.lineTo(x*cs+.5,rows*cs);pg.stroke()}for(let y=1;y<rows;y++){pg.beginPath();pg.moveTo(0,y*cs+.5);pg.lineTo(cols*cs,y*cs+.5);pg.stroke()}
  const st=W.start(level);if(st){const px=st.x*cs,py=st.y*cs;pg.fillStyle='#f1d39a';pg.beginPath();pg.moveTo(px+cs/2,py+2);pg.lineTo(px+cs-2,py+cs-2);pg.lineTo(px+2,py+cs-2);pg.fill()}
 }
 function sync(){
  host.querySelector('[data-walk-level]').value=level;
  for(const b of host.querySelectorAll('[data-walk-tool]'))b.setAttribute('aria-checked',String(b.dataset.walkTool===tool));
  for(const b of host.querySelectorAll('[data-brush]'))b.setAttribute('aria-selected',String(b.dataset.brush===brush));
  for(const f of ['wall','floor'])host.querySelector('[data-walk-field="'+f+'"]').innerHTML=opt(W.textures,lv()[f]);
  host.querySelector('.walk-sprites').innerHTML=W.levelSprites[level].map(a=>'<label>'+W.sprites[a]+'<select data-walk-sprite="'+a+'">'+opt(W.sprites,lv().sprites[a]||a)+'</select></label>').join('');
  const m=W.state.minimap;mini.querySelector('[data-mini="texture"]').value=m.texture;
  for(const f of ['textureAmount','noise','darkness','falloff']){mini.querySelector('[data-mini="'+f+'"]').value=m[f];mini.querySelector('[data-mini-out="'+f+'"]').textContent=m[f]+'%'}
  drawPlan();
 }
 function cellAt(e){const r=plan.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*plan.width/r.width/cs),y=Math.floor((e.clientY-r.top)*plan.height/r.height/cs);const g=gridNow();return g&&g[y]&&g[y][x]!==undefined?{x,y}:null}
 function apply(cell){
  if(!cell)return;const g=gridNow(),c=g[cell.y][cell.x],k=cell.x+','+cell.y,st=W.start(level);
  if(!W.paintable(c))return;
  if(tool==='wall'){if(st&&st.x===cell.x&&st.y===cell.y)return;if(c==='#'&&lv().walls[k]===brush)return}
  if(tool==='floor'&&c!=='#')return;
  if(tool==='paint'&&(c!=='#'||lv().walls[k]===brush))return;
  setState((s,l)=>{const rows=g.map(r=>[...r]);
   if(tool==='wall'){rows[cell.y][cell.x]='#';l.walls[k]=brush}
   else if(tool==='floor'){const b=W.baseGrid(level)?.[cell.y]?.[cell.x];rows[cell.y][cell.x]=b&&b!=='#'?b:'.';delete l.walls[k]}
   else l.walls[k]=brush;
   l.grid=rows.map(r=>r.join(''))});
 }
 plan.addEventListener('pointerdown',e=>{if(e.button!==0)return;plan.setPointerCapture(e.pointerId);painting=e.pointerId;apply(cellAt(e))});
 plan.addEventListener('pointermove',e=>{if(painting===e.pointerId)apply(cellAt(e))});
 for(const t of ['pointerup','pointercancel'])plan.addEventListener(t,()=>painting=null);
 host.addEventListener('click',e=>{const t=e.target.closest('[data-walk-tool]');if(t){tool=t.dataset.walkTool;sync()}const b=e.target.closest('[data-brush]');if(b){brush=b.dataset.brush;if(tool==='floor')tool='wall';sync()}
  if(e.target.closest('[data-walk-act="reset"]')&&confirm('Вернуть уровень «'+W.levels[level]+'» к исходному виду?'))setState((s)=>{s.levels[level]={}})});
 host.addEventListener('change',e=>{
  if(e.target.matches('[data-walk-level]')){level=e.target.value;sync();return}
  const f=e.target.dataset.walkField;if(f){setState((s,l)=>{l[f]=e.target.value});return}
  const a=e.target.dataset.walkSprite;if(a){setState((s,l)=>{if(e.target.value===a)delete l.sprites[a];else l.sprites[a]=e.target.value});return}
 });
 mini.addEventListener('input',e=>{const f=e.target.dataset.mini;if(!f)return;setState(s=>{s.minimap[f]=f==='texture'?e.target.value:Number(e.target.value)})});
 // The panel follows the walk level being played; another level can still be picked by hand.
 setInterval(()=>{const node=window.journey?.snapshot?.().node;if(node!==lastNode){lastNode=node;if(screenLevel[node]&&screenLevel[node]!==level){level=screenLevel[node];sync()}}},400);
 window.addEventListener('walk-edits-change',()=>{palette();sync()});
 W.ready.then(()=>{palette();sync()});palette();sync();
})();
