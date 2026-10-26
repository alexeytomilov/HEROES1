// Coast mechanics restored from the pre-Figma campsite search; UI is drawn separately.
let rpgDialogueFx=null;
let rpgGame=null;
async function startRPG(){
 const files=['shore_ground','shore_north','shore_west','shore_wet','shore_tourists','walk_cliff','camp_tent','camp_tent_pitched','camp_bottle','camp_wrapper','rpg_portrait_knight','rpg_portrait_wanderer','rpg_portrait_mage'];
 const art=Object.fromEntries(await Promise.all(files.map(async key=>[key,await load('assets/'+key.replaceAll('_','-')+'.png?v=light-1')])));
 const renderer=window.createWalkView({images:art,level:'coast'});
 const map=await json('rpg-map.json?v=2'),cells=map.grid.map(row=>[...row]);
 const candidates=[];
 for(let gy=1;gy<cells.length-1;gy++)for(let gx=1;gx<cells[0].length-1;gx++)if(cells[gy][gx]==='.'&&!(gx===map.start.x&&gy===map.start.y)){
  let nearPath=false,nearSite=false;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const c=cells[gy+dy]?.[gx+dx];if(c==='=')nearPath=true;if(c==='c')nearSite=true;}
  if(nearPath&&!nearSite)candidates.push({x:gx,y:gy});
 }
 const tourists=[];
 while(tourists.length<3&&candidates.length){const i=Math.floor(Math.random()*candidates.length),spot=candidates.splice(i,1)[0];if(tourists.some(t=>Math.abs(t.x-spot.x)+Math.abs(t.y-spot.y)<3))continue;cells[spot.y][spot.x]='t';tourists.push(spot);}
 const liveGrid=cells.map(row=>row.join('')),piles=[];
 // Walls drawn in the walk editor apply live over the plan with its tourists.
 let grid=window.PeninsulaWalk?PeninsulaWalk.merge('coast',liveGrid,map.grid):liveGrid;
 window.addEventListener('walk-edits-change',()=>{grid=PeninsulaWalk.merge('coast',liveGrid,map.grid);if(typeof render==='function')render()});
 grid.forEach((row,gy)=>[...row].forEach((c,gx)=>{if(c==='r')piles.push({x:gx,y:gy});}));

 const vectors=[[0,-1],[1,0],[0,1],[-1,0]],directions=[LT('camp1.dirNorth'),LT('camp1.dirEast'),LT('camp1.dirSouth'),LT('camp1.dirWest')];
 const sites={c:{name:LT('camp1.siteCamp'),dry:true,quiet:true},w:{name:LT('camp1.siteWet'),dry:false,quiet:true},t:{name:LT('camp1.siteTourists'),dry:true,quiet:false}};
 const view={x:8,y:23,w:188,h:136},trash=[{id:'bottle',x:58,y:114,w:24,h:24},{id:'wrapper',x:119,y:126,w:22,h:18}];
 let x=map.start.x,y=map.start.y,dir=map.start.dir,won=false,drag=null,pointer=null,tentPosition=null;
 let message=LT('camp1.start');
 const collected=new Set(),seen=new Set();
 function reveal(){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(grid[y+dy]?.[x+dx])seen.add((x+dx)+','+(y+dy));}
 reveal();
 const trashId=(gx,gy,id)=>gx+','+gy+':'+id;
 // Trash and tourists block their cells: trash is picked up from the neighbouring cell while facing it.
 const ahead=()=>{const [dx,dy]=vectors[dir];return{x:x+dx,y:y+dy,c:grid[y+dy]?.[x+dx]}};
 const clean=(gx,gy)=>trash.every(o=>collected.has(trashId(gx,gy,o.id)));
 const facingTrash=()=>{const a=ahead();return a.c==='r'&&!clean(a.x,a.y)};
 const picked=id=>{const a=ahead();return collected.has(trashId(a.x,a.y,id))};
 const count=id=>[...collected].filter(key=>key.endsWith(':'+id)).length;
 const cell=()=>grid[y][x],site=()=>sites[cell()];
 const inside=(p,r)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
 const rect=(a,b,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(a,b,w,h)};
 const say=s=>{message=s;render()};
 function reason(){const s=site();if(!s)return LT('camp1.noSite');if(!s.dry)return LT('camp1.wet');if(!s.quiet)return LT('camp1.tourists');if(collected.size<2)return LT('camp1.trashFirst');return '';}
 function describe(){if(facingTrash()){say(LT('camp1.trashAhead'));return;}if(cell()==='r'){say(LT('camp1.trashCleared'));return;}say(site()?LT('camp1.siteInspect',{site:site().name}):LT('camp1.path'));}
 function step(amount=1){if(won||drag)return;const [dx,dy]=vectors[dir],nx=x+dx*amount,ny=y+dy*amount,target=grid[ny]?.[nx];if(!target||target==='#'||target==='~'){say(target==='~'?LT('camp1.sea'):LT('camp1.rocks'));return;}if(target==='t'){say(LT('camp1.touristsBlock'));return;}if(target==='r'&&!clean(nx,ny)){say(LT('camp1.trashBlock'));return;}x=nx;y=ny;reveal();describe();}
 function turn(amount){if(won||drag)return;dir=(dir+amount+4)%4;if(facingTrash())describe();else say(LT('camp1.look',{dir:directions[dir]}));}
 function inspect(){if(won)return;if(facingTrash()){describe();return;}say(reason()||LT('camp1.good'));}
 function collect(id){if(!facingTrash()||picked(id)||won)return;const a=ahead();collected.add(trashId(a.x,a.y,id));say(clean(a.x,a.y)?LT('camp1.allTrash'):LT('camp1.moreTrash'));}
 function install(){const why=reason();if(why){say(why);return false;}won=true;
  // The pitched tent stands on the free cell in front of the player, so it is in view; else in this cell.
  const [fx,fy]=vectors[dir],ahead=grid[y+fy]?.[x+fx];tentPosition=ahead==='.'||ahead==='='?{x:x+.5+fx*.9,y:y+.5+fy*.9}:{x:x+.5,y:y+.2};say(LT('camp1.won'));return true;}
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
   window.PeninsulaWalk?.decorateMinimap(ctx,left,top,width,height);rect(cx-3,cy-3,6,6,settings.textColor);
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
  border(7,22,190,138);PeninsulaColors.box(ctx,198,22,115,138,'situation');PeninsulaColors.box(ctx,198,161,115,14,'power');
  clipped(view.x,view.y,view.w,view.h,()=>{
   const objects=[...tourists.map(t=>({x:t.x+.5,y:t.y+.3,asset:'shore_tourists',height:.75,ratio:1.7})),
    ...piles.flatMap(p=>trash.filter(o=>!(facingTrash()&&p.x===ahead().x&&p.y===ahead().y)&&!collected.has(trashId(p.x,p.y,o.id))).map((o,i)=>({x:p.x+.25+i*.5,y:p.y+.1,asset:'camp_'+o.id,height:.12}))),
    ...(won?[{...tentPosition,asset:'camp_tent_pitched',height:.75,ratio:72/42}]:[])];
   renderer.render(ctx,view,grid,x,y,dir,objects);
   if(facingTrash()&&!won)for(const o of trash)if(!picked(o.id))icon('camp_'+o.id,o.x,o.y,o.w,o.h);

  });
  // Repaint only the new situation field and inventory interiors.
  PeninsulaColors.box(ctx,198,22,115,138,'situation');text(LT('camp1.situationTitle'),255.5,27,'center');
  const context=won?LT('camp1.sitWon'):facingTrash()?LT('camp1.sitTrash'):site()?LT('camp1.sitSite',{site:site().name}):LT('camp1.sitPath');
  block(context,199,44,113,49);
  drawMap();
  resourceText({text:LT('camp1.power'),align:'LEFT'});resourceText({text:'80%',align:'RIGHT'});
  const bag=[won?null:'camp_tent',count('bottle')?'camp_bottle':null,count('wrapper')?'camp_wrapper':null];
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){const bx=198+col*29,by=176+row*29;PeninsulaColors.box(ctx,bx,by,28,28,'inventory');if(row===0&&bag[col]&&!(drag&&col===0)){icon(bag[col],bx+2,by+2);const n=col===1?count('bottle'):col===2?count('wrapper'):0;if(n>1){rect(bx+14,by+14,12,12,'#18242b');PeninsulaText.line(ctx,String(n),bx+26,by+13,'data',fonts,'right');}}}
  ['knight','wanderer','mage'].forEach((name,i)=>{const bx=7+i*37;rect(bx+1,162,34,42,'#293640');ctx.drawImage(art['rpg_portrait_'+name],bx+1,162,34,42);border(bx,161,36,43);});
  const icons=[['left',118,161],['up',145,161],['right',172,161],['sword',118,183],['down',145,183],['eye',172,183]];
  for(const [kind,bx,by]of icons){const w=bx===172?25:26;PeninsulaColors.box(ctx,bx,by,w,21,'buttons');controlIcon(kind,bx,by);}
  PeninsulaColors.box(ctx,7,205,190,28,'dialogue');
  // Game 1.2 has no radio: no messages type out in the strip and no mage portrait or radio sound (asked by the author).
  // To bring them back, restore the dialogue-fx calls: PeninsulaDialogueFX.create(...), .line(PeninsulaDialogue.evaluate('walk:coast', …)), .portrait().
  heading(LT('camp1.heading'));
  if(drag)clipped(1,22,318,211,()=>icon('camp_tent',drag.x-12,drag.y-12));
  drawMouseArrow();if(pressedRect){const b=pressedRect;ctx.drawImage(canvas,b.x,b.y,b.w-1,b.h-1,b.x+1,b.y+1,b.w-1,b.h-1);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(b.x,b.y,b.w,1);ctx.fillRect(b.x,b.y,1,b.h)}
 }
 // Inside the view the cursor is a pixel arrow for the move a click makes; over trash it becomes a hand.
 const buttonsArea=[{x:118,y:161,w:80,h:43},{x:198,y:176,w:28,h:28}];
 const overTrash=p=>p&&facingTrash()&&!won&&trash.some(o=>!picked(o.id)&&inside(p,o));
 function mouseAction(p){if(!p||won||drag||!inside(p,view)||overTrash(p))return null;const u=(p.x-view.x)/view.w;return u<.28?'left':u>.72?'right':'forward';}
 function drawMouseArrow(){const action=mouseAction(pointer);canvas.style.cursor=action?'none':overTrash(pointer)||pointer&&buttonsArea.some(r=>inside(pointer,r))?'var(--px-hand,pointer)':'var(--px-arrow,default)';if(!action)return;const ax=Math.round(pointer.x),ay=Math.round(pointer.y);ctx.save();ctx.beginPath();ctx.rect(view.x,view.y,view.w,view.h);ctx.clip();const mask=['00100','01110','11111','00100','00100','00100','00100'];for(let pass=0;pass<2;pass++)for(let yy=0;yy<7;yy++)for(let xx=0;xx<5;xx++)if(mask[yy][xx]==='1'){const ux=(xx-2)*2,uy=(yy-3)*2,dx=action==='left'?uy:action==='right'?-uy:ux,dy=action==='forward'?uy:ux;rect(ax+dx-(pass?0:1),ay+dy-(pass?0:1),pass?2:4,pass?2:4,pass?'#f1d39a':'#07101a');}ctx.restore();}
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*240/r.height}};
 let pressedRect=null;
 const CONTROLS=[{x:118,y:161,w:26,h:21},{x:145,y:161,w:26,h:21},{x:172,y:161,w:26,h:21},{x:118,y:183,w:26,h:21},{x:145,y:183,w:26,h:21},{x:172,y:183,w:26,h:21}];
 function click(p,now){
  const cb=!now&&CONTROLS.find(r=>inside(p,r));if(cb){if(pressedRect)return;pressedRect=cb;render();setTimeout(()=>{pressedRect=null;click(p,true);render()},170);return}
  if(inside(p,{x:118,y:161,w:26,h:21}))return turn(-1);
  if(inside(p,{x:145,y:161,w:26,h:21}))return step();
  if(inside(p,{x:172,y:161,w:26,h:21}))return turn(1);
  if(inside(p,{x:145,y:183,w:26,h:21}))return step(-1);
  if(inside(p,{x:118,y:183,w:26,h:21})||inside(p,{x:172,y:183,w:26,h:21}))return inspect();
  if(!inside(p,view)||won)return;
  if(facingTrash()){const o=trash.find(o=>!picked(o.id)&&inside(p,o));if(o)return collect(o.id);}
  const u=(p.x-view.x)/view.w;if(u<.28)turn(-1);else if(u>.72)turn(1);else step();
 }
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const p=point(e);if(!won&&inside(p,{x:198,y:176,w:28,h:28})){drag={...p,id:e.pointerId};canvas.setPointerCapture(e.pointerId);render();return;}click(p);});
 canvas.addEventListener('pointermove',e=>{pointer=point(e);if(drag&&drag.id===e.pointerId)Object.assign(drag,pointer);render();});
 canvas.addEventListener('pointerleave',()=>{pointer=null;render();});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(inside(p,view))install();else render();});
 canvas.addEventListener('pointercancel',()=>{drag=null;render();});
 window.addEventListener('keydown',e=>{if(e.target?.matches?.('input,select,textarea')||e.repeat)return;const k=({KeyW:'arrowup',KeyS:'arrowdown',KeyA:'arrowleft',KeyD:'arrowright'})[e.code]||e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','e','g','t','enter'].includes(k))return;e.preventDefault();if(k==='arrowup')step();if(k==='arrowdown')step(-1);if(k==='arrowleft')turn(-1);if(k==='arrowright')turn(1);if(k==='e'||k==='enter')inspect();if(k==='t'&&!won)install();if(k==='g'&&facingTrash())collect(picked('bottle')?'wrapper':'bottle');});
 rpgGame={draw,step,turn,inspect,collect,install,snapshot:()=>({x,y,dir,won,items:[...collected],message,seen:[...seen],grid:[...grid],tourists:tourists.map(t=>({...t})),tentPosition})};
 window.rpg=rpgGame;render();
 status.hidden=false;status.textContent=LT('camp1.help');
}
function drawRPG(){rpgGame.draw();}
