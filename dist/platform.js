// Game 5: four rooms through the Khibiny, each twice as wide as the view and scrolling with the hero, with a final overlook.
// level 'waterfall' (game 0.1, at the start of the journey): two rooms by the rapids on Sredny, stone blocks that give
// finds and points like in Mario, a score line over the picture and a plain one-line panel below.
window.createKhibinyPlatform=function({canvas,inputSurface,images,drawPanel,drawText,announce,onExit,onComplete=null,level='khibiny'}){
 // The waterfall plays the Khibiny walk (MW keeps the Mario-style layout, off for now) in a taller picture: the world sits at its bottom, more sky above.
 const WF=level==='waterfall',MW=false,TX=WF?'waterfall':'platform5';
 // The waterfall draws its own pictures (assets/waterfall) where it has them, the shared ones otherwise.
 if(WF)images=new Proxy(images,{get:(all,k)=>all['waterfall_'+String(k)]||all[k]});
 const ctx=canvas.getContext('2d'),keys=new Set(),W=304,H=WF?174:136,OY=H-136;
 // Waterfall rooms are given in final coordinates: banks (wide ledges) and boulder steps (22 px wide) over the fall.
 // Waterfall = World 1-1 of Super Mario Bros., tile for tile: T px tiles, row 13 is the top of the ground (y GY).
 // ground spans, ? blocks and stone bricks as [column,row], pipes as [column,height], stairs as [column,height].
 const T=16,GY=142,ty=r=>GY-(13-r)*T,WFL={
  // World 1-1's three pits plus more on the open stretches, each a fall to jump over
  ground:[[0,6],[8,12],[14,33],[36,42],[44,51],[54,62],[65,69],[71,86],[89,97],[99,103],[105,114],[117,124],[127,145],[147,153],[155,165],[168,192],[195,212]],
  q:[[16,9],[21,9],[23,9],[22,5],[78,9],[94,5],[106,9],[109,9],[109,5],[112,9],[129,5],[130,5],[170,9]],
  bricks:[[20,9],[22,9],[24,9],[77,9],[79,9],...[80,81,82,83,84,85,86,87].map(c=>[c,5]),[91,5],[92,5],[93,5],[94,9],[100,9],[101,9],[118,9],[121,5],[122,5],[123,5],[128,5],[131,5],[129,9],[130,9],[168,9],[169,9],[171,9]],
  pipes:[[28,2],[38,3],[46,4],[57,4],[163,2],[179,2]],
  stairs:[[134,1],[135,2],[136,3],[137,4],[140,4],[141,3],[142,2],[143,1],[148,1],[149,2],[150,3],[151,4],[152,4],[155,4],[156,3],[157,2],[158,1],[181,1],[182,2],[183,3],[184,4],[185,5],[186,6],[187,7],[188,8],[189,8]],
  flag:198};
 const wfLedges=()=>[...WFL.ground.map(([a,b])=>({x:a*T,y:GY,w:(b-a)*T,kind:'ground'})),...WFL.pipes.map(([c,h])=>({x:c*T,y:GY-h*T,w:2*T,kind:'pipe'})),...WFL.stairs.map(([c,h])=>({x:c*T,y:GY-h*T,w:T,kind:'stair'}))];
 const rooms=MW?[
  {name:LT('waterfall.room1'),start:{x:40,y:GY},exitY:GY,width:212*T,ledges:wfLedges()} ]:[
  {name:LT('platform5.room1'),start:{x:36,y:116},exitY:190,ledges:[{x:0,y:116,w:104},{x:0,y:190,w:158},{x:196,y:190,w:124}]},
  {name:LT('platform5.room2'),start:{x:18,y:190},exitY:134,ledges:[{x:0,y:190,w:110},{x:140,y:164,w:72},{x:244,y:134,w:76}]},
  {name:LT('platform5.room3'),start:{x:18,y:134},exitY:132,ledges:[{x:0,y:134,w:82},{x:110,y:152,w:78},{x:220,y:132,w:100}]},
  {name:LT('platform5.room4'),start:{x:18,y:132},exitY:132,ledges:[{x:0,y:132,w:148}]}
 ];
 let active=false,room=0,p={x:36,y:116,vx:0,vy:0,face:1,ground:true,hang:null},state='play',last=0,acc=0,frame=0,time=0,jumpBuffer=0,coyote=0,grabCooldown=0,choice=0,hits=[],pressedHit=null,finalAsked=false,deathBy='fall';
 if(!MW)for(const r of rooms){r.start.x=Math.round(r.start.x*.95);r.start.y=Math.round((r.start.y-23)*.65);r.exitY=Math.round((r.exitY-23)*.65);for(const l of r.ledges){l.x=Math.round(l.x*.95);l.w=Math.round(l.w*.95);l.y=Math.round((l.y-23)*.65)}}
 // Rooms are twice as wide as the view: stretches with ledges get longer, the gaps between ledges keep their size.
 const ROOM_W=W*2;
 if(!MW)for(const r of rooms){
  const orig=r.ledges.map(l=>({...l}));
  const edges=[...new Set([0,W,...orig.flatMap(l=>[l.x,Math.min(W,l.x+l.w)])])].filter(x=>x<=W).sort((a,b)=>a-b);
  const covered=(a,b)=>orig.some(l=>l.x<b&&l.x+l.w>a);
  let cov=0,gap=0;for(let i=0;i<edges.length-1;i++){const d=edges[i+1]-edges[i];if(covered(edges[i],edges[i+1]))cov+=d;else gap+=d}
  const k=(ROOM_W-gap)/cov;
  r.map=x=>{let out=0;for(let i=0;i<edges.length-1;i++){const a=edges[i],b=edges[i+1];if(x<=a)break;const d=Math.min(x,b)-a;out+=covered(a,b)?d*k:d}return Math.round(out+Math.max(0,x-W))};
  for(const l of r.ledges){const e=r.map(l.x+l.w);l.x=r.map(l.x);l.w=e-l.x}
  r.start.x=r.map(r.start.x);r.width=ROOM_W;
 }
 let LAST=rooms.length-1,finalAsk=MW?0:rooms[3].map(106),finalStop=MW?0:rooms[3].map(134);
 // Mario-style props: stone bridges hang above the ground, lens blocks are hit with the head to take a photo.
 // Every lens hangs within a jump of the ground or of a bridge below it; bridges are 36 px above the ground.
 // Under each bridge the ground opens into a chasm wider than a jump, with a waterfall: the bridge is the only way over.
 const BRIDGE_H=MW?16:12,LENS=MW?16:14;
 // Waterfall blocks hang within a jump from the ground (the ground is at y 108 there).
 const props=MW?[
  {bridges:WFL.bricks.map(([c,r])=>({x:c*T,y:ty(r),w:T})),lenses:WFL.q.map(([c,r])=>({x:c*T,y:ty(r)}))} ]:[
  // over the first bridge: a stone step left of the high photo block and a block right of it lead up to the super prize;
  // they are thin (jump up through them from below, stand on top), so they never block the bridge under them
  {bridges:[{x:400,y:73,w:128},{x:421,y:34,w:24,thin:true},{x:477,y:25,w:16,thin:true}],lenses:[{x:262,y:61},{x:457,y:25}]},
  {bridges:[{x:80,y:73,w:128}],lenses:[{x:333,y:44},{x:137,y:25}]},
  {bridges:[{x:230,y:48,w:128}],lenses:[{x:90,y:24},{x:500,y:23}]},
  {bridges:[],lenses:[{x:200,y:23}]}
 ];
 rooms.forEach((r,i)=>{r.bridges=props[i].bridges;r.lenses=props[i].lenses.map(l=>({...l,used:false,bump:0}));
  if(!MW)for(const b of r.bridges){const a=b.x+12,z=b.x+b.w-12;r.ledges=r.ledges.flatMap(l=>l.y<=b.y||l.x>=z||l.x+l.w<=a?[l]:[...(l.x<a?[{...l,w:a-l.x}]:[]),...(l.x+l.w>z?[{...l,x:z,w:l.x+l.w-z}]:[])])}
  // gaps between two pieces of ground, each a dark chasm with a waterfall starting at the higher edge;
  // the open end of the last room is just the view, not a gap
  const cover=[...r.ledges].sort((a,b)=>a.x-b.x);r.falls=[];let x=0,lastY=cover[0].y;
  for(const l of cover){if(l.x>x+1)r.falls.push({x,w:l.x-x,y:Math.min(lastY,l.y)-2});if(l.x+l.w>x){x=l.x+l.w;lastY=l.y}}
 });
 // The waterfall's own layout (2026-11-12, after the approved GPT frame): each room a small scene with height changes.
 // Room 1 as the frame: a high granite ledge, a drop to a pillar between two falls, a row of boulders over the stream,
 // a lower bank with a tourist. Room 2 climbs the slope in granite steps to the gold cup. Room 3 is the long rapids:
 // jump from boulder to boulder. Room 4 is the calm shore with birches and the question home.
 // y is the top of the ground (the hero's feet), x across the 608 px room; boulders (thin) are stood on, jumped through.
 if(WF){const L=(x,y,w)=>({x,y,w}),B=(x,y,w,thin)=>thin?{x,y,w,thin:true}:{x,y,w},S=(x,y)=>({x,y,w:30,thin:true});
  const WFR=[
   {start:{x:40,y:60},exitY:109,ledges:[L(0,60,190),L(232,90,58),L(402,100,68),L(512,109,96)],bridges:[B(296,86,100)],lenses:[{x:110,y:14},{x:336,y:26},{x:548,y:40}],
    decor:[['birch1',150,60],['bush2',60,60],['rock_small',258,90],['bush1',440,100],['birch2',590,109],['rock_mid',530,109]]},
   {start:{x:30,y:109},exitY:80,ledges:[L(0,109,140),L(140,88,60),L(200,67,62),L(304,60,118),L(470,80,138)],bridges:[S(346,28)],lenses:[{x:160,y:30},{x:520,y:16}],
    decor:[['bush1',60,109],['rock_big',110,109],['birch2',400,60],['bush2',580,80],['birch1',500,80]]},
   {start:{x:30,y:80},exitY:80,ledges:[L(0,80,84),L(560,80,48)],bridges:[S(140,86),S(228,80),S(316,88),S(404,80),S(492,86)],lenses:[{x:222,y:24},{x:398,y:24}],  /* photo blocks over the near end of a stone, clear of the take-off; one jump (about 77 px) apart */
    decor:[['bush2',40,80],['rock_mid',590,80]]},
   {start:{x:30,y:80},exitY:71,ledges:[L(0,80,200),L(232,71,376)],bridges:[],lenses:[{x:120,y:24},{x:330,y:14}],
    decor:[['birch1',90,80],['bush1',170,80],['birch2',280,71],['bush2',470,71],['birch1',560,71],['rock_big',520,71]]}];
  WFR.forEach((d,i)=>{const r=rooms[i];r.start=d.start;r.exitY=d.exitY;r.width=ROOM_W;r.ledges=d.ledges;r.bridges=d.bridges;r.lenses=d.lenses.map(l=>({...l,used:false,bump:0}));r.decor=d.decor.map(([k,x,y])=>({k,x,y}))});
  finalAsk=430;finalStop=470}
 // The waterfall as ONE scene, three screens long (912 px), after the user's sketch of 2026-11-13: a flat granite
 // ground in six pieces with five waterfalls between them; the back is painted in layers that scroll with parallax
 // (bg_sky still, bg_clouds x0.2, bg_far x0.35, bg_near x0.6); nothing else on it for now.
 const SCENE=WF;
 if(SCENE){rooms.splice(1);LAST=0;const r=rooms[0],GY=109;
  r.start={x:30,y:GY};r.exitY=GY;r.width=912;r.bridges=[];r.lenses=[];r.decor=[];
  r.ledges=[[0,105],[140,196],[296,420],[460,560],[616,700],[740,912]].map(([a,b],i)=>({x:a,y:GY,w:b-a,slab:i+1}));
  // stone blocks over the falls and the lenses come from the PSD (scene-layout.js, written by the PSD watcher)
  const SL=window.WATERFALL_SCENE||{};r.bridges=(SL.blocks||[]).map(b=>({x:b.x,y:b.y,w:b.w||16,h:b.h||16,block:b.k||1}));
  r.sceneCoins=(SL.coins||[]).map(c=>({x:c.x,y:c.y}));
  finalAsk=850;finalStop=890}
 const LAYERS=[['bg_clouds',.2],['bg_far',.35],['bg_near',.6]];
 // Falls are the gaps between pieces of ground; worked out again whenever the level editor changes a room.
 const fallsOf=r=>{const cover=[...r.ledges].sort((a,b)=>a.x-b.x),out=[];if(!cover.length)return out;let x=0,lastY=cover[0].y;for(const l of cover){if(l.x>x+1)out.push({x,w:l.x-x,y:Math.min(lastY,l.y)-2});if(l.x+l.w>x){x=l.x+l.w;lastY=l.y}}return out};
 // Waterfall coins, Mario-style: rows of three over the ground (one row per 168 px), every other spot along each bridge
 // and an arc of three over each gap short enough to jump; nothing past the end of the last room's walk.
 // The open parts of a piece of ground: where no higher piece covers it. Under a higher piece the ground is inside
 // the rock and cannot be reached, so coins and tourists go only on the open parts.
 const openParts=(r,l)=>{let parts=[{x:l.x,w:l.w}];for(const h of r.ledges){if(h===l||h.y>=l.y-1)continue;parts=parts.flatMap(q=>h.x>=q.x+q.w||h.x+h.w<=q.x?[q]:[...(h.x>q.x?[{x:q.x,w:h.x-q.x}]:[]),...(h.x+h.w<q.x+q.w?[{x:h.x+h.w,w:q.x+q.w-h.x-h.w}]:[])])}return parts.map(q=>({...q,y:l.y}))};
 const autoCoins=(r,i)=>{const out=[],end=i===LAST?finalStop-8:(r.width||ROOM_W);const add=(x,y)=>{if(x>12&&x<end)out.push({x:Math.round(x),y:Math.round(y)})};
  for(const l of r.ledges.flatMap(l=>openParts(r,l)))for(let gx=l.x+24;gx+24<=l.x+l.w-20;gx+=168)for(let k=0;k<3;k++)add(gx+k*12,l.y-10);
  for(const b of r.bridges)for(let x=b.x+16;x<=b.x+b.w-16;x+=32)add(x,b.y-10);
  for(const f of fallsOf(r))if(f.w<=64&&f.x>0)for(let k=0;k<3;k++){const u=(k+.5)/3;add(f.x+f.w*u,f.y-14-Math.sin(u*Math.PI)*22)}
  return out};
 // Waterfall tourists: one strolling on each of the two longest pieces of ground (away from the start), plus the ones
 // that just stand where they are (STANDING, per room). Bumping into any of them ends the try, like a fall.
 const STANDING=[[{x:455,y:100}],[],[],[]];
 const autoTourists=(r,i)=>[...r.ledges.flatMap(l=>openParts(r,l)).filter(l=>l.w>=90&&(!(r.start.x>=l.x&&r.start.x<=l.x+l.w&&Math.abs(r.start.y-l.y)<6)||l.x+l.w-r.start.x>=300)).sort((a,b)=>b.w-a.w).slice(0,i===0?0:i===1?1:2)  /* room 1 has only its standing tourist, room 2 one on the lower bank */.map(l=>({x:Math.round(l.x+l.w*.65),y:l.y})),...(STANDING[i]||[]).map(t=>({...t,stand:true}))];
 // the super prize: a big gold cup above the high photo block of the first room
 const PRIZES=[[],[{x:446,y:6}],[],[]];
 // On entering a room each tourist gets the stretch of ground under it to walk, kept clear of the hero's start.
 function prepTourists(r){r.walkers=(r.tourists||[]).map(t=>{const l=r.ledges.filter(l=>t.x>=l.x&&t.x<=l.x+l.w&&l.y>=t.y-4).sort((a,b)=>a.y-b.y)[0];if(!l)return null;
  if(t.stand)return {x:t.x,y:l.y,dir:-1,a:t.x,b:t.x,stand:true};
  const o=openParts(r,l).sort((m,n)=>Math.abs(m.x+m.w/2-t.x)-Math.abs(n.x+n.w/2-t.x))[0];if(!o)return null;let a=o.x+40,b=o.x+o.w-10;  // the hero arrives from the left: keep the landing clearif(r.start.x>=l.x&&r.start.x<=l.x+l.w&&Math.abs(r.start.y-l.y)<6){if(t.x>r.start.x)a=Math.max(a,r.start.x+56);else b=Math.min(b,r.start.x-56)}
  return b-a<16?null:{x:Math.max(a,Math.min(b,t.x)),y:l.y,dir:-1,a,b}}).filter(Boolean)}
 for(const r of rooms){r.falls=fallsOf(r);r.decor=r.decor||[]}
 if(SCENE)for(const r of rooms){r.coins=(r.sceneCoins||[]).map(c=>({...c,taken:false}));r.prizes=[]}
 for(const [i,r] of rooms.entries()){r.coins=r.coins||(WF?autoCoins(r,i):[]);r.tourists=WF&&!SCENE?autoTourists(r,i):[];r.prizes=WF&&!SCENE?(PRIZES[i]||[]).map(q=>({...q})):[]}
 // The rooms as built in (final coordinates), and the level editor's rooms (platform-level.js) put in their place:
 // the start, pieces of ground, bridges, photo blocks, coins and tourists of each room.
 const builtIn=JSON.parse(JSON.stringify(rooms.map(r=>({start:r.start,ledges:r.ledges.map(({x,y,w})=>({x,y,w})),bridges:r.bridges.map(({x,y,w,thin})=>thin?{x,y,w,thin:true}:{x,y,w}),lenses:r.lenses.map(({x,y})=>({x,y})),coins:r.coins.map(({x,y})=>({x,y})),tourists:r.tourists,prizes:r.prizes.map(({x,y})=>({x,y}))}))));
 function setRooms(data){if(!Array.isArray(data))return;data.forEach((d,i)=>{const r=rooms[i];if(!r||!d)return;r.start={x:d.start.x,y:d.start.y};r.ledges=d.ledges.map(({x,y,w})=>({x,y,w}));r.bridges=d.bridges.map(({x,y,w,thin})=>thin?{x,y,w,thin:true}:{x,y,w});r.lenses=d.lenses.map(({x,y})=>({x,y,used:false,bump:0}));r.coins=(d.coins||[]).map(({x,y})=>({x,y,taken:false}));r.tourists=d.tourists?d.tourists.map(({x,y,stand})=>stand?{x,y,stand:true}:{x,y}):WF?autoTourists(r,i):[];r.prizes=(d.prizes||(WF?PRIZES[i]||[]:[])).map(({x,y})=>({x,y,taken:false}));r.falls=fallsOf(r);if(i===room)prepTourists(r)})}
 if(WF&&!SCENE)setRooms(window.PeninsulaPlatformLevels?.get('waterfall'));  // the one-scene layout ignores rooms saved by the old editor
 // A seamless 32x64 tile of falling water, scrolled downwards every frame.
 const fallTile=(()=>{const c=document.createElement('canvas');c.width=32;c.height=64;const g=c.getContext('2d');const cols=['#335577','#4f7c9e','#7fa9c4','#b6d3e0','#e4f0f4'];
  for(let x=0;x<32;x++){const phase=(x*37)%64,len=10+(x*13)%14,edge=x%8===0;for(let y=0;y<64;y++){const v=(y+phase)%64;let k=v<len?(v<3?4:3):v<len+8?2:1;if(edge)k=Math.max(0,k-2);g.fillStyle=cols[k];g.fillRect(x,y,1,1)}}return c})();
 const solids=()=>[...rooms[room].bridges.map(b=>({...b,h:b.h||BRIDGE_H})),...rooms[room].lenses.map(l=>({x:l.x,y:l.y,w:LENS,h:LENS,lens:l}))];
 let photos=[],photoPending=false,flash=0;
 function snap(lens){lens.used=true;lens.bump=.15;if(MW){find(lens);return}if(WF){score+=1000;pops.push({x:lens.x+LENS/2,y:lens.y,t:0,pts:'1000'})}flash=.18;photoPending=true;announce(LT('platform5.photo'))}
 // Waterfall: each block gives the next find of the list; it hops out, its points float up, the find goes into a slot.
 const FINDS=['rusks','thermos','compass','map','flask','rope','pot'];let finds=[],pops=[],score=0,clock=400,lives=3,coins=0;
 function find(lens){const name=FINDS[(score/100)%FINDS.length];score+=100;pops.push({x:lens.x+LENS/2,y:lens.y,name,t:0});if(finds.length<4)finds.push(name);announce('+100')}
 // Waterfall: Shift runs (half as fast again), like holding the run button in a console platformer; elsewhere it walks.
 const speed=WF?103:82,walkSpeed=WF?155:38,gravity=WF?703:450,jumpSpeed=MW?356:WF?263:210,radius=MW?7:5,height=MW?36:WF?29:24,HS=WF?29/24:1;  // the waterfall hero is 29 px tall: the 24 px frames drawn at 29/24 until frames of his own size are drawn
   // the waterfall runs 25% faster than the Khibiny walk, jumps keep their shape
 // Legs change frame every STRIDE pixels walked, so holding Shift slows the steps as well as the hero.
 const STRIDE=5;let stride=0;
 // The camera keeps the hero near the middle; the far background scrolls at PARALLAX of the ground's speed.
 // the hills stand on the ground line of the Mario level (their picture ends about 12 px above it)
 const PARALLAX=.35,HILLS=.3,LEAVES=1.35,HY=MW?12:0;let camX=0;
 // draw a tile, flipped left-right and/or up-down (the waterfall tiles alternate so their edges meet without a seam)
 function mirrorDraw(im,x,y,fx,fy){if(!fx&&!fy){ctx.drawImage(im,x,y);return}ctx.save();ctx.translate(x+(fx?im.width:0),y+(fy?im.height:0));ctx.scale(fx?-1:1,fy?-1:1);ctx.drawImage(im,0,0);ctx.restore()}
 function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
 // waterfall tiles: dark natural stones, one texture for the ground's top row, the block rows and the stairs.
 // Six variants are drawn once: one to three uneven boulders each, a little larger than the tile so the rows get a ragged
 // outline, lit from the top left, each with a dark rim; between them the background shows through.
 const STONE_TILES=(()=>{let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const ramps=[['#25282c','#33373c','#454a50','#5b6168','#757b82'],['#28272a','#38363a','#4b484c','#625e61','#7b7679'],['#23272a','#31373b','#434a4f','#596167','#727a80']];
  const shapes=[[[8,8,8,8]],[[5,8,5,8],[12,8,4,8]],[[8,5,8,5],[8,12,8,4]],[[5,5,5,5],[12,6,4,6],[8,13,8,3]],[[7,9,7,7],[14,4,3,4]],[[4,10,4,6],[11,7,5,7]]];
  return shapes.map(sh=>{const c=document.createElement('canvas');c.width=c.height=T+4;const g=c.getContext('2d');
   for(const [cx,cy,rx,ry] of sh){const ramp=ramps[Math.floor(rnd()*ramps.length)],wob=[rnd(),rnd(),rnd()];
    for(let y=0;y<T+4;y++)for(let x=0;x<T+4;x++){const dx=(x+.5-cx-2)/(rx+1.5),dy=(y+.5-cy-2)/(ry+1.5),a=Math.atan2(dy,dx),r=Math.hypot(dx,dy),edge=.92+.08*Math.sin(a*3+wob[0]*6)+.05*Math.sin(a*5+wob[1]*6);
     if(r>edge+.16)continue;if(r>edge){g.fillStyle='#15171a';g.fillRect(x,y,1,1);continue}const light=-dx*.55-dy*.85+(rnd()-.5)*.35;let k=light>.55?4:light>.15?3:light>-.3?2:1;if(r>edge-.18&&light<0)k=Math.max(0,k-1);
     g.fillStyle=ramp[k];g.fillRect(x,y,1,1)}}
   return c})})();
 function stoneTile(x,y){const v=((Math.floor(x/T)*73856093)^(Math.floor(y/T)*19349663))>>>0;ctx.drawImage(STONE_TILES[v%STONE_TILES.length],x-2,y-2)}
 // rusty pipe: an old steel pipe gone orange-brown, lit from the left, with darker rust patches and streaks down
 function drawPipe(x,y){const RUST=['#1d130e','#4a2a19','#7a4325','#a45d32','#c97f48'],h=GY-y;
  rect(x+2,y+8,T*2-4,h-8,RUST[0]);rect(x,y,T*2,9,RUST[0]);
  const shade=i=>i<3?3:i<7?4:i<15?2:1;
  for(let yy=0;yy<h;yy++){const rim=yy<9,x0=rim?1:3,w=rim?T*2-2:T*2-6;if(rim&&(yy===0||yy===8))continue;
   for(let i=0;i<w;i++){let k=shade(i);const n=((x+i)*928371+(y+yy)*1237)%97;if(n<9)k=Math.max(1,k-1);else if(n>90&&k<4)k++;
    if(!rim&&((x+i)*31%11===0)&&((y+yy)%7<4))k=Math.max(1,k-1);ctx.fillStyle=RUST[k];ctx.fillRect(x+x0+i,y+yy,1,1)}}
  rect(x+1,y+1,T*2-2,1,RUST[4])}
 // flagpole: a thin steel pole with a ball on top and a flag
 function drawFlag(x){rect(x-1,ty(3),2,GY-ty(3),'#aab4bf');rect(x-3,ty(3)-5,6,6,'#d9dfe6');rect(x-T,ty(3)+6,T-1,10,'#3c6e46');rect(x-T,ty(3)+6,T-1,2,'#5e9a68');stoneTile(x-T/2,GY-T,'stair')}
 // waterfall block: a warm stone block with a carved question mark, flat and grey once hit
 function drawBlock(x,y,used){rect(x,y,LENS,LENS,'#1b1e23');rect(x+1,y+1,LENS-2,LENS-2,used?'#4a4640':'#a0703a');if(used)return;rect(x+1,y+1,LENS-2,1,'#d8a45a');rect(x+1,y+1,1,LENS-2,'#d8a45a');rect(x+2,y+LENS-2,LENS-3,1,'#6a4520');rect(x+LENS-2,y+2,1,LENS-3,'#6a4520');
  for(const [dx,dy] of [[5,3],[6,3],[7,3],[8,3],[4,4],[9,4],[9,5],[8,6],[7,6],[6,7],[6,8],[6,10]])rect(x+dx,y+dy,1,1,'#fff1c8')}
 function text(s,x,y,c='#dce5ed',align='left'){drawText(s,x,y,8,c,align)}
 function button(label,x,y,w,h,fn,selected=false){drawPanel(x,y,w,h,'ui_button');currentUI.roleBlock(ctx,label,x,y,w,h,'buttons');hits.push({x,y,w,h,fn});}
 function clearInput(){keys.clear();jumpBuffer=0;}
 function spawn(index=room){room=index;const s=rooms[room].start;p={x:s.x,y:s.y,vx:0,vy:0,face:1,ground:true,hang:null};prepTourists(rooms[room]);pops=[];state='play';finalAsked=false;choice=0;grabCooldown=0;clearInput();announce(rooms[room].name);}
 function retry(){spawn(room);render()}
 function home(){if(onComplete){clearInput();onComplete();return;}state='home';clearInput();announce(LT('platform5.sayHome'));render()}
 function keepWalking(){state='play';finalAsked=true;clearInput();announce(LT('platform5.sayStay'));render()}
 function ask(){p.vx=0;state='question';choice=0;clearInput();announce(LT('platform5.sayAsk'));render()}
 function jump(){jumpBuffer=.14}
 function update(dt){
  time+=dt;if(MW||WF){clock=Math.max(0,clock-dt*2.5);for(const q of pops)q.t+=dt;pops=pops.filter(q=>q.t<1.2)}flash=Math.max(0,flash-dt);for(const l of rooms[room].lenses)l.bump=Math.max(0,l.bump-dt);if(state!=='play')return;grabCooldown=Math.max(0,grabCooldown-dt);
  for(const c of rooms[room].coins)if(!c.taken&&Math.abs(c.x-p.x)<radius+4&&c.y>p.y-height-5&&c.y<p.y+5){c.taken=true;coins++;score+=200}
  jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=p.ground?.1:Math.max(0,coyote-dt);
  // tourists stroll (or stand); bumping into one ends the try, like a fall into the water
  for(const t of rooms[room].walkers||[]){if(!t.stand){t.x+=t.dir*16*dt;if(t.x<t.a){t.x=t.a;t.dir=1}if(t.x>t.b){t.x=t.b;t.dir=-1}}
   if(!p.hang&&Math.abs(t.x-p.x)<radius+3&&p.y>t.y-19&&p.y-height<t.y){state='fallen';deathBy='tourist';clearInput();announce(LT('waterfall.touristTitle'));return}}
  // the super prize: 5000 points and 10 coins
  for(const q of rooms[room].prizes||[])if(!q.taken&&Math.abs(q.x-p.x)<radius+7&&q.y>p.y-height-8&&q.y<p.y+6){q.taken=true;coins+=10;score+=5000;flash=.18;pops.push({x:q.x,y:q.y+8,t:0,pts:'5000'})}
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
   if(b.thin){if(p.vy>=0&&oldY<=top+1&&ny>=top&&nx+radius>b.x&&nx-radius<b.x+b.w){ny=top;p.vy=0;p.ground=true}continue}
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
  if(MW&&p.x>WFL.flag*T+T/2){p.x=WFL.flag*T+T/2;if(!finalAsked){finalAsked=true;state='done';clearInput();if(onComplete)onComplete();return}}
  else if(!MW&&room===LAST){p.x=Math.max(radius,Math.min(finalStop,p.x));if(p.ground&&p.x>=finalAsk&&!finalAsked)ask();}
  else if(p.x>rooms[room].width+radius){spawn(room+1);return;}
  if(p.x<-radius&&room>0){const previous=room-1;spawn(previous);p.x=rooms[previous].width-13;p.y=rooms[previous].exitY;p.face=-1;}
  if(p.y>(MW?H-8:148)){state='fallen';deathBy='fall';clearInput();announce(WF?LT('waterfall.fallTitle'):LT('platform5.sayFall'));}
 }
 function drawHero(){
  // Every hero frame is drawn at 100%: the frames are already at their on-screen size (24 px tall, feet on the bottom row).
  // Walking: 8 frames (contact, down, passing, up for each leg); the body's bob is in the frames, anchored like the idle frame.
  const WALK_X=7;
  if(p.ground&&!p.hang&&Math.abs(p.vx)>1){const im=images['platform_walk'+(Math.floor(stride/STRIDE)%(WF?6:8))]  /* the waterfall run cycle has 6 frames */;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face*height/im.height,height/im.height);ctx.drawImage(im,-WALK_X,-im.height);ctx.restore();return}
  let index=0;if(p.hang)index=6;else if(!p.ground)index=5;const im=images['platform_hero'+index];ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face*height/im.height,height/im.height);ctx.drawImage(im,-Math.round(im.width/2),-im.height);ctx.restore();}
 // a tourist, 20 px tall, drawn in code for now: red windbreaker, blue cap, green backpack, a trekking pole; legs swap as he walks
 const LENS_COIN=['..rrrrr..','.rmmmmmr.','rmgwgggmr','rmgdddgmr','rmgdkdgmr','rmgdddgmr','rmgggggmr','.rmmmmmr.','..rrrrr..'];
 const LENS_COLORS={w:'#bfe3ff',r:'#15181d',m:'#8b97a3',g:'#3b82c4',d:'#1f4f8f',k:'#0b1a33'};
 function drawTourist(t){const step=t.stand?0:Math.floor(t.x/4)%2;ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));ctx.scale(t.dir,1);
  const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
  r(-3,-6,2,6-step,'#3a3f4a');r(1,-6,2,5+step,'#3a3f4a');r(-4,-1+(step?-1:0),3,1,'#2a1d14');r(1,-1-(step?0:1)+1,3,1,'#2a1d14');
  r(-7,-16,4,9,'#2c2a24');r(-6,-15,3,8,'#4c6a3a');r(-6,-17,3,2,'#8a7a52');
  r(-3,-14,7,8,'#2a1414');r(-2,-14,5,8,'#c8452f');r(-2,-14,1,8,'#e2704f');
  r(-2,-19,5,5,'#2a1d14');r(-1,-19,4,4,'#e0b48c');r(2,-17,1,1,'#2a1d14');
  r(-2,-21,5,2,'#2f5d8a');r(3,-20,2,1,'#2f5d8a');
  r(4,-10,1,10,'#9aa4ad');r(3,-10,2,1,'#e0b48c');
  ctx.restore()}
 let dialogueFx=null;
 function render(){PeninsulaPopup.visible=false;
  if(!active)return;hits=[];ctx.imageSmoothingEnabled=false;currentUI.base(ctx,'platform5');currentUI.header(ctx,LT(TX+'.heading'));
  currentUI.clip(ctx,8,23,304,H,()=>{ctx.save();ctx.translate(8,23);
   if(MW){ctx.drawImage(images.platform_wf_sky,0,0);const hx=Math.round(Math.max(0,Math.min(rooms[room].width-W,Math.round(p.x-W/2)))*HILLS);
    for(let k=Math.floor(hx/W);k*W<hx+W;k++){const x=k*W-hx;if(k%2){ctx.save();ctx.translate(x+W,HY);ctx.scale(-1,1);ctx.drawImage(images.platform_wf_hills,0,0);ctx.restore()}else ctx.drawImage(images.platform_wf_hills,x,HY)}}
   const im=MW?images.platform_wf_sky:images['platform_bg'+(room+1)],rw=rooms[room].width;camX=Math.max(0,Math.min(rw-W,Math.round(p.x-W/2)));
   const scale=Math.max((W+(rw-W)*PARALLAX)/im.width,H/im.height),iw=Math.round(im.width*scale),ih=Math.round(im.height*scale);
   if(SCENE&&images.bg_sky){ctx.drawImage(images.bg_sky,0,0);for(const [k,f] of LAYERS)if(images[k])ctx.drawImage(images[k],-Math.round(camX*f),0)}
   else if(!MW)ctx.drawImage(window.PeninsulaColors?PeninsulaColors.picture(im,'platform-bg'+(room+1)):im,-Math.round(camX*PARALLAX),Math.round((H-ih)/2),iw,ih);
   ctx.translate(-camX,MW?0:OY);
   // waterfalls behind the ledges: scrolling water, foam where it pours over, mist at the bottom
   if(!MW)for(const f of rooms[room].falls){if(f.x+f.w<camX||f.x>camX+W)continue;const FS=SCENE&&images['fall_'+f.w];if(FS){ctx.drawImage(FS,f.x,f.y+1);continue}const g=ctx.createLinearGradient(0,f.y,0,136);g.addColorStop(0,'#2a3034');g.addColorStop(1,'#0c1012');ctx.fillStyle=g;ctx.fillRect(f.x,f.y+4,f.w,132-f.y);
    // the water is narrower than the chasm, so the dark rock shows on both sides and it reads as a fall, not a wall
    const wx=f.x,ww=f.w;  // the water fills the whole gap from edge to edge
    currentUI.clip(ctx,wx,f.y,ww,136-f.y,()=>{const off=Math.floor(time*90)%64;for(let ty=f.y-64+off;ty<136;ty+=64)for(let tx=wx;tx<wx+ww;tx+=32)ctx.drawImage(fallTile,tx,ty);
    
    ctx.fillStyle='#e4f0f4';for(let x=wx;x<wx+ww;x++){const h=1+((x*7+Math.floor(time*12))%3);ctx.fillRect(x,f.y,1,h)}
    // foam where the water lands (waterfall picture set), every other piece mirrored, bobbing a pixel
    const FM=images.platform_foam;if(WF&&FM)for(let fx=wx,i=0;fx<wx+ww;fx+=FM.width,i++)mirrorDraw(FM,fx,136-FM.height+(Math.floor(time*4+i)%2),i%2===1,false)});
    currentUI.clip(ctx,f.x,f.y,f.w,136-f.y,()=>{for(let i=0;i<4;i++){ctx.fillStyle='rgba(220,236,242,'+(.10+i*.07)+')';ctx.fillRect(f.x,136-20+i*5,f.w,5)}})}
   // The ledge picture's walkable grass starts 5 px below its top edge, so it is drawn 5 px higher.
   if(MW){const vis=(x,w)=>x+w>=camX-4&&x<=camX+W+4;
    // the pits between the ground spans are the fall: running water, foam on the lip, mist at the foot
    for(let k=0;k<WFL.ground.length-1;k++){const x=WFL.ground[k][1]*T,w=WFL.ground[k+1][0]*T-x;if(!vis(x,w))continue;
     currentUI.clip(ctx,x,GY,w,H-GY,()=>{const off=Math.floor(time*90)%64;for(let yy=GY-64+off;yy<H;yy+=64)for(let tx=x;tx<x+w;tx+=32)ctx.drawImage(fallTile,tx,yy);
      ctx.fillStyle='#e4f0f4';for(let xx=x;xx<x+w;xx++)ctx.fillRect(xx,GY,1,1+((xx*7+Math.floor(time*12))%3));
      for(let q=0;q<4;q++){ctx.fillStyle='rgba(220,236,242,'+(.10+q*.07)+')';ctx.fillRect(x,H-20+q*5,w,5)}})}
    for(const l of rooms[room].ledges){if(!vis(l.x,l.w))continue;
     if(l.kind==='ground')currentUI.clip(ctx,l.x,l.y,l.w,H-l.y,()=>{for(let sy=l.y;sy<H;sy+=64)for(let sx=l.x;sx<l.x+l.w;sx+=64)ctx.drawImage(images.platform_wf_bank_rock,sx,sy);for(let sx=l.x;sx<l.x+l.w;sx+=T)stoneTile(sx,l.y,'cap')});
     else if(l.kind==='pipe')drawPipe(l.x,l.y);
     else for(let sy=l.y;sy<GY;sy+=T)stoneTile(l.x,sy,'stair')}
    for(const b of rooms[room].bridges)if(vis(b.x,T))stoneTile(b.x,b.y,'brick');
    if(vis(WFL.flag*T-8,24))drawFlag(WFL.flag*T+T/2)}
   // ground: the rock body tiles below, the ledge strip on top; each picture repeats at its own size, and the ledge's
   // walkable line is LEDGE_TOP px below its top edge (5 for the 64x32 ledge, the strip's own value otherwise)
   else if(SCENE)for(const l of rooms[room].ledges){if(l.x+l.w<camX||l.x>camX+W)continue;const sl=images['slab'+l.slab];if(sl)ctx.drawImage(sl,l.x,l.y)}
   else for(const l of rooms[room].ledges){if(l.x+l.w<camX||l.x>camX+W)continue;const LG=images.platform_ledge,CL=images.walk_cliff_64,top=LG.ledgeTop??(WF?8:5);currentUI.clip(ctx,l.x,l.y-top,l.w,136+top-l.y,()=>{for(let sy=l.y+1,j=0;sy<136;sy+=CL.height,j++)for(let sx=l.x,i=0;sx<l.x+l.w;sx+=CL.width,i++)mirrorDraw(CL,sx,sy,WF&&i%2===1,WF&&j%2===1);for(let sx=l.x,i=0;sx<l.x+l.w;sx+=LG.width,i++)mirrorDraw(LG,sx,l.y-top,WF&&i%2===1,false)});}// a short step is one whole stone (platform_step) when that picture exists, centred on the step
   if(!MW)for(const b of rooms[room].bridges)if(SCENE&&b.block&&images['block'+b.block])ctx.drawImage(images['block'+b.block],b.x,b.y);else if(b.w<=32&&images.platform_step){const st=images.platform_step;ctx.drawImage(st,Math.round(b.x+b.w/2-st.width/2),b.y-(st.stepTop??1))}else currentUI.clip(ctx,b.x,b.y-(images.platform_bridge.bridgeTop??(WF?1:3)),b.w,images.platform_bridge.height,()=>{for(let sx=b.x,bw=images.platform_bridge.width;sx<b.x+b.w&&(sx===b.x||sx+bw<=b.x+b.w+8);sx+=bw)ctx.drawImage(images.platform_bridge,sx,b.y-(images.platform_bridge.bridgeTop??(WF?1:3)))});
   for(const l of rooms[room].lenses){const dy=-Math.round(Math.sin(l.bump/.15*Math.PI)*3);if(MW)drawBlock(l.x,l.y+dy,l.used);else ctx.drawImage(images[l.used?'platform_lens_used':'platform_lens'],l.x,l.y+dy)}
   // coins are little round camera lenses, 9 px: dark rim, steel ring, blue glass deepening to the middle, a white glint
   // that blinks now and then (each lens at its own moment)
   for(const c of rooms[room].coins){if(c.taken||c.x<camX-8||c.x>camX+W+8)continue;const x=Math.round(c.x-4),y=Math.round(c.y-4);
    LENS_COIN.forEach((row,yy)=>{for(let xx=0;xx<9;xx++){const k=row[xx];if(k!=='.'){ctx.fillStyle=LENS_COLORS[k];ctx.fillRect(x+xx,y+yy,1,1)}}});
    if((Math.floor(time*3+c.x*.37)%7)===0){ctx.fillStyle='#ffffff';ctx.fillRect(x+3,y+2,1,1);ctx.fillRect(x+2,y+3,1,1)}}
   // the super prize: a gold cup on a little stand, bobbing, with a glint running over it
   for(const q of rooms[room].prizes||[]){if(q.taken)continue;const x=Math.round(q.x),y=Math.round(q.y+Math.sin(time*4)*1.5);const R=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+a,y+b,w,h)};
    R(-7,-8,14,1,'#5a3a08');R(-6,-8,12,8,'#5a3a08');R(-5,-7,10,7,'#f2c14e');R(-5,-7,2,6,'#fff2b0');R(-9,-6,3,4,'#5a3a08');R(6,-6,3,4,'#5a3a08');R(-8,-5,2,2,'#f2c14e');R(6,-5,2,2,'#f2c14e');
    R(-2,0,4,3,'#5a3a08');R(-1,0,2,3,'#c8922e');R(-5,3,10,3,'#5a3a08');R(-4,3,8,2,'#c8922e');
    const g=Math.floor(time*6)%12;if(g<5)R(-5+g*2,-7,1,6,'#ffffff')}
   // a find hops out of its block, its points float higher
   for(const q of pops){const im=currentUI.heroItemImages[q.name],u=Math.min(1,q.t/.5),hop=Math.round(Math.sin(u*Math.PI)*18+u*4);if(im&&q.t<.6)ctx.drawImage(im,Math.round(q.x-8),Math.round(q.y-14-hop),16,16);drawText(q.pts||'100',Math.round(q.x),Math.round(q.y-26-q.t*22),8,'#fff4c2','center')}
   // birches, bushes and boulders standing on the ground, behind the hero and the tourists
   for(const d of rooms[room].decor||[]){const im=images['deco_'+d.k];if(im&&d.x+im.width>camX&&d.x-im.width<camX+W)ctx.drawImage(im,Math.round(d.x-im.width/2),d.y-im.height+2)}
   for(const t of rooms[room].walkers||[])if(t.x>camX-10&&t.x<camX+W+10)drawTourist(t);
   drawHero();ctx.restore();
   // A photo is the view at the moment of the hit, before the flash, on a small white print.
   if(photoPending){photoPending=false;const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.fillStyle='#e8e4d8';g.fillRect(0,0,24,24);g.imageSmoothingEnabled=true;g.drawImage(canvas,8,23,304,136,2,2,20,15);photos.push(c)}
   if(MW||WF){// the score line over the picture, like the top line of a console platformer
    // labels in the game's font, digits twice as large; a dark copy one pixel lower keeps them readable on water
    const OUT=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1],[1,2],[0,2]];  // dark outline all round, so the white reads on clouds
    const big=(t,x,y,a)=>{for(const [dx,dy] of OUT)pixelText(ctx,t,x+dx,y+dy,8,'#11171c',a,2);pixelText(ctx,t,x,y,8,'#f4f1e6',a,2)};
    // the game font is drawn in its own colour: tint a copy dark for the shadow and light for the label
    const label=(t,x,a)=>{const c=document.createElement('canvas');c.width=W;c.height=20;const g=c.getContext('2d');currentUI.text(g,t,a==='right'?W-2:2,2,a);
     const tint=col=>{const d=document.createElement('canvas');d.width=W;d.height=20;const h=d.getContext('2d');h.drawImage(c,0,0);h.globalCompositeOperation='source-in';h.fillStyle=col;h.fillRect(0,0,W,20);return d};
     const ox=a==='right'?x-(W-2):x-2;const dk=tint('#11171c');for(const [dx,dy] of OUT)ctx.drawImage(dk,ox+dx,24+dy);ctx.drawImage(tint('#f4f1e6'),ox,24)};
    if(MW){label(LT('waterfall.score'),14,'left');big(String(score).padStart(6,'0'),14,38,'left');
    label(LT('waterfall.lives'),306,'right');big(String(lives),306,38,'right')}
    else{const total=rooms.reduce((n,r)=>n+r.lenses.length,0);if(typeof glyphRows!=='undefined'&&!glyphRows['/'])glyphRows['/']=['00001','00010','00010','00100','01000','01000','10000'];
     label(LT('waterfall.score'),14,'left');big(String(score).padStart(6,'0'),14,38,'left');
     label(LT('waterfall.coins'),112,'left');big('Х'+String(coins).padStart(2,'0'),112,38,'left');
     label(LT('waterfall.photos'),190,'left');big(photos.length+'/'+total,190,38,'left');
     label(LT('waterfall.time'),306,'right');big(String(Math.ceil(clock)),306,38,'right')}}
   if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash/.18*.8).toFixed(2)+')';ctx.fillRect(8,23,304,H)}
  });
  if(WF){// no radio line: the lower strip is only the photo prints, one window per photo block of the level,
   // filled left to right as the photos are taken
   const n=rooms.reduce((sum,r)=>sum+r.lenses.length,0),w=28,gap=Math.min(12,Math.floor((306-n*w)/(n+1))),x0=7+Math.round((306-n*w-(n-1)*gap)/2);
   PeninsulaColors.fill(ctx,7,198,306,36);for(let i=0;i<n;i++)currentUI.box(ctx,x0+i*(w+gap),201,w,w,'#18242b','inventory');
   if(MW)finds.forEach((f,i)=>{const im=currentUI.heroItemImages[f];if(im&&i<n)ctx.drawImage(im,x0+i*(w+gap)+2,203)});else photos.slice(0,n).forEach((ph,i)=>ctx.drawImage(ph,x0+i*(w+gap)+2,203));
  }else{
  currentUI.box(ctx,7,161,190,72,'#11171c','dialogue');
  // The line types out and the mage's portrait shows in the corner of the picture (dialogue-fx.js).
  dialogueFx=dialogueFx||PeninsulaDialogueFX.create({ctx,fonts:currentUI.fonts,portrait:{x:271,y:110},clip:[8,23,304,136],render:()=>render()});
  dialogueFx.line(p.hang?LT('platform5.hang'):LT('platform5.walkHelp',{room:rooms[room].name}),8,166,188,66);dialogueFx.portrait();currentUI.resource(ctx,LT('platform5.power'),'80%');currentUI.slots(ctx);photos.slice(0,8).forEach((ph,i)=>ctx.drawImage(ph,200+i%4*29,178+Math.floor(i/4)*29));}
  if(state==='question'){
   PeninsulaPopup.draw(ctx,{body:LT('platform5.askHome'),labels:[LT('platform5.yes'),LT('platform5.no')],choice}).forEach((b,i)=>hits.push({...b,fn:i?keepWalking:home}));
  }else if(state!=='play'&&state!=='done'){const b=currentUI.modal(ctx,state==='fallen'?LT(TX+(deathBy==='tourist'?'.touristTitle':'.fallTitle')):LT('platform5.homeTitle'),state==='fallen'?LT(TX+(deathBy==='tourist'?'.touristBody':'.fallBody')):LT('platform5.homeBody'));hits.push({...b,fn:()=>press('enter')})}
  // a pressed button sinks a pixel and darkens for a moment before it acts
  if(pressedHit){const b=pressedHit;ctx.drawImage(canvas,b.x,b.y,b.w-1,b.h-1,b.x+1,b.y+1,b.w-1,b.h-1);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(b.x,b.y,b.w,1);ctx.fillRect(b.x,b.y,1,b.h)}
  drawGameBorder(ctx);
 }
 function tick(now){if(!active)return;const dt=last?Math.min(.1,(now-last)/1000):0;last=now;acc+=dt;while(acc>=1/60&&active){update(1/60);acc-=1/60;}render();if(active)frame=requestAnimationFrame(tick);}
 function press(k){if(state==='question'){if(k==='left'||k==='right'){choice=1-choice;render()}if(k==='jump'||k==='enter'){choice===0?home():keepWalking()}return;}if(state==='fallen'){if(k==='jump'||k==='enter'){if(MW){lives--;if(lives<=0){lives=3;score=0;finds=[];for(const r of rooms)for(const l of r.lenses){l.used=false;l.bump=0}spawn(0);render();return}}retry()}return;}if(state==='home'){if(k==='enter'||k==='jump')onExit();return;}if(!MW&&k==='enter'&&room===LAST&&p.ground)ask();else if(k==='jump')jump();}
 const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',Shift:'shift',' ':'jump',Enter:'enter'};
 window.addEventListener('keydown',e=>{if(!active)return;if(e.key==='r'||e.key==='R'){e.preventDefault();retry();return;}const k=keyMap[e.key];if(!k)return;e.preventDefault();if(!e.repeat)press(k);keys.add(k);});
 window.addEventListener('keyup',e=>{if(active)keys.delete(keyMap[e.key]);});window.addEventListener('blur',()=>{if(active)clearInput()});
 inputSurface.addEventListener('pointerdown',e=>{if(!active||e.button!==0)return;const b=inputSurface.getBoundingClientRect(),x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*240/b.height,h=hits.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);if(h){e.preventDefault();if(pressedHit)return;pressedHit=h;render();setTimeout(()=>{pressedHit=null;h.fn();render()},170)}});
 return{snapshot:()=>({room,state,player:{...p},rooms,photos:photos.length,score,finds:finds.length,lives,coins,clock}),setRooms(data){setRooms(data);render()},goRoom(i){spawn(i);render()},builtIn,auto:(d,i)=>({coins:autoCoins(d,i),tourists:autoTourists(d,i)}),update,press,start(){active=true;dialogueFx?.levelStart();photos=[];finds=[];pops=[];score=0;clock=WF?300:400;lives=3;coins=0;for(const r of rooms){for(const l of r.lenses){l.used=false;l.bump=0}for(const c of r.coins)c.taken=false;for(const q of r.prizes||[])q.taken=false}spawn(0);last=0;acc=0;render();frame=requestAnimationFrame(tick)},stop(){active=false;clearInput();cancelAnimationFrame(frame);inputSurface.style.cursor=''},render,setControl(k,down){if(!active)return;if(down){press(k);keys.add(k)}else keys.delete(k)}};
};
