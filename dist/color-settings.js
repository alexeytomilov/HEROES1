(()=>{
 const api=PeninsulaColors,host=document.querySelector('#color-settings');if(!host)return;let selected='heading',adjustGroup='walk';
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const options=(list,value)=>Object.entries(list).map(([v,l])=>'<option value="'+esc(v)+'"'+(v===value?' selected':'')+'>'+esc(l)+'</option>').join('');
 // A slider with a number box, both bound to the same setting path.
 const slider=(label,path,min,max)=>'<label>'+label+'<div class="texture-control"><input data-path="'+path+'" type="range" min="'+min+'" max="'+max+'" step="1"><input aria-label="'+esc(label)+'" data-path="'+path+'" type="number" min="'+min+'" max="'+max+'" step="1"></div></label>';
 const pair=(a,b)=>'<div class="color-pair">'+a+b+'</div>';
 const field=(label,path,min=-999,max=999)=>'<label>'+label+'<input data-path="'+path+'" type="number" min="'+min+'" max="'+max+'" step="1"></label>';
 const colorField=(label,path)=>'<label>'+label+'<input data-path="'+path+'" type="color"></label>';
 const select=(label,path,list,value)=>'<label>'+label+'<select data-path="'+path+'">'+options(list,value)+'</select></label>';
 function fileList(){const out={...api.textures};for(const [id,f]of Object.entries(api.state.files))out['up:'+id]='Файл: '+f.name;out.__upload='Загрузить файл…';return out}
 host.innerHTML='<h2>Настройки цвета</h2><div class="color-tabs" role="tablist" aria-label="Блоки игры">'+Object.entries(api.names).map(([id,label])=>'<button type="button" role="tab" id="color-tab-'+id+'" aria-controls="color-controls" data-color-preset="'+id+'">'+label+'</button>').join('')+'</div><div id="color-controls" role="tabpanel"></div>'+
  '<h2 class="adjust-title">Аджастменты текстур</h2><div class="color-tabs adjust-tabs">'+Object.entries(api.adjustGroups).map(([id,l])=>'<button type="button" data-adjust-group="'+id+'">'+l+'</button>').join('')+'</div><div id="adjust-controls"></div><input type="file" accept="image/png,image/gif,image/webp,image/jpeg" data-upload hidden>';
 let shape='';
 function build(){
  const z=api.get(selected),files=fileList();
  shape=selected+'|'+z.layers.length+'|'+Object.keys(api.state.files).join(',');
  host.querySelector('#color-controls').innerHTML=colorField('Цвет фона','background')+
   (selected==='storyImage'?'':'<details open class="color-group"><summary>Текстуры</summary>'+z.layers.map((l,i)=>'<div class="texture-layer"><div class="texture-layer-head">Слой '+(i+1)+'<button type="button" data-remove-layer="'+i+'" aria-label="Удалить слой '+(i+1)+'">×</button></div>'+select('Файл','layers.'+i+'.file',files,l.file)+slider('Непрозрачность, %','layers.'+i+'.opacity',0,100)+select('Режим наложения','layers.'+i+'.blend',api.blends,l.blend)+pair(field('Сдвиг X, px','layers.'+i+'.x'),field('Сдвиг Y, px','layers.'+i+'.y'))+'</div>').join('')+(z.layers.length<api.MAX_LAYERS?'<button type="button" class="add-layer" data-add-layer>+ Добавить текстуру</button>':'')+'</details>'+
   '<details class="color-group"'+(z.overlay.opacity?' open':'')+'><summary>Оверлей цвета</summary>'+colorField('Цвет','overlay.color')+slider('Непрозрачность, %','overlay.opacity',0,100)+select('Режим наложения','overlay.blend',api.blends,z.overlay.blend)+'</details>'+
   '<details class="color-group"'+(z.gradient.opacity?' open':'')+'><summary>Оверлей градиента</summary>'+pair(colorField('Цвет 1','gradient.a'),field('Точка 1, %','gradient.aPos',0,100))+pair(colorField('Цвет 2','gradient.b'),field('Точка 2, %','gradient.bPos',0,100))+select('Направление','gradient.dir',{v:'Сверху вниз',h:'Слева направо'},z.gradient.dir)+slider('Непрозрачность, %','gradient.opacity',0,100)+select('Режим наложения','gradient.blend',api.blends,z.gradient.blend)+'</details>')+
   colorField('Цвет контура','border');
  host.querySelector('#adjust-controls').innerHTML='<p class="adjust-note">Для всех текстур '+(adjustGroup==='walk'?'бродилок: пол, стены, небо, вода':'гонок: фоны, горы, файлы спрайтов')+'.</p>'+
   '<details open class="color-group"><summary>Цветовой тон / насыщенность</summary>'+slider('Цветовой тон','adjust.'+adjustGroup+'.hue',-180,180)+slider('Насыщенность','adjust.'+adjustGroup+'.saturation',-100,100)+slider('Яркость','adjust.'+adjustGroup+'.lightness',-100,100)+'</details>'+
   '<details open class="color-group"><summary>Уровни</summary>'+slider('Чёрная точка','adjust.'+adjustGroup+'.black',0,254)+slider('Белая точка','adjust.'+adjustGroup+'.white',1,255)+slider('Гамма ×100','adjust.'+adjustGroup+'.gamma',10,300)+'</details><button type="button" class="add-layer" data-reset-adjust>Сбросить аджастменты</button>';
 }
 const get=(obj,path)=>path.split('.').reduce((o,k)=>o?.[k],obj);
 function sync(){
  const z=api.get(selected);if(shape!==selected+'|'+z.layers.length+'|'+Object.keys(api.state.files).join(','))build();
  host.querySelectorAll('[data-color-preset]').forEach(e=>{const active=e.dataset.colorPreset===selected;e.setAttribute('aria-selected',String(active));e.tabIndex=active?0:-1});
  host.querySelectorAll('[data-adjust-group]').forEach(e=>e.setAttribute('aria-selected',String(e.dataset.adjustGroup===adjustGroup)));
  host.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby','color-tab-'+selected);
  for(const e of host.querySelectorAll('[data-path]')){if(e===document.activeElement&&e.type==='number')continue;const p=e.dataset.path,v=p.startsWith('adjust.')?get(api.state,p):get(z,p);if(v!==undefined&&String(e.value)!==String(v))e.value=v}
 }
 function change(fn){const value=JSON.parse(JSON.stringify(api.state));fn(value,value[selected]);api.update(value)}
 function set(obj,path,v){const keys=path.split('.'),last=keys.pop();const o=keys.reduce((o,k)=>o[k],obj);o[last]=typeof o[last]==='number'?Number(v):v}
 host.addEventListener('click',e=>{
  const tab=e.target.closest('[data-color-preset]');if(tab){selected=tab.dataset.colorPreset;build();sync();return}
  const g=e.target.closest('[data-adjust-group]');if(g){adjustGroup=g.dataset.adjustGroup;build();sync();return}
  if(e.target.closest('[data-add-layer]'))change((_,z)=>z.layers.push({file:'latest-stone',opacity:100,x:0,y:0,blend:'source-over'}));
  const rm=e.target.closest('[data-remove-layer]');if(rm)change((_,z)=>z.layers.splice(Number(rm.dataset.removeLayer),1));
  if(e.target.closest('[data-reset-adjust]'))change(v=>v.adjust[adjustGroup]={...api.adjustDefaults});
 });
 host.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const ids=Object.keys(api.names);selected=ids[e.key==='Home'?0:e.key==='End'?ids.length-1:(ids.indexOf(selected)+(e.key==='ArrowLeft'?ids.length-1:1))%ids.length];build();sync();host.querySelector('[data-color-preset="'+selected+'"]').focus()});
 // "Загрузить файл…" in a layer's file list opens a file picker; the picture is kept with the settings.
 let uploadLayer=-1;const upload=host.querySelector('[data-upload]');
 upload.addEventListener('change',()=>{const f=upload.files[0];upload.value='';if(!f||uploadLayer<0)return;const r=new FileReader();r.onload=()=>{const id='f'+Date.now().toString(36);change((v,z)=>{v.files[id]={name:f.name.replace(/\.[^.]+$/,''),data:r.result};if(z.layers[uploadLayer])z.layers[uploadLayer].file='up:'+id})};r.readAsDataURL(f)});
 host.addEventListener('input',e=>{const p=e.target.dataset.path;if(!p||e.target.value==='')return;
  if(e.target.value==='__upload'){uploadLayer=Number(p.split('.')[1]);sync();upload.click();return}
  change((v,z)=>set(p.startsWith('adjust.')?v:z,p,e.target.value));
 });
 window.addEventListener('color-presets-change',()=>{sync();if(typeof levelFrame!=='undefined'&&!levelFrame.hidden)levelFrame.contentWindow.postMessage({type:'color-presets',settings:api.state},location.origin);if(typeof render==='function'&&currentUI.fonts.cozette?.image)render()});build();sync();
 // Text edit mode: a click on a background zone in the game opens that zone here.
 window.PeninsulaColorSettings={select(role){if(!api.names[role])return;selected=role;build();sync();const tab=host.querySelector('[data-color-preset="'+role+'"]');PeninsulaSettingsFlash(tab,host.querySelector('#color-controls'))}};
})();
