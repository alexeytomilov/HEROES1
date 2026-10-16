// Dialogue effects shared by every level with a dialogue strip (races, walks, platformer; not the shop and
// the wanderer): a radio sound plays, the line types out letter by letter with a blinking block cursor, and the
// mage's 1-bit portrait flickers into a small dark frame (light pixels on a dark ground); once the text is typed it
// leaves — flickering out, blown away like pixel sand, or both (settings «Как уходит»).
// Settings live in the dialogue rules (PeninsulaDialogue.state.fx) and are edited in the right-hand column.
window.PeninsulaDialogueFX=(()=>{
 const defaults={pixels:'light',typing:30,offset:.4,vanish:1.6,wind:45,angle:0,appear:.4,flickerOut:.5,leave:'flicker',sound:60,firstDelay:2,textHold:3,textFade:.8,textNoise:60,textDust:40};
 const FLY=.9,image=new Image(),instances=new Set();
 image.onload=()=>{for(const fx of instances)fx.reset(true)};image.src='assets/radio-mage.png?v=34x42';
 const settings=()=>({...defaults,...(window.PeninsulaDialogue?.state?.fx||{})});
 // Radio sound: a squelch click, a short two-tone chirp and a tail of band-passed static. Synthesised, no file.
 // Inside a level frame it is played by the main page, which has the player's clicks and so may play sound.
 let audio=null;
 function sound(volume){
  const v=Math.max(0,Math.min(1,volume/100));if(!v)return;
  try{
   audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
   const t=audio.currentTime,out=audio.createGain();out.gain.value=v*.5;out.connect(audio.destination);
   const noise=(len,from,to,freq,q)=>{const b=audio.createBuffer(1,Math.ceil(audio.sampleRate*len),audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(Math.random()<.92?1:2.5);
    const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(.0001,t+from);g.gain.exponentialRampToValueAtTime(1,t+from+.008);g.gain.exponentialRampToValueAtTime(.0001,t+to);s.connect(f).connect(g).connect(out);s.start(t+from);s.stop(t+to+.02)};
   const tone=(freq,from,len)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t+from);g.gain.exponentialRampToValueAtTime(.25,t+from+.005);g.gain.exponentialRampToValueAtTime(.0001,t+from+len);o.connect(g).connect(out);o.start(t+from);o.stop(t+from+len+.02)};
   noise(.07,0,.06,2600,.7);tone(1250,.05,.045);tone(1850,.1,.05);noise(.4,.12,.42,1900,1.1);
  }catch{}
 }
 function radio(){const s=settings();let host=null;try{if(window.parent!==window)host=window.parent.PeninsulaDialogueFX}catch{}(host||api).sound(s.sound)}
 // Flicker: on/off in short random slices (about 45 ms), more often on as `p` grows; also returns a 1-px jitter.
 const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
 const flicker=(sec,p)=>{const n=Math.floor(sec/.045);return {on:hash(n)<p,shift:hash(n+.5)<.25?(hash(n+.7)<.5?-1:1):0}};
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
  let text=null,start=0,sprite=null,mode=null,typed=0,raf=0,own=false,outside=0,alive=false,sounded=false,textMoving=false;
  // Our own frame: only when the level has not drawn for a moment; otherwise just keep watching.
  const tick=()=>{raf=0;if(!alive)return;if(performance.now()-outside>40){own=true;try{render()}finally{own=false}}else raf=requestAnimationFrame(tick)};
  const fx={
   reset(redraw){start=performance.now();sprite=null;sounded=false;if(redraw&&text!==null)render()},
   // The level (re)starts: its next line is the first one again and waits `firstDelay` seconds.
   levelStart(){text=null},
   // Draws the line in the dialogue strip: typed letter by letter after an optional delay (the first line of a
   // level waits `firstDelay` seconds so the picture is seen first); `textHold` seconds after it is typed every
   // letter fades on its own schedule (`textNoise` spreads them, `textFade` is how long one letter takes) and
   // the wind blows pixels off it (`textDust`, same wind as the portrait sand).
   line(full,x,y,w,h,role='dialogue'){
    const now=performance.now();if(!own)outside=now;
    const T=PeninsulaText,s0=settings();
    if(full!==text){start=now+(text===null?s0.firstDelay*1000:0);text=full;sprite=null;sounded=false}
    const sec=(now-start)/1000;if(!sounded&&sec>=0&&full){sounded=true;radio()}
    T.record(ctx,full,x,y,w,h,role);
    const {s,f,ratio,step}=T.metrics(role,fonts),pad=Math.min(s.padding,Math.max(0,Math.floor((w-1)/2))),rows=T.lines(T.text(full),w-pad*2,role,fonts);
    const total=rows.reduce((n,r)=>n+[...r].length,0);typed=total/s0.typing;
    const fadeAt=typed+s0.textHold,spread=s0.textNoise/100*Math.max(.3,s0.textFade)*1.6,cw=Math.max(2,Math.round((f.glyphs['M']?.w||6)*ratio)),ch=Math.round(s.size);
    const a=s0.angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),speed=s0.wind*1.4,dust=Math.round(s0.textDust/100*6);
    let shown=Math.floor(sec*s0.typing),index=0,cx=null,cy=null,live=false;
    ctx.save();ctx.beginPath();ctx.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.clip();
    rows.forEach((row,i)=>{
     const chars=[...row],rowX=s.align==='center'?Math.round(x+w/2-T.measure(row,role,fonts,true)/2):x+pad,rowY=y+s.offset+i*step;let prefix='';
     chars.forEach(c=>{
      const k=index++,cxL=rowX+(prefix?T.measure(prefix,role,fonts,true)+s.letterSpacing:0);prefix+=c;
      if(k>=shown){if(cx===null){cx=cxL;cy=rowY}return}
      const t0=fadeAt+hash(k*3.1+.3)*spread,u=(sec-t0)/Math.max(.05,s0.textFade);
      if(u<1)live=true;
      // The letter itself: full until its own moment, then fading with a little flicker of its own.
      if(c.trim()&&u<1){ctx.globalAlpha=u<=0?1:Math.max(0,(1-u)*(.75+.25*hash(k+Math.floor(sec*20))));T.line(ctx,c,cxL,rowY,role,fonts,'left',true)}
      // Pixels blown off the letter while it fades.
      if(c.trim()&&u>0)for(let j=0;j<dust;j++){const r1=hash(k*7.3+j),r2=hash(k*3.7+j*1.9),r3=hash(k*5.1+j*2.3),tt=(sec-t0-r3*s0.textFade)*1;if(tt<=0||tt>FLY)continue;live=true;
       const v=speed*(.5+r1)+8,px=cxL+r1*cw+dx*v*tt-dy*Math.sin(tt*9+r2*6)*1.5,py=rowY+r2*ch+dy*v*tt+dx*Math.sin(tt*9+r2*6)*1.5+(s0.wind<5?tt*tt*25:0);
       ctx.globalAlpha=1-tt/FLY;ctx.fillStyle=s.color||'#e4e6e8';ctx.fillRect(Math.round(px),Math.round(py),1,1)}
     });
     if(cx===null&&shown>=index&&i===rows.length-1){cx=rowX+(prefix?T.measure(prefix,role,fonts,true)+s.letterSpacing:0);cy=rowY}
    });
    ctx.globalAlpha=1;
    // A block cursor the size of a letter: solid while typing, blinking once typed, gone when the text leaves.
    if(cx!==null&&sec>=0&&sec<fadeAt&&(sec<typed||Math.floor((sec-typed)*2.5)%2===0)){ctx.fillStyle=s.color||'#e4e6e8';ctx.fillRect(Math.round(cx),Math.round(cy),cw,ch)}
    ctx.restore();
    textMoving=sec<0||sec<fadeAt||live;
   },
   // The portrait: a frame (1px border, dark ground) with the pixels inside. It flickers in over `appear` seconds;
   // from (typed + offset) it leaves: flickering out over `flickerOut` seconds, its pixels blown away with the wind
   // over `vanish` seconds (a flying pixel gets a one-pixel shadow so it reads on the picture), or both.
   portrait(){
    const s=settings();if(!sprite||mode!==s.pixels){sprite=pixels(s.pixels);mode=s.pixels}
    const sec=(performance.now()-start)/1000;let moving=sec<typed+1||textMoving;
    if(sprite&&text&&sec>=0){
     const {list,w:pw,h:ph}=sprite,a=s.angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),begin=Math.max(0,typed+s.offset),speed=s.wind*1.4;
     const sand=s.leave!=='flicker',flick=s.leave!=='sand',proj=p=>((p.x/pw-.5)*dx+(p.y/ph-.5)*dy)/1.42+.5;
     // Visibility of the frame and the pixels still in it: flicker in, steady, flicker out (or fade after the sand).
     let show=1,shift=0;
     if(sec<s.appear){const f=flicker(sec,.2+.8*sec/Math.max(.01,s.appear));show=f.on?1:0;shift=f.shift}
     else if(flick&&sec>=begin){const k=(sec-begin)/Math.max(.01,s.flickerOut);if(k>=1)show=0;else{const f=flicker(sec,1-k*.95);show=f.on?1:0;shift=f.shift}}
     const end=flick?begin+s.flickerOut:begin+s.vanish+FLY*.6,frameAlpha=flick?show:show*Math.max(0,Math.min(1,1-(sec-end)/.35));
     const dark=s.pixels==='dark',ink=dark?'#14170f':'#e9eee0',shade=dark?'rgba(233,238,240,.45)':'rgba(5,7,8,.6)',fx0=portrait.x+shift,ox=fx0+2,oy=portrait.y+2;
     ctx.save();ctx.beginPath();ctx.rect(...clip);ctx.clip();
     if(frameAlpha>0){ctx.globalAlpha=frameAlpha;ctx.fillStyle='#d8dccf';ctx.fillRect(fx0,portrait.y,pw+4,ph+4);ctx.fillStyle=dark?'#c9cdbf':'#1d2119';ctx.fillRect(fx0+1,portrait.y+1,pw+2,ph+2)}
     for(const pass of [0,1])for(const p of list){
      const release=sand?begin+(1-(.75*proj(p)+.25*p.r))*s.vanish:Infinity,t=sec-release;let px=ox+p.x,py=oy+p.y,alpha=show;
      if(t>0){if(t>FLY)continue;const v=speed*(.55+p.j*.9),swirl=s.wind>0?Math.sin(t*9+p.k*6)*2.2:0;px=portrait.x+2+p.x+dx*v*t-dy*swirl;py+=dy*v*t+dx*swirl+(s.wind<5?t*t*20:0);alpha=1-t/FLY}
      else if(!pass||!alpha)continue;
      ctx.globalAlpha=alpha;ctx.fillStyle=pass?ink:shade;ctx.fillRect(Math.round(px)+(pass?0:1),Math.round(py)+(pass?0:1),1,1);
     }
     ctx.restore();moving=moving||sec<Math.max(end,sand?begin+s.vanish+FLY:0)+.4;
    }
    // While anything still moves and the level itself is not redrawing every frame, ask for the next frame.
    alive=moving;if(moving&&!raf)raf=requestAnimationFrame(tick);
   }
  };
  instances.add(fx);return fx;
 }
 const api={create,defaults,settings,sound};
 return api;
})();
