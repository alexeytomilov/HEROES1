// Right-hand column: settings of the dialogue typing and the mage's portrait (dialogue-fx.js).
// Shown on levels with a dialogue strip; the shop and the wanderer have their own hero screen and no portrait.
(()=>{
 const D=window.PeninsulaDialogue,host=document.querySelector('#dialogue-fx-settings');if(!D||!host)return;
 const levels=['drive1','fog4','traffic5','camp1','bear2','house2','village3','platform5'];
 const fields=[['sound','Громкость звука рации (0 — без звука)',1],['firstDelay','Первая реплика уровня через, с',.1],['typing','Текст: скорость печати, букв/с',1],['textHold','Текст: держится после печати, с',.1],['textFade','Текст: буква гаснет за, с',.05],['textNoise','Текст: шум — разброс букв по времени',1],['textDust','Текст: сколько пикселей сдувает',1],['appear','Портрет: мелькание при появлении, с',.05],['offset','Портрет: начало ухода после текста, с',.1],['flickerOut','Портрет: мелькание при уходе, с',.05],['vanish','Портрет: песок, распад длится, с',.1],['wind','Ветер (портрет и текст): сила',1],['angle','Ветер: направление, ° (0 — вправо, 90 — вниз)',1]];
 host.innerHTML='<h2>Текст и портрет в диалоге</h2><p class="walk-hint">Звучит рация, реплика печатается по буквам с мигающим курсором, в рамке мелькая появляется чёрно-белый портрет мага; когда текст допечатан, портрет уходит — мельканием, песком по ветру или и тем, и другим, а через какое-то время гаснет и сам текст: каждая буква в своё время, ветер сдувает с неё пиксели. Первая реплика уровня ждёт, чтобы сначала была видна картинка. Любое изменение сразу проигрывает текущую реплику заново.</p>'+
  '<label>Видны пиксели портрета<select data-fx="pixels"><option value="light">Светлые</option><option value="dark">Тёмные</option></select></label>'+
  '<label>Как уходит портрет<select data-fx="leave"><option value="flicker">Мельканием</option><option value="sand">Песком по ветру</option><option value="both">Мельканием и песком</option></select></label>'+
  fields.map(([k,n,step])=>'<label class="walk-range">'+n+'<span><input data-fx="'+k+'" type="range" min="'+D.fxLimits[k][0]+'" max="'+D.fxLimits[k][1]+'" step="'+step+'"><output data-fx-out="'+k+'"></output></span></label>').join('')+
  '<button type="button" class="walk-reset" data-fx-reset>Вернуть настройки</button>';
 const set=fn=>{const s=JSON.parse(JSON.stringify(D.state));fn(s.fx);D.update(s)};
 function sync(){
  const f=D.state.fx;host.querySelector('[data-fx="pixels"]').value=f.pixels;host.querySelector('[data-fx="leave"]').value=f.leave;
  for(const [k]of fields){const i=host.querySelector('[data-fx="'+k+'"]');if(document.activeElement!==i)i.value=f[k];host.querySelector('[data-fx-out="'+k+'"]').textContent=f[k]}
 }
 host.addEventListener('input',e=>{const k=e.target.dataset.fx;if(k)set(f=>{f[k]=k==='pixels'||k==='leave'?e.target.value:Number(e.target.value)})});
 host.addEventListener('click',e=>{if(e.target.closest('[data-fx-reset]'))set(f=>Object.assign(f,D.fxDefaults))});
 window.addEventListener('dialogue-rules-change',sync);
 // Only while one of these levels is actually open (not on the map or a story screen after it).
 setInterval(()=>{const n=window.journey?.snapshot?.().node,open=typeof screen==='string'&&['embedded','camp','platform'].includes(screen);host.hidden=!(open&&levels.includes(n))},400);
 sync();
})();
