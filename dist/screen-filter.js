// «Раздел» next to the screen list: the whole game, or only intros, character creation, questions, story screens
// (with the epilogue), games, the map (with the entries to each place) or victories. The list then shows only that section, «Назад» / «Вперёд» step only through it, and when a
// screen ends by itself (an intro runs out, a game is won) the game goes on to the next screen of the same section
// instead of following the whole story; after the last one it starts the section again.
(()=>{
 const list=document.querySelector('#chapter-select');if(!list||typeof reviewScreen!=='function')return;
 const sections=[['all','Вся игра',null],['intro','Заставки',/^Заставка/],['hero','Создание персонажа',/^Создание персонажа/],['question','Вопросы',/^Вопрос/],['story','Истории',/^(История|Эпилог)/],['game','Игры',/^Игра/],['map','Карта',/^(Карта|Вход)/],['win','Победы',/^Победа/]];
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
 let last=list.value;
 setInterval(()=>{if(filter.value==='all'){last=list.value;return}const cur=list.options[list.selectedIndex];if(!cur)return;if(!cur.hidden){last=cur.value;return}
  const shown=[...list.options].filter(o=>!o.hidden);if(!shown.length)return;const i=shown.findIndex(o=>o.value===last);const next=shown[i+1]||shown[0];last=next.value;reviewScreen(next.value)},150);
})();
