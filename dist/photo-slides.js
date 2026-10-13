// Photos from a PSD group flip one by one inside its mask (the phone screen on screen 2.3).
window.loadPhotoSlides=async function(folder){
 const manifest=await fetch('assets/'+folder+'/layers.json').then(r=>{if(!r.ok)throw Error(folder+' PSD layers');return r.json()});
 const assets={};await Promise.all([manifest.base,manifest.mask,...manifest.photos].map(async l=>{assets[l.src]=await new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=()=>reject(Error(l.src));im.src=l.src})}));
 const count=manifest.photos.length,mask=manifest.mask,slide=.35,seconds=()=>PeninsulaScenes.story.photoSeconds;
 // index is the shown photo; from/direction/swipe describe the swipe still in progress.
 let index=0,from=null,direction=1,swipe=slide,elapsed=0,paused=false,card=null;
 function reset(){index=0;from=null;swipe=slide;elapsed=0}
 function show(next){if(next<0||next>=count||next===index)return false;from=index;direction=next>index?1:-1;index=next;swipe=0;elapsed=0;return true}
 // Each photo stays for its own interval; the last one stays until the screen leaves.
 function advance(dt){dt=Math.max(0,Number(dt)||0);swipe=Math.min(slide,swipe+dt);if(swipe>=slide)from=null;if(paused||index>=count-1)return false;elapsed+=dt;if(elapsed+1e-9>=seconds())return show(index+1);return false}
 function drawCard(g,photo,dx){g.drawImage(assets[photo.src],dx,0,photo.w,photo.h)}
 function draw(ctx,x=1,y=1){
  if(!card){card=document.createElement('canvas');card.width=mask.w;card.height=mask.h}
  const g=card.getContext('2d');g.imageSmoothingEnabled=false;g.globalCompositeOperation='source-over';g.clearRect(0,0,mask.w,mask.h);
  if(from===null)drawCard(g,manifest.photos[index],0);
  else{const t=1-Math.pow(1-swipe/slide,3),shift=Math.round(t*mask.w)*direction;drawCard(g,manifest.photos[from],-shift);drawCard(g,manifest.photos[index],direction*mask.w-shift)}
  g.globalCompositeOperation='destination-in';g.drawImage(assets[mask.src],0,0);g.globalCompositeOperation='source-over';
  // Same inner area as the story image: the 1px frame around it stays visible.
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.beginPath();ctx.rect(1,1,manifest.width-2,manifest.height-2);ctx.clip();
  ctx.drawImage(assets[manifest.base.src],manifest.base.x,manifest.base.y,manifest.base.w,manifest.base.h);ctx.drawImage(card,mask.x,mask.y);ctx.restore();
 }
 return {draw,advance,reset,show,next:()=>show(index+1),previous:()=>show(index-1),setPaused(value){paused=!!value},
  get last(){return index>=count-1},get moving(){return from!==null},snapshot:()=>({index,count,elapsed,paused,moving:from!==null,manifest})};
};
