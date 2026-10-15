// Dialogue rules: your own "when … say …" cards for walk and race levels, and built-in level texts that
// can be hidden. Levels ask evaluate(level, state) for the line to show in their dialogue box.
// Stored in the browser and in the settings export; embedded levels follow through the storage event.
(()=>{
 const key='peninsula-dialogue-rules-v1';
 const levels={'walk:coast':'Лагерь','walk:bear':'Медведь','walk:house':'Заброшка','walk:village':'Поиск лавки','race:sredny':'Гонка 1.1','race:fog':'Туманная гонка','race:home':'Дорога домой','shop:teriberka':'Лавка в Териберке','exchange:pass':'Странник на перевале'};
 const triggers={
  walk:{start:'В начале уровня',cell:'Игрок пришёл в клетку',line:'Игрок пересёк линию',facing:'Игрок смотрит в сторону',near:'Игрок рядом с местом'},
  race:{start:'На старте',progress:'Проехали часть трассы',speed:'Скорость выше',detour:'На объезде',edge:'У края дороги'},
  shop:{hover:'Мышка на товаре',give:'Товар перетащили на человека'},
  exchange:{hover:'Мышка на вещи',give:'Вещь перетащили на человека'}
 };
 const kindOf=level=>level.split(':')[0];
 const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
 function normalizeRule(r){
  if(!r||!levels[r.level])return null;const t=triggers[kindOf(r.level)];const type=t[r.type]?r.type:Object.keys(t)[0];
  return {id:String(r.id||Math.random().toString(36).slice(2,9)),level:r.level,type,x:num(r.x),y:num(r.y),axis:r.axis==='y'?'y':'x',value:num(r.value),dir:[0,1,2,3].includes(Number(r.dir))?Number(r.dir):0,anyCell:r.anyCell!==false,place:typeof r.place==='string'?r.place.slice(0,1):'c',distance:Math.max(0,num(r.distance,1)),percent:Math.max(0,Math.min(100,num(r.percent,50))),speed:Math.max(0,num(r.speed,60)),seconds:Math.max(1,Math.min(30,num(r.seconds,4))),item:typeof r.item==='string'&&/^[\w*]+$/.test(r.item)?r.item:'*',once:!!r.once,text:String(r.text||'').slice(0,400)};
 }
 function normalize(v={}){v=v&&typeof v==='object'?v:{};return {rules:(Array.isArray(v.rules)?v.rules:[]).map(normalizeRule).filter(Boolean),hidden:(Array.isArray(v.hidden)?v.hidden:[]).filter(c=>typeof c==='string'&&/^\w+\.\w+$/.test(c))}}
 let state=normalize(window.PENINSULA_PROJECT_CONFIG?.dialogue);try{const s=localStorage.getItem(key);if(s)state=normalize(JSON.parse(s))}catch{}
 const changed=()=>window.dispatchEvent(new Event('dialogue-rules-change'));
 function update(v){state=normalize(v);try{localStorage.setItem(key,JSON.stringify(state))}catch{}changed()}
 window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'{}'));changed()}catch{}}});
 // Hidden built-in texts come back empty, so the level shows nothing for them.
 const originalLT=window.LT;
 if(originalLT)window.LT=(id,vars)=>state.hidden.includes(String(id))?'':originalLT(id,vars);
 const memory={};const lastState={};
 function begin(level){memory[level]={prev:null,fired:new Set(),event:null}}
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 function holds(r,s,prev){
  if(r.type==='cell')return s.x===r.x&&s.y===r.y;
  if(r.type==='facing')return s.dir===r.dir&&(r.anyCell||s.x===r.x&&s.y===r.y);
  if(r.type==='near'){for(let dy=-r.distance;dy<=r.distance;dy++)for(let dx=-r.distance;dx<=r.distance;dx++)if(s.grid?.[s.y+dy]?.[s.x+dx]===r.place)return true;return false}
  if(r.type==='speed')return s.speed>=r.speed;
  if(r.type==='detour')return !!s.detour;
  if(r.type==='edge')return !!s.warning;
  return false;
 }
 function crossed(r,s,prev){
  if(r.type==='start')return !prev;
  if(!prev)return false;
  if(r.type==='line'){const a=r.axis==='x'?prev.x:prev.y,b=r.axis==='x'?s.x:s.y;return a<r.value&&b>=r.value||a>=r.value&&b<r.value}
  if(r.type==='progress')return prev.progress*100<r.percent&&s.progress*100>=r.percent;
  return false;
 }
 function evaluate(level,s){
  lastState[level]={...s,grid:undefined};
  if(kindOf(level)==='race'&&s.state==='title')begin(level);
  const m=memory[level]||(begin(level),memory[level]),now=Date.now(),walk=kindOf(level)==='walk',stateKey=walk?s.x+','+s.y+','+s.dir:'';
  const rules=state.rules.filter(r=>r.level===level&&r.text);
  // Events (start, crossing a line or a mark) show for a while; in walks they last until the player's next step or turn.
  for(const r of rules){if(m.fired.has(r.id)&&r.once)continue;if(crossed(r,s,m.prev)){m.event={text:r.text,until:now+r.seconds*1000,key:stateKey};m.fired.add(r.id)}}
  if(walk&&m.event&&m.event.key!==stateKey)m.event=null;
  m.prev={...s};
  if(m.event&&(walk?m.event.key===stateKey:now<m.event.until))return m.event.text;
  // Conditions (cell, facing, near, speed, detour, road edge) show while they hold.
  for(const r of rules){if(['start','line','progress'].includes(r.type))continue;if(r.once&&m.fired.has(r.id)&&!m.holding?.has(r.id))continue;if(holds(r,s)){m.fired.add(r.id);(m.holding||(m.holding=new Set)).add(r.id);return r.text}else m.holding?.delete(r.id)}
  return null;
 }
 // Trading levels: the line for hovering an item or for dragging it onto the person (a card for this item wins over "any item").
 function itemText(level,type,id){
  const m=memory[level]||(begin(level),memory[level]);
  const rules=state.rules.filter(r=>r.level===level&&r.type===type&&r.text&&(r.item===id||r.item==='*')).sort((a,b)=>(a.item==='*')-(b.item==='*'));
  for(const r of rules){if(r.once&&m.fired.has(r.id)&&type==='give')continue;if(r.once&&type==='hover'&&m.fired.has(r.id)&&m.hovered!==id)continue;m.fired.add(r.id);m.hovered=id;return r.text}
  return null;
 }
 window.PeninsulaDialogue={key,levels,triggers,kindOf,normalize,update,begin,evaluate,itemText,lastState,get state(){return state},newRule:level=>normalizeRule({level,text:''})};
})();
