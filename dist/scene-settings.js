// Intro motion and screen timing are independent of game progress.
(()=>{
 const key=n=>n===2?'peninsula-intro-parallax':'peninsula-intro-parallax-'+n,storyKey='peninsula-story-display-v1';
 const directions=['left','right','up','down'],layered=n=>[2,3,4].includes(Number(n));
 const clamp=(v,a,b,d)=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):Math.max(a,Math.min(b,d));
 function normalizeIntro(n,value={}){
  if(!value||typeof value!=='object')value={};
  const showSeconds=clamp(value.showSeconds,.1,120,{1:4,2:7,3:7,4:6,5:4}[n]),speed=clamp(value.speed,0,100,6);
  return {enabled:layered(n)&&(typeof value.enabled==='boolean'?value.enabled:true),showSeconds,duration:clamp(value.duration,.1,60,2),speed,
   interval:n===2?clamp(value.interval,0,(showSeconds-.01)/2,.25):0,
   frames:Array.from({length:n===2?3:1},(_,i)=>{const f=value.frames?.[i]||{};return {direction:directions.includes(f.direction)?f.direction:['left','up','right'][i],speed:clamp(f.speed,0,100,speed),multiplier:clamp(f.multiplier,-4,4,[.35,.5,.25][i]),thirdMultiplier:clamp(f.thirdMultiplier,-4,4,0)}})};
 }
 const normalizeStory=v=>({showSeconds:clamp(v?.showSeconds,.1,120,7)});
 const read=(k,fallback)=>{try{const saved=localStorage.getItem(k);return saved?JSON.parse(saved):fallback}catch{return fallback}};
 let intros=Object.fromEntries([1,2,3,4,5].map(n=>[n,normalizeIntro(n,read(key(n),window.PENINSULA_PROJECT_CONFIG?.intros?.[n]))])),story=normalizeStory(read(storyKey,window.PENINSULA_PROJECT_CONFIG?.story));
 const changed=()=>window.dispatchEvent?.(new Event('scene-settings-change'));
 const api=window.PeninsulaScenes={key,storyKey,layered,normalizeIntro,normalizeStory,get intros(){return intros},get story(){return story},
  kind:id=>/^intro[1-5]$/.test(id)?'intro':/^\d+\.\d+$/.test(id)?'story':null,
  duration(id){return api.kind(id)==='intro'?window.PeninsulaIntroVideo?.duration(Number(id.slice(5)))??intros[Number(id.slice(5))].showSeconds:api.kind(id)==='story'?story.showSeconds:null},
  updateIntro(n,value){intros[n]=normalizeIntro(n,{...intros[n],...value});try{localStorage.setItem(key(n),JSON.stringify(intros[n]))}catch{}changed()},
  updateStory(value){story=normalizeStory({...story,...value});try{localStorage.setItem(storyKey,JSON.stringify(story))}catch{}changed()},
  apply(value){intros=Object.fromEntries([1,2,3,4,5].map(n=>[n,normalizeIntro(n,value.intros?.[n])]));story=normalizeStory(value.story);changed()},
  clock(){let id=null,elapsed=0,completed=false;return {select(next){if(next!==id){id=next;elapsed=0;completed=false}},restart(){elapsed=0;completed=false},tick(dt,visible=true){const duration=api.duration(id);if(!visible||duration===null||completed)return false;elapsed+=Math.max(0,Number(dt)||0);if(elapsed+1e-9>=duration){completed=true;return true}return false},snapshot:()=>({id,elapsed,completed,duration:api.duration(id)})}}
 };
 window.addEventListener?.('storage',e=>{const n=[1,2,3,4,5].find(n=>key(n)===e.key);if(n){try{intros[n]=normalizeIntro(n,JSON.parse(e.newValue||'{}'));changed()}catch{}}else if(e.key===storyKey){try{story=normalizeStory(JSON.parse(e.newValue||'{}'));changed()}catch{}}});
})();
