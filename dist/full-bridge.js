// Join the accepted standalone levels with the complete five-chapter journey.
const levelFrame=document.querySelector('#level-frame'),levelNext=document.querySelector('#level-next'),chapterSelect=document.querySelector('#chapter-select');
let embeddedMode=null,embeddedComplete=false;
const legacyStopGames=stopGames;stopGames=function(){legacyStopGames();if(!levelFrame.hidden){levelFrame.hidden=true;levelFrame.src='about:blank'}embeddedMode=null;embeddedComplete=false;levelNext.hidden=true;document.querySelector('#level-tools').hidden=true};
function launchAccepted(mode,variant='sredny'){stopGames();screen='embedded';embeddedMode=mode;embeddedComplete=false;controls.replaceChildren();document.querySelector('#fog-back').hidden=false;for(const id of ['#fog-pad','#fog-sound','#platform-pad'])document.querySelector(id).hidden=true;levelFrame.hidden=false;levelFrame.src=(mode==='race'?'race.html':'rpg.html')+'?embed=1&scale=1&mode='+variant;document.querySelector('#level-tools').hidden=mode!=='race';document.querySelector('#hint').textContent=mode==='race'?'↑ / W — газ · ↓ / S — тормоз · ← → / A D — руль. Предметы перетаскивайте на дорогу.':'↑ ↓ — шаг · ← → — поворот · E — осмотр · G — поднять мусор. Палатку перетащите на площадку.';syncEmbeddedScale();chapterSelect.value=journeyNode;}
const legacyCamp=launchCampSearch;launchCampSearch=function(mode='coast'){if(mode==='coast')launchAccepted('rpg');else legacyCamp(mode)};
const legacyDrive=launchFogRace;launchFogRace=function(mode='fog'){launchAccepted('race',mode)};
const legacySetScreen=setScreen;setScreen=function(s){if(screen==='embedded')stopGames();legacySetScreen(s)};
function syncEmbeddedScale(){levelFrame.style.transform='scale('+parseFloat(document.querySelector('#frame').style.width)/320+')'}
const priorScale=applyDisplayScale;applyDisplayScale=function(){priorScale();syncEmbeddedScale()};
window.addEventListener('resize',()=>{applyDisplayScale();syncEmbeddedScale()});document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{displayScale=Number(b.dataset.scale);applyDisplayScale()});
levelFrame.addEventListener('load',()=>{if(!levelFrame.hidden){levelFrame.contentWindow.postMessage({type:'appearance',settings:currentUI.settings},location.origin);levelFrame.contentWindow.postMessage({type:'text-presets',settings:PeninsulaText.state},location.origin);levelFrame.contentWindow.postMessage({type:'color-presets',settings:PeninsulaColors.state},location.origin);levelFrame.contentWindow.focus()}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==levelFrame.contentWindow||screen!=='embedded')return;if(e.data?.type==='level-complete'){embeddedComplete=true;levelNext.hidden=false;document.querySelector('#hint').textContent=embeddedMode==='race'?'Вы добрались до места ночлега. Можно продолжать.':'Лагерь установлен. Можно продолжать.'}});
levelNext.onclick=()=>{if(!embeddedComplete)return;if(journeyActive)gameCompleted();else showNode('map')};
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
const oldFullRender=render;render=function(){oldFullRender();if(screen==='title')chapterSelect.value='title';else if(screen==='hero')chapterSelect.value='hero'+hero;else if(screen==='map')chapterSelect.value=dialog?'entry'+selected:'map';else if(journeyNode)chapterSelect.value=journeyNode};
document.querySelector('#fog-back').onclick=()=>{stopGames();showNode('map')};

window.journey={select:reviewScreen,snapshot:()=>({screen,node:journeyNode,hero,selected,visited:[...visited],rewards:{...rewards},items:[...travelItems],embeddedMode,embeddedComplete,screens:selection.map(([id,name])=>({id,name}))})};
const direct=new URLSearchParams(location.search).get('game');if(direct&&direct!=='1-1')currentUI.ready.then(()=>setTimeout(()=>reviewScreen(({'1-2':'camp1','2-1':'bear2','2-2':'house2','3-1':'village3','3-2':'shop3','4-1':'fog4','4-2':'exchange4','5-1':'platform5','5-2':'traffic5'})[direct]||direct),0));
// The current screen owns its timer; changing screens cancels the old clock.
let fullIntroMotions={},fullIntroKey=null,scenePanelKey=null,sceneLastTime=null;
const sceneClock=PeninsulaScenes.clock(),sceneHost=document.querySelector('#scene-settings');
function activeScene(){return screen==='title'?'intro1':screen==='story'&&PeninsulaScenes.kind(journeyNode)?journeyNode:null}
function syncScenePanel(id){
 if(!sceneHost)return;
 const kind=PeninsulaScenes.kind(id),panelKey=kind==='story'?'story':id;
 sceneHost.hidden=!kind;if(!kind){scenePanelKey=null;return}
 if(panelKey===scenePanelKey)return;
 if(kind==='intro'){
  const motion=fullIntroMotions[id];if(!motion){sceneHost.innerHTML='<h2>Заставка '+id.slice(5)+'</h2><p>Загрузка слоёв…</p>';return}
  buildParallaxControls(sceneHost,motion,()=>render());
 }else{
  sceneHost.innerHTML='<h2>Все сюжетные экраны</h2><label class="number">Длительность показа, с<input data-story-seconds type="number" min="0.1" max="120" step="0.1"></label>';
  const input=sceneHost.querySelector('[data-story-seconds]');input.value=PeninsulaScenes.story.showSeconds;
  sceneHost.oninput=e=>{if(e.target===input&&input.value!=='')PeninsulaScenes.updateStory({showSeconds:Number(input.value)})};
 }
 scenePanelKey=panelKey;
}
let sceneShown=null;
// Entering an intro always replays it from its first frame.
function fullIntroAnimate(now){
 const id=activeScene();sceneClock.select(id);if(id!==sceneShown){fullIntroMotions[id]?.reset();sceneShown=id}
 const visible=!document.hidden,dt=sceneLastTime===null?0:(now-sceneLastTime)/1000;sceneLastTime=now;
 for(const [key,motion]of Object.entries(fullIntroMotions))motion.tick(now,visible&&key===id);
 if(sceneClock.tick(dt,visible)){if(id==='intro1')startJourney();else advanceStory()}
 else if(fullIntroMotions[id])render();
 requestAnimationFrame(fullIntroAnimate);
}
// "С начала" resets progress and returns to the first intro, even when it is already shown.
document.querySelector('#demo-start').onclick=()=>{startJourney();showNode('title');sceneShown=null;sceneClock.restart();render()};
Promise.all([currentUI.ready,...[1,2,3,4,5].map(n=>window.loadIntroParallax(n))]).then(([, ...motions])=>{
 fullIntroMotions=Object.fromEntries(motions.map((motion,i)=>['intro'+(i+1),motion]));scenePanelKey=null;sceneLastTime=null;render();requestAnimationFrame(fullIntroAnimate);
}).catch(e=>{if(sceneHost){sceneHost.hidden=false;sceneHost.innerHTML='<p>Не удалось загрузить слои заставок. Обновите страницу.</p>'}console.error(e)});
const renderBeforeParallax=render;render=function(){
 renderBeforeParallax();const id=activeScene();sceneClock.select(id);syncScenePanel(id);
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
