// Level editor of the waterfall platformer: in each of the four rooms the pieces of ground (their tops are the
// climbs, the gaps between them are the falls with water), bridges, photo blocks hit with the head, coins and the start.
// The rooms are kept in this browser (peninsula-platform-levels-v1) and travel with «Настройки в файл»; without them
// the game builds its own rooms. Every change goes straight into the running level.
(()=>{
 const KEY='peninsula-platform-levels-v1',LEVEL='waterfall',OY=38,W=608,H=174,LENS=14;
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}};
 const write=all=>{try{localStorage.setItem(KEY,JSON.stringify(all))}catch{}};
 window.PeninsulaPlatformLevels={key:KEY,
  get:level=>read()[level]?.rooms||null,
  set(level,rooms){const all=read();all[level]={rooms};write(all)},
  clear(level){const all=read();delete all[level];write(all)}};

 const tabs=document.querySelector('#level-editor-tabs'),sidebar=document.querySelector('.walk-sidebar');if(!tabs||!sidebar)return;
 tabs.style.gridTemplateColumns='1fr 1fr 1fr';
 const tab=document.createElement('button');tab.type='button';tab.dataset.editorTab='platform';tab.textContent='Платформер';tabs.append(tab);
 const host=document.createElement('section');host.id='platform-editor';host.setAttribute('aria-label','Редактор платформера');host.hidden=true;
 host.style.cssText='border:1px solid #425873;background:#101924;padding:12px;font:12px monospace;color:#b8c7d9';
 const TOOLS=[['move','Двигать'],['ground','Земля'],['bridge','Мостик'],['lens','Блок с фото'],['coin','Монета'],['start','Старт'],['erase','Стереть']];
 const HINTS={move:'Тяни предмет мышкой. У земли и мостика за левый или правый край меняется ширина. Delete — удалить выбранное.',
  ground:'Проведи мышкой слева направо: верх куска земли на высоте, где нажал. Промежутки между кусками — провалы с водопадом.',
  bridge:'Проведи мышкой слева направо: мостик на высоте, где нажал. Под мостиком можно оставить провал.',
  lens:'Щёлкни: блок с фото, по нему бьют головой снизу. Ставь на высоте прыжка над землёй или мостиком.',
  coin:'Щёлкни: монета. Герой берёт её, задев.',start:'Щёлкни: откуда герой начинает комнату (встаёт на землю под точкой).',erase:'Щёлкни по предмету, чтобы убрать его.'};
 const btn=(t,a)=>'<button type="button" '+a+' style="padding:5px 6px;margin:0 3px 3px 0;font:12px monospace;color:#b8c7d9;background:#172231;border:1px solid #425873">'+t+'</button>';
 host.innerHTML='<h2 style="font:600 15px monospace;margin:0 0 10px;color:#fff">Платформер · Водопад</h2>'+
  '<div data-pe-rooms>Комната: '+[1,2,3,4].map(n=>btn(n,'data-pe-room="'+(n-1)+'"')).join('')+'</div>'+
  '<div data-pe-tools style="margin-top:6px">'+TOOLS.map(([k,t])=>btn(t,'data-pe-tool="'+k+'"')).join('')+'</div>'+
  '<p data-pe-hint style="min-height:42px;margin:6px 0;line-height:1.35"></p>'+
  '<div style="overflow-x:auto;border:1px solid #425873;background:#000"><canvas data-pe-view width="'+W+'" height="'+H+'" style="display:block;width:'+W*2+'px;height:'+H*2+'px;image-rendering:pixelated;cursor:crosshair;touch-action:none"></canvas></div>'+
  '<p data-pe-info style="margin:6px 0"></p>'+
  '<div>'+btn('Играть эту комнату','data-pe-play')+btn('Вернуть исходный уровень','data-pe-reset')+'</div>';
 sidebar.append(host);
 const view=host.querySelector('[data-pe-view]'),g=view.getContext('2d'),hint=host.querySelector('[data-pe-hint]'),info=host.querySelector('[data-pe-info]');
 let room=0,tool='move',rooms=null,sel=null,drag=null;

 // the built-in rooms come from a level built off screen, so the editor works before the level is opened
 function builtIn(){try{return JSON.parse(JSON.stringify(window.createKhibinyPlatform({canvas:document.createElement('canvas'),inputSurface:document.createElement('div'),images,drawPanel(){},drawText(){},announce(){},onExit(){},level:LEVEL}).builtIn))}catch(e){console.warn(e);return null}}
 function load(){rooms=window.PeninsulaPlatformLevels.get(LEVEL)||builtIn();if(rooms)for(const r of rooms)r.coins=r.coins||[]}
 const playing=()=>typeof platformGame!=='undefined'&&platformGame&&platformGame.level===LEVEL&&typeof screen!=='undefined'&&screen==='platform';
 function commit(){window.PeninsulaPlatformLevels.set(LEVEL,rooms);if(playing())platformGame.setRooms(rooms);draw()}

 // items of the room with their boxes (world coordinates), topmost first
 function items(){const r=rooms[room],out=[];
  r.coins.forEach((c,i)=>out.push({kind:'coin',i,box:[c.x-5,c.y-6,10,12]}));
  r.lenses.forEach((l,i)=>out.push({kind:'lens',i,box:[l.x,l.y,LENS,LENS]}));
  r.bridges.forEach((b,i)=>out.push({kind:'bridge',i,box:[b.x,b.y-3,b.w,15]}));
  out.push({kind:'start',i:0,box:[r.start.x-6,r.start.y-24,12,24]});
  r.ledges.forEach((l,i)=>out.push({kind:'ground',i,box:[l.x,l.y-3,l.w,140-l.y]}));
  return out}
 const hit=(x,y)=>items().find(({box:[a,b,w,h]})=>x>=a&&x<a+w&&y>=b&&y<b+h)||null;
 const list=kind=>({coin:rooms[room].coins,lens:rooms[room].lenses,bridge:rooms[room].bridges,ground:rooms[room].ledges})[kind];
 const groundBelow=(x,y)=>rooms[room].ledges.filter(l=>x>=l.x&&x<=l.x+l.w&&l.y>=y-2).sort((a,b)=>a.y-b.y)[0];

 function draw(){
  if(!rooms){load();if(!rooms){info.textContent='Уровень не собрался — открой «Водопад» и вернись сюда.';return}}
  const r=rooms[room];g.imageSmoothingEnabled=false;g.fillStyle='#8fb3cf';g.fillRect(0,0,W,H);
  const bg=images.waterfall_platform_bg1&&images['waterfall_platform_bg'+(room+1)];if(bg){g.globalAlpha=.45;g.drawImage(bg,0,0,W,H);g.globalAlpha=1}
  g.fillStyle='rgba(255,255,255,.12)';for(let x=0;x<W;x+=16)g.fillRect(x,0,1,H);
  // falls: the gaps between pieces of ground
  const cover=[...r.ledges].sort((a,b)=>a.x-b.x);let x=0,lastY=cover[0]?.y??100;
  for(const l of cover){if(l.x>x+1){g.fillStyle='#3d6f96';g.fillRect(x,Math.min(lastY,l.y)-2+OY,l.x-x,H)}if(l.x+l.w>x){x=l.x+l.w;lastY=l.y}}
  for(const l of r.ledges){g.fillStyle='#5b5650';g.fillRect(l.x,l.y+OY,l.w,H);g.fillStyle='#8aa43a';g.fillRect(l.x,l.y+OY-2,l.w,4)}
  for(const b of r.bridges){g.fillStyle='#7a6a55';g.fillRect(b.x,b.y+OY-3,b.w,12);g.fillStyle='#a8957a';g.fillRect(b.x,b.y+OY-3,b.w,2)}
  for(const l of r.lenses){g.fillStyle='#1d2a3a';g.fillRect(l.x,l.y+OY,LENS,LENS);g.fillStyle='#4f8fd0';g.fillRect(l.x+3,l.y+OY+3,LENS-6,LENS-6)}
  for(const c of r.coins){g.fillStyle='#7a4e10';g.fillRect(c.x-4,c.y+OY-5,8,10);g.fillStyle='#f2c14e';g.fillRect(c.x-3,c.y+OY-4,6,8)}
  g.fillStyle='#2e7d32';g.fillRect(r.start.x-4,r.start.y+OY-24,8,24);g.fillStyle='#fff';g.fillRect(r.start.x-1,r.start.y+OY-20,2,2);
  if(sel){const it=items().find(i=>i.kind===sel.kind&&i.i===sel.i);if(it){const [a,b,w,h]=it.box;g.strokeStyle='#ff4fd8';g.lineWidth=1;g.strokeRect(a-.5,b+OY-.5,w+1,Math.min(h,40)+1)}}
  if(drag?.draft){const d=drag.draft;g.fillStyle=drag.kind==='bridge'?'rgba(168,149,122,.8)':'rgba(138,164,58,.8)';g.fillRect(d.x,d.y+OY-3,d.w,6)}
  info.textContent='Комната '+(room+1)+': земли '+r.ledges.length+', мостиков '+r.bridges.length+', блоков с фото '+r.lenses.length+', монет '+r.coins.length+'. Всего блоков с фото: '+rooms.reduce((n,q)=>n+q.lenses.length,0)+'.';
  for(const b of host.querySelectorAll('[data-pe-room]'))b.style.background=+b.dataset.peRoom===room?'#2b4059':'#172231';
  for(const b of host.querySelectorAll('[data-pe-tool]'))b.style.background=b.dataset.peTool===tool?'#2b4059':'#172231';
  hint.textContent=HINTS[tool];
 }
 const at=e=>{const b=view.getBoundingClientRect();return {x:Math.round((e.clientX-b.left)*W/b.width),y:Math.round((e.clientY-b.top)*H/b.height)-OY}};
 view.addEventListener('pointerdown',e=>{if(!rooms)return;view.setPointerCapture(e.pointerId);const {x,y}=at(e),r=rooms[room];
  if(tool==='ground'||tool==='bridge'){drag={kind:tool,x0:x,y,draft:{x,y,w:1}};draw();return}
  if(tool==='lens'){r.lenses.push({x:x-7,y:y-7});sel={kind:'lens',i:r.lenses.length-1};commit();return}
  if(tool==='coin'){r.coins.push({x,y});sel={kind:'coin',i:r.coins.length-1};commit();return}
  if(tool==='start'){const l=groundBelow(x,y);r.start={x,y:l?l.y:y};commit();return}
  const it=hit(x,y);if(tool==='erase'){if(it&&it.kind!=='start'){list(it.kind).splice(it.i,1);sel=null;commit()}return}
  sel=it?{kind:it.kind,i:it.i}:null;if(!it){draw();return}
  const o=it.kind==='start'?r.start:list(it.kind)[it.i],edge=(it.kind==='ground'||it.kind==='bridge')?(x<o.x+4?'left':x>o.x+o.w-4?'right':null):null;
  drag={kind:'move',it,edge,x0:x,y0:y,orig:{...o}};draw()});
 view.addEventListener('pointermove',e=>{if(!drag)return;const {x,y}=at(e),r=rooms[room];
  if(drag.draft){const a=Math.min(drag.x0,x),b=Math.max(drag.x0,x);drag.draft={x:a,y:drag.y,w:Math.max(1,b-a)};draw();return}
  const it=drag.it,o=it.kind==='start'?r.start:list(it.kind)[it.i],dx=x-drag.x0,dy=y-drag.y0,s=drag.orig;
  if(drag.edge==='left'){const right=s.x+s.w;o.x=Math.min(right-8,s.x+dx);o.w=right-o.x}else if(drag.edge==='right'){o.w=Math.max(8,s.w+dx)}else{o.x=s.x+dx;o.y=s.y+dy}
  if(playing())platformGame.setRooms(rooms);draw()});
 view.addEventListener('pointerup',()=>{if(!drag)return;const r=rooms[room];
  if(drag.draft){const d=drag.draft,min=drag.kind==='bridge'?16:8;if(d.w>=min){const l=list(drag.kind);l.push({x:d.x,y:d.y,w:d.w});sel={kind:drag.kind,i:l.length-1}}}
  drag=null;commit()});
 window.addEventListener('keydown',e=>{if(host.hidden||!sel||!rooms||!['Delete','Backspace'].includes(e.key)||e.target.closest?.('input,textarea'))return;if(sel.kind!=='start'){list(sel.kind).splice(sel.i,1);sel=null;commit()}});
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.peRoom!==undefined){room=+b.dataset.peRoom;sel=null;draw()}
  else if(b.dataset.peTool){tool=b.dataset.peTool;draw()}
  else if(b.hasAttribute('data-pe-play')){if(!playing())launchPlatform(LEVEL);platformGame.setRooms(rooms);platformGame.goRoom(room)}
  else if(b.hasAttribute('data-pe-reset')&&confirm('Вернуть исходный уровень Водопада? Твои правки уровня сотрутся.')){window.PeninsulaPlatformLevels.clear(LEVEL);rooms=builtIn();sel=null;if(playing())platformGame.setRooms(rooms);draw()}});

 // the tab: shown by its button and when the waterfall is opened
 const OTHER=['#walk-editor','#race-editor','#walk-extra','#race-extra','#minimap-settings'];
 function show(on){host.hidden=!on;if(on){for(const id of OTHER){const el=document.querySelector(id);if(el)el.hidden=true}for(const b of tabs.querySelectorAll('[data-editor-tab]'))b.setAttribute('aria-selected',String(b===tab));draw()}}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-editor-tab]');if(b)show(b===tab)});
 let wasPlaying=false;setInterval(()=>{const now=playing();if(now&&!wasPlaying)show(true);wasPlaying=now},400);
 window.addEventListener('settings-applied',()=>{rooms=null;if(!host.hidden)draw()});
})();
