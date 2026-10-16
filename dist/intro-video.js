// Intros 1–5 play consecutive pieces of the rendered "Intro Main v4" sequence (RENDER/Intro Main/Intro Main v4).
// tools/build-intro-video.py packs each piece into assets/screens/intros/introN.webp; the screen text is drawn on top.
window.PeninsulaIntroVideo=(()=>{
 // SHEETS names the render the sprite sheets come from, so browsers never reuse sheets from an older render.
 const FPS=10,SHEETS='v4',base=PeninsulaScreenAssets.introVideo,images={};let sheets=null;
 const ready=fetch(base+'sheets.json?r='+SHEETS).then(r=>{if(!r.ok)throw Error('intro video');return r.json()}).then(m=>Promise.all(Object.entries(m).map(([n,s])=>new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>{images[n]=im;resolve()};im.onerror=()=>reject(Error(s.src));im.src=base+s.src+'?r='+SHEETS}))).then(()=>{sheets=m}));
 // Each intro lasts exactly as long as its piece of the video.
 const duration=n=>sheets?.[n]?sheets[n].frames/FPS:null;
 // Text sits in the black band under the picture; intro 5 is a full-screen picture without text.
 function text(ctx,n){
  if(n===1)currentUI.roleBlock(ctx,LT('ui.firstScreen'),8,182,304,52,'firstScreen');
  else if(n<5){const body=window.PENINSULA_STORY?.nodes?.['intro'+n]?.body;if(body)currentUI.roleBlock(ctx,body,8,182,304,52,'narrator')}
 }
 function motion(n){
  let elapsed=0,last=null,paused=false;
  return {number:n,
   reset(){elapsed=0;last=null},
   setPaused(value){paused=!!value},
   tick(now,visible=true){if(last!==null&&visible&&!paused)elapsed+=Math.max(0,(now-last)/1000);last=now;return false},
   draw(ctx){const s=sheets[n],i=Math.min(s.frames-1,Math.floor(elapsed*FPS));ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(images[n],i%s.columns*s.width,Math.floor(i/s.columns)*s.height,s.width,s.height,1,1,s.width,s.height);ctx.restore();text(ctx,n)}
  };
 }
 return {FPS,ready,duration,motion,get sheets(){return sheets}};
})();
