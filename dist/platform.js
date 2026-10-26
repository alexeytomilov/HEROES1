// Game 5: four rooms through the Khibiny, each twice as wide as the view and scrolling with the hero, with a final overlook.
// level 'waterfall' (game 0.1, at the start of the journey): two rooms by the rapids on Sredny, stone blocks that give
// finds and points like in Mario, a score line over the picture and a plain one-line panel below.
window.createKhibinyPlatform=function({canvas,inputSurface,images,drawPanel,drawText,announce,onExit,onComplete=null,level='khibiny'}){
 const WF=level==='waterfall',TX=WF?'waterfall':'platform5';
 const ctx=canvas.getContext('2d'),keys=new Set(),W=304,H=136;
 const rooms=WF?[
  {name:LT('waterfall.room1'),start:{x:36,y:190},exitY:190,ledges:[{x:0,y:190,w:150},{x:178,y:190,w:142}]},
  {name:LT('waterfall.room2'),start:{x:18,y:190},exitY:164,ledges:[{x:0,y:190,w:112},{x:140,y:164,w:84},{x:252,y:190,w:68}]}
 ]:[
  {name:LT('platform5.room1'),start:{x:36,y:116},exitY:190,ledges:[{x:0,y:116,w:104},{x:0,y:190,w:158},{x:196,y:190,w:124}]},
  {name:LT('platform5.room2'),start:{x:18,y:190},exitY:134,ledges:[{x:0,y:190,w:110},{x:140,y:164,w:72},{x:244,y:134,w:76}]},
  {name:LT('platform5.room3'),start:{x:18,y:134},exitY:132,ledges:[{x:0,y:134,w:82},{x:110,y:152,w:78},{x:220,y:132,w:100}]},
  {name:LT('platform5.room4'),start:{x:18,y:132},exitY:132,ledges:[{x:0,y:132,w:148}]}
 ];
 let active=false,room=0,p={x:36,y:116,vx:0,vy:0,face:1,ground:true,hang:null},state='play',last=0,acc=0,frame=0,time=0,jumpBuffer=0,coyote=0,grabCooldown=0,choice=0,hits=[],finalAsked=false;
 for(const r of rooms){r.start.x=Math.round(r.start.x*.95);r.start.y=Math.round((r.start.y-23)*.65);r.exitY=Math.round((r.exitY-23)*.65);for(const l of r.ledges){l.x=Math.round(l.x*.95);l.w=Math.round(l.w*.95);l.y=Math.round((l.y-23)*.65)}}
 // Rooms are twice as wide as the view: stretches with ledges get longer, the gaps between ledges keep their size.
 const ROOM_W=W*2;
 for(const r of rooms){
  const orig=r.ledges.map(l=>({...l}));
  const edges=[...new Set([0,W,...orig.flatMap(l=>[l.x,Math.min(W,l.x+l.w)])])].filter(x=>x<=W).sort((a,b)=>a-b);
  const covered=(a,b)=>orig.some(l=>l.x<b&&l.x+l.w>a);
  let cov=0,gap=0;for(let i=0;i<edges.length-1;i++){const d=edges[i+1]-edges[i];if(covered(edges[i],edges[i+1]))cov+=d;else gap+=d}
  const k=(ROOM_W-gap)/cov;
  r.map=x=>{let out=0;for(let i=0;i<edges.length-1;i++){const a=edges[i],b=edges[i+1];if(x<=a)break;const d=Math.min(x,b)-a;out+=covered(a,b)?d*k:d}return Math.round(out+Math.max(0,x-W))};
  for(const l of r.ledges){const e=r.map(l.x+l.w);l.x=r.map(l.x);l.w=e-l.x}
  r.start.x=r.map(r.start.x);r.width=ROOM_W;
 }
 const LAST=rooms.length-1,finalAsk=WF?0:rooms[3].map(106),finalStop=WF?0:rooms[3].map(134);
 // Mario-style props: stone bridges hang above the ground, lens blocks are hit with the head to take a photo.
 // Every lens hangs within a jump of the ground or of a bridge below it; bridges are 36 px above the ground.
 // Under each bridge the ground opens into a chasm wider than a jump, with a waterfall: the bridge is the only way over.
 const BRIDGE_H=12,LENS=14;
 // Waterfall blocks hang within a jump from the ground (the ground is at y 108 there).
 const props=WF?[
  {bridges:[],lenses:[{x:120,y:66},{x:262,y:66},{x:276,y:66},{x:470,y:66}]},
  {bridges:[{x:330,y:73,w:128}],lenses:[{x:150,y:66},{x:386,y:29},{x:540,y:66}]}
 ]:[
  {bridges:[{x:400,y:73,w:128}],lenses:[{x:262,y:61},{x:457,y:25}]},
  {bridges:[{x:80,y:73,w:128}],lenses:[{x:333,y:44},{x:137,y:25}]},
  {bridges:[{x:230,y:48,w:128}],lenses:[{x:90,y:24},{x:500,y:23}]},
  {bridges:[],lenses:[{x:200,y:23}]}
 ];
 rooms.forEach((r,i)=>{r.bridges=props[i].bridges;r.lenses=props[i].lenses.map(l=>({...l,used:false,bump:0}));
  for(const b of r.bridges){const a=b.x+12,z=b.x+b.w-12;r.ledges=r.ledges.flatMap(l=>l.y<=b.y||l.x>=z||l.x+l.w<=a?[l]:[...(l.x<a?[{...l,w:a-l.x}]:[]),...(l.x+l.w>z?[{...l,x:z,w:l.x+l.w-z}]:[])])}
  // gaps between two pieces of ground, each a dark chasm with a waterfall starting at the higher edge;
  // the open end of the last room is just the view, not a gap
  const cover=[...r.ledges].sort((a,b)=>a.x-b.x);r.falls=[];let x=0,lastY=cover[0].y;
  for(const l of cover){if(l.x>x+1)r.falls.push({x,w:l.x-x,y:Math.min(lastY,l.y)-2});if(l.x+l.w>x){x=l.x+l.w;lastY=l.y}}
 });
 // A seamless 32x64 tile of falling water, scrolled downwards every frame.
 const fallTile=(()=>{const c=document.createElement('canvas');c.width=32;c.height=64;const g=c.getContext('2d');const cols=['#335577','#4f7c9e','#7fa9c4','#b6d3e0','#e4f0f4'];
  for(let x=0;x<32;x++){const phase=(x*37)%64,len=10+(x*13)%14,edge=x%8===0;for(let y=0;y<64;y++){const v=(y+phase)%64;let k=v<len?(v<3?4:3):v<len+8?2:1;if(edge)k=Math.max(0,k-2);g.fillStyle=cols[k];g.fillRect(x,y,1,1)}}return c})();
 const solids=()=>[...rooms[room].bridges.map(b=>({...b,h:BRIDGE_H})),...rooms[room].lenses.map(l=>({x:l.x,y:l.y,w:LENS,h:LENS,lens:l}))];
 let photos=[],photoPending=false,flash=0;
 function snap(lens){lens.used=true;lens.bump=.15;if(WF){find(lens);return}flash=.18;photoPending=true;announce(LT('platform5.photo'))}
 // Waterfall: each block gives the next find of the list; it hops out, its points float up, the find goes into a slot.
 const FINDS=['rusks','thermos','compass','map','flask','rope','pot'];let finds=[],pops=[],score=0,clock=400;
 function find(lens){const name=FINDS[(score/100)%FINDS.length];score+=100;pops.push({x:lens.x+LENS/2,y:lens.y,name,t:0});if(finds.length<4)finds.push(name);announce('+100')}
 const speed=82,walkSpeed=38,gravity=450,jumpSpeed=210,radius=5,height=24;
 // Legs change frame every STRIDE pixels walked, so holding Shift slows the steps as well as the hero.
 const STRIDE=5;let stride=0;
 // The camera keeps the hero near the middle; the far background scrolls at PARALLAX of the ground's speed.
 const PARALLAX=.35;let camX=0;
 function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
 // waterfall block: a warm stone block with a carved question mark, flat and grey once hit
 function drawBlock(x,y,used){rect(x,y,LENS,LENS,'#1b1e23');rect(x+1,y+1,LENS-2,LENS-2,used?'#4a4640':'#a0703a');if(used)return;rect(x+1,y+1,LENS-2,1,'#d8a45a');rect(x+1,y+1,1,LENS-2,'#d8a45a');rect(x+2,y+LENS-2,LENS-3,1,'#6a4520');rect(x+LENS-2,y+2,1,LENS-3,'#6a4520');
  for(const [dx,dy] of [[5,3],[6,3],[7,3],[8,3],[4,4],[9,4],[9,5],[8,6],[7,6],[6,7],[6,8],[6,10]])rect(x+dx,y+dy,1,1,'#fff1c8')}
 function text(s,x,y,c='#dce5ed',align='left'){drawText(s,x,y,8,c,align)}
 function button(label,x,y,w,h,fn,selected=false){drawPanel(x,y,w,h,'ui_button');currentUI.roleBlock(ctx,label,x,y,w,h,'buttons');hits.push({x,y,w,h,fn});}
 function clearInput(){keys.clear();jumpBuffer=0;}
 function spawn(index=room){room=index;const s=rooms[room].start;p={x:s.x,y:s.y,vx:0,vy:0,face:1,ground:true,hang:null};state='play';finalAsked=false;choice=0;grabCooldown=0;clearInput();announce(rooms[room].name);}
 function retry(){spawn(room);render()}
 function home(){if(onComplete){clearInput();onComplete();return;}state='home';clearInput();announce(LT('platform5.sayHome'));render()}
 function keepWalking(){state='play';finalAsked=true;clearInput();announce(LT('platform5.sayStay'));render()}
 function ask(){p.vx=0;state='question';choice=0;clearInput();announce(LT('platform5.sayAsk'));render()}
 function jump(){jumpBuffer=.14}
 function update(dt){
  time+=dt;if(WF){clock=Math.max(0,clock-dt*2.5);for(const q of pops)q.t+=dt;pops=pops.filter(q=>q.t<1.2)}flash=Math.max(0,flash-dt);for(const l of rooms[room].lenses)l.bump=Math.max(0,l.bump-dt);if(state!=='play')return;grabCooldown=Math.max(0,grabCooldown-dt);
  jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=p.ground?.1:Math.max(0,coyote-dt);
  const direction=(keys.has('right')?1:0)-(keys.has('left')?1:0);
  if(p.hang){if(keys.has('down')){p.hang=null;p.vy=30;grabCooldown=.4;}else if(keys.has('up')||jumpBuffer>0){const ledge=p.hang;p.x=ledge.side>0?ledge.x+radius+1:ledge.x+ledge.w-radius-1;p.y=ledge.y;p.vy=0;p.ground=true;p.hang=null;jumpBuffer=0;}return;}
  p.vx=direction*(keys.has('shift')?walkSpeed:speed);if(direction)p.face=direction;
  if(jumpBuffer>0&&coyote>0){p.vy=-jumpSpeed;p.ground=false;coyote=0;jumpBuffer=0;}
  const oldX=p.x,oldY=p.y;let nx=p.x+p.vx*dt;p.vy+=gravity*dt;let ny=p.y+p.vy*dt;p.ground=false;
  const ledges=rooms[room].ledges;
  // Each natural rock ledge is solid below its top surface.
  for(const l of ledges){if(oldY>l.y+1&&oldY-height<H&&nx+radius>l.x&&nx-radius<l.x+l.w){if(oldX+radius<=l.x){nx=l.x-radius;p.vx=0}else if(oldX-radius>=l.x+l.w){nx=l.x+l.w+radius;p.vx=0}}}
  if(p.vy>=0){let floor=999;for(const l of ledges)if(nx+radius>l.x+1&&nx-radius<l.x+l.w-1&&oldY<=l.y+1&&ny>=l.y)floor=Math.min(floor,l.y);if(floor<999){ny=floor;p.vy=0;p.ground=true;}}
  // Bridges and lens blocks: stand on their tops, stop at their sides, bump the head on their undersides.
  for(const b of solids()){const top=b.y,bottom=b.y+b.h;
   if(ny-height<bottom&&ny>top+1&&!(oldX+radius>b.x&&oldX-radius<b.x+b.w)){if(oldX+radius<=b.x&&nx+radius>b.x){nx=b.x-radius;p.vx=0}else if(oldX-radius>=b.x+b.w&&nx-radius<b.x+b.w){nx=b.x+b.w+radius;p.vx=0}}
   if(nx+radius>b.x&&nx-radius<b.x+b.w){
    if(p.vy>=0&&oldY<=top+1&&ny>=top){ny=top;p.vy=0;p.ground=true}
    else if(p.vy<0&&oldY-height>=bottom-1&&ny-height<bottom){ny=bottom+height;p.vy=0;if(b.lens&&!b.lens.used)snap(b.lens)}
   }
  }
  // A forgiving automatic catch makes short jumps over rivers manageable.
  if(!p.ground&&p.vy>=0&&direction&&grabCooldown===0){for(const l of ledges){const edge=direction>0?l.x:l.x+l.w,head=ny-height;if(Math.abs(nx-edge)<10&&head<l.y+8&&head>l.y-13&&oldY>l.y+3){p.hang={...l,side:direction};nx=edge-direction*(radius+1);ny=l.y+height-3;p.vy=0;announce(LT('platform5.sayHang'));break}}}
  if(p.ground)stride+=Math.abs(nx-p.x);
  p.x=nx;p.y=ny;
  if(room===0&&p.x<radius)p.x=radius;
  if(WF&&room===LAST&&p.x>rooms[room].width-radius-2){p.x=rooms[room].width-radius-2;if(!finalAsked){finalAsked=true;state='done';clearInput();if(onComplete)onComplete();return}}
  else if(!WF&&room===3){p.x=Math.max(radius,Math.min(finalStop,p.x));if(p.ground&&p.x>=finalAsk&&!finalAsked)ask();}
  else if(p.x>rooms[room].width+radius){spawn(room+1);return;}
  if(p.x<-radius&&room>0){const previous=room-1;spawn(previous);p.x=rooms[previous].width-13;p.y=rooms[previous].exitY;p.face=-1;}
  if(p.y>148){state='fallen';clearInput();announce(WF?LT('waterfall.fallTitle'):LT('platform5.sayFall'));}
 }
 const spriteBounds={};for(let i=0;i<8;i++){const im=images['platform_hero'+i],c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const data=g.getImageData(0,0,im.width,im.height).data;let left=im.width,top=im.height,right=0,bottom=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(data[(y*im.width+x)*4+3]>128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}spriteBounds[i]=[left,top,right-left+1,bottom-top+1];}
 function drawHero(){
  // Walking: 8 frames (contact, down, passing, up for each leg), drawn at the idle sprite's scale so the body's bob stays visible.
  if(p.ground&&!p.hang&&Math.abs(p.vx)>1){const im=images['platform_walk'+(Math.floor(stride/STRIDE)%8)],b=spriteBounds[0],s=height/b[3];ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face,1);ctx.drawImage(im,0,0,im.width,im.height,-Math.round((b[0]+b[2]/2)*s),-Math.round((b[1]+b[3])*s),Math.round(im.width*s),Math.round(im.height*s));ctx.restore();return}
  let index=0;if(p.hang)index=6;else if(!p.ground)index=5;const im=images['platform_hero'+index];ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face,1);const bounds=spriteBounds[index],width=Math.round(height*bounds[2]/bounds[3]);ctx.drawImage(im,...bounds,-Math.round(width/2),-height,width,height);ctx.restore();}
 let dialogueFx=null;
 function render(){PeninsulaPopup.visible=false;
  if(!active)return;hits=[];ctx.imageSmoothingEnabled=false;currentUI.base(ctx,'platform5');currentUI.header(ctx,LT(TX+'.heading'));
  currentUI.clip(ctx,8,23,304,136,()=>{ctx.save();ctx.translate(8,23);
   const im=images[(WF?'platform_wf_bg':'platform_bg')+(room+1)],rw=rooms[room].width;camX=Math.max(0,Math.min(rw-W,Math.round(p.x-W/2)));
   const scale=Math.max((W+(rw-W)*PARALLAX)/im.width,136/im.height),iw=Math.round(im.width*scale),ih=Math.round(im.height*scale);
   ctx.drawImage(window.PeninsulaColors?PeninsulaColors.picture(im,(WF?'platform-wf-bg':'platform-bg')+(room+1)):im,-Math.round(camX*PARALLAX),Math.round((136-ih)/2),iw,ih);
   ctx.translate(-camX,0);
   // waterfalls behind the ledges: scrolling water, foam where it pours over, mist at the bottom
   for(const f of rooms[room].falls){if(f.x+f.w<camX||f.x>camX+W)continue;const g=ctx.createLinearGradient(0,f.y,0,136);g.addColorStop(0,'#2a3034');g.addColorStop(1,'#0c1012');ctx.fillStyle=g;ctx.fillRect(f.x,f.y+4,f.w,132-f.y);
    // the water is narrower than the chasm, so the dark rock shows on both sides and it reads as a fall, not a wall
    const wx=f.x+Math.min(8,Math.floor(f.w*.15)),ww=f.w-2*(wx-f.x);currentUI.clip(ctx,wx,f.y,ww,136-f.y,()=>{const off=Math.floor(time*90)%64;for(let ty=f.y-64+off;ty<136;ty+=64)for(let tx=wx;tx<wx+ww;tx+=32)ctx.drawImage(fallTile,tx,ty);
    ctx.fillStyle='rgba(12,16,18,.35)';ctx.fillRect(wx,f.y,2,136-f.y);ctx.fillRect(wx+ww-2,f.y,2,136-f.y);
    ctx.fillStyle='#e4f0f4';for(let x=wx;x<wx+ww;x++){const h=1+((x*7+Math.floor(time*12))%3);ctx.fillRect(x,f.y,1,h)}});
    currentUI.clip(ctx,f.x,f.y,f.w,136-f.y,()=>{for(let i=0;i<4;i++){ctx.fillStyle='rgba(220,236,242,'+(.10+i*.07)+')';ctx.fillRect(f.x,136-20+i*5,f.w,5)}})}
   // The ledge picture's walkable grass starts 5 px below its top edge, so it is drawn 5 px higher.
   for(const l of rooms[room].ledges){if(l.x+l.w<camX||l.x>camX+W)continue;currentUI.clip(ctx,l.x,l.y-5,l.w,141-l.y,()=>{for(let sy=l.y+1;sy<136;sy+=64)for(let sx=l.x;sx<l.x+l.w;sx+=64)ctx.drawImage(images.walk_cliff,sx,sy,64,64);for(let sx=l.x;sx<l.x+l.w;sx+=64)ctx.drawImage(images.platform_ledge,sx,l.y-5,64,32)});}for(const b of rooms[room].bridges)currentUI.clip(ctx,b.x,b.y-3,b.w,BRIDGE_H+3,()=>{for(let sx=b.x;sx<b.x+b.w;sx+=48)ctx.drawImage(images.platform_bridge,sx,b.y-3)});
   for(const l of rooms[room].lenses){const dy=-Math.round(Math.sin(l.bump/.15*Math.PI)*3);if(WF)drawBlock(l.x,l.y+dy,l.used);else ctx.drawImage(images[l.used?'platform_lens_used':'platform_lens'],l.x,l.y+dy)}
   // a find hops out of its block, its points float higher
   for(const q of pops){const im=currentUI.heroItemImages[q.name],u=Math.min(1,q.t/.5),hop=Math.round(Math.sin(u*Math.PI)*18+u*4);if(im&&q.t<.6)ctx.drawImage(im,Math.round(q.x-8),Math.round(q.y-14-hop),16,16);drawText('100',Math.round(q.x),Math.round(q.y-26-q.t*22),8,'#fff4c2','center')}
   drawHero();ctx.restore();
   // A photo is the view at the moment of the hit, before the flash, on a small white print.
   if(photoPending){photoPending=false;const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.fillStyle='#e8e4d8';g.fillRect(0,0,24,24);g.imageSmoothingEnabled=true;g.drawImage(canvas,8,23,304,136,2,2,20,15);photos.push(c)}
   if(WF){// the score line over the picture, like the top line of a console platformer
    // labels in the game's font, digits twice as large; a dark copy one pixel lower keeps them readable on water
    const big=(t,x,y,a)=>{pixelText(ctx,t,x+1,y+1,8,'#11171c',a,2);pixelText(ctx,t,x,y,8,'#f4f1e6',a,2)};
    currentUI.text(ctx,LT('waterfall.score'),14,26,'left');big(String(score).padStart(6,'0'),14,38,'left');
    currentUI.text(ctx,LT('waterfall.time'),306,26,'right');big(String(Math.ceil(clock)),306,38,'right')}
   if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash/.18*.8).toFixed(2)+')';ctx.fillRect(8,23,304,136)}
  });
  if(WF){// one line on the left and one row of four slots; the lower strip stays plain
   PeninsulaColors.fill(ctx,7,161,306,73);currentUI.box(ctx,7,161,190,30,'#11171c','dialogue');currentUI.roleBlock(ctx,LT('waterfall.line'),9,163,186,26,'dialogue');
   for(let i=0;i<4;i++)currentUI.box(ctx,198+i*29,161,28,28,'#18242b','inventory');finds.forEach((n,i)=>{const im=currentUI.heroItemImages[n];if(im)ctx.drawImage(im,198+i*29+2,163)});
  }else{
  currentUI.box(ctx,7,161,190,72,'#11171c','dialogue');
  // The line types out and the mage's portrait shows in the corner of the picture (dialogue-fx.js).
  dialogueFx=dialogueFx||PeninsulaDialogueFX.create({ctx,fonts:currentUI.fonts,portrait:{x:271,y:110},clip:[8,23,304,136],render:()=>render()});
  dialogueFx.line(p.hang?LT('platform5.hang'):LT('platform5.walkHelp',{room:rooms[room].name}),8,166,188,66);dialogueFx.portrait();currentUI.resource(ctx,LT('platform5.power'),'80%');currentUI.slots(ctx);photos.slice(0,8).forEach((ph,i)=>ctx.drawImage(ph,200+i%4*29,178+Math.floor(i/4)*29));}
  if(state==='question'){
   PeninsulaPopup.draw(ctx,{body:LT('platform5.askHome'),labels:[LT('platform5.yes'),LT('platform5.no')],choice}).forEach((b,i)=>hits.push({...b,fn:i?keepWalking:home}));
  }else if(state!=='play'&&state!=='done'){const b=currentUI.modal(ctx,state==='fallen'?LT(TX+'.fallTitle'):LT('platform5.homeTitle'),state==='fallen'?LT(TX+'.fallBody'):LT('platform5.homeBody'));hits.push({...b,fn:()=>press('enter')})}drawGameBorder(ctx);
 }
 function tick(now){if(!active)return;const dt=last?Math.min(.1,(now-last)/1000):0;last=now;acc+=dt;while(acc>=1/60&&active){update(1/60);acc-=1/60;}render();if(active)frame=requestAnimationFrame(tick);}
 function press(k){if(state==='question'){if(k==='left'||k==='right'){choice=1-choice;render()}if(k==='jump'||k==='enter'){choice===0?home():keepWalking()}return;}if(state==='fallen'){if(k==='jump'||k==='enter')retry();return;}if(state==='home'){if(k==='enter'||k==='jump')onExit();return;}if(!WF&&k==='enter'&&room===3&&p.ground)ask();else if(k==='jump')jump();}
 const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',Shift:'shift',' ':'jump',Enter:'enter'};
 window.addEventListener('keydown',e=>{if(!active)return;if(e.key==='r'||e.key==='R'){e.preventDefault();retry();return;}const k=keyMap[e.key];if(!k)return;e.preventDefault();if(!e.repeat)press(k);keys.add(k);});
 window.addEventListener('keyup',e=>{if(active)keys.delete(keyMap[e.key]);});window.addEventListener('blur',()=>{if(active)clearInput()});
 inputSurface.addEventListener('pointerdown',e=>{if(!active||e.button!==0)return;const b=inputSurface.getBoundingClientRect(),x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*240/b.height,h=hits.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);if(h){e.preventDefault();h.fn();}});
 return{snapshot:()=>({room,state,player:{...p},rooms,photos:photos.length,score,finds:finds.length}),update,press,start(){active=true;dialogueFx?.levelStart();photos=[];finds=[];pops=[];score=0;clock=400;for(const r of rooms)for(const l of r.lenses){l.used=false;l.bump=0}spawn(0);last=0;acc=0;render();frame=requestAnimationFrame(tick)},stop(){active=false;clearInput();cancelAnimationFrame(frame);inputSurface.style.cursor=''},render,setControl(k,down){if(!active)return;if(down){press(k);keys.add(k)}else keys.delete(k)}};
};
