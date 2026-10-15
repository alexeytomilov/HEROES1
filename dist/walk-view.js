// Shared pixel renderer: textured horizontal planes, map walls and depth-tested sprites.
window.createWalkView=function({images,indoor=false,forest=false,level=null}){
 const w=188,h=136,horizon=45,focal=94,eye=.45,output=document.createElement('canvas');output.width=w;output.height=h;
 const g=output.getContext('2d'),frame=g.createImageData(w,h),cache={};
 function texture(key){if(cache[key])return cache[key];const im=images[key]||window.PeninsulaWalk?.image(key);if(!im)return null;const c=document.createElement('canvas');c.width=128;c.height=128;const q=c.getContext('2d');q.imageSmoothingEnabled=false;q.drawImage(im,0,0,128,128);return cache[key]=q.getImageData(0,0,128,128).data;}
 const floor=texture(indoor?'walk_floor':forest?'bear_floor':'shore_ground'),wall=texture(indoor?'walk_wall':forest?'bear_wall':'walk_cliff');
 const sea=texture('shore_west'),sky=texture('shore_north');
 function sample(data,u,v){return (((v%128+128)%128)*128+(u%128+128)%128)*4}
 // Walk edits (walk-edits.js) choose the floor, a texture per wall cell and sprite replacements for this level.
 const W=window.PeninsulaWalk,edited=k=>level&&W?texture(k):null;
 function render(ctx,view,grid,x,y,dir,objects=[]){
  const floorTex=edited(W?.floorTexture(level))||floor,wallAt=(mx,my)=>edited(W?.wallTexture(level,mx,my))||wall;let hx=0,hy=0;
  const vectors=[[0,-1],[1,0],[0,1],[-1,0]], [fx,fy]=vectors[dir],rx=-fy,ry=fx,px=x+.5,py=y+.5,zbuf=new Float32Array(w).fill(999),d=frame.data;
  const cell=(a,b)=>grid[Math.floor(b)]?.[Math.floor(a)]|| (indoor?'#':'~');
  function put(cx,cy,tex,i,shade){const o=(cy*w+cx)*4;d[o]=tex[i]*shade;d[o+1]=tex[i+1]*shade;d[o+2]=tex[i+2]*shade;d[o+3]=255;}
  for(let cy=0;cy<h;cy++)for(let cx=0;cx<w;cx++){
   if(cy<=horizon){if(indoor){const o=(cy*w+cx)*4;d[o]=22;d[o+1]=25;d[o+2]=28;d[o+3]=255;}else put(cx,cy,sky,sample(sky,Math.floor(cx*128/w),Math.floor(cy*42/horizon)),1);continue;}
   const depth=eye*focal/(cy-horizon),side=(cx-w/2)/focal*depth,wx=px+fx*depth+rx*side,wy=py+fy*depth+ry*side;
   const water=cell(wx,wy)==='~',tex=water?sea:floorTex,u=Math.floor(wx*64),v=Math.floor(wy*64);
   const trail=cell(wx,wy)==='=';
   put(cx,cy,tex,water?sample(sea,40+(u%45),65+(v%40)):sample(tex,u,v),Math.max(.35,1-depth*.055)*(trail?1.18:1));
  }
  for(let cx=0;cx<w;cx++){
   const side=(cx+.5-w/2)/focal,dx=fx+rx*side,dy=fy+ry*side;
   let mx=x,my=y;const ddx=dx===0?1e9:Math.abs(1/dx),ddy=dy===0?1e9:Math.abs(1/dy),sx=dx<0?-1:1,sy=dy<0?-1:1;
   let tx=(dx<0?px-mx:mx+1-px)*ddx,ty=(dy<0?py-my:my+1-py)*ddy,dist=999,axis=0;
   for(let n=0;n<40;n++){if(tx<ty){dist=tx;tx+=ddx;mx+=sx;axis=0}else{dist=ty;ty+=ddy;my+=sy;axis=1}if(mx<0||my<0||my>=grid.length||mx>=grid[0].length)break;if(grid[my][mx]==='#'){zbuf[cx]=dist;hx=mx;hy=my;break}dist=999;}
   if(dist===999||zbuf[cx]===999)continue;
   const wallHeight=indoor?1.5:1.25,top=horizon-(wallHeight-eye)*focal/dist,bottom=horizon+eye*focal/dist;
   const pos=axis===0?py+dy*dist:px+dx*dist,u=Math.floor((pos-Math.floor(pos))*128),shade=Math.max(.28,1-dist*.075)*(axis===0?.82:1);
   const wt=wallAt(hx,hy);for(let cy=Math.max(0,Math.ceil(top));cy<Math.min(h,Math.ceil(bottom));cy++)put(cx,cy,wt,sample(wt,u,Math.floor((cy-top)/(bottom-top)*128)),shade);
  }
  g.putImageData(frame,0,0);ctx.drawImage(output,view.x,view.y);
  const visible=[];const sorted=objects.map(o=>{const ax=o.x-px,ay=o.y-py;return{...o,depth:ax*fx+ay*fy,side:ax*rx+ay*ry}}).filter(o=>o.depth>.18).sort((a,b)=>b.depth-a.depth);
  ctx.save();ctx.beginPath();ctx.rect(view.x,view.y,w,h);ctx.clip();
  for(const o of sorted){const im=(level&&W?.spriteImage(level,o.asset))||images[o.asset],height=Math.round((o.height||.65)*focal/o.depth),width=Math.round(height*(o.ratio||im.width/im.height)),left=Math.round(w/2+o.side*focal/o.depth-width/2),bottom=Math.round(horizon+eye*focal/o.depth),top=bottom-height;
   let first=w,last=-1;for(let col=Math.max(0,left);col<Math.min(w,left+width);col++){if(o.depth>=zbuf[col])continue;ctx.drawImage(im,Math.floor((col-left)/width*im.width),0,1,im.height,view.x+col,view.y+top,1,height);first=Math.min(first,col);last=Math.max(last,col);}
   if(last>=first&&bottom>0&&top<h)visible.push({...o,rect:{x:view.x+first,y:view.y+Math.max(0,top),w:last-first+1,h:Math.min(h,bottom)-Math.max(0,top)}});
  }
  ctx.restore();return visible;
 }
 return{render};
};
