// Join the accepted standalone levels with the complete five-chapter journey.
const levelFrame=document.querySelector('#level-frame'),levelNext=document.querySelector('#level-next'),chapterSelect=document.querySelector('#chapter-select');
let embeddedMode=null,embeddedComplete=false;
const legacyStopGames=stopGames;stopGames=function(){legacyStopGames();if(!levelFrame.hidden){levelFrame.hidden=true;levelFrame.src='about:blank'}embeddedMode=null;embeddedComplete=false;document.querySelector('#level-tools').hidden=true};
// While an embedded level loads, the game canvas shows a loading screen instead of half-built frames.
let levelRevealTimer=null;
function revealLevel(){clearTimeout(levelRevealTimer);levelFrame.style.visibility=''}
function drawLevelLoading(){PeninsulaColors.fill(ctx,0,0,320,240);PeninsulaColors.outline(ctx,0,0,320,240);PeninsulaText.line(ctx,LT('ui.loading'),160,113,'narrator',currentUI.fonts,'center')}
// Keys pressed while the page (not the level frame) has focus still reach the embedded level.
for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(screen!=='embedded'||levelFrame.hidden||e.target?.matches?.('input,select,textarea')||!levelFrame.contentDocument)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();levelFrame.contentDocument.dispatchEvent(new KeyboardEvent(type,{key:e.key,code:e.code,repeat:e.repeat,shiftKey:e.shiftKey,bubbles:true,cancelable:true}))});
// Publishing replaces __BUILD__ with the commit, so each release loads its own level pages.
const levelBuild='__BUILD__';
function launchAccepted(mode,variant='sredny'){stopGames();screen='embedded';levelNext.disabled=false;embeddedMode=mode;embeddedComplete=false;controls.replaceChildren();document.querySelector('#fog-back').hidden=false;document.querySelector('#platform-pad').hidden=true;levelFrame.hidden=false;levelFrame.style.visibility='hidden';clearTimeout(levelRevealTimer);levelRevealTimer=setTimeout(revealLevel,10000);drawLevelLoading();levelFrame.src=(mode==='race'?'race.html':'rpg.html')+'?embed=1&scale=1&mode='+variant+'&v='+levelBuild;document.querySelector('#level-tools').hidden=mode!=='race';syncEmbeddedScale();chapterSelect.value=journeyNode;}
const legacyCamp=launchCampSearch;launchCampSearch=function(mode='coast'){if(mode==='coast')launchAccepted('rpg');else legacyCamp(mode)};
function launchFogRace(mode='fog'){launchAccepted('race',mode)}
const legacySetScreen=setScreen;setScreen=function(s){if(screen==='embedded')stopGames();legacySetScreen(s)};
function syncEmbeddedScale(){levelFrame.style.transform='scale('+parseFloat(document.querySelector('#frame').style.width)/320+')'}
const priorScale=applyDisplayScale;applyDisplayScale=function(){priorScale();syncEmbeddedScale()};
window.addEventListener('resize',()=>{applyDisplayScale();syncEmbeddedScale()});document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{displayScale=Number(b.dataset.scale);applyDisplayScale()});
levelFrame.addEventListener('load',()=>{if(!levelFrame.hidden){levelFrame.contentWindow.postMessage({type:'text-edit',on:!!window.PeninsulaTextEdit?.on},location.origin);levelFrame.contentWindow.postMessage({type:'appearance',settings:currentUI.settings},location.origin);levelFrame.contentWindow.postMessage({type:'text-presets',settings:PeninsulaText.state},location.origin);levelFrame.contentWindow.postMessage({type:'color-presets',settings:PeninsulaColors.state},location.origin);levelFrame.contentWindow.focus()}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==levelFrame.contentWindow||screen!=='embedded')return;if(e.data?.type==='level-ready')revealLevel();if(e.data?.type==='level-continue'&&embeddedComplete){levelNext.onclick();return}if(e.data?.type==='level-complete')embeddedComplete=true});
// "Вперёд" skips the game being played straight to the moment it is won (and continues after a win).
const gameScreens=['embedded','camp','shop','platform','exchange'];
levelNext.onclick=()=>{if(!gameScreens.includes(screen))return;if(journeyActive)gameCompleted();else showNode('map')};
document.querySelectorAll('[data-level-action]').forEach(b=>b.onclick=()=>levelFrame.contentWindow.postMessage({type:'race-action',action:b.dataset.levelAction},location.origin));
const selection=[['title','Заставка 1'],['intro2','Заставка 2'],['intro3','Заставка 3'],['intro4','Заставка 4'],['hero0','Создание персонажа · Странник'],['hero1','Создание персонажа · Маг'],['hero2','Создание персонажа · Рыцарь'],['intro5','Заставка 5'],['map','Карта']];
for(let i=0;i<5;i++){
 journeyNodes['q'+i]={type:'question',body:chapterQuestions[i],next:(i+1)+'.1',no:i===3?'4.1':'map'};
 selection.push(['entry'+i,'Вход · '+points[i].full],['q'+i,'Вопрос '+(i+1)+'-1']);
 const ids=[['1.1','drive1','1.2','camp1','1.3','sleep','1.4','win1'],['2.1','bear2','2.2','2.3','ruin','house2','win2'],['3.1','village3','3.2','shop3','win3'],['4.1','fog4','4.2','exchange4','win4'],['5.1','platform5','5.2','home','traffic5','win5']][i];
 for(const id of ids)selection.push([id,({drive1:'Игра 1.1 · Гонка',camp1:'Игра 1.2 · Лагерь',bear2:'Игра 2.1 · Медведь',house2:'Игра 2.2 · Заброшка',village3:'Игра 3.1 · Поиск лавки',shop3:'Игра 3.2 · Торговец',fog4:'Игра 4.1 · Туманная гонка',exchange4:'Игра 4.2 · Странник',platform5:'Игра 5.1 · Платформер',traffic5:'Игра 5.2 · Дорога домой',sleep:'Вопрос 1-2 · Спать?',ruin:'Вопрос 2-2 · Руина',home:'Вопрос 5-2 · Домой?'})[id]||(/^win/.test(id)?'Победа '+id.at(-1):'Экран '+id)]);
}selection.push(['epilogue','Эпилог']);
chapterSelect.innerHTML=selection.map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('');
function reviewScreen(id){clearInterval(timer);loading=false;stopGames();journeyStarted=true;journeyActive=true;if(id==='title'){journeyActive=false;setScreen('title')}else if(/^hero[012]$/.test(id)){hero=Number(id.at(-1));setScreen('hero')}else if(id==='map')showNode('map');else if(/^entry[0-4]$/.test(id)){selected=Number(id.at(-1));journeyActive=false;setScreen('map');selectDestination(selected)}else showNode(id);chapterSelect.value=id;}
chapterSelect.addEventListener('change',()=>reviewScreen(chapterSelect.value));
const oldFullRender=render;render=function(){oldFullRender();levelNext.disabled=!gameScreens.includes(screen);if(screen==='title')chapterSelect.value='title';else if(screen==='hero')chapterSelect.value='hero'+hero;else if(screen==='map')chapterSelect.value=dialog?'entry'+selected:'map';else if(journeyNode)chapterSelect.value=journeyNode};
document.querySelector('#fog-back').onclick=()=>{stopGames();showNode('map')};

