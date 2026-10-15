// Race editor (right panel, "Гонки" tab): bends and hills drawn column by column, a top view of the
// resulting road, every road/land colour, and an image file for any drawn sprite.
(()=>{
 const R=window.PeninsulaRace,host=document.querySelector('#race-editor'),extra=document.querySelector('#race-extra'),walk=document.querySelector('#walk-editor'),tabs=document.querySelector('#level-editor-tabs');if(!R||!host||!extra)return;
 // Colours and sprites sit in a second column (#race-extra), in place of the minimap, which only walks use.
 const root={querySelector:q=>host.querySelector(q)||extra.querySelector(q),querySelectorAll:q=>[...host.querySelectorAll(q),...extra.querySelectorAll(q)]},on=(t,f)=>{host.addEventListener(t,f);extra.addEventListener(t,f)};
 const screenMode={drive1:'sredny',fog4:'fog',traffic5:'home'},walkScreens=['camp1','bear2','house2','village3'];
 let mode='sredny',lastNode=null,drawing=null,assetFiles=[];
 const opt=(lib,value)=>Object.entries(lib).map(([k,n])=>'<option value="'+k+'"'+(k===value?' selected':'')+'>'+n+'</option>').join('');
 host.innerHTML='<h2>Редактор гонки</h2>'+
  '<label>Гонка<select data-race-mode>'+opt(R.modes,mode)+'</select></label>'+
  '<h3>Форма трассы</h3><p class="walk-hint">Рисуйте мышью: выше линии — поворот направо или подъём, ниже — налево или спуск. Слева старт, справа финиш. Новая форма применяется при следующем старте гонки; всё, что стоит на дороге, остаётся на своих местах.</p>'+
  '<div class="race-plot-label">Повороты</div><canvas class="race-plot" data-plot="curve" width="288" height="72"></canvas>'+
  '<div class="race-plot-label">Подъёмы и спуски</div><canvas class="race-plot" data-plot="hill" width="288" height="56"></canvas>'+
  '<div class="race-plot-label">Вид сверху</div><canvas class="race-top" width="288" height="120"></canvas>'+
  '<div class="race-buttons"><button type="button" data-race-act="original">Начать с исходной</button><button type="button" data-race-act="smooth">Сгладить</button><button type="button" data-race-act="reset">Исходная трасса</button></div>';
 extra.innerHTML='<h2>Цвета и спрайты гонки</h2>'+
  '<h3>Цвета</h3><div class="race-colors"></div><button type="button" class="walk-reset" data-race-act="colors">Вернуть цвета</button>'+
  '<h3>Спрайты</h3><p class="walk-hint">Картинка из папки игры (assets) или свой PNG с компьютера вместо нарисованного спрайта.</p><div class="race-sprites"></div><input type="file" accept="image/png,image/gif,image/webp" hidden data-race-file>';
 const clone=()=>JSON.parse(JSON.stringify(R.state));
 const setState=fn=>{const s=clone();fn(s);R.update(s)};
 const ranges={curve:30,hill:10};
 const profile=()=>R.profile(mode)||{curve:Array(R.COLUMNS).fill(0),hill:Array(R.COLUMNS).fill(0)};
 function plot(cv,kind){
  const g=cv.getContext('2d'),p=profile()[kind],K=R.COLUMNS,cw=cv.width/K,mid=cv.height/2,max=ranges[kind];
  g.fillStyle='#0b1118';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#2a3a4f';g.fillRect(0,Math.round(mid),cv.width,1);
  for(let k=0;k<K;k++){const v=p[k],h=Math.round(Math.abs(v)/max*(mid-2));g.fillStyle=R.profile(mode)?(v>=0?'#d7b574':'#84b5a7'):'#4a5868';if(v>=0)g.fillRect(Math.round(k*cw),Math.round(mid)-h,Math.ceil(cw)-1,h);else g.fillRect(Math.round(k*cw),Math.round(mid)+1,Math.ceil(cw)-1,h)}
 }
 function topView(){
  const cv=root.querySelector('.race-top'),g=cv.getContext('2d'),p=profile(),pts=[];let x=0,y=0,a=-Math.PI/2;
  for(let k=0;k<R.COLUMNS;k++)for(let s=0;s<8;s++){a+=p.curve[k]*.018;x+=Math.cos(a);y+=Math.sin(a);pts.push([x,y])}
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),minX=Math.min(0,...xs),maxX=Math.max(0,...xs),minY=Math.min(0,...ys),maxY=Math.max(0,...ys),sc=Math.min((cv.width-16)/Math.max(1,maxX-minX),(cv.height-16)/Math.max(1,maxY-minY));
  g.fillStyle='#0b1118';g.fillRect(0,0,cv.width,cv.height);
  const P=q=>[Math.round(8+(q[0]-minX)*sc+((cv.width-16)-(maxX-minX)*sc)/2),Math.round(8+(q[1]-minY)*sc+((cv.height-16)-(maxY-minY)*sc)/2)];
  g.fillStyle='#d7b574';for(const q of pts){const [px,py]=P(q);g.fillRect(px,py,2,2)}
  const [sx,sy]=P([0,0]),[fx,fy]=P(pts.at(-1));g.fillStyle='#84b5a7';g.fillRect(sx-2,sy-2,5,5);g.fillStyle='#df493d';g.fillRect(fx-2,fy-2,5,5);
 }
 function sync(){
  root.querySelector('[data-race-mode]').value=mode;
  for(const cv of root.querySelectorAll('[data-plot]'))plot(cv,cv.dataset.plot);topView();
  root.querySelector('.race-colors').innerHTML=Object.entries(R.colors).map(([k,[n]])=>'<label class="race-color"><input type="color" data-race-color="'+k+'" value="'+R.color(k)+'"><span>'+n+'</span></label>').join('');
  const assetOpts='<option value="">Нарисованный</option>'+assetFiles.map(f=>'<option value="asset:'+f+'">'+f+'</option>').join('');
  root.querySelector('.race-sprites').innerHTML=Object.entries(R.sprites).map(([k,n])=>{const cur=R.state.sprites[k]||'';return '<div class="race-sprite"><span>'+n+'</span><select data-race-sprite="'+k+'">'+assetOpts+(cur.startsWith('data:')?'<option value="'+cur+'" selected>Свой файл</option>':'')+'</select><button type="button" data-race-upload="'+k+'" title="Свой PNG с компьютера">Файл…</button></div>'}).join('');
  for(const s of root.querySelectorAll('[data-race-sprite]')){const cur=R.state.sprites[s.dataset.raceSprite]||'';if(!cur.startsWith('data:'))s.value=cur}
 }
 function paint(e,cv){
  const r=cv.getBoundingClientRect(),k=Math.max(0,Math.min(R.COLUMNS-1,Math.floor((e.clientX-r.left)/r.width*R.COLUMNS))),kind=cv.dataset.plot,max=ranges[kind];
  const v=Math.round(Math.max(-max,Math.min(max,(.5-(e.clientY-r.top)/r.height)*2*max*1.05)));
  setState(s=>{const p=s.modes[mode].profile||profile();p[kind][k]=v;if(drawing&&drawing.k!==null&&Math.abs(drawing.k-k)>1){const a=Math.min(k,drawing.k),b=Math.max(k,drawing.k);for(let i=a+1;i<b;i++)p[kind][i]=Math.round(drawing.v+(v-drawing.v)*(i-drawing.k)/(k-drawing.k))}s.modes[mode].profile=p});
  drawing={k,v};
 }
 for(const cv of root.querySelectorAll('[data-plot]')){
  cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;cv.setPointerCapture(e.pointerId);drawing={k:null};paint(e,cv)});
  cv.addEventListener('pointermove',e=>{if(drawing&&cv.hasPointerCapture(e.pointerId))paint(e,cv)});
  for(const t of ['pointerup','pointercancel'])cv.addEventListener(t,()=>drawing=null);
 }
 // The original road of each race comes from a throwaway copy of the engine (race pages are separate).
 function original(){
  if(!window.createFogRace){alert('Движок гонки ещё не загружен.');return}
  const c=document.createElement('canvas'),engine=window.createFogRace({canvas:c,inputSurface:document.createElement('div'),mode,viewportWidth:304,viewportHeight:136});
  const p=engine.originalProfile(R.COLUMNS);engine.stop?.();setState(s=>{s.modes[mode].profile=p});
 }
 let uploadFor=null;const fileInput=root.querySelector('[data-race-file]');
 fileInput.addEventListener('change',()=>{const f=fileInput.files[0];fileInput.value='';if(!f||!uploadFor)return;if(f.size>600000){alert('Файл больше 600 КБ — для спрайта слишком большой.');return}const rd=new FileReader;rd.onload=()=>setState(s=>{s.sprites[uploadFor]=rd.result});rd.readAsDataURL(f)});
 on('click',e=>{
  const act=e.target.closest('[data-race-act]')?.dataset.raceAct;
  if(act==='original')original();
  if(act==='smooth')setState(s=>{const p=s.modes[mode].profile;if(!p)return;for(const kind of ['curve','hill'])p[kind]=p[kind].map((v,i,a)=>Math.round((a[Math.max(0,i-1)]+2*v+a[Math.min(a.length-1,i+1)])/4))});
  if(act==='reset'&&confirm('Вернуть исходную форму трассы «'+R.modes[mode]+'»?'))setState(s=>{s.modes[mode].profile=null});
  if(act==='colors'&&confirm('Вернуть исходные цвета гонок?'))setState(s=>{s.colors={}});
  const up=e.target.closest('[data-race-upload]');if(up){uploadFor=up.dataset.raceUpload;fileInput.click()}
 });
 on('input',e=>{const k=e.target.dataset.raceColor;if(k)setState(s=>{s.colors[k]=e.target.value})});
 on('change',e=>{
  if(e.target.matches('[data-race-mode]')){mode=e.target.value;sync();return}
  const k=e.target.dataset.raceSprite;if(k)setState(s=>{if(e.target.value)s.sprites[k]=e.target.value;else delete s.sprites[k]});
 });
 // Tabs: the panel shows the walk editor or the race editor and follows the level being played.
 function show(which){if(!tabs)return;walk.hidden=which!=='walk';host.hidden=which!=='race';extra.hidden=which!=='race';for(const id of ['#walk-extra','#minimap-settings']){const el=document.querySelector(id);if(el)el.hidden=which!=='walk'}for(const b of tabs.querySelectorAll('[data-editor-tab]'))b.setAttribute('aria-selected',String(b.dataset.editorTab===which))}
 tabs?.addEventListener('click',e=>{const b=e.target.closest('[data-editor-tab]');if(b)show(b.dataset.editorTab)});
 setInterval(()=>{const node=window.journey?.snapshot?.().node;if(node===lastNode)return;lastNode=node;if(screenMode[node]){show('race');if(screenMode[node]!==mode){mode=screenMode[node];sync()}}else if(walkScreens.includes(node))show('walk')},400);
 window.addEventListener('race-edits-change',()=>{if(document.activeElement?.matches?.('[data-race-color]'))return;sync()});
 fetch('assets/files.json').then(r=>r.json()).then(list=>{assetFiles=list;sync()}).catch(()=>{});
 show('walk');sync();
})();
