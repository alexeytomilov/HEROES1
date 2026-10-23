// Settings that do nothing on the current screen are hidden: colour zones, text presets and their
// assignments that were not drawn since this screen opened, and the walk / race panels away from those games.
// Every screen change bumps a counter; text-presets.js and color-presets.js tag each role they draw with it.
(()=>{
 if(typeof showNode!=='function')return;
 window.PeninsulaUsageEpoch=1;
 const prevShow=showNode;
 showNode=function(...args){window.PeninsulaUsageEpoch++;return prevShow.apply(this,args)};
 const frame=()=>typeof levelFrame!=='undefined'&&!levelFrame.hidden?levelFrame:null;
 // Roles drawn on this screen, in the page itself and in an embedded level.
 function usedRoles(api){const epoch=window.PeninsulaUsageEpoch,out=new Set();for(const w of [window,frame()?.contentWindow]){try{const used=w?.[api]?.used;if(used)for(const [role,e]of Object.entries(used))if(e===epoch)out.add(role)}catch{}}return out}
 const show=(el,on)=>{if(el&&el.hidden===on)el.hidden=!on};
 // Whole side panels keep their place, so the game field never moves.
 const showBox=(el,on)=>{const v=on?'':'hidden';if(el&&el.style.visibility!==v)el.style.visibility=v};
 let lastPicture;
 function update(){
  const colors=usedRoles('PeninsulaColors'),texts=usedRoles('PeninsulaText'),src=frame()?.src||'';
  const mode=/race\.html/.test(src)?'race':/rpg\.html/.test(src)?'walk':null;
  // Before anything is drawn every setting stays visible.
  const known=colors.size>0||texts.size>0;
  // Colour zones.
  const colorHost=document.querySelector('#color-settings');
  if(colorHost){
   let firstVisible=null;
   for(const b of colorHost.querySelectorAll('[data-color-preset]')){const on=!known||colors.has(b.dataset.colorPreset);show(b,on);if(on&&!firstVisible)firstVisible=b}
   const sel=window.PeninsulaColorSettings?.selected,selBtn=colorHost.querySelector('[data-color-preset="'+sel+'"]');
   if(selBtn?.hidden&&firstVisible)firstVisible.click();
   show(colorHost.querySelector('#color-controls'),!!firstVisible);
   // Texture adjustments only for the game they change.
   for(const b of colorHost.querySelectorAll('[data-adjust-group]')){const on=b.dataset.adjustGroup===mode;show(b,on);if(on&&b.getAttribute('aria-selected')!=='true')b.click()}
   for(const el of colorHost.querySelectorAll('.adjust-title,.adjust-tabs,#adjust-controls'))show(el,!!mode);
   if(PeninsulaColors.currentPicture!==lastPicture){lastPicture=PeninsulaColors.currentPicture;window.PeninsulaColorSettings?.refresh?.()}
  }
  // Text presets: an assignment row when its text type was drawn, a preset when a drawn type uses it.
  const T=window.PeninsulaText,presets=new Set();for(const r of texts)presets.add(T.state.assignments[r]||r);
  const assign=document.querySelector('#text-assignments');
  if(assign){let any=false;for(const s of assign.querySelectorAll('[data-role]')){const on=!known||texts.has(s.dataset.role);show(s.closest('label'),on);any=any||on}showBox(assign.closest('aside'),any)}
  const textHost=document.querySelector('#text-settings');
  if(textHost){let firstVisible=null;for(const b of textHost.querySelectorAll('[data-preset]')){const on=!known||presets.has(b.dataset.preset);show(b,on);if(on&&!firstVisible)firstVisible=b}
   const selBtn=textHost.querySelector('[data-preset="'+window.PeninsulaTextSettings?.selected+'"]');if(selBtn?.hidden&&firstVisible)firstVisible.click();
   showBox(textHost,!!firstVisible)}
  // Walk and race editors.
  for(const sel of ['.walk-sidebar','.minimap-sidebar'])showBox(document.querySelector(sel),!!mode);
 }
 setInterval(update,400);
})();