window.journey={select:reviewScreen,snapshot:()=>({screen,node:journeyNode,hero,selected,visited:[...visited],rewards:{...rewards},items:[...travelItems],embeddedMode,embeddedComplete,screens:selection.map(([id,name])=>({id,name}))})};
const direct=new URLSearchParams(location.search).get('game');if(direct&&direct!=='1-1')currentUI.ready.then(()=>setTimeout(()=>reviewScreen(({'1-2':'camp1','2-1':'bear2','2-2':'house2','3-1':'village3','3-2':'shop3','4-1':'fog4','4-2':'exchange4','5-1':'platform5','5-2':'traffic5'})[direct]||direct),0));
// The current screen owns its timer; changing screens cancels the old clock.
let fullIntroMotions={},fullIntroKey=null,scenePanelKey=null,sceneLastTime=null;
const sceneClock=PeninsulaScenes.clock(),sceneHost=document.querySelector('#scene-settings');
function activeScene(){return screen==='title'?'intro1':screen==='story'&&PeninsulaScenes.kind(journeyNode)?journeyNode:null}
function syncScenePanel(id){
 if(!sceneHost)return;
 if(window.PeninsulaTextEdit?.on){sceneHost.hidden=false;const popup=!!window.PeninsulaPopup?.visible&&screen!=='embedded',key='text-edit:'+Object.keys(PeninsulaText.overrides).length+(popup?':popup':'');if(scenePanelKey!==key){buildTextEditPanel();if(popup)buildPopupControls(true);scenePanelKey=key}return}
 // An open question window takes over the panel with its size switch.
 if(window.PeninsulaPopup?.visible&&screen!=='embedded'){sceneHost.hidden=false;if(scenePanelKey!=='popup'){buildPopupControls();scenePanelKey='popup'}return}
 const kind=PeninsulaScenes.kind(id),panelKey=kind==='story'?'story':id;
 sceneHost.hidden=!kind;if(!kind){scenePanelKey=null;return}
 if(panelKey===scenePanelKey)return;
 if(kind==='intro'){
  const n=Number(id.slice(5)),s=PeninsulaIntroVideo.sheets?.[n];sceneHost.oninput=null;
  sceneHost.innerHTML='<h2>Заставка '+n+'</h2><p>'+(s?'Видео Intro Main v1, кадры '+s.first+'–'+s.last+' · '+PeninsulaIntroVideo.duration(n).toFixed(2).replace(/\.?0+$/,'')+' с ('+PeninsulaIntroVideo.FPS+' кадров/с)':'Загрузка видео…')+'</p>';if(!s)return;
 }else{
  sceneHost.innerHTML='<h2>Все сюжетные экраны</h2><label class="number">Длительность показа, с<input data-story-seconds type="number" min="0.1" max="120" step="0.1"></label>';
  const input=sceneHost.querySelector('[data-story-seconds]');input.value=PeninsulaScenes.story.showSeconds;
  sceneHost.oninput=e=>{if(e.target===input&&input.value!=='')PeninsulaScenes.updateStory({showSeconds:Number(input.value)})};
 }
 scenePanelKey=panelKey;
}
let sceneShown=null,scenePaused=false;
// "Назад" walks back through the screens shown in this session, one at a time.
const screenHistory=[],sceneBack=document.querySelector('#scene-back');
function trackScreen(){const id=chapterSelect.value;if(id&&screenHistory.at(-1)!==id){screenHistory.push(id);if(screenHistory.length>200)screenHistory.shift()}if(sceneBack)sceneBack.disabled=screenHistory.length<2}
if(sceneBack)sceneBack.onclick=()=>{if(screenHistory.length<2)return;screenHistory.pop();reviewScreen(screenHistory.at(-1));trackScreen()};
// Pause freezes the automatic show timer and parallax; click, Enter and Space still advance manually.
const scenePause=document.querySelector('#scene-pause');
function setScenePaused(value){scenePaused=!!value;for(const motion of Object.values(fullIntroMotions))motion.setPaused?.(scenePaused);if(scenePause){scenePause.textContent=scenePaused?'Продолжить показ':'Пауза';scenePause.setAttribute('aria-pressed',String(scenePaused))}}
if(scenePause)scenePause.onclick=()=>setScenePaused(!scenePaused);
// The travel window ("В пути") also waits while the show is paused, e.g. in text edit mode.
window.peninsulaShowPaused=()=>scenePaused;
// The pixel cursor turns into an hourglass while travelling or while a level loads.
window.peninsulaBusy=()=>loading||(!levelFrame.hidden&&levelFrame.style.visibility==='hidden');
// Text edit mode pauses the show, reaches the embedded level and lists the edits in the panel below.
const textEditButton=document.querySelector('#text-edit');
function syncTextEdit(){const on=!!window.PeninsulaTextEdit?.on;if(textEditButton){textEditButton.setAttribute('aria-pressed',String(on));textEditButton.textContent=on?'Готово':'Текст'}if(!levelFrame.hidden)levelFrame.contentWindow?.postMessage({type:'text-edit',on},location.origin);scenePanelKey=null}
if(textEditButton)textEditButton.onclick=()=>{const on=!window.PeninsulaTextEdit.on;if(on)setScenePaused(true);window.PeninsulaTextEdit.set(on)};
window.addEventListener('text-edit-change',syncTextEdit);
function buildTextEditPanel(){const n=Object.keys(PeninsulaText.overrides).length;sceneHost.innerHTML='<h2>Редактирование текста</h2><p>Наведите мышь на текст в игре и кликните, чтобы поменять слова. Изменено текстов: '+n+'.</p><div class="text-edit-actions"><button type="button" data-text-act="copy">Скопировать правки</button> <button type="button" data-text-act="clear"'+(n?'':' disabled')+'>Вернуть все исходные</button></div>';
 sceneHost.onclick=async e=>{const act=e.target.dataset?.textAct;if(act==='copy'){const json=JSON.stringify(PeninsulaText.overrides,null,2);try{await navigator.clipboard.writeText(json);e.target.textContent='Скопировано'}catch{prompt('Скопируйте правки:',json)}}if(act==='clear'&&confirm('Вернуть исходный текст во всех местах?')){PeninsulaText.setOverrides({});scenePanelKey=null}};sceneHost.oninput=null}
