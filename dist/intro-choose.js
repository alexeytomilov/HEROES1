// Intro 4 ends on «Выбор героя»: the button fades in once «Помоги странникам найти путь» has come in, and the intro
// waits for it (a click, Enter or Space) instead of moving on by itself; it opens character creation.
(()=>{
 const BUTTON={x:96,y:212,w:128,h:20},DELAY=1.4,FADE=.6;
 let shownKey=null,shownAt=0,go=false;
 const here=()=>activeScene()==='intro4';
 // seconds since intro 4 opened (performance.now runs on, also while the intro clock is paused)
 const since=()=>{const id=activeScene();if(id!==shownKey){shownKey=id;shownAt=performance.now()}return (performance.now()-shownAt)/1000};
 const ready=()=>here()&&since()>=DELAY;
 const choose=()=>{if(!ready())return;go=true;showNode('hero');go=false};
 const syncBefore=syncHotspots;syncHotspots=function(){if(here())buttons=ready()?[{...BUTTON,label:LT('ui.chooseHero'),fn:choose}]:[];syncBefore()};
 const advanceBefore=advanceStory;advanceStory=function(){if(here()&&!go)return;advanceBefore()};
 window.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&ready())choose()});
 const renderBefore=render;render=function(){renderBefore();if(!here())return;const a=Math.max(0,Math.min(1,(since()-DELAY)/FADE));if(a<=0)return;
  const {x,y,w,h}=BUTTON;ctx.save();ctx.globalAlpha=a;panel(x,y,w,h,'ui_button');currentUI.roleBlock(ctx,LT('ui.chooseHero'),x,y,w,h,'buttons');ctx.restore()};
})();
