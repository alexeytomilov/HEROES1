// Portable configuration includes parameters only, never game progress or unrelated browser data.
(function(){
 const layoutKey='peninsula-layout-settings',introKey=n=>n===2?'peninsula-intro-parallax':'peninsula-intro-parallax-'+n;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const layoutFallback={textColor:'#bec4c9',lineColor:'#91a1ad',headingBackground:'#293640',headingColor:'#bec4c9',lineStep:13,padding:5,resourcePadding:5,narratorOffset:0,resourceOffset:1};
 const bounds={lineStep:[10,24],padding:[0,24],resourcePadding:[0,24],narratorOffset:[-60,60],resourceOffset:[-20,20]};
 const clamp=(v,a,b,f)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):f));
 function normalize(input){if(!input||typeof input!=='object'||input.schemaVersion!==1||!input.layout||!input.intros)throw Error('Ожидается файл настроек игры, версия 1.');const layout={...layoutFallback};for(const k of ['textColor','lineColor','headingBackground','headingColor']){const value=input.layout[k];if(value!==undefined){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error('Некорректный цвет: '+k);layout[k]=value}}for(const [k,[min,max]]of Object.entries(bounds))layout[k]=Math.round(clamp(input.layout[k],min,max,layout[k]));const intros={};for(const n of [2,3,4]){const value=input.intros[n]||{},duration=clamp(value.duration,.1,60,2);intros[n]={duration,speed:clamp(value.speed,0,100,6),interval:clamp(value.interval,0,(duration-.01)/2,.25),frames:Array.from({length:n===2?3:1},(_,i)=>{const f=value.frames?.[i]||{};return{direction:['left','right','up','down'].includes(f.direction)?f.direction:['left','up','right'][i],multiplier:clamp(f.multiplier,-4,4,[.35,.5,.25][i])}})}}return{schemaVersion:1,layout,intros}}
 const defaults=normalize(window.PENINSULA_PROJECT_CONFIG||{schemaVersion:1,layout:layoutFallback,intros:{}});
 const read=(key,fallback)=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):clone(fallback)}catch{return clone(fallback)}};
 function snapshot(){return normalize({schemaVersion:1,layout:read(layoutKey,defaults.layout),intros:Object.fromEntries([2,3,4].map(n=>[n,read(introKey(n),defaults.intros[n])]))})}
 function apply(input){const config=normalize(input);localStorage.setItem(layoutKey,JSON.stringify(config.layout));localStorage.setItem('peninsula-race-settings',JSON.stringify(config.layout));for(const n of [2,3,4])localStorage.setItem(introKey(n),JSON.stringify(config.intros[n]));return config}
 // Existing browser selections win; new hosts start from the versioned configuration.
 try{if(localStorage.getItem(layoutKey)===null)localStorage.setItem(layoutKey,JSON.stringify(defaults.layout));for(const n of [2,3,4])if(localStorage.getItem(introKey(n))===null)localStorage.setItem(introKey(n),JSON.stringify(defaults.intros[n]))}catch{}
 function download(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 window.PeninsulaSettings={normalize,snapshot,apply,defaults,exportJSON:()=>download('peninsula-settings.json',JSON.stringify(snapshot(),null,2)+'\n','application/json'),exportProject:()=>download('project-config.js','// Exported project settings.\nwindow.PENINSULA_PROJECT_CONFIG = '+JSON.stringify(snapshot(),null,2)+';\n','text/javascript')};
})();