// Toolbar buttons drop focus so Space and Enter keep advancing the screen instead of pressing the button again.
document.querySelectorAll('.toolbar button').forEach(b=>b.addEventListener('click',()=>b.blur()));
// Entering an intro always replays it from its first frame.
function buildPopupControls(append=false){
 const b=PeninsulaPopup.bounds,field=(key,label)=>'<label class="number">'+label+'<input data-popup-field="'+key+'" type="number" min="'+b[key][0]+'" max="'+b[key][1]+'" step="1"></label>';
 const html='<h2>Окно вопроса</h2>'+field('width','Ширина, px')+field('height','Высота, px');if(append)sceneHost.insertAdjacentHTML('beforeend','<div class="popup-size">'+html+'</div>');else sceneHost.innerHTML=html;
 for(const e of sceneHost.querySelectorAll('[data-popup-field]'))e.value=PeninsulaPopup.settings[e.dataset.popupField];
 sceneHost.oninput=e=>{const key=e.target.dataset.popupField;if(!key||e.target.value==='')return;PeninsulaPopup.update({...PeninsulaPopup.settings,[key]:Number(e.target.value)});render()};
}
function fullIntroAnimate(now){
 trackScreen();levelNext.disabled=!gameScreens.includes(screen);const id=activeScene();sceneClock.select(id);syncScenePanel(id);if(id!==sceneShown){fullIntroMotions[id]?.reset();sceneShown=id}
 const visible=!document.hidden,dt=sceneLastTime===null?0:(now-sceneLastTime)/1000;sceneLastTime=now;
 for(const [key,motion]of Object.entries(fullIntroMotions))motion.tick(now,visible&&key===id);
 if(sceneClock.tick(dt,visible&&!scenePaused)){if(id==='intro1')startJourney();else advanceStory()}
 else if(fullIntroMotions[id])render();
 requestAnimationFrame(fullIntroAnimate);
}
// "С начала" resets progress and returns to the first intro, even when it is already shown.
document.querySelector('#demo-start').onclick=()=>{startJourney();showNode('title');sceneShown=null;sceneClock.restart();render()};
Promise.all([currentUI.ready,PeninsulaIntroVideo.ready]).then(()=>{
 fullIntroMotions=Object.fromEntries([1,2,3,4,5].map(n=>['intro'+n,PeninsulaIntroVideo.motion(n)]));setScenePaused(scenePaused);scenePanelKey=null;sceneLastTime=null;render();requestAnimationFrame(fullIntroAnimate);
}).catch(e=>{if(sceneHost){sceneHost.hidden=false;sceneHost.innerHTML='<p>Не удалось загрузить видео заставок. Обновите страницу.</p>'}console.error(e)});
const renderBeforeParallax=render;render=function(){
 if(window.PeninsulaPopup)PeninsulaPopup.visible=false;renderBeforeParallax();const id=activeScene();sceneClock.select(id);syncScenePanel(id);
 const motion=fullIntroMotions[id];if(motion){if(fullIntroKey!==id)motion.reset();motion.draw(ctx)}
 fullIntroKey=id;
};
window.addEventListener('scene-settings-change',()=>{
 const id=activeScene();sceneClock.restart();sceneLastTime=null;fullIntroMotions[id]?.reset();
 if(PeninsulaScenes.kind(id)==='story'&&sceneHost?.querySelector('[data-story-seconds]'))sceneHost.querySelector('[data-story-seconds]').value=PeninsulaScenes.story.showSeconds;
 if(currentUI.fonts.cozette?.image)render();
});
document.addEventListener('visibilitychange',()=>{sceneLastTime=null;for(const motion of Object.values(fullIntroMotions))motion.tick(performance.now(),false)});

PeninsulaPopup.onchange=()=>{if(screen!=="embedded")render()};
