// Frames and timings from assets/victory1/fish-pickup.gif. A sprite sheet keeps
// GIF playback reliable on canvas and lets the game's pause button freeze it.
(()=>{
 const durations=[300,220,220,240,800],total=durations.reduce((a,b)=>a+b,0);
 let elapsed=0,active=false,sheet;
 const api=window.PeninsulaVictoryAnimation={
  ready:new Promise((resolve,reject)=>{
   const image=new Image();
   image.onload=()=>{sheet=image;resolve()};
   image.onerror=()=>reject(Error('Victory 1 animation could not be loaded'));
   image.src='assets/victory1/fish-pickup-frames.png';
  }),
  tick(dt,shown,playing=true){
   if(!shown||!active)elapsed=0;
   else if(playing)elapsed=(elapsed+Math.max(0,Number(dt)||0)*1000)%total;
   active=shown;
  },
  frame(){
   let end=0;
   for(let i=0;i<durations.length;i++){end+=durations[i];if(elapsed<end)return i}
   return 0;
  },
  draw(c){
   if(!sheet)return;
   // Preserve the source's 318×152 composition beneath the existing 1px frame.
   c.drawImage(sheet,api.frame()*318+1,1,316,150,2,2,316,150);
  }
 };
})();
