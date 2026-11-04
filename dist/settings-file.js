// «Настройки в файл» / «Настройки из файла»: every setting of the panels (layout, intros, story display, colour
// presets with their textures, text presets and texts, popups, walks, races, dialogue) in one JSON file, to carry
// them between the published game and a local copy (each address keeps its own browser storage).
// Game progress is not in the file. Loading a file replaces the settings of this browser and reloads the page.
(()=>{
 const bar=document.querySelector('.toolbar');if(!bar||!window.PeninsulaSettings)return;
 const save=document.createElement('button');save.textContent='Настройки в файл';
 save.title='Скачать все настройки игры (цвета, текстуры, тексты, заставки) в файл peninsula-settings.json';
 const load=document.createElement('button');load.textContent='Настройки из файла';
 load.title='Взять все настройки из файла peninsula-settings.json, который сохранён кнопкой «Настройки в файл»';
 const pick=document.createElement('input');pick.type='file';pick.accept='.json,application/json';pick.hidden=true;
 bar.append(save,load,pick);
 save.onclick=()=>PeninsulaSettings.exportJSON();
 load.onclick=()=>pick.click();
 pick.onchange=async()=>{const file=pick.files[0];pick.value='';if(!file)return;
  try{PeninsulaSettings.apply(JSON.parse(await file.text()));location.reload()}
  catch(e){alert('Не получилось взять настройки: '+e.message)}};
})();
