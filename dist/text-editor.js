// Text edit mode: click any text drawn on a game canvas and replace its words.
// Works in the full game and inside embedded levels; edits are stored by PeninsulaText.
(()=>{
 const T=window.PeninsulaText;if(!T)return;
 let on=false,editor=null;
 const css=document.createElement('style');
 css.textContent='.text-edit-hover{position:fixed;z-index:9998;pointer-events:none;outline:2px dashed #f1d39a;outline-offset:1px;display:none}'+
  '.text-edit-panel{position:fixed;z-index:9999;width:280px;max-width:calc(100vw - 16px);background:#11171c;color:#e4e6e8;border:1px solid #91a1ad;padding:10px;font:13px/1.4 monospace;box-shadow:0 6px 24px #000a}'+
  '.text-edit-panel textarea{width:100%;box-sizing:border-box;min-height:84px;background:#1b252d;color:#e4e6e8;border:1px solid #4b5a66;font:inherit;padding:6px;resize:vertical}'+
  '.text-edit-panel .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.text-edit-panel button{font:inherit;padding:4px 8px;background:#293640;color:#e4e6e8;border:1px solid #91a1ad;cursor:pointer}'+
  '.text-edit-panel small{display:block;color:#91a1ad;margin-bottom:6px}body.text-editing canvas,body.text-editing #controls,body.text-editing #controls *{cursor:text!important}';
 document.head.append(css);
 const hover=document.createElement('div');hover.className='text-edit-hover';
 document.addEventListener('DOMContentLoaded',()=>document.body.append(hover));if(document.body)document.body.append(hover);
 function canvasAt(x,y){for(const c of document.querySelectorAll('canvas')){const r=c.getBoundingClientRect();if(r.width&&x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom)return {c,r}}return null}
 function hitAt(e){const found=canvasAt(e.clientX,e.clientY);if(!found)return null;const {c,r}=found,k=r.width/c.width,px=(e.clientX-r.left)/k,py=(e.clientY-r.top)*c.height/r.height;
  for(let i=T.hits.length-1;i>=0;i--){const h=T.hits[i];if(h.canvas===c&&px>=h.x&&px<h.x+h.w&&py>=h.y&&py<h.y+h.h)return {...h,r,k}}return null}
 function place(el,h){el.style.left=(h.r.left+h.x*h.k)+'px';el.style.top=(h.r.top+h.y*h.k)+'px';el.style.width=(h.w*h.k)+'px';el.style.height=(h.h*h.k)+'px'}
 function close(){editor?.remove();editor=null}
 function open(h,e){close();const panel=document.createElement('div');panel.className='text-edit-panel';
  panel.innerHTML='<small>Новый текст. Перенос строки — Enter.</small><textarea></textarea><div class="row"><button data-act="save">Сохранить</button><button data-act="reset">Вернуть исходный</button><button data-act="cancel">Отмена</button></div>';
  const area=panel.querySelector('textarea');area.value=T.text(h.original);
  panel.addEventListener('click',ev=>{const act=ev.target.dataset?.act;if(!act)return;if(act==='save')T.setOverride(h.original,area.value);if(act==='reset')T.setOverride(h.original,null);close()});
  panel.addEventListener('keydown',ev=>{if(ev.key==='Escape')close();if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){T.setOverride(h.original,area.value);close()}});
  document.body.append(panel);editor=panel;
  const w=panel.offsetWidth,ht=panel.offsetHeight,left=Math.max(8,Math.min(innerWidth-w-8,e.clientX-w/2)),top=e.clientY+16+ht<innerHeight?e.clientY+16:Math.max(8,e.clientY-ht-16);
  panel.style.left=left+'px';panel.style.top=top+'px';area.focus();area.select()}
 const inEditor=e=>editor&&editor.contains(e.target);
 // While editing, clicks on the game only pick text and never reach the game itself.
 for(const type of ['pointerdown','pointerup','click','mousedown','mouseup','dblclick'])window.addEventListener(type,e=>{if(!on||inEditor(e)||!canvasAt(e.clientX,e.clientY))return;e.preventDefault();e.stopImmediatePropagation();if(type==='pointerdown'){const h=hitAt(e);if(h)open(h,e);else close()}},true);
 window.addEventListener('pointermove',e=>{if(!on)return;const h=hitAt(e);hover.style.display=h?'block':'none';if(h)place(hover,h)},true);
 // Typing in the editor must not move the hero or trigger game keys.
 for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(on&&inEditor(e))e.stopImmediatePropagation()},true);
 function set(value){on=!!value;document.body?.classList.toggle('text-editing',on);if(!on){close();hover.style.display='none'}window.dispatchEvent(new Event('text-edit-change'))}
 window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===location.origin&&e.data?.type==='text-edit')set(e.data.on)});
 window.PeninsulaTextEdit={get on(){return on},set};
})();
