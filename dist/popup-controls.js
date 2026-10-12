// Permanent popup controls beside the game; uses the shared popup settings.
(()=>{
 const host=document.querySelector('#popup-inline-fields');if(!host)return;
 const p=PeninsulaPopup,names={width:'Ширина плашки',height:'Высота плашки',padding:'Отступы',lineStep:'Межстрочный шаг',buttonWidth:'Ширина кнопки',buttonHeight:'Высота кнопки',gap:'Расстояние между элементами'};
 for(const [key,[min,max]]of Object.entries(p.bounds)){const label=document.createElement('label');label.className='number';label.textContent=names[key]+', px';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=1;input.value=p.settings[key];input.dataset.popup=key;label.append(input);host.append(label)}
 const label=document.createElement('label');label.className='number';label.textContent='Размер текста';const select=document.createElement('select');select.dataset.popup='fontSize';for(const size of [13,16]){const option=document.createElement('option');option.value=size;option.textContent=size+' px';select.append(option)}select.value=p.settings.fontSize;label.append(select);host.append(label);
 const previous=p.onchange;p.onchange=()=>{for(const el of host.querySelectorAll('[data-popup]'))el.value=p.settings[el.dataset.popup];previous?.()};
 host.addEventListener('input',()=>{const values={...p.settings};for(const el of host.querySelectorAll('[data-popup]'))values[el.dataset.popup]=Number(el.value);p.update(values)});
 document.querySelector('#popup-inline-reset').onclick=()=>p.update(p.defaults);
})();
