// Dialogue effects shared by every level with a dialogue strip (races, walks, platformer; not the shop and
// the wanderer): the line types out letter by letter with a blinking block cursor, and the mage's 1-bit portrait
// shows in the picture, then blows away like pixel sand once the text is typed.
// Settings live in the dialogue rules (PeninsulaDialogue.state.fx) and are edited in the right-hand column.
window.PeninsulaDialogueFX=(()=>{
 const defaults={pixels:'light',typing:30,offset:.4,vanish:1.6,wind:45,angle:0,appear:.25};
 const FLY=.9,image=new Image(),instances=new Set();
 image.onload=()=>{for(const fx of instances)fx.reset(true)};image.src='assets/radio-mage.png';
 const settings=()=>({...defaults,...(window.PeninsulaDialogue?.state?.fx||{})});
 // Any change of the settings (here or in another frame) replays the current line everywhere.
 window.addEventListener('dialogue-rules-change',()=>{for(const fx of instances)fx.reset(true)});
 function pixels(mode){
  if(!image.complete||!image.naturalWidth)return null;
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);
  const d=g.getImageData(0,0,c.width,c.height).data,list=[];
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const o=(y*c.width+x)*4;if(d[o+3]<128||(d[o]>127)!==(mode!=='dark'))continue;list.push({x,y,r:Math.random(),j:Math.random(),k:Math.random()})}
  return {list,w:c.width,h:c.height};
 }
 // One per level: ctx to draw on, the text fonts, where the portrait sits (x, y) and the picture area it is
 // clipped to, and the level's own render function for the frames the effect needs while the level is still.
 function create({ctx,fonts,portrait,clip,render}){
  let text=null,start=0,sprite=null,mode=null,typed=0,raf=0,own=false,outside=0,alive=false;
  // Our own frame: only when the level has not drawn for a moment; otherwise just keep watching.
  const tick=()=>{raf=0;if(!alive)return;if(performance.now()-outside>40){own=true;try{render()}finally{own=false}}else raf=requestAnimationFrame(tick)};
  const fx={
   reset(redraw){start=performance.now();sprite=null;if(redraw&&text!==null)render()},
   // Draws the typed part of `full` in the dialogue strip; returns nothing, remembers when typing ends.
   line(full,x,y,w,h,role='dialogue'){
    if(!own)outside=performance.now();
    const T=PeninsulaText,s0=settings();if(full!==text){text=full;start=performance.now();sprite=null}
    T.record(ctx,full,x,y,w,h,role);
    const {s,f,ratio,step}=T.metrics(role,fonts),pad=Math.min(s.padding,Math.max(0,Math.floor((w-1)/2))),rows=T.lines(T.text(full),w-pad*2,role,fonts);
    const total=rows.reduce((n,r)=>n+[...r].length,0),sec=(performance.now()-start)/1000;
    let left=Math.floor(sec*s0.typing),cx=null,cy=null;typed=total/s0.typing;
    ctx.save();ctx.beginPath();ctx.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.clip();
    rows.forEach((row,i)=>{
     const chars=[...row],part=chars.slice(0,Math.max(0,left)).join(''),rowX=s.align==='center'?Math.round(x+w/2-T.measure(row,role,fonts,true)/2):x+pad,rowY=y+s.offset+i*step;
     if(part)T.line(ctx,part,rowX,rowY,role,fonts,'left',true);
     if(left>=0&&(left<chars.length||i===rows.length-1)&&cx===null){cx=rowX+(part?T.measure(part,role,fonts,true)+s.letterSpacing:0);cy=rowY}
     left-=chars.length;
    });
    // A block cursor the size of a letter: solid while typing, blinking once the line is complete.
    if(cx!==null&&(sec<typed||Math.floor((sec-typed)*2.5)%2===0)){ctx.fillStyle=s.color||'#e4e6e8';ctx.fillRect(Math.round(cx),Math.round(cy),Math.max(2,Math.round((f.glyphs['M']?.w||6)*ratio)),Math.round(s.size))}
    ctx.restore();
   },
   // The portrait: fades in, then from (typed + offset) its pixels leave one by one, downwind side first,
   // over `vanish` seconds and fly off with the wind. Each pixel has a one-pixel shadow so it reads on any picture.
   portrait(){
    const s=settings();if(!sprite||mode!==s.pixels){sprite=pixels(s.pixels);mode=s.pixels}
    const sec=(performance.now()-start)/1000;let moving=sec<typed+1;
    if(sprite&&text){
     const {list,w:pw,h:ph}=sprite,a=s.angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),begin=Math.max(0,typed+s.offset),appear=Math.min(1,sec/Math.max(.01,s.appear)),speed=s.wind*1.4;
     const proj=p=>((p.x/pw-.5)*dx+(p.y/ph-.5)*dy)/1.42+.5;
     const ink=s.pixels==='dark'?'#0b0d0e':'#e9eef0',shade=s.pixels==='dark'?'rgba(233,238,240,.45)':'rgba(5,7,8,.6)';
     ctx.save();ctx.beginPath();ctx.rect(...clip);ctx.clip();
     for(const pass of [0,1])for(const p of list){
      const release=begin+(1-(.75*proj(p)+.25*p.r))*s.vanish,t=sec-release;let px=portrait.x+p.x,py=portrait.y+p.y,alpha=appear;
      if(t>0){if(t>FLY)continue;const v=speed*(.55+p.j*.9),swirl=s.wind>0?Math.sin(t*9+p.k*6)*2.2:0;px+=dx*v*t-dy*swirl;py+=dy*v*t+dx*swirl+(s.wind<5?t*t*20:0);alpha*=1-t/FLY}
      ctx.globalAlpha=alpha;ctx.fillStyle=pass?ink:shade;ctx.fillRect(Math.round(px)+(pass?0:1),Math.round(py)+(pass?0:1),1,1);
     }
     ctx.restore();moving=moving||sec<begin+s.vanish+FLY;
    }
    // While anything still moves and the level itself is not redrawing every frame, ask for the next frame.
    alive=moving;if(moving&&!raf)raf=requestAnimationFrame(tick);
   }
  };
  instances.add(fx);return fx;
 }
 return {create,defaults,settings};
})();
