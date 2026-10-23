// A big switch for playing without the editor: hides every settings panel and the editing buttons,
// leaving the game, its scale and «С начала». Remembered in the browser.
(()=>{
 const key='peninsula-play-mode',body=document.body;
 const button=document.createElement('button');button.id='play-mode';button.type='button';document.body.append(button);
 function set(on){
  body.classList.toggle('play-mode',on);button.setAttribute('aria-pressed',String(on));
  button.textContent=on?'Показать настройки':'Играть без настроек';
  // Text edit mode draws outlines over the game, so it is switched off for play.
  const edit=document.querySelector('#text-edit');if(on&&edit?.getAttribute('aria-pressed')==='true')edit.click();
  try{localStorage.setItem(key,on?'1':'0')}catch{}
 }
 button.addEventListener('click',()=>{set(!body.classList.contains('play-mode'));button.blur()});
 let saved=false;try{saved=localStorage.getItem(key)==='1'}catch{}
 set(saved);
})();
