// Animated sea on the world map: the author's map (assets/screens/map-author.png) stays still, and over its sea
// a 64x64 water tile loops through 40 frames (4 s at 10 fps), shown only where the sea mask is.
// Rendered from the «Map» comp in After Effects (Заставка Motion 5.aep); see README «Карта».
window.PeninsulaMapWater=(()=>{
 const FPS=10,FRAMES=40,T=64,COLS=8,sheet=new Image(),mask=new Image();
 let ready=false,canvas=null,g=null,patterns=[],shown=-1;
 let pending=2;const loaded=()=>{if(--pending)return;
  // One pattern per frame from the sprite sheet; one canvas the size of the map that holds the water of the frame.
  for(let f=0;f<FRAMES;f++){const c=document.createElement('canvas');c.width=c.height=T;c.getContext('2d').drawImage(sheet,f%COLS*T,Math.floor(f/COLS)*T,T,T,0,0,T,T);patterns.push(c)}
  canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;g=canvas.getContext('2d');ready=true;
 };
 sheet.onload=mask.onload=loaded;sheet.src='assets/screens/map-author-water.png?v=1';mask.src='assets/screens/map-author-water-mask.png?v=1';
 function frame(){return Math.floor(performance.now()/1000*FPS)%FRAMES}
 // Draws the water of the current frame at the map's top-left corner (x, y), inside the caller's clip.
 function draw(ctx,x,y){
  if(!ready)return;const f=frame();
  if(f!==shown){g.globalCompositeOperation='copy';g.fillStyle=g.createPattern(patterns[f],'repeat');g.fillRect(0,0,canvas.width,canvas.height);
   g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);g.globalCompositeOperation='source-over';shown=f}
  ctx.drawImage(canvas,Math.round(x),Math.round(y));
 }
 // While the map is on screen, redraw it at the water's frame rate.
 setInterval(()=>{if(ready&&!document.hidden&&typeof screen==='string'&&screen==='map'&&typeof render==='function')render()},1000/FPS);
 return {draw,get ready(){return ready}};
})();
