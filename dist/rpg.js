// Coast mechanics restored from the pre-Figma campsite search; UI is drawn separately.
let rpgGame=null;
async function startRPG(){
 const files=['shore_ground','shore_north','shore_west','shore_wet','shore_tourists','walk_cliff','camp_tent','camp_bottle','camp_wrapper'];
 const art=Object.fromEntries(await Promise.all(files.map(async key=>[key,await load('assets/'+key.replaceAll('_','-')+'.png?v=psd-2')])));
 const renderer=window.createWalkView({images:art});
 const map=await json('rpg-map.json?v=2'),cells=map.grid.map(row=>[...row]);
 const candidates=[];
 for(let gy=1;gy<cells.length-1;gy++)for(let gx=1;gx<cells[0].length-1;gx++)if(cells[gy][gx]==='.'&&!(gx===map.start.x&&gy===map.start.y)){
  let nearPath=false,nearSite=false;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const c=cells[gy+dy]?.[gx+dx];if(c==='=')nearPath=true;if(c==='c')nearSite=true;}
  if(nearPath&&!nearSite)candidates.push({x:gx,y:gy});
 }
 const tourists=[];
 while(tourists.length<3&&candidates.length){const i=Math.floor(Math.random()*candidates.length),spot=candidates.splice(i,1)[0];if(tourists.some(t=>Math.abs(t.x-spot.x)+Math.abs(t.y-spot.y)<3))continue;cells[spot.y][spot.x]='t';tourists.push(spot);}
 const grid=cells.map(row=>row.join('')),piles=[];
 grid.forEach((row,gy)=>[...row].forEach((c,gx)=>{if(c==='r')piles.push({x:gx,y:gy});}));

 const vectors=[[0,-1],[1,0],[0,1],[-1,0]],directions=['Север','Восток','Юг','Запад'];
 const sites={c:{name:'Площадка у моря',dry:true,quiet:true},w:{name:'Сырая низина',dry:false,quiet:true},t:{name:'Стоянка туристов',dry:true,quiet:false}};
 const view={x:8,y:23,w:188,h:136},trash=[{id:'bottle',x:58,y:114,w:24,h:24},{id:'wrapper',x:119,y:126,w:22,h:18}];
 let x=map.start.x,y=map.start.y,dir=map.start.dir,won=false,drag=null,pointer=null,tentPosition=null;
 let message='Найдите место для лагеря.\nСначала уберите мусор.';
 const collected=new Set(),seen=new Set();
 function reveal(){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(grid[y+dy]?.[x+dx])seen.add((x+dx)+','+(y+dy));}
 reveal();
 const trashId=(gx,gy,id)=>gx+','+gy+':'+id;
 const picked=id=>collected.has(trashId(x,y,id));
 const count=id=>[...collected].filter(key=>key.endsWith(':'+id)).length;
 const cell=()=>grid[y][x],site=()=>sites[cell()];
 const inside=(p,r)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
 const rect=(a,b,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(a,b,w,h)};
 const say=s=>{message=s;render()};
 function reason(){const s=site();if(!s)return 'Здесь лагерь не поставить.\nНайдите площадку.';if(!s.dry)return 'Здесь сыро. Палатка промокнет.';if(!s.quiet)return 'Рядом туристы.\nНайдите тихое место.';if(collected.size<2)return 'Сначала уберите мусор.\nОн отмечен красным на карте.';return '';}
 function describe(){if(cell()==='r'){say(trash.every(o=>picked(o.id))?'Мусор здесь уже убран.':'Здесь лежит мусор.\nПодберите его.');return;}say(site()?site().name+'.\nОсмотрите площадку.':'Ищите тихую площадку у моря.');}
 function step(amount=1){if(won||drag)return;const [dx,dy]=vectors[dir],nx=x+dx*amount,ny=y+dy*amount,target=grid[ny]?.[nx];if(!target||target==='#'||target==='~'){say(target==='~'?'Здесь море. Идите вдоль берега.':'Здесь скалы. Прохода нет.');return;}x=nx;y=ny;reveal();describe();}
 function turn(amount){if(won||drag)return;dir=(dir+amount+4)%4;say('Вы смотрите на '+directions[dir].toLowerCase()+'.');}
 function inspect(){if(won)return;if(cell()==='r'){describe();return;}say(reason()||'Сухо, тихо и чисто.\nПеретащите палатку сюда.');}
 function collect(id){if(cell()!=='r'||picked(id)||won)return;collected.add(trashId(x,y,id));say(trash.every(o=>picked(o.id))?'Мусор убран. Ищите\nзолотую площадку на карте.':'Подберите и оставшийся мусор.');}
 function install(){const why=reason();if(why){say(why);return false;}won=true;tentPosition={x:x+.5,y:y+.2};say('Лагерь установлен у моря.\nМусор заберём с собой.');return true;}
 function icon(key,a,b,w=24,h=24){ctx.drawImage(art[key],Math.round(a),Math.round(b),w,h);}
 function drawMap(){
  const size=8,left=201,top=94,width=108,height=64,cx=left+width/2,cy=top+height/2;
  rect(left,top,width,height,'#000000');
  clipped(left,top,width,height,()=>{
   for(let dy=-4;dy<=4;dy++)for(let dx=-7;dx<=7;dx++){
    const gx=x+dx,gy=y+dy,c=grid[gy]?.[gx];
    if(!c||!seen.has(gx+','+gy))continue;
    const px=cx+dx*size-size/2,py=cy+dy*size-size/2;
    const clean=c==='r'&&trash.every(o=>collected.has(trashId(gx,gy,o.id)));
    rect(px,py,size-1,size-1,c==='~'?'#426988':c==='#'?'#535967':c==='='?'#a4b19a':c==='c'?'#d2ad73':c==='r'&&!clean?'#df493d':c==='t'?'#ad83bc':'#657651');
   }
   rect(cx-3,cy-3,6,6,settings.textColor);
   rect(cx-1+vectors[dir][0]*2,cy-1+vectors[dir][1]*2,2,2,'#11171c');
  });
 }
 function controlIcon(kind,bx,by){
  const patterns={left:['00100','01100','11111','01100','00100'],up:['00100','01110','11111','00100','00100'],right:['00100','00110','11111','00110','00100'],down:['00100','00100','11111','01110','00100'],sword:['000001','000011','000110','001100','111000','010000'],eye:['0011100','0100010','1001001','0100010','0011100']};
  const rows=patterns[kind],size=2,w=rows[0].length*size,h=rows.length*size,left=Math.round(bx+(26-w)/2),top=Math.round(by+(21-h)/2);
  ctx.fillStyle=settings.textColor;rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')ctx.fillRect(left+x*size,top+y*size,size,size)}));
 }
 function draw(){
  PeninsulaColors.fill(ctx,7,22,306,212);
  border(7,22,190,138);PeninsulaColors.box(ctx,198,22,115,138,'situation');PeninsulaColors.box(ctx,198,161,115,14);
  clipped(view.x,view.y,view.w,view.h,()=>{
   const objects=[...tourists.map(t=>({x:t.x+.5,y:t.y+.3,asset:'shore_tourists',height:.75,ratio:1.7})),
    ...piles.flatMap(p=>trash.filter(o=>!(p.x===x&&p.y===y)&&!collected.has(trashId(p.x,p.y,o.id))).map((o,i)=>({x:p.x+.25+i*.5,y:p.y+.1,asset:'camp_'+o.id,height:.12}))),
    ...(won?[{...tentPosition,asset:'camp_tent',height:.6}]:[])];
   renderer.render(ctx,view,grid,x,y,dir,objects);
   if(cell()==='r'&&!won)for(const o of trash)if(!picked(o.id))icon('camp_'+o.id,o.x,o.y,o.w,o.h);

  });
  // Repaint only the new situation field and inventory interiors.
  PeninsulaColors.box(ctx,198,22,115,138,'situation');text('Ситуация',255.5,27,'center');
  const context=won?'Лагерь установлен.':cell()==='r'?'Мусор на земле.':site()?site().name+'.':'Прибрежная тропа.\nИщите место\nдля лагеря.';
  block(context,199,44,113,49);
  drawMap();
  resourceText({text:'Запас сил',align:'LEFT'});resourceText({text:'80%',align:'RIGHT'});
  const bag=[won?null:'camp_tent',count('bottle')?'camp_bottle':null,count('wrapper')?'camp_wrapper':null];
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){const bx=198+col*29,by=176+row*29;PeninsulaColors.box(ctx,bx,by,28,28);if(row===0&&bag[col]&&!(drag&&col===0)){icon(bag[col],bx+2,by+2);const n=col===1?count('bottle'):col===2?count('wrapper'):0;if(n>1){rect(bx+14,by+14,12,12,'#18242b');PeninsulaText.line(ctx,String(n),bx+26,by+13,'data',fonts,'right');}}}
  ['833b3edee700c533c4a9dc2fadfddbf6fd7e872a','f40317e182ff959dc9bab1e1d3a9483eb7022a4e','2ecc0ecbf583a11c025a80661324094dc8572ecc'].forEach((hash,i)=>{const bx=7+i*37;rect(bx+1,162,34,42,'#293640');ctx.drawImage(images[hash],bx+1,162,34,42);border(bx,161,36,43);});
  const icons=[['left',118,161],['up',145,161],['right',172,161],['sword',118,183],['down',145,183],['eye',172,183]];
  for(const [kind,bx,by]of icons){const w=bx===172?25:26;PeninsulaColors.box(ctx,bx,by,w,21,'buttons');controlIcon(kind,bx,by);}
  PeninsulaColors.box(ctx,7,205,190,28,'dialogue');block(message,8,206,188,26,{role:'dialogue'});
  heading('Полуостров средний');
  if(drag)clipped(1,22,318,211,()=>icon('camp_tent',drag.x-12,drag.y-12));
 }
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*240/r.height}};
 function click(p){
  if(inside(p,{x:118,y:161,w:26,h:21}))return turn(-1);
  if(inside(p,{x:145,y:161,w:26,h:21}))return step();
  if(inside(p,{x:172,y:161,w:26,h:21}))return turn(1);
  if(inside(p,{x:145,y:183,w:26,h:21}))return step(-1);
  if(inside(p,{x:118,y:183,w:26,h:21})||inside(p,{x:172,y:183,w:26,h:21}))return inspect();
  if(!inside(p,view)||won)return;
  if(cell()==='r'){const o=trash.find(o=>!picked(o.id)&&inside(p,o));if(o)return collect(o.id);}
  const u=(p.x-view.x)/view.w;if(u<.28)turn(-1);else if(u>.72)turn(1);else step();
 }
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const p=point(e);if(!won&&inside(p,{x:198,y:176,w:28,h:28})){drag={...p,id:e.pointerId};canvas.setPointerCapture(e.pointerId);render();return;}click(p);});
 canvas.addEventListener('pointermove',e=>{pointer=point(e);if(drag&&drag.id===e.pointerId){Object.assign(drag,pointer);render();}});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(inside(p,view))install();else render();});
 canvas.addEventListener('pointercancel',()=>{drag=null;render();});
 window.addEventListener('keydown',e=>{if(e.target?.matches?.('input,select,textarea')||e.repeat)return;const k=e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','e','g','t','enter'].includes(k))return;e.preventDefault();if(k==='arrowup')step();if(k==='arrowdown')step(-1);if(k==='arrowleft')turn(-1);if(k==='arrowright')turn(1);if(k==='e'||k==='enter')inspect();if(k==='t'&&!won)install();if(k==='g'&&cell()==='r')collect(picked('bottle')?'wrapper':'bottle');});
 rpgGame={draw,step,turn,inspect,collect,install,snapshot:()=>({x,y,dir,won,items:[...collected],message,seen:[...seen],grid:[...grid],tourists:tourists.map(t=>({...t})),tentPosition})};
 window.rpg=rpgGame;render();
 status.hidden=false;status.textContent='↑ ↓ — шаг · ← → — поворот · E — осмотр · G — поднять мусор. Палатку перетащите из инвентаря.';
}
function drawRPG(){rpgGame.draw();}
