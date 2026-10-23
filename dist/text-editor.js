// Text edit mode: click any text drawn on a game canvas and replace its words.
// The background zone under the cursor lights up in another color; a click opens its color settings, and a click on text also opens its text preset.
// Works in the full game and inside embedded levels; edits are stored by PeninsulaText.
(()=>{
 const T=window.PeninsulaText;if(!T)return;
 let on=false,editor=null;
 const css=document.createElement('style');
 css.textContent='.text-edit-hover{position:fixed;z-index:9998;pointer-events:none;outline:2px dashed #f1d39a;outline-offset:1px;display:none}'+
  '.text-edit-panel{position:fixed;z-index:9999;width:280px;max-width:calc(100vw - 16px);background:#11171c;color:#e4e6e8;border:1px solid #91a1ad;padding:10px;font:13px/1.4 monospace;box-shadow:0 6px 24px #000a}'+
  '.text-edit-panel textarea{width:100%;box-sizing:border-box;min-height:84px;background:#1b252d;color:#e4e6e8;border:1px solid #4b5a66;font:inherit;padding:6px;resize:vertical}'+
  '.text-edit-panel .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.text-edit-panel button{font:inherit;padding:4px 8px;background:#293640;color:#e4e6e8;border:1px solid #91a1ad;cursor:pointer}'+
  '.zone-edit-hover{position:fixed;z-index:9997;pointer-events:none;outline:2px solid #6fd3ff;outline-offset:-1px;background:#6fd3ff1f;display:none}.zone-edit-hover span{position:absolute;left:-2px;top:-17px;background:#6fd3ff;color:#0b1116;font:11px/15px monospace;padding:0 4px;white-space:nowrap}'+
  '@keyframes settings-flash{0%,60%{outline-color:#6fd3ff;background-color:#6fd3ff33}100%{outline-color:transparent;background-color:transparent}}.settings-flash{outline:2px solid transparent;outline-offset:2px;animation:settings-flash 1.4s ease-out}'+
  '.text-edit-panel small{display:block;color:#91a1ad;margin-bottom:6px}body.text-editing canvas,body.text-editing #controls,body.text-editing #controls *{cursor:var(--px-hand,pointer)!important}';
 document.head.append(css);
 const hover=document.createElement('div');hover.className='text-edit-hover';
 const zoneHover=document.createElement('div');zoneHover.className='zone-edit-hover';zoneHover.append(document.createElement('span'));
 document.addEventListener('DOMContentLoaded',()=>document.body.append(hover,zoneHover));if(document.body)document.body.append(hover,zoneHover);
 function canvasAt(x,y){for(const c of document.querySelectorAll('canvas')){const r=c.getBoundingClientRect();if(r.width&&x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom)return {c,r}}return null}
 function hitAt(e){const found=canvasAt(e.clientX,e.clientY);if(!found)return null;const {c,r}=found,k=r.width/c.width,px=(e.clientX-r.left)/k,py=(e.clientY-r.top)*c.height/r.height;
  for(let i=T.hits.length-1;i>=0;i--){const h=T.hits[i];if(h.canvas===c&&px>=h.x&&px<h.x+h.w&&py>=h.y&&py<h.y+h.h)return {...h,r,k}}return null}
 // The topmost background zone under the cursor (zones are recorded in drawing order).
 function zoneAt(e){const C=window.PeninsulaColors,found=canvasAt(e.clientX,e.clientY);if(!C||!found)return null;const {c,r}=found,k=r.width/c.width,px=(e.clientX-r.left)/k,py=(e.clientY-r.top)*c.height/r.height;
  for(let i=C.zones.length-1;i>=0;i--){const z=C.zones[i];if(z.canvas===c&&px>=z.x&&px<z.x+z.w&&py>=z.y&&py<z.y+z.h)return {...z,r,k}}return null}
 // Settings panels live in the full game page; an embedded level asks its parent to open them.
 function openSettings(kind,role){if(!role)return;const panel=kind==='color'?window.PeninsulaColorSettings:window.PeninsulaTextSettings;if(panel){panel.select(role);if(kind==='color'&&role==='question')window.PeninsulaSettingsFlash(document.querySelector('#scene-settings .popup-size'))}else if(window.parent!==window)window.parent.postMessage({type:'settings-select',kind,role},location.origin)}
 window.PeninsulaSettingsFlash=(...els)=>{for(const el of els){if(!el)continue;el.classList.remove('settings-flash');void el.offsetWidth;el.classList.add('settings-flash');el.scrollIntoView({block:'nearest'})}};
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source!==window&&e.source?.parent===window&&e.data?.type==='settings-select')openSettings(e.data.kind,e.data.role)});
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source?.parent===window&&e.data?.type==='text-edit-open'&&typeof e.data.original==='string')open({original:e.data.original},null)});
 function place(el,h){el.style.left=(h.r.left+h.x*h.k)+'px';el.style.top=(h.r.top+h.y*h.k)+'px';el.style.width=(h.w*h.k)+'px';el.style.height=(h.h*h.k)+'px'}
 function close(){editor?.remove();editor=null}
 // Inside an embedded level the window opens in the full game page, beside the game; the new words reach the
 // level through the shared browser storage.
 function open(h,e){if(window.parent!==window){try{if(window.parent.PeninsulaTextEdit){window.parent.postMessage({type:'text-edit-open',original:h.original},location.origin);return}}catch{}}close();const panel=document.createElement('div');panel.className='text-edit-panel';
  panel.innerHTML='<small>Новый текст. Перенос строки — Enter.</small><textarea></textarea><div class="row"><button data-act="save">Сохранить</button><button data-act="reset">Вернуть исходный</button><button data-act="cancel">Отмена</button></div>';
  const area=panel.querySelector('textarea');area.value=T.text(h.original);
  panel.addEventListener('click',ev=>{const act=ev.target.dataset?.act;if(!act)return;if(act==='save')T.setOverride(h.original,area.value);if(act==='reset')T.setOverride(h.original,null);close()});
  panel.addEventListener('keydown',ev=>{if(ev.key==='Escape')close();if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){T.setOverride(h.original,area.value);close()}});
  document.body.append(panel);editor=panel;
  // The window opens beside the game (right, else left, else below), never over the picture.
  const w=panel.offsetWidth,ht=panel.offsetHeight,g=(document.querySelector('#frame')||h.r?.c||document.body).getBoundingClientRect?.()||h.r;
  let left,top=Math.max(8,Math.min(innerHeight-ht-8,g.top));
  if(g.right+12+w<=innerWidth-8)left=g.right+12;else if(g.left-12-w>=8)left=g.left-12-w;else{left=Math.max(8,Math.min(innerWidth-w-8,g.left));top=Math.min(innerHeight-ht-8,g.bottom+12)}
  panel.style.left=left+'px';panel.style.top=top+'px';area.focus();area.select()}
 const inEditor=e=>editor&&editor.contains(e.target);
 // While editing, clicks on the game only pick text and never reach the game itself.
 for(const type of ['pointerdown','pointerup','click','mousedown','mouseup','dblclick'])window.addEventListener(type,e=>{if(!on||inEditor(e)||!canvasAt(e.clientX,e.clientY))return;e.preventDefault();e.stopImmediatePropagation();if(type==='pointerdown'){const h=hitAt(e);if(h){open(h,e);openSettings('text',h.role)}else close();openSettings('color',zoneAt(e)?.role)}},true);
 window.addEventListener('pointermove',e=>{if(!on)return;const h=hitAt(e),z=zoneAt(e);hover.style.display=h?'block':'none';if(h)place(hover,h);zoneHover.style.display=z?'block':'none';if(z){place(zoneHover,z);zoneHover.firstChild.textContent='Фон: '+(window.PeninsulaColors.names[z.role]||z.role)}},true);
 // Typing in the editor must not move the hero or trigger game keys.
 for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(on&&inEditor(e))e.stopImmediatePropagation()},true);
 function set(value){on=!!value;document.body?.classList.toggle('text-editing',on);if(!on){close();hover.style.display='none';zoneHover.style.display='none'}window.dispatchEvent(new Event('text-edit-change'))}
 window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===location.origin&&e.data?.type==='text-edit')set(e.data.on)});
 window.PeninsulaTextEdit={get on(){return on},set};
})();
