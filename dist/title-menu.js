// Title menu on intro 5 in place of the single «Начать игру» button: one zone (colour zone and text type «Меню»)
// with three lines — new game, load game (the last screen played), exit to DOS (a black DOS prompt; any key returns).
// The line under the mouse or chosen with the arrows is drawn in the zone's «Цвет выбранной строки»; the others
// share the text colour (without a save «Загрузить игру» looks the same but cannot be chosen).
(()=>{
 if(typeof drawStartPrompt!=='function')return;
 const saveKey='peninsula-save';
 // Size and place come from the «Меню» block in the panel under the game (stored with the question window settings).
 const menu=()=>{const s=PeninsulaPopup.settings,w=s.menuWidth,h=Math.min(s.menuHeight,240-s.menuY);return {x:Math.round(160-w/2+s.menuX),y:s.menuY,w,h}};
 const items=[['menuNew',()=>advanceStory()],['menuLoad',()=>loadGame()],['menuDos',()=>{dos=true;dosTime=performance.now();render()}]];
 let selected=0,dos=false,dosTime=0;
 const save=()=>{try{return JSON.parse(localStorage.getItem(saveKey)||'null')}catch{return null}};
 // Every story screen or game reached after the intros becomes the place «Загрузить игру» returns to.
 const show=showNode;showNode=function(id,...rest){const r=show.call(this,id,...rest);try{if(id&&!/^intro|^hero\d/.test(id))localStorage.setItem(saveKey,JSON.stringify({node:id,hero}))}catch{}return r};
 function loadGame(){const s=save();if(!s)return;if(Number.isInteger(s.hero))hero=s.hero;window.journey?.select?.(s.node)}
 const shown=()=>activeScene()==='intro5'&&intro5Time>=START_DELAY;
 function rows(){const M=menu(),s=PeninsulaText.get('menu'),step=Math.max(1,s.size+s.lineSpacing),top=M.y+Math.round((M.h-step*items.length)/2)+s.offset;return items.map((it,i)=>({i,x:M.x,y:top+i*step,w:M.w,h:step}))}
 // A line in the accent colour: drawn as usual, then tinted inside its own letters.
 const tint=document.createElement('canvas'),tg=tint.getContext('2d');
 function lineIn(color,label,y,role){tint.width=320;tint.height=40;tg.clearRect(0,0,320,40);PeninsulaText.line(tg,label,menu().x+menu().w/2,4,role,currentUI.fonts,'center');tg.globalCompositeOperation='source-in';tg.fillStyle=color;tg.fillRect(0,0,320,40);tg.globalCompositeOperation='source-over';ctx.drawImage(tint,0,y-4)}
 drawStartPrompt=function(){
  if(dos){ctx.fillStyle='#000';ctx.fillRect(0,0,320,240);const blink=((performance.now()-dosTime)/500|0)%2===0,prompt=LT('ui.dosPrompt');currentUI.text(ctx,prompt+(blink?'_':''),4,6,'left');return}
  const a=Math.max(0,Math.min(1,(intro5Time-START_DELAY)/START_FADE));if(a<=0)return;
  ctx.save();ctx.globalAlpha=a;const M=menu();PeninsulaColors.box(ctx,M.x,M.y,M.w,M.h,'menu');const accent=PeninsulaColors.get('menu').accent,hasSave=!!save();
  for(const r of rows()){const label=LT('ui.'+items[r.i][0]);
   if(r.i===selected&&!(r.i===1&&!hasSave))lineIn(accent,label,r.y,'menu');else PeninsulaText.line(ctx,label,M.x+M.w/2,r.y,'menu',currentUI.fonts,'center')}
  ctx.restore()};
 // Hotspots: one per line once the menu shows, or the whole screen while the DOS prompt is up.
 const sync=syncHotspots;syncHotspots=function(){if(activeScene()!=='intro5'||typeof syncHotspotsBase!=='function')return sync();
  if(dos){buttons=[{x:0,y:0,w:320,h:240,label:'DOS',fn:()=>{dos=false;render()}}]}else buttons=shown()?rows().filter(r=>r.i!==1||save()).map(r=>({x:r.x,y:r.y,w:r.w,h:r.h,label:LT('ui.'+items[r.i][0]),fn:items[r.i][1]})):[];
  syncHotspotsBase()};
 // The mouse picks the line under it; the arrows move the choice and Enter runs it.
 window.PeninsulaTitleMenu={get selected(){return selected},get dos(){return dos}};
 const canvas=document.querySelector('#game');
 canvas.addEventListener('mousemove',e=>{if(!shown()||dos)return;const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*240/b.height;const r=rows().find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h&&(r.i!==1||save()));if(r&&r.i!==selected){selected=r.i;render()}});
 window.addEventListener('keydown',e=>{if(activeScene()!=='intro5'||e.target?.matches?.('input,select,textarea'))return;
  if(dos){dos=false;render();e.preventDefault();e.stopImmediatePropagation();return}
  if(!shown())return;const usable=items.map((_,i)=>i).filter(i=>i!==1||save());
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){const k=usable.indexOf(selected),n=usable.length;selected=usable[((k<0?0:k)+(e.key==='ArrowDown'?1:n-1))%n];render()}
  else if(e.key==='Enter'||e.key===' '){(items[usable.includes(selected)?selected:0][1])()}else return;
  e.preventDefault();e.stopImmediatePropagation()},true);
 // The «Меню» block (size and place of the zone) is added under the intro 5 settings in the panel below the game.
 if(typeof syncScenePanel==='function'){const base=syncScenePanel;syncScenePanel=function(id){base(id);if(id!=='intro5'||!sceneHost||sceneHost.hidden||sceneHost.querySelector('.menu-size'))return;
  const b=PeninsulaPopup.bounds,f=(k,l)=>'<label class="number">'+l+'<input data-menu-field="'+k+'" type="number" min="'+b[k][0]+'" max="'+b[k][1]+'" step="1"></label>';
  sceneHost.insertAdjacentHTML('beforeend','<div class="popup-size menu-size"><h2>Меню</h2>'+f('menuWidth','Ширина, px')+f('menuHeight','Высота, px')+f('menuY','Сверху, px')+f('menuX','Сдвиг влево / вправо, px')+'</div>');
  for(const e of sceneHost.querySelectorAll('[data-menu-field]'))e.value=PeninsulaPopup.settings[e.dataset.menuField]}
  sceneHost?.addEventListener('input',e=>{const k=e.target.dataset?.menuField;if(!k||e.target.value==='')return;PeninsulaPopup.update({...PeninsulaPopup.settings,[k]:Number(e.target.value)});render()})}
})();
