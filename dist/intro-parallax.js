// Render extracted layers at native pixel positions, clipped to each frame.
window.loadIntroParallax=async function(number=2){
 let manifest;
 if([2,3,4].includes(number)){
  manifest=await fetch('assets/intro'+number+'/layers.json').then(r=>{if(!r.ok)throw Error('intro PSD layers');return r.json()});
  // The full backing image is the third layer inside each image frame.
  manifest.frames=manifest.frames.map(f=>({...f,c:f.c||manifest.background}));
 }else if(number===1){
  manifest={width:318,height:132,frames:[{frame:{x:0,y:0,w:318,h:132},a:{src:'assets/4db3bc3c0077083ef0d3018b337d0f2183e8a852.png',x:74,y:39,w:170,h:82}}]};
 }else{
  manifest={width:318,height:238,frames:[{frame:{x:0,y:0,w:318,h:238},a:{src:'assets/intro5-full.png',x:-1,y:-1,w:320,h:240}}]};
 }
 const assets={};await Promise.all([manifest.background,...manifest.frames.flatMap(f=>[f.a,f.b,f.c])].filter(l=>l?.src).map(async l=>{if(assets[l.src])return;assets[l.src]=await new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=()=>reject(Error(l.src));im.src=l.src})}));
 const offsets=manifest.frames.map(()=>({a:0,b:0,c:0}));let paused=false,last=null,elapsed=0;
 const vectors={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]},settings=()=>PeninsulaScenes.intros[number];
 function reset(){offsets.forEach(o=>{o.a=0;o.b=0;o.c=0});elapsed=0;last=null}
 function advance(dt){if(paused)return false;const s=settings(),previous=elapsed;elapsed=Math.min(s.showSeconds,elapsed+Math.max(0,Number(dt)||0));
  if(s.enabled)manifest.frames.forEach((frame,i)=>{const t=Math.max(0,elapsed-Math.max(previous,number===2?i*s.interval:0)),f=s.frames[i];offsets[i].a+=f.speed*t;offsets[i].b+=f.speed*f.multiplier*t;offsets[i].c+=f.speed*f.thirdMultiplier*t});
  return previous<s.showSeconds&&elapsed>=s.showSeconds;
 }
 function tick(now,visible=true){const complete=last!==null&&visible?advance((now-last)/1000):false;last=now;return complete}
 function drawLayer(ctx,layer,distance,direction){if(!layer)return;const [dx,dy]=vectors[direction];ctx.drawImage(assets[layer.src],layer.x+dx*Math.round(distance),layer.y+dy*Math.round(distance),layer.w,layer.h)}
 function draw(ctx,x=1,y=1){const s=settings();ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,manifest.width,manifest.height);ctx.clip();
  PeninsulaColors.fill(ctx,0,0,manifest.width,manifest.height);
  if(manifest.background)drawLayer(ctx,manifest.background,0,'left');
  manifest.frames.forEach((f,i)=>{if(elapsed+1e-9<(number===2?i*s.interval:0))return;ctx.save();ctx.beginPath();ctx.rect(f.frame.x,f.frame.y,f.frame.w,f.frame.h);ctx.clip();for(const layer of ['c','b','a'])drawLayer(ctx,f[layer],s.enabled?offsets[i][layer]:0,s.frames[i].direction);ctx.restore()});ctx.restore();
 }
 return {draw,tick,advance,configure(value){PeninsulaScenes.updateIntro(number,value);reset()},reset,setPaused(value){paused=!!value},snapshot:()=>({settings:JSON.parse(JSON.stringify(settings())),offsets:offsets.map(o=>({...o})),number,paused,elapsed,cycleDuration:settings().showSeconds,manifest})};
};
window.buildParallaxControls=function(host,game,redraw){
 const {number,manifest}=game.snapshot();
 const direction='<option value="left">Влево</option><option value="right">Вправо</option><option value="up">Вверх</option><option value="down">Вниз</option>';
 // Single-image intros have no PSD layers, so only their display time is configurable.
 const duration='<h2>Заставка '+number+'</h2><label class="number">Длительность показа, с<input data-scene-field="showSeconds" type="number" min="0.1" max="120" step="0.1"></label>';
 host.innerHTML=!PeninsulaScenes.layered(number)?duration:duration+'<label class="motion-switch"><input data-scene-field="enabled" type="checkbox">Параллакс включён</label>'+(number===2?'<label class="number">Интервал появления фреймов, с<input data-scene-field="interval" type="number" min="0" step="0.05"></label>':'')+'<div class="motion-frames">'+manifest.frames.map((f,i)=>'<fieldset><legend>'+(number===2?'Фрейм '+(i+1):'Изображение')+'</legend><label class="number">Направление<select data-frame="'+i+'" data-motion-field="direction">'+direction+'</select></label><label class="number">Скорость первого слоя, px/с<input data-frame="'+i+'" data-motion-field="speed" type="number" min="0" max="100" step="0.5"></label>'+(f.b?'<label class="number">Множитель второго слоя<input data-frame="'+i+'" data-motion-field="multiplier" type="number" min="-4" max="4" step="0.05"></label>':'')+(f.c?'<label class="number">Множитель третьего слоя<input data-frame="'+i+'" data-motion-field="thirdMultiplier" type="number" min="-4" max="4" step="0.05"></label>':'')+'</fieldset>').join('')+'</div>';
 function sync(){const s=game.snapshot().settings;host.querySelectorAll('[data-scene-field]').forEach(e=>{if(e.type==='checkbox')e.checked=s[e.dataset.sceneField];else e.value=s[e.dataset.sceneField];if(e.dataset.sceneField==='interval')e.max=(s.showSeconds-.01)/2});host.querySelectorAll('[data-motion-field]').forEach(e=>{e.value=s.frames[e.dataset.frame][e.dataset.motionField];e.disabled=!s.enabled})}
 host.oninput=e=>{const field=e.target.dataset.sceneField,motionField=e.target.dataset.motionField;if(!field&&!motionField||e.target.type==='number'&&e.target.value==='')return;const s=game.snapshot().settings;if(field)s[field]=e.target.type==='checkbox'?e.target.checked:Number(e.target.value);if(motionField)s.frames[e.target.dataset.frame][motionField]=motionField==='direction'?e.target.value:Number(e.target.value);game.configure(s);sync();redraw()};sync();
};
