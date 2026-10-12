// The first coastal drive uses the existing driving simulation and the current UI.
let raceEngine=null,raceScene=null,raceData=null,raceFinished=false,racePaused=false;
let draggedItem=null;
function raceDialog(d){
 if(raceFinished||d.state==='clear'){const next=params.get('embed')==='1'?LT('race.next'):'';return (params.get('mode')==='home'?LT('race.arrivedHome'):params.get('mode')==='fog'?LT('race.arrivedFog'):LT('race.arrivedSredny'))+next;}
 if(d.state==='title')return params.get('mode')==='fog'?LT('race.startFog'):params.get('mode')==='home'?LT('race.startHome'):LT('race.followMe');
 if(d.state==='repair'||d.state==='over')return (d.msg?.t1||LT('race.stopped'))+'\n'+(d.msg?.t2||'');
 if(racePaused)return LT('race.paused');
 if(params.get('mode')==='fog'&&d.state==='drive')return d.warning?LT('race.cliffEdge'):LT('race.fogDrive');
 if(d.msg&&!d.msg.dim&&!d.msg.start)return d.msg.t1+'\n'+(d.msg.t2||'');
 if(d.detour)return d.detour.type==='hole'?LT('race.holeAhead'):LT('race.rocksAhead');
 if(d.warning)return LT('race.roadEdge');
 return LT('race.followMe');
}
function inventoryIcon(index,x,y){
 const r=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+a,y+b,w,h)};
 if(index===0){r(5,7,17,17,'#b48c47');r(7,3,9,4,'#c4a065');r(9,4,5,2,'#18242b');r(19,5,4,4,'#777b71');r(8,10,11,1,'#d1b078');r(10,12,1,9,'#795e36');r(7,17,13,1,'#795e36');r(18,12,1,9,'#795e36');}
 else if(index===3){for(let row=0;row<3;row++)for(let col=0;col<3;col++){r(4+col*7,5+row*6,6,1,'#a0aaa9');r(4+col*7,9+row*6,6,1,'#a0aaa9');r(4+col*7,6+row*6,1,3,'#697a80');r(9+col*7,6+row*6,1,3,'#697a80');}r(6,24,16,1,'#697a80');}
 else{for(let a=-10;a<=10;a++)for(let b=-10;b<=10;b++){const q=a*a+b*b;if(q<=100){ctx.fillStyle=q>64?'#090d10':q>36?'#58616a':q>9?'#a4adae':'#28353b';ctx.fillRect(x+14+a,y+14+b,1,1)}}}
}
function cockpitPanel(d){
 clipped(8,148,188,56,()=>{
  ctx.fillStyle='#454747';ctx.fillRect(8,162,188,48);
  ctx.fillStyle='#6a6c69';ctx.fillRect(8,162,188,3);
  ctx.fillStyle='#191b1c';ctx.fillRect(60,167,128,20);
  ctx.fillStyle='#313536';ctx.fillRect(62,169,124,16);
  // Circular dashboard instruments and air vent, drawn with hard pixel edges.
  for(const cx of [81,112,169]){
   for(let y=-9;y<=9;y++)for(let x=-9;x<=9;x++){
    const r=x*x+y*y;ctx.fillStyle=r>64?'#111314':r>49?'#919793':'#222728';if(r<=81)ctx.fillRect(cx+x,177+y,1,1);
   }
  }
  ctx.fillStyle='#b47c63';ctx.fillRect(79,174,2,6);ctx.fillRect(110,171,2,8);
  ctx.fillStyle='#969f98';ctx.fillRect(164,175,10,2);ctx.fillRect(168,172,2,10);
  ctx.fillStyle='#282a2a';ctx.fillRect(8,190,188,20);ctx.fillStyle='#141617';ctx.fillRect(8,189,188,2);
  // Wheel rotation follows steering; every sample is one source pixel.
  const angle=(d.steer||0)*.55,co=Math.cos(angle),si=Math.sin(angle),cx=111,cy=198;
  for(let y=-49;y<=16;y++)for(let x=-49;x<=49;x++){
   const radius=Math.sqrt(x*x+y*y),rx=x*co+y*si,ry=-x*si+y*co;let color=null;
   if(radius>=39&&radius<=48)color=radius>46?'#111314':radius>44&&y<0?'#a1a39d':radius>41?'#636764':'#242828';
   if(radius<40&&radius>10&&(Math.abs(ry)<4||ry>0&&Math.abs(rx)<4))color=Math.abs(ry)<2?'#737873':'#303535';
   if(radius<=14)color=radius>12?'#141718':radius>9?'#a1a69f':'#474e4c';
   if(color){ctx.fillStyle=color;ctx.fillRect(cx+x,cy+y,1,1)}
  }
 });
}
function cockpitRadio(d){
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
 // Upright antenna, right-hand keypad and a separate hanging microphone.
 r(268,44,2,64,'#151719');r(267,43,4,2,'#2b3030');r(266,104,6,10,'#171b1c');
 r(262,111,28,41,'#111517');r(264,112,24,38,'#22282a');r(264,110,8,3,'#343c3d');
 r(266,120,18,10,'#79afc7');r(267,121,16,1,'#a6c9d6');
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){r(267+col*5,133+row*5,4,3,'#4b5558');r(267+col*5,133+row*5,4,1,'#788184')}
 r(241,116,16,20,'#161a1c');r(243,114,12,2,'#1c2224');
 for(let y=118;y<132;y+=2)r(243,y,12,1,'#354043');
 for(let y=137;y<160;y++){const x=247+Math.round(Math.sin((y-137)*.12)*2);r(x,y,2,1,'#111719')}
 for(let x=249;x<274;x++){const y=161+Math.round(Math.sin((x-249)/25*Math.PI)*5);r(x,y,1,2,'#111719')}
 for(let y=146;y<162;y+=3){r(290,y,7,1,'#13191a');r(291,y+1,5,1,'#303a3b')}
 clipped(266,119,19,11,()=>PeninsulaText.line(ctx,'145',275.5,118,'data',fonts,'center'));
}
function drawRace(){
 const d=raceData;ctx.imageSmoothingEnabled=false;
 // Keep the shared six-pixel gutters inside the one-pixel outer frame.
 PeninsulaColors.fill(ctx,7,22,306,212);
 clipped(8,23,304,136,()=>ctx.drawImage(raceScene,8,23));border(7,22,306,138);
 cockpitPanel(d);
 // The phone is drawn at its native 54×104 pixels so the altitude text stays sharp.
 if(raceEngine)ctx.drawImage(raceEngine.phoneImage(),12,64);
 PeninsulaColors.box(ctx,198,161,115,14,'power');
 resourceText({text:LT('race.power'),align:'LEFT'});resourceText({text:(d.fuel??80)+'%',align:'RIGHT'});
 // One row of supplies; the radio messages run along the bottom to the frame edge.
 for(let row=0;row<1;row++)for(let col=0;col<4;col++){const i=row*4+col,x=198+col*29,y=176+row*29;PeninsulaColors.box(ctx,x,y,28,28,'inventory');if(d.inventory?.[i]&&draggedItem?.index!==i)inventoryIcon(i,x,y)}
 PeninsulaColors.box(ctx,7,205,306,28,'dialogue');
 block(raceDialog(d),8,206,304,26,{role:'dialogue'});
 cockpitRadio(d);
 if(draggedItem)inventoryIcon(draggedItem.index,draggedItem.x-14,draggedItem.y-14);
 heading(params.get('mode')==='fog'?LT('race.headingFog'):params.get('mode')==='home'?LT('race.headingHome'):LT('race.headingSredny'));
}
function startRace(){
 canvas.style.touchAction='none';
 // Snapshot the current device's selected appearance rather than resetting it.
 try{localStorage.setItem('peninsula-race-settings',JSON.stringify(settings))}catch{}
 $('#race-tools').hidden=false;$('#fog-pad').hidden=false;$('#race-help').hidden=false;$('#status').hidden=false;
 raceScene=document.createElement('canvas');raceScene.width=320;raceScene.height=240;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*240/r.height}};
 canvas.addEventListener('pointerdown',e=>{const p=point(e),i=Math.floor((p.x-198)/29);if(raceData?.state==='repair'&&p.y>=176&&p.y<204&&i>=0&&i<4&&p.x<198+i*29+28&&raceData.inventory[i]){draggedItem={index:i,...p};canvas.setPointerCapture(e.pointerId);render()}});
 canvas.addEventListener('pointermove',e=>{if(draggedItem){Object.assign(draggedItem,point(e));render()}});
 const drop=(e,cancel=false)=>{if(!draggedItem)return;const p=point(e),i=draggedItem.index;draggedItem=null;if(!cancel&&p.x>=8&&p.x<312&&p.y>=23&&p.y<159)raceEngine.useItem(i);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);render()};
 canvas.addEventListener('pointerup',e=>drop(e));canvas.addEventListener('pointercancel',e=>drop(e,true));
 const bg=new Image(),near=new Image();let pending=2;const loaded=()=>{if(--pending)return;
  raceEngine=window.createFogRace({canvas:raceScene,inputSurface:canvas,drawPanel:()=>{},mode:['fog','home'].includes(params.get('mode'))?params.get('mode'):'sredny',background:bg,nearBackground:near,compactUI:true,viewportWidth:304,viewportHeight:136,demoFinish:true,
   onRender:d=>{raceData=d;if(params.get('embed')==='1'&&d.state==='clear'){raceFinished=true;raceEngine?.stop()}render();$('#race-start').textContent=d.state==='title'?LT('race.btnStart'):d.state==='over'?LT('race.btnRetry'):LT('race.btnOnWay');$('#race-start').disabled=d.state==='drive'||raceFinished;},
   onComplete:()=>{if(raceFinished)return;raceFinished=true;raceEngine.stop();render();$('#status').textContent=LT('race.statusArrived');$('#race-start').disabled=true;}
  });raceEngine.start();window.trip=raceEngine;
 };bg.onload=loaded;near.onload=loaded;bg.onerror=near.onerror=()=>{$('#status').textContent=LT('race.loadError')};bg.src='assets/mountains-far.png';near.src='assets/mountains-near-loop.png';
 $('#race-start').addEventListener('click',()=>raceEngine?.press());
 $('#race-restart').addEventListener('click',()=>{if(!raceEngine)return;raceFinished=false;draggedItem=null;const resume=racePaused||raceData.state==='clear';racePaused=false;$('#race-pause').textContent=LT('race.btnPause');raceEngine.restart();if(resume)raceEngine.start();});
 const pause=()=>{if(!raceEngine||raceFinished)return;racePaused=!racePaused;if(racePaused)raceEngine.stop();else raceEngine.start();$('#race-pause').textContent=racePaused?LT('race.btnResume'):LT('race.btnPause');render()};
 $('#race-pause').addEventListener('click',pause);
 window.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat&&!e.target.matches('input,select,textarea')){e.preventDefault();pause()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!racePaused&&!raceFinished)pause()});
 // Click the radio itself to sound the horn; keep the scene's start/retry gesture.
 canvas.addEventListener('pointerdown',e=>{if(!raceEngine)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*320/r.width,y=(e.clientY-r.top)*240/r.height;if(x>=238&&y>=43&&y<=168)raceEngine.horn()});
}
