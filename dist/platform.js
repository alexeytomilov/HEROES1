// Game 5: four fixed screens through the Khibiny, with a final overlook.
window.createKhibinyPlatform=function({canvas,inputSurface,images,drawPanel,drawText,announce,onExit,onComplete=null}){
 const ctx=canvas.getContext('2d'),keys=new Set(),W=304,H=136;
 const rooms=[
  {name:LT('platform5.room1'),start:{x:36,y:116},exitY:190,ledges:[{x:0,y:116,w:104},{x:0,y:190,w:158},{x:196,y:190,w:124}]},
  {name:LT('platform5.room2'),start:{x:18,y:190},exitY:134,ledges:[{x:0,y:190,w:110},{x:140,y:164,w:72},{x:244,y:134,w:76}]},
  {name:LT('platform5.room3'),start:{x:18,y:134},exitY:132,ledges:[{x:0,y:134,w:82},{x:110,y:152,w:78},{x:220,y:132,w:100}]},
  {name:LT('platform5.room4'),start:{x:18,y:132},exitY:132,ledges:[{x:0,y:132,w:148}]}
 ];
 let active=false,room=0,p={x:36,y:116,vx:0,vy:0,face:1,ground:true,hang:null},state='play',last=0,acc=0,frame=0,time=0,jumpBuffer=0,coyote=0,grabCooldown=0,choice=0,hits=[],finalAsked=false;
 for(const r of rooms){r.start.x=Math.round(r.start.x*.95);r.start.y=Math.round((r.start.y-23)*.65);r.exitY=Math.round((r.exitY-23)*.65);for(const l of r.ledges){l.x=Math.round(l.x*.95);l.w=Math.round(l.w*.95);l.y=Math.round((l.y-23)*.65)}}
 const speed=82,gravity=450,jumpSpeed=210,radius=5,height=24;
 function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
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
  time+=dt;if(state!=='play')return;grabCooldown=Math.max(0,grabCooldown-dt);
  jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=p.ground?.1:Math.max(0,coyote-dt);
  const direction=(keys.has('right')?1:0)-(keys.has('left')?1:0);
  if(p.hang){if(keys.has('down')){p.hang=null;p.vy=30;grabCooldown=.4;}else if(keys.has('up')||jumpBuffer>0){const ledge=p.hang;p.x=ledge.side>0?ledge.x+radius+1:ledge.x+ledge.w-radius-1;p.y=ledge.y;p.vy=0;p.ground=true;p.hang=null;jumpBuffer=0;}return;}
  p.vx=direction*(keys.has('shift')?38:speed);if(direction)p.face=direction;
  if(jumpBuffer>0&&coyote>0){p.vy=-jumpSpeed;p.ground=false;coyote=0;jumpBuffer=0;}
  const oldX=p.x,oldY=p.y;let nx=p.x+p.vx*dt;p.vy+=gravity*dt;let ny=p.y+p.vy*dt;p.ground=false;
  const ledges=rooms[room].ledges;
  // Each natural rock ledge is solid below its top surface.
  for(const l of ledges){if(oldY>l.y+1&&oldY-height<H&&nx+radius>l.x&&nx-radius<l.x+l.w){if(oldX+radius<=l.x){nx=l.x-radius;p.vx=0}else if(oldX-radius>=l.x+l.w){nx=l.x+l.w+radius;p.vx=0}}}
  if(p.vy>=0){let floor=999;for(const l of ledges)if(nx+radius>l.x+1&&nx-radius<l.x+l.w-1&&oldY<=l.y+1&&ny>=l.y)floor=Math.min(floor,l.y);if(floor<999){ny=floor;p.vy=0;p.ground=true;}}
  // A forgiving automatic catch makes short jumps over rivers manageable.
  if(!p.ground&&p.vy>=0&&direction&&grabCooldown===0){for(const l of ledges){const edge=direction>0?l.x:l.x+l.w,head=ny-height;if(Math.abs(nx-edge)<10&&head<l.y+8&&head>l.y-13&&oldY>l.y+3){p.hang={...l,side:direction};nx=edge-direction*(radius+1);ny=l.y+height-3;p.vy=0;announce(LT('platform5.sayHang'));break}}}
  p.x=nx;p.y=ny;
  if(room===0&&p.x<radius)p.x=radius;
  if(room===3){p.x=Math.max(radius,Math.min(134,p.x));if(p.ground&&p.x>=106&&!finalAsked)ask();}
  else if(p.x>W+radius){spawn(room+1);return;}
  if(p.x<-radius&&room>0){const previous=room-1;spawn(previous);p.x=291;p.y=rooms[previous].exitY;p.face=-1;}
  if(p.y>148){state='fallen';clearInput();announce(LT('platform5.sayFall'));}
 }
 const spriteBounds={};for(let i=0;i<8;i++){const im=images['platform_hero'+i],c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const data=g.getImageData(0,0,im.width,im.height).data;let left=im.width,top=im.height,right=0,bottom=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(data[(y*im.width+x)*4+3]>128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}spriteBounds[i]=[left,top,right-left+1,bottom-top+1];}
 function drawHero(){let index=0;if(p.hang)index=6;else if(!p.ground)index=5;else if(Math.abs(p.vx)>1)index=1+Math.floor(time*9)%4;const im=images['platform_hero'+index];ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face,1);const bounds=spriteBounds[index],width=Math.round(height*bounds[2]/bounds[3]);ctx.drawImage(im,...bounds,-Math.round(width/2),-height,width,height);ctx.restore();}
 function render(){PeninsulaPopup.visible=false;
  if(!active)return;hits=[];ctx.imageSmoothingEnabled=false;currentUI.base(ctx,'platform5');currentUI.header(ctx,LT('platform5.heading'));
  currentUI.clip(ctx,8,23,304,136,()=>{ctx.save();ctx.translate(8,23);
   const im=images['platform_bg'+(room+1)],scale=Math.max(304/im.width,136/im.height),iw=Math.round(im.width*scale),ih=Math.round(im.height*scale);
   ctx.drawImage(im,Math.round((304-iw)/2),Math.round((136-ih)/2),iw,ih);
   for(const l of rooms[room].ledges){currentUI.clip(ctx,l.x,l.y,l.w,136-l.y,()=>{for(let sy=l.y+6;sy<136;sy+=64)for(let sx=l.x;sx<l.x+l.w;sx+=64)ctx.drawImage(images.walk_cliff,sx,sy,64,64);for(let sx=l.x;sx<l.x+l.w;sx+=64)ctx.drawImage(images.platform_ledge,sx,l.y,64,32)});}drawHero();ctx.restore();
  });
  currentUI.box(ctx,7,161,190,72,'#11171c','dialogue');currentUI.roleBlock(ctx,p.hang?LT('platform5.hang'):LT('platform5.walkHelp',{room:rooms[room].name}),8,166,188,66,'dialogue');currentUI.resource(ctx,LT('platform5.power'),'80%');currentUI.slots(ctx);
  if(state==='question'){
   PeninsulaPopup.draw(ctx,{body:LT('platform5.askHome'),labels:[LT('platform5.yes'),LT('platform5.no')],choice}).forEach((b,i)=>hits.push({...b,fn:i?keepWalking:home}));
  }else if(state!=='play'){const b=currentUI.modal(ctx,state==='fallen'?LT('platform5.fallTitle'):LT('platform5.homeTitle'),state==='fallen'?LT('platform5.fallBody'):LT('platform5.homeBody'));hits.push({...b,fn:()=>press('enter')})}drawGameBorder(ctx);
 }
 function tick(now){if(!active)return;const dt=last?Math.min(.1,(now-last)/1000):0;last=now;acc+=dt;while(acc>=1/60&&active){update(1/60);acc-=1/60;}render();if(active)frame=requestAnimationFrame(tick);}
 function press(k){if(state==='question'){if(k==='left'||k==='right'){choice=1-choice;render()}if(k==='jump'||k==='enter'){choice===0?home():keepWalking()}return;}if(state==='fallen'){if(k==='jump'||k==='enter')retry();return;}if(state==='home'){if(k==='enter'||k==='jump')onExit();return;}if(k==='enter'&&room===3&&p.ground)ask();else if(k==='jump')jump();}
 const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',Shift:'shift',' ':'jump',Enter:'enter'};
 window.addEventListener('keydown',e=>{if(!active)return;if(e.key==='r'||e.key==='R'){e.preventDefault();retry();return;}const k=keyMap[e.key];if(!k)return;e.preventDefault();if(!e.repeat)press(k);keys.add(k);});
 window.addEventListener('keyup',e=>{if(active)keys.delete(keyMap[e.key]);});window.addEventListener('blur',()=>{if(active)clearInput()});
 inputSurface.addEventListener('pointerdown',e=>{if(!active||e.button!==0)return;const b=inputSurface.getBoundingClientRect(),x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*240/b.height,h=hits.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);if(h){e.preventDefault();h.fn();}});
 return{snapshot:()=>({room,state,player:{...p},rooms}),update,press,start(){active=true;spawn(0);last=0;acc=0;render();frame=requestAnimationFrame(tick)},stop(){active=false;clearInput();cancelAnimationFrame(frame);inputSurface.style.cursor='default'},render,setControl(k,down){if(!active)return;if(down){press(k);keys.add(k)}else keys.delete(k)}};
};
