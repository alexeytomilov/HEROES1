// A small 3D view of a walk level: walls as textured cubes, floor and water tiles, and a band of sky.
// Drag to turn, wheel to zoom, click to pick a wall side, the floor, the water or the sky.
window.createWalk3D=function(canvas,getLevel,onPick){
 const W=window.PeninsulaWalk,g=canvas.getContext('2d');
 let yaw=.6,zoom=1,selection=null,faces=[],drag=null;
 const sides={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]},names={n:'север',e:'восток',s:'юг',w:'запад'};
 function render(){
  const level=getLevel(),grid=W.grid(level);g.imageSmoothingEnabled=false;
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#0b1118';g.fillRect(0,0,canvas.width,canvas.height);faces=[];
  if(!grid)return;
  // Sky band
  const skyIm=W.image(W.skyTexture(level)),skyH=22;
  if(skyIm)g.drawImage(skyIm,0,0,skyIm.width,Math.min(skyIm.height,skyIm.width*skyH/canvas.width),0,0,canvas.width,skyH);else{g.fillStyle='#5a6b7c';g.fillRect(0,0,canvas.width,skyH)}
  faces.push({kind:'sky',poly:[[0,0],[canvas.width,0],[canvas.width,skyH],[0,skyH]]});
  const rows=grid.length,cols=grid[0].length,cx=cols/2,cy=rows/2,pitch=.62;
  const s=Math.min((canvas.width-20)/Math.hypot(cols,rows),(canvas.height-skyH-20)/(Math.hypot(cols,rows)*Math.sin(pitch)+1.4))*zoom;
  const ox=canvas.width/2,oy=skyH+(canvas.height-skyH)/2+s*.4,cs=Math.cos(yaw),sn=Math.sin(yaw);
  const P=(x,y,z)=>{const rx=(x-cx)*cs-(y-cy)*sn,ry=(x-cx)*sn+(y-cy)*cs;return [ox+rx*s,oy+ry*s*Math.sin(pitch)-z*s*Math.cos(pitch)*1.25,ry]};
  // Draws an image on a parallelogram: a = top-left, b = top-right, d = bottom-left.
  function quad(im,a,b,d,fallback,shade){
   g.save();g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(b[0]+d[0]-a[0],b[1]+d[1]-a[1]);g.lineTo(d[0],d[1]);g.closePath();g.clip();
   if(im){g.setTransform((b[0]-a[0])/im.width,(b[1]-a[1])/im.width,(d[0]-a[0])/im.height,(d[1]-a[1])/im.height,a[0],a[1]);g.drawImage(im,0,0);g.setTransform(1,0,0,1,0,0)}else{g.fillStyle=fallback;g.fill()}
   if(shade){g.fillStyle='rgba(0,0,0,'+shade+')';g.fill()}
   g.restore();
  }
  const floorIm=W.image(W.floorTexture(level)),waterIm=W.image(W.waterTexture(level));
  const ground=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]!=='#')ground.push({x,y,d:P(x+.5,y+.5,0)[2]});
  ground.sort((a,b)=>a.d-b.d);
  for(const t of ground){const c=grid[t.y][t.x],water=c==='~',a=P(t.x,t.y,0),b=P(t.x+1,t.y,0),d=P(t.x,t.y+1,0);
   quad(water?waterIm:floorIm,a,b,d,water?'#426988':'#657651',water?0:.15);
   const poly=[a,b,P(t.x+1,t.y+1,0),d];faces.push({kind:water?'water':'floor',x:t.x,y:t.y,poly});
   if(!water&&!'.='.includes(c)){g.fillStyle='#f1d39a';const m=P(t.x+.5,t.y+.5,0);g.fillRect(Math.round(m[0])-1,Math.round(m[1])-1,3,3)}}
  const cubes=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]==='#')cubes.push({x,y,d:P(x+.5,y+.5,0)[2]});
  cubes.sort((a,b)=>a.d-b.d);
  const wallAt=(x,y)=>grid[y]?.[x]==='#';
  for(const c of cubes){
   for(const [f,[nx,ny]]of Object.entries(sides)){
    if(nx*sn+ny*cs<=0||wallAt(c.x+nx,c.y+ny))continue;
    // Corners of this side seen from outside, left to right.
    const e={n:[[c.x+1,c.y],[c.x,c.y]],e:[[c.x+1,c.y+1],[c.x+1,c.y]],s:[[c.x,c.y+1],[c.x+1,c.y+1]],w:[[c.x,c.y],[c.x,c.y+1]]}[f];
    const a=P(e[0][0],e[0][1],1),b=P(e[1][0],e[1][1],1),d=P(e[0][0],e[0][1],0);
    quad(W.image(W.wallTexture(level,c.x,c.y,f)),a,b,d,'#535967',f==='e'||f==='w'?.18:0);
    faces.push({kind:'wall',x:c.x,y:c.y,face:f,poly:[a,b,P(e[1][0],e[1][1],0),d]});
   }
   const t=[P(c.x,c.y,1),P(c.x+1,c.y,1),P(c.x+1,c.y+1,1),P(c.x,c.y+1,1)];
   g.fillStyle='#2a3038';g.beginPath();t.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();
   faces.push({kind:'wallTop',x:c.x,y:c.y,poly:t});
  }
  if(selection){const f=faces.find(q=>q.kind===selection.kind&&q.x===selection.x&&q.y===selection.y&&q.face===selection.face)||(['sky','floor','water'].includes(selection.kind)?faces.filter(q=>q.kind===selection.kind):null);
   for(const q of [].concat(f||[])){g.strokeStyle='#f1d39a';g.lineWidth=q.kind==='sky'?2:1.5;g.beginPath();q.poly.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke()}}
 }
 const inside=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>p[1])!==(yj>p[1])&&p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi)c=!c}return c};
 const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height]};
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,yaw,moved:false}});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>3)drag.moved=true;if(drag.moved){yaw=drag.yaw+dx*.012;render()}});
 canvas.addEventListener('pointerup',e=>{const d=drag;drag=null;if(!d||d.moved)return;const p=point(e);let hit=null;for(let i=faces.length-1;i>=0;i--)if(inside(p,faces[i].poly)){hit=faces[i];break}
  if(hit?.kind==='wallTop')hit=null;selection=hit?{kind:hit.kind,x:hit.x,y:hit.y,face:hit.face}:null;render();onPick?.(selection)});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(3,zoom*(e.deltaY<0?1.12:.89)));render()},{passive:false});
 const describe=s=>!s?'Ничего не выбрано — кликните по стене, полу, воде или небу.':s.kind==='wall'?'Стена '+s.x+','+s.y+', сторона: '+names[s.face]:s.kind==='floor'?'Пол уровня':s.kind==='water'?'Вода уровня':'Небо уровня';
 return {render,describe,get selection(){return selection},clear(){selection=null;render()}};
};
