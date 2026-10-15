// Undo for the level editors (walks, races, dialogues): Ctrl+Z steps back, Ctrl+Y or Ctrl+Shift+Z forward.
// Each store calls PeninsulaUndo.record(name, previousState) before it saves; one mouse stroke
// (drawing a track, painting cells, dragging a slider) or a quick run of typing is one step.
// Inside text fields the browser's own undo works as usual.
window.PeninsulaUndo=(()=>{
 const stores={walk:()=>window.PeninsulaWalk,race:()=>window.PeninsulaRace,dialogue:()=>window.PeninsulaDialogue};
 const names={walk:'бродилки',race:'гонка',dialogue:'диалоги'};
 const LIMIT=100,undo=[],redo=[];let applying=false,gesture=0,down=false,toast=null,toastTimer=0;
 window.addEventListener('pointerdown',()=>{gesture++;down=true},true);
 for(const type of ['pointerup','pointercancel'])window.addEventListener(type,()=>{down=false},true);
 function record(name,before){
  if(applying||!stores[name])return;const now=Date.now(),last=undo[undo.length-1];
  if(last&&last.name===name&&last.gesture===gesture&&(down||now-last.t<500)){last.t=now;return}
  undo.push({name,before:JSON.stringify(before),gesture,t:now});if(undo.length>LIMIT)undo.shift();redo.length=0;
 }
 function show(text){
  if(!toast){toast=document.createElement('div');toast.className='undo-toast';document.body.append(toast)}
  toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},1200);
 }
 function step(from,to,label){
  const s=from.pop();if(!s){show(label==='Отменено'?'Нечего отменять':'Нечего возвращать');return}
  const store=stores[s.name]();if(!store)return;
  to.push({name:s.name,before:JSON.stringify(store.state),gesture:-1,t:0});
  applying=true;try{store.update(JSON.parse(s.before))}finally{applying=false}
  show(label+' · '+names[s.name]);
 }
 window.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const z=e.code==='KeyZ',y=e.code==='KeyY';if(!z&&!y)return;
  if(e.target?.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]),textarea,[contenteditable]'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(z&&!e.shiftKey)step(undo,redo,'Отменено');else step(redo,undo,'Возвращено');
 },true);
 return {record,get canUndo(){return undo.length>0},get canRedo(){return redo.length>0}};
})();
