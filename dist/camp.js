// A small, step-based first-person campsite search on the Sredny coast.
window.createCampSearch = function({canvas,inputSurface,images,drawPanel,drawText,announce,onExit,mode="coast",objective=false,completeLabel="НА КАРТУ"}){
  const ctx=canvas.getContext('2d');
  const indoor=mode==='house',bear=mode==='bear',village=mode==='village';
  const coastGrid=['~########','~....t..#','~..c....#','~....w..#','~.......#','~.......#','~~~~~~~~~'];
  const houseGrid=['#############','#.....#.....#','#.....#.....#','#...........#','#.....#.....#','###.#####.###','#.....#.....#','#...........#','#.....#.....#','#.....#.....#','#############'];
  const bearGrid=['#########','#.......#','#..b....#','#.#..#..#','#.......#','#.......#','#########'];
  const grid=indoor?houseGrid:bear?bearGrid:coastGrid;
  const renderer=window.createWalkView({images,indoor,forest:bear});
  const mapW=grid[0].length,mapH=grid.length;
  const vectors=[[0,-1],[1,0],[0,1],[-1,0]],cardinals=['СЕВЕР','ВОСТОК','ЮГ','ЗАПАД'];
  const view={x:8,y:23,w:188,h:136},bag={x:198,y:176,w:28,h:28};
  const trashSpots=[{id:'bottle',x:58,y:114,w:24,h:24},{id:'wrapper',x:119,y:126,w:22,h:18}];
  let active=false,x=3,y=indoor?8:5,dir=0,intro=!indoor&&!village,won=false,drag=null,showMap=false,lastMessage='',chosen=null,failed=false;
  const collected=new Set(),seen=new Set();let hits=[];
  function reveal(){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(grid[y+dy]?.[x+dx])seen.add((x+dx)+','+(y+dy));}reveal();
  const bearItems=[{id:'dagger',name:'Кинжал',asset:'bear_dagger'},{id:'food',name:'Еда',asset:'shop_tin'},{id:'repeller',name:'Отпугиватель',asset:'bear_repeller'}];
  const info={
    c:{name:'Площадка у моря',asset:'camp_good',dry:true,view:true,quiet:true},
    w:{name:'Сырая низина',asset:'camp_wet',dry:false,view:true,quiet:true},
    t:{name:'Стоянка туристов',asset:'camp_tourists',dry:true,view:true,quiet:false}
  };
  const tile=()=>grid[y][x],site=()=>info[tile()];
  function rect(a,b,w,h,c){ctx.fillStyle=c;ctx.fillRect(a,b,w,h)}
  function text(s,a,b,c='#dce5ed',align='left'){drawText(s,a,b,8,c,align)}
  function wrapped(s,a,b,width,color='#cbd6df',max=2,gap=10){
    const out=[];let line='';for(const word of s.toUpperCase().split(/\s+/)){if(line&&pixelMeasure(line+' '+word)>width){out.push(line);line=word}else line+=(line?' ':'')+word;}if(line)out.push(line);out.slice(0,max).forEach((l,i)=>text(l,a,b+i*gap,color));return out.length;
  }
  function message(s){lastMessage=s;announce(s);render()}
  function hit(label,a,b,w,h,fn){hits.push({label,x:a,y:b,w,h,fn})}
  function button(label,a,b,w,h,fn){drawPanel(a,b,w,h,'ui_button');text(label,a+w/2,b+(h-7)/2,'#dce5ed','center');hit(label,a,b,w,h,fn)}
  function step(which=1){if(intro||won||failed||drag)return;const [dx,dy]=vectors[dir],nx=x+dx*which,ny=y+dy*which;const target=grid[ny]?.[nx];if(target==='#'||target==='~'||!target){const behind=which<0?'За спиной ':'';message(target==='~'?behind+'Море. Не пройти.\nИдите вдоль берега.':behind+(indoor?'Стена дома.\nИщите проход.':bear?'Густой лес.\nЗдесь не пройти.':'Скалы. Не пройти.\nИдите вдоль скал.'));return}x=nx;y=ny;reveal();describe()}
  function turn(amount){if(intro||won||failed||drag)return;dir=(dir+amount+4)%4;lastMessage='Вы смотрите на '+cardinals[dir].toLowerCase()+'.';render()}
  function describe(){if(bear){message(tile()==='b'?'Открытая поляна.\nВыберите предмет.':'Слышен рёв медведя.\nНайдите поляну.');return}if(village){message('Ищите лавку на севере.\nОна отмечена золотом.');return}if(indoor){message('Большой зал дома.\nИщите проход дальше.');return}const s=site();lastMessage=s?s.name+'.\nОсмотрите площадку.':'Прибрежная тропа.\nИщите площадку у моря.';announce(lastMessage);render()}
  function reason(){if(bear)return tile()==='b'?'':'Это не поляна.\nОна отмечена золотом.';const s=site();if(!s)return 'На тропе нельзя.\nНайдите площадку.';if(!s.dry)return 'Здесь сыро.\nПалатка промокнет.';if(!s.view)return 'Не видно моря.\nИщите вид получше.';if(!s.quiet)return 'Рядом туристы.\nНужно тихое место.';if(collected.size<2)return 'Здесь мусор.\nСначала уберите его.';return ''}
  function install(id=chosen?.id){if(village)return false;if(indoor)return false;if(bear){const why=reason();if(why){chosen=null;message(why);return false}if(!id){message('Выберите предмет в инвентаре.');return false}chosen=null;if(id==='repeller'){won=true;showMap=false;message('Отпугиватель стоит.\nМедведь ушёл.');return true}if(id==='dagger'){failed=true;showMap=false;message('Кинжал не помог.\nВы погибли.');return false}message('Еда приманит медведя.\nВыберите другое.');return false}const why=reason();if(why){message(why);return false}won=true;drag=null;showMap=false;message('Лагерь установлен.\nМусор заберём с собой.');return true}
  function inspect(){if(objective&&indoor){if(x>=8&&y<=3){won=true;showMap=false;message('Вы нашли старую ниву.');}else message('Осмотрите дальний зал.\nТам остались вещи.');return}if(village){if(x===5&&y===1){won=true;showMap=false;message('Вы нашли лавку\nтаинственного торговца.');}else message('Лавка на севере.\nИдите вдоль берега.');return}if(bear){message(reason()||'Открытая поляна.\nВыберите предмет.');return}if(indoor){message('Пустой дом.\nСтарая мебель и полки.');return}const why=reason();message(why||'Сухо, тихо, чисто и красивый вид. Перетащите палатку сюда.')}
  function collect(id){if(tile()!=='c'||collected.has(id)||won)return;collected.add(id);message('Спасибо, что вы убрали мусор! '+(collected.size===2?'Теперь здесь чисто.':'Заберите и оставшийся мусор.'))}
  function item(asset,a,b,w=26,h=26){ctx.drawImage(images[asset],Math.round(a),Math.round(b),w,h)}
  function drawScene(){
    drawPanel(4,24,192,132);
    let objects;
    if(indoor)objects=[
      {x:1.5,y:1.3,asset:'walk_shelf',height:1.2},{x:4.5,y:1.3,asset:'walk_shelf',height:1.2},{x:3.5,y:3.5,asset:'walk_table',height:.65},
      {x:9.5,y:2.5,asset:'walk_table',height:.65},{x:10.5,y:3.5,asset:'walk_chair',height:.8},{x:11.5,y:1.3,asset:'walk_shelf',height:1.2},
      {x:2.5,y:7.2,asset:'walk_table',height:.65},{x:4.5,y:6.3,asset:'walk_shelf',height:1.2},{x:1.5,y:8.5,asset:'walk_chair',height:.8},
      {x:9.5,y:8.5,asset:'walk_table',height:.65},{x:11.5,y:6.3,asset:'walk_shelf',height:1.2},{x:8.5,y:7.5,asset:'walk_chair',height:.8}
    ];
    else if(bear)objects=won?[{x:3.5,y:2.1,asset:'bear_repeller',height:.45}]:[];
    else if(village)objects=[{x:5.5,y:1.2,asset:'walk_table',height:.65},{x:5.5,y:.9,asset:'walk_shelf',height:1.2}];
    else objects=[{x:5.5,y:3.2,asset:'shore_wet',height:.12,ratio:3},{x:5.5,y:1.3,asset:'shore_tourists',height:.75,ratio:1.7},
      ...trashSpots.filter(o=>tile()!=='c'&&!collected.has(o.id)).map((o,i)=>({id:o.id,x:3.25+i*.5,y:2.1,asset:'camp_'+o.id,height:.12})),
      ...(won?[{x:3.5,y:2.1,asset:'camp_tent',height:.6}]:[])];
    renderer.render(ctx,view,grid,x,y,dir,objects);
    // Nearby ground items must remain visible and reachable at the player's feet.
    if(!indoor&&!bear&&!village&&tile()==='c'&&!won)for(const o of trashSpots){
      if(collected.has(o.id))continue;
      item('camp_'+o.id,o.x,o.y,o.w,o.h);
      if(!intro&&!showMap)hit('Поднять '+o.id,o.x-3,o.y-3,o.w+6,o.h+6,()=>collect(o.id));
    }
    if(drag){rect(view.x+2,view.y+view.h-12,view.w-4,10,reason()?'#432d28':'#223d34');text(reason()?'ЭТО МЕСТО НЕ ПОДХОДИТ':bear?'МОЖНО ПОСТАВИТЬ ПУГАЛКУ':'МОЖНО ПОСТАВИТЬ ПАЛАТКУ',view.x+view.w/2,view.y+view.h-10,'#f1d39a','center');}
  }
  function drawDetails(){
    if(village){drawPanel(199,24,117,132);text('НАЙДИТЕ ЛАВКУ',207,32,'#e5c695');wrapped('Вам обязательно нужно найти особенный местный сувенир. Лавка на севере, у золотой точки.',207,60,99,'#cbd6df',8);return}if(bear){drawPanel(199,24,117,132);text('ОТПУГНИ',207,32,'#e5c695');text('МЕДВЕДЯ',207,43,'#e5c695');rect(207,56,101,1,'#364a61');wrapped(tile()==='b'?'Открытая поляна. Выберите предмет и поставьте его здесь.':'Слышен рёв медведя. Ищите поляну: золотая точка на карте.',207,64,99,'#cbd6df',7);text(tile()==='b'?'МЕСТО НАЙДЕНО':'ИЩИТЕ ПОЛЯНУ',207,140,'#a6c4a7');return}
    if(indoor){drawPanel(199,24,117,132);text('ЗАБРОШКА',207,32,'#e5c695');rect(207,49,101,1,'#364a61');wrapped(objective?'Осмотрите дальний зал на северо-востоке. Там может быть интересная находка.':'Большие залы старого дома. Ищите проходы между комнатами.',207,59,99,'#cbd6df',7);text('БЕЗЛЮДНО',207,138,'#a6c4a7');return}
    drawPanel(199,24,117,132);text('НАЙДИТЕ МЕСТО',207,32,'#e5c695');text('ДЛЯ ЛАГЕРЯ',207,43,'#e5c695');rect(207,56,101,1,'#364a61');
    const s=site();wrapped(s?s.name:'Прибрежная тропа',207,62,99,'#e4e6e8',2);
    if(s){
      const checks=[['СУХО',s.dry],['ВИД НА МОРЕ',s.view],['ТИШИНА',s.quiet],['ЧИСТО',tile()!=='c'||collected.size===2]];
      checks.forEach(([l,v],i)=>text(l+': '+(v?'ДА':'НЕТ'),207,86+i*11,v?'#a6c4a7':'#e7a684'));
      text('ПАЛАТКА:',207,135,'#a9b9cd');text(reason()?'РАНО':'МОЖНО',307,145,reason()?'#e7a684':'#a6c4a7','right');
    }else wrapped('Ищите площадку. Золотые точки на карте — места для лагеря.',207,87,99,'#a9b9cd',6);
  }
  function drawParty(){
    ['knight','wanderer','mage'].forEach((name,i)=>{const px=5+i*36;drawPanel(px,161,35,51);const portrait=images[name];const crop=[[31,0,52,51],[36,9,48,50],[33,15,54,55]][i];ctx.drawImage(portrait,...crop,px+4,165,27,30);rect(px+4,198,27,3,'#4c2029');rect(px+4,198,25,3,'#b95452');rect(px+4,204,27,3,'#1b3e43');rect(px+4,204,23,3,'#789ba3')});
  }
  function drawBag(){
    drawPanel(199,159,117,53);text('ИНВЕНТАРЬ',257,161,'#a9b9cd','center');
    for(let i=0;i<3;i++){const a=202+i*36;drawPanel(a,173,32,30,'ui_button');}
    if(bear){bearItems.forEach((o,i)=>{const a=202+i*36;if(chosen?.id===o.id)rect(a+4,177,24,22,'#2b4059');if(!(won&&o.id==='repeller')&&drag?.kind!==o.id)item(o.asset,a+3,175,26,26);if(!won&&!failed)hit(o.name,a,173,32,30,()=>{});});return}
    if(!indoor&&!village&&!won && !(drag&&drag.kind==='tent'))item('camp_tent',bag.x+3,bag.y+2,26,26);
    if(!indoor&&!village&&!won)hit('Палатка — перетащите на площадку',bag.x,bag.y,bag.w,bag.h,()=>{});
    if(collected.has('bottle'))item('camp_bottle',241,175,26,26);
    if(collected.has('wrapper'))item('camp_wrapper',277,175,26,26);
  }
  function mapOverlay(){
    rect(8,28,184,124,'#060d16ee');text(indoor?'ЗАЛЫ И ПРОХОДЫ':bear?'ЛЕС И ПОЛЯНА':'ТРОПЫ И ПЛОЩАДКИ',100,32,'#e5c695','center');
    for(let gy=0;gy<mapH;gy++)for(let gx=0;gx<mapW;gx++){
      const cell=grid[gy][gx],px=20+gx*12,py=44+gy*8;
      rect(px,py,10,6,cell==='~'?'#426988':cell==='#'?'#535967':'#657651');
      if(info[cell]||cell==='b')rect(px+3,py+3,4,4,'#d2ad73');if(x===gx&&y===gy){rect(px+2,py+2,6,6,'#dce5ed');text(['↑','›','↓','‹'][dir],px+5,py+2,'#152132','center');}
    }
    text(indoor?'ЗАЛЫ':bear?'ЛЕС':'МОРЕ',48,133,'#83b6de');text(indoor?'СТЕНЫ':bear?'ПОЛЯНА':'СКАЛЫ',125,133,'#a7afbc');text('БЕЛАЯ ТОЧКА - ВЫ',100,144,'#a9b9cd','center');
  }
  function completion(){if(completeLabel==='ДАЛЕЕ')hit('Продолжить',0,0,320,240,onExit);else button(completeLabel,104,143,112,20,onExit)}
  function modal(){
    if((indoor||village)&&won){rect(4,24,312,188,'#050a12bb');drawPanel(21,59,278,112);text(village?'ЛАВКА НАЙДЕНА':'ВЫ НАШЛИ СТАРУЮ НИВУ',160,78,'#e5c695','center');hits=[];completion();return}
    if(bear){rect(4,24,312,188,'#050a12bb');drawPanel(21,59,278,112);text(failed?'ВЫ ПОГИБЛИ':won?'МЕДВЕДЬ ОТПУГНУТ!':'ОТПУГНИТЕ МЕДВЕДЯ',160,73,'#e5c695','center');wrapped(failed?'Кинжал не помог в схватке с медведем. Попробуйте другой предмет.':won?'Отпугиватель установлен. Медведь держится подальше. Вы в безопасности.':'Слышен рёв медведя. Найдите поляну и перетащите туда правильный предмет из инвентаря.',35,95,252,'#dce5ed',4);hits=[];if(won&&completeLabel==='ДАЛЕЕ'){completion();return}button(failed?'ЕЩЁ РАЗ':won?completeLabel:'ИСКАТЬ',104,143,112,20,()=>{if(failed)restartBear();else if(won)onExit();else{intro=false;describe()}});return}
    rect(4,24,312,188,'#050a12bb');drawPanel(21,59,278,112);
    text(won?'МЕСТО НАЙДЕНО!':'НАЙДИТЕ МЕСТО',160,73,'#e5c695','center');
    if(!won)text('ДЛЯ УСТАНОВКИ ЛАГЕРЯ',160,85,'#e5c695','center');
    wrapped(won?'Лагерь установлен у моря. Мусор заберём с собой.':'Нужны сухая земля, красивый вид и тишина. Палатку перетащите из инвентаря на площадку.',35,101,252,'#dce5ed',4);
    hits=[];if(won&&completeLabel==='ДАЛЕЕ'){completion();return}button(won?completeLabel:'ИСКАТЬ',104,143,112,20,()=>{if(won)onExit();else{intro=false;describe()}});
  }
  function drawMinimap(){
    rect(201,94,108,64,'#000000');currentUI.clip(ctx,201,94,108,64,()=>{for(let dy=-4;dy<=4;dy++)for(let dx=-7;dx<=7;dx++){
      const gx=x+dx,gy=y+dy,c=grid[gy]?.[gx];if(!c||!seen.has(gx+','+gy))continue;
      rect(251+dx*8,122+dy*8,7,7,c==='#'?'#535967':c==='~'?'#426988':c==='b'||village&&gx===5&&gy===1?'#d2ad73':'#657651');
    }rect(252,123,6,6,currentUI.settings.textColor);rect(254+vectors[dir][0]*2,125+vectors[dir][1]*2,2,2,'#11171c');});
  }
  function render(){PeninsulaPopup.visible=false;
    if(!active)return;ctx.imageSmoothingEnabled=false;hits=[];
    currentUI.base(ctx,indoor?'house2':village?'village3':bear?'bear2':'camp1');drawScene();
    const context=indoor?'Исследуйте залы.\nОсмотрите находки.':village?'Найдите лавку\nна севере.':tile()==='b'?'Открытая поляна.\nПоставьте отпугиватель.':'Слышен рёв медведя.\nИщите поляну.';
    currentUI.roleBlock(ctx,context,199,44,113,49,'situation');drawMinimap();
    ['knight','wanderer','mage'].forEach((name,i)=>{const bx=7+i*37;currentUI.box(ctx,bx,161,36,43);ctx.drawImage(images[name],bx+1,162,34,42)});
    hit('Влево',118,161,26,21,()=>turn(-1));hit('Вперёд',145,161,26,21,()=>step(1));hit('Вправо',172,161,25,21,()=>turn(1));
    hit('Меч',118,183,26,21,()=>{if(bear)install();else inspect()});hit('Назад',145,183,26,21,()=>step(-1));hit('Осмотр',172,183,25,21,inspect);
    const bagItems=bear?bearItems.map(o=>won&&o.id==='repeller'?null:o.asset):indoor||village?[]:['camp_tent',...Array.from(collected).map(id=>'camp_'+id)];currentUI.bag(ctx,bagItems,images);
    // The message under the scene is the shared Dialogue zone, as in the race and the camp.
    PeninsulaColors.box(ctx,7,205,190,28,'dialogue');currentUI.roleBlock(ctx,lastMessage||'Осмотрите место и выберите предмет.',8,206,188,26,'dialogue');
    if(intro||won||failed){const popupButton=currentUI.modal(ctx,failed?'Вы погибли':won?village?'Лавка найдена':indoor?'Старая Нива найдена':'Медведь отпугнут':'Медведь',failed?'Кинжал не помог. Выберите другой предмет.':won?lastMessage:'Найдите поляну и поставьте отпугиватель.');hits=[];hit(popupButton.label,popupButton.x,popupButton.y,popupButton.w,popupButton.h,()=>{if(failed)restartBear();else if(won)onExit();else{intro=false;describe()}})}
    drawMouseArrow();if(drag)item(bear?bearItems.find(o=>o.id===drag.kind).asset:'camp_tent',drag.x-13,drag.y-13,26,26);drawGameBorder(ctx);
  }
  let pointer=null;
  function mouseAction(p){if(!p||intro||won||failed||showMap||drag||(bear&&chosen)||!contains(p,view)||hits.some(h=>contains(p,h)))return null;const u=(p.x-view.x)/view.w;return u<.28?'left':u>.72?'right':'forward';}
  function drawMouseArrow(){const action=mouseAction(pointer),pickup=pointer&&hits.some(h=>h.label.startsWith('Поднять')&&contains(pointer,h));inputSurface.style.cursor=action?'none':pickup?'pointer':'default';if(!action)return;const ax=Math.round(pointer.x),ay=Math.round(pointer.y);ctx.save();ctx.beginPath();ctx.rect(view.x,view.y,view.w,view.h);ctx.clip();const mask=['00100','01110','11111','00100','00100','00100','00100'];for(let pass=0;pass<2;pass++)for(let yy=0;yy<7;yy++)for(let xx=0;xx<5;xx++)if(mask[yy][xx]==='1'){const ux=(xx-2)*2,uy=(yy-3)*2,dx=action==='left'?uy:action==='right'?-uy:ux,dy=action==='forward'?uy:ux;rect(ax+dx-(pass?0:1),ay+dy-(pass?0:1),pass?2:4,pass?2:4,pass?'#f1d39a':'#07101a');}ctx.restore();}
  function point(e){const b=inputSurface.getBoundingClientRect();return{x:(e.clientX-b.left)*320/b.width,y:(e.clientY-b.top)*240/b.height}}
  function contains(p,r){return p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h}
  inputSurface.addEventListener('pointerdown',e=>{
    if(!active||e.button!==0)return;e.preventDefault();const p=point(e);
    if(bear&&!intro&&!won&&!failed){const i=bearItems.findIndex((o,i)=>contains(p,{x:198+i*29,y:176,w:28,h:28}));if(i>=0){chosen=bearItems[i];drag={kind:chosen.id,id:e.pointerId,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:false};inputSurface.setPointerCapture(e.pointerId);message('Выбран: '+chosen.name+'.\nПоставьте на поляну.');return}if(chosen&&contains(p,view)&&!showMap){install();return}}
    if(!bear&&!indoor&&!village&&!intro&&!won&&contains(p,bag)){drag={kind:'tent',id:e.pointerId,x:p.x,y:p.y};inputSurface.setPointerCapture(e.pointerId);render();return}
    const b=hits.find(h=>contains(p,h));if(b){b.fn();return}const action=mouseAction(p);if(action==='forward')step(1);if(action==='left')turn(-1);if(action==='right')turn(1);
  });
  inputSurface.addEventListener('pointermove',e=>{if(!active)return;const p=point(e);if(drag){if(drag.id!==e.pointerId)return;drag.x=p.x;drag.y=p.y;if(bear&&Math.hypot(p.x-drag.startX,p.y-drag.startY)>2)drag.moved=true}else pointer=p;render()});
  inputSurface.addEventListener('pointerleave',()=>{if(active){pointer=null;render()}});
  inputSurface.addEventListener('pointerup',e=>{
    if(!active||!drag||drag.id!==e.pointerId)return;e.preventDefault();const p=point(e),lastDrag=drag;drag=null;if(inputSurface.hasPointerCapture(e.pointerId))inputSurface.releasePointerCapture(e.pointerId);if(bear){const wasDrag=lastDrag.moved;if(wasDrag&&contains(p,view)&&!showMap)install(lastDrag.kind);else if(wasDrag){chosen=null;message('Предмет остался в инвентаре.')}}else if(contains(p,view)&&!showMap)install();else message('Палатка в инвентаре.\nПеретащите её на место.');render();
  });
  inputSurface.addEventListener('pointercancel',()=>{if(active){drag=null;if(bear)chosen=null;render()}});
  // Keyboard alternative for the same actions; dragging remains the primary interaction.
  // WASD moves like the arrows; e.code keeps it working in the Russian layout too.
  const wasd={KeyW:'ArrowUp',KeyS:'ArrowDown',KeyA:'ArrowLeft',KeyD:'ArrowRight'};
  window.addEventListener('keydown',e=>{
    if(!active)return;
    if(wasd[e.code]&&!e.target?.matches?.('input,select,textarea')){const original=e;e={key:wasd[e.code],preventDefault:()=>original.preventDefault()}}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','m','M','e','E','t','T','g','G','1','2','3'].includes(e.key))e.preventDefault();else return;
    if(failed){if(e.key==='Enter'||e.key===' ')restartBear();return}
    if(intro||won){if(e.key==='Enter'||e.key===' '){if(won)onExit();else{intro=false;describe()}}return}
    if(bear&&['1','2','3'].includes(e.key)){chosen=bearItems[Number(e.key)-1];message('Выбран: '+chosen.name+'.\nT — поставить.');return}
    if(e.key==='ArrowUp')step(1);if(e.key==='ArrowDown')step(-1);if(e.key==='ArrowLeft')turn(-1);if(e.key==='ArrowRight')turn(1);
    
    if(e.key.toLowerCase()==='g'){if(tile()==='c'&&collected.size<2)collect(collected.has('bottle')?'wrapper':'bottle');else message('Здесь нет мусора.')}
    if(e.key.toLowerCase()==='e'||e.key==='Enter')inspect();if(e.key.toLowerCase()==='t')install();
  });
  function restartBear(){x=3;y=5;dir=0;intro=false;won=false;failed=false;chosen=null;drag=null;showMap=false;seen.clear();reveal();describe()}
  return {step,turn,inspect,install,snapshot:()=>({x,y,dir,won,failed,intro,grid:[...grid],seen:[...seen]}),start(){if(bear&&won)restartBear();if(!bear&&won){x=3;y=5;dir=0;intro=true;won=false;showMap=false;lastMessage='';collected.clear();seen.clear();reveal();}active=true;pointer=null;if(indoor)describe();else render();announce(indoor?'Исследуйте заброшенный дом.':bear?'Найдите поляну и поставьте отпугиватель медведя.':'Найдите место для установки лагеря.')},stop(){active=false;drag=null;pointer=null;inputSurface.style.cursor='default'},render};
};
