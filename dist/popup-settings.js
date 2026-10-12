(()=>{
 const p=PeninsulaPopup,canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),fields=document.querySelector('#popup-fields');
 const names={width:'Ширина плашки',height:'Высота плашки',padding:'Отступы текста и кнопок',lineStep:'Межстрочный шаг',buttonWidth:'Ширина кнопки',buttonHeight:'Высота кнопки',gap:'Расстояние между элементами'};
 for(const [key,[min,max]]of Object.entries(p.bounds)){const label=document.createElement('label');label.className='number';label.textContent=names[key]+', px';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=1;input.value=p.settings[key];input.dataset.popup=key;label.append(input);fields.append(label)}
 const label=document.createElement('label');label.className='number';label.textContent='Размер пиксельного текста';const select=document.createElement('select');select.dataset.popup='fontSize';for(const size of [13,16]){const o=document.createElement('option');o.value=size;o.textContent=size+' px';select.append(o)}select.value=p.settings.fontSize;label.append(select);fields.append(label);
 const samples={trip:{body:'Вы хотите отправиться на полуостров Средний?',labels:['Да','Нет']},bear:{title:'Медведь',body:'Слышен рёв медведя. Найдите поляну и поставьте отпугиватель.'},camp:{title:'Лагерь',body:'Найдите тихую сухую площадку. Уберите мусор и перетащите палатку из инвентаря.'},win:{title:'Лавка найдена',body:'Можно продолжать путешествие.'}};
 let sample='trip',ready=false,choice=0;
 function draw(){if(!ready)return;currentUI.base(c,'1.1');p.draw(c,{...samples[sample],choice});document.querySelector('#preview-status').textContent='Настройки применяются сразу ко всем всплывающим окнам игры.'}
 function sync(){for(const el of fields.querySelectorAll('[data-popup]'))el.value=p.settings[el.dataset.popup];draw()}
 fields.addEventListener('input',()=>{const v={...p.settings};for(const el of fields.querySelectorAll('[data-popup]'))v[el.dataset.popup]=Number(el.value);p.update(v);draw()});
 p.onchange=sync;document.querySelector('#popup-reset').onclick=()=>p.update(p.defaults);
 document.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>{sample=b.dataset.sample;choice=0;draw()});
 document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{const scale=Number(b.dataset.scale);canvas.style.width=320*scale+'px';canvas.style.height=240*scale+'px';document.querySelectorAll('[data-scale]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)))});
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*320/r.width,y=(e.clientY-r.top)*240/r.height;p.last?.buttons.forEach((b,i)=>{if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h){choice=i;draw()}})});
 currentUI.ready.then(()=>{ready=true;draw()}).catch(()=>document.querySelector('#preview-status').textContent='Не удалось загрузить предпросмотр. Обновите страницу.');
})();
