// Dialogue editor under the game (a scrolling panel): on a level it shows your own "when … say …" cards and the built-in
// texts of that level with the condition they appear on. Cards can be added, changed, hidden or deleted.
(()=>{
 const D=window.PeninsulaDialogue,host=document.querySelector('#dialogue-editor');if(!D||!host)return;
 const nodes={drive1:['race:sredny',['race']],fog4:['race:fog',['race']],traffic5:['race:home',['race']],camp1:['walk:coast',['camp1','walk']],bear2:['walk:bear',['bear2','walk']],house2:['walk:house',['house2','walk']],village3:['walk:village',['village3','walk']],shop3:['shop:teriberka',['shop3']],exchange4:['exchange:pass',['exchange4']],platform5:[null,['platform5']]};
 // Built-in texts shared by several levels but shown only on one of them (the rest appear everywhere in their section).
 const onlyOn={'race.arrivedSredny':['race:sredny'],'race.headingSredny':['race:sredny'],'race.arrivedFog':['race:fog'],'race.startFog':['race:fog'],'race.cliffEdge':['race:fog'],'race.fogDrive':['race:fog'],'race.overtook':['race:fog'],'race.headingFog':['race:fog'],'race.arrivedHome':['race:home'],'race.startHome':['race:home'],'race.headingHome':['race:home'],'walk.houseWall':['walk:house'],'walk.forest':['walk:bear'],'walk.rocks':['walk:coast','walk:village']};
 const dirNames=['Север','Восток','Юг','Запад'],placeNames={t:'Туристы',c:'Стоянка',r:'Мусор',b:'Медведь',w:'Особое место'};
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 let node=null,openBuiltIn=false;
 const sel=(name,lib,value)=>'<select data-f="'+name+'">'+Object.entries(lib).map(([k,n])=>'<option value="'+k+'"'+(String(k)===String(value)?' selected':'')+'>'+n+'</option>').join('')+'</select>';
 const numIn=(name,label,value,step=1)=>'<label class="dlg-num">'+label+'<input type="number" data-f="'+name+'" value="'+value+'" step="'+step+'"></label>';
 function places(level){const id=level.split(':')[1],g=window.PeninsulaWalk?.grid(id)||[];const found={};for(const row of g)for(const c of row)if(placeNames[c])found[c]=placeNames[c];return Object.keys(found).length?found:placeNames}
 // Things that can be hovered or handed over: the shop catalogue, or what the wanderer may take.
 function items(level){
  const T=window.PENINSULA_LEVEL_TEXTS,list={'*':'Любой товар'};
  if(level==='shop:teriberka')for(const [k,e]of Object.entries(T.shop3?.texts||{}))if(k.startsWith('item_'))list[k.slice(5)]=e.text;
  if(level==='exchange:pass')Object.assign(list,{'*':'Любая вещь',food:LT('exchange4.itemFood'),mug:LT('exchange4.itemMug'),tent:LT('exchange4.itemTent')});
  return list;
 }
 function describe(r){
  if(r.type==='hover'||r.type==='give')return D.triggers[D.kindOf(r.level)][r.type]+' «'+(items(r.level)[r.item]||r.item)+'»';
  const t=D.triggers[D.kindOf(r.level)][r.type];
  if(r.type==='cell')return t+' '+r.x+','+r.y;
  if(r.type==='line')return t+' '+(r.axis==='x'?'X = ':'Y = ')+r.value;
  if(r.type==='facing')return t+': '+dirNames[r.dir].toLowerCase()+(r.anyCell?'':' (в клетке '+r.x+','+r.y+')');
  if(r.type==='near')return t+' «'+(placeNames[r.place]||r.place)+'» ≤ '+r.distance;
  if(r.type==='progress')return t+': '+r.percent+'%';
  if(r.type==='speed')return t+' '+r.speed+' км/ч';
  return t;
 }
 function params(r){
  const walk=D.kindOf(r.level)==='walk',take=walk?'<button type="button" data-act="take">Взять позицию игрока</button>':'';
  if(r.type==='cell')return numIn('x','X',r.x)+numIn('y','Y',r.y)+take;
  if(r.type==='line')return '<label class="dlg-num">Линия'+sel('axis',{x:'Столбец X',y:'Строка Y'},r.axis)+'</label>'+numIn('value','Номер',r.value)+take;
  if(r.type==='facing')return '<label class="dlg-num">Сторона'+sel('dir',dirNames,r.dir)+'</label><label class="dlg-check"><input type="checkbox" data-f="anyCell"'+(r.anyCell?' checked':'')+'>в любой клетке</label>'+(r.anyCell?'':numIn('x','X',r.x)+numIn('y','Y',r.y))+take;
  if(r.type==='near')return '<label class="dlg-num">Место'+sel('place',places(r.level),r.place)+'</label>'+numIn('distance','Клеток',r.distance);
  if(r.type==='progress')return numIn('percent','% трассы',r.percent);
  if(r.type==='speed')return numIn('speed','км/ч',r.speed);
  if(r.type==='hover'||r.type==='give')return '<label class="dlg-num">Товар'+sel('item',items(r.level),r.item)+'</label>';
  return '';
 }
 function ruleCard(r){
  const event=['start','line','progress'].includes(r.type);
  return '<article class="dlg-card dlg-own" data-rule="'+r.id+'"><header>КОГДА · '+esc(describe(r))+'</header><div class="dlg-body">'+
   '<div class="dlg-row">'+sel('type',D.triggers[D.kindOf(r.level)],r.type)+params(r)+'</div>'+
   '<label class="dlg-text">ГОВОРИТ<textarea data-f="text" rows="2" placeholder="Текст в окне диалога">'+esc(r.text)+'</textarea></label>'+
   '<div class="dlg-row">'+(event&&D.kindOf(r.level)==='race'?numIn('seconds','Секунд',r.seconds):'')+'<label class="dlg-check"><input type="checkbox" data-f="once"'+(r.once?' checked':'')+'>только один раз</label><button type="button" class="dlg-delete" data-act="delete">Удалить</button></div>'+
   '</div></article>';
 }
 function builtInCards(sections,level){
  const T=window.PENINSULA_LEVEL_TEXTS,cards=[];
  for(const s of sections)for(const [k,e]of Object.entries(T[s]?.texts||{})){const code=s+'.'+k;if(onlyOn[code]&&!onlyOn[code].includes(level))continue;const hidden=D.state.hidden.includes(code),shown=window.PeninsulaText?.text?PeninsulaText.text(e.text):e.text;
   cards.push('<article class="dlg-card dlg-builtin'+(hidden?' dlg-hidden':'')+'" data-code="'+code+'"><header>КОГДА · '+esc(e.when||'—')+'</header><div class="dlg-body"><label class="dlg-text">'+code+'<textarea data-b="text" rows="2">'+esc(shown)+'</textarea></label><label class="dlg-check"><input type="checkbox" data-b="show"'+(hidden?'':' checked')+'>показывать</label></div></article>')}
  return cards.join('');
 }
 function render(){
  const info=nodes[node];host.hidden=!info;if(!info)return;
  const [level,sections]=info,T=window.PENINSULA_LEVEL_TEXTS,logic=sections.map(s=>T[s]?.logic).filter(Boolean).join(' ');
  const rules=level?D.state.rules.filter(r=>r.level===level):[];
  host.innerHTML='<h2>Диалоги уровня'+(level?' · '+D.levels[level]:'')+'</h2>'+
   (level?'<p class="walk-hint">'+(['shop','exchange'].includes(D.kindOf(level))?'Что написать, пока мышка на товаре, и что скажет человек, если перетащить на него товар. Пока карточек нет, всё работает как раньше.':'Свои условия проверяются раньше встроенных: пока условие выполняется (или после события), в окне диалога стоит ваш текст.')+'</p><div class="dlg-grid">'+rules.map(ruleCard).join('')+'</div><button type="button" class="dlg-add" data-act="add">+ Добавить условие</button>':'<p class="walk-hint">Свои условия пока работают в бродилках и гонках; здесь можно поправить или скрыть встроенные тексты.</p>')+
   '<details class="dlg-builtin-list"'+(openBuiltIn?' open':'')+'><summary>Встроенные тексты уровня и когда они появляются</summary>'+(logic?'<p class="walk-hint">'+esc(logic)+'</p>':'')+'<div class="dlg-grid">'+builtInCards(sections,level)+'</div></details>';
 }
 const setRules=fn=>{const s=JSON.parse(JSON.stringify(D.state));fn(s);D.update(s)};
 function playerState(level){
  if(level==='walk:coast'){try{return document.querySelector('#level-frame').contentWindow.PeninsulaDialogue.lastState[level]}catch{return null}}
  return D.lastState[level];
 }
 host.addEventListener('toggle',e=>{if(e.target.matches('.dlg-builtin-list'))openBuiltIn=e.target.open},true);
 host.addEventListener('change',e=>{
  const card=e.target.closest('[data-rule]'),f=e.target.dataset.f;
  if(card&&f)setRules(s=>{const r=s.rules.find(q=>q.id===card.dataset.rule);if(!r)return;r[f]=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?Number(e.target.value):e.target.value});
  const b=e.target.closest('[data-code]');
  if(b&&e.target.dataset.b==='show')setRules(s=>{s.hidden=s.hidden.filter(c=>c!==b.dataset.code);if(!e.target.checked)s.hidden.push(b.dataset.code)});
  if(b&&e.target.dataset.b==='text'){const [sec,k]=b.dataset.code.split('.'),orig=window.PENINSULA_LEVEL_TEXTS[sec].texts[k].text;window.PeninsulaText?.setOverride?.(orig,e.target.value===orig?null:e.target.value)}
 });
 host.addEventListener('click',e=>{
  const act=e.target.closest('[data-act]')?.dataset.act;if(!act)return;const level=nodes[node]?.[0],card=e.target.closest('[data-rule]');
  if(act==='add'&&level)setRules(s=>{s.rules.push(D.newRule(level))});
  if(act==='delete'&&card&&confirm('Удалить это условие?'))setRules(s=>{s.rules=s.rules.filter(r=>r.id!==card.dataset.rule)});
  if(act==='take'&&card){const p=playerState(level);if(!p){alert('Сначала зайдите в уровень и сделайте шаг.');return}setRules(s=>{const r=s.rules.find(q=>q.id===card.dataset.rule);r.x=p.x;r.y=p.y;if(r.type==='facing')r.dir=p.dir;if(r.type==='line')r.value=r.axis==='x'?p.x:p.y})}
 });
 // Re-render after a change, but never under the text being typed.
 window.addEventListener('dialogue-rules-change',()=>{if(!(host.contains(document.activeElement)&&document.activeElement.tagName==='TEXTAREA'))render()});
 setInterval(()=>{const n=window.journey?.snapshot?.().node;if(n!==node){node=n;render()}},400);
 render();
})();
