// «Раздел» next to the screen list: all screens, or only intros, character creation, questions, story screens,
// games or victories. The list then shows only that section, and «Назад» / «Вперёд» step only through it.
(()=>{
 const list=document.querySelector('#chapter-select');if(!list||typeof reviewScreen!=='function')return;
 const sections=[['all','Все экраны',null],['intro','Заставки',/^Заставка/],['hero','Создание персонажа',/^Создание персонажа/],['question','Вопросы',/^Вопрос/],['story','Экраны',/^Экран/],['game','Игры',/^Игра/],['win','Победы',/^Победа/]];
 const filter=document.createElement('select');filter.id='chapter-filter';filter.setAttribute('aria-label','Раздел игры');
 filter.innerHTML=sections.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
 const row=document.createElement('div');row.className='picker-row';list.before(row);row.append(filter,list);
 const key='peninsula-screen-section';
 function apply(jump){const re=sections.find(s=>s[0]===filter.value)?.[2];for(const o of list.options)o.hidden=!!re&&!re.test(o.text);
  const cur=list.options[list.selectedIndex];if(jump&&cur&&cur.hidden){const first=[...list.options].find(o=>!o.hidden);if(first)reviewScreen(first.value)}
  try{localStorage.setItem(key,filter.value)}catch{}if(typeof render==='function')try{render()}catch{}}
 filter.addEventListener('change',()=>{apply(true);filter.blur()});
 try{const v=localStorage.getItem(key);if(v&&sections.some(s=>s[0]===v))filter.value=v}catch{}
 apply(false);
})();
