// Teriberka merchant: catalog purchases are atomic when dropped into the inventory.
window.createTeriberkaShop=function({canvas,inputSurface,images,drawPanel,drawText,announce,onExit,budget=2300,completeLabel="НА КАРТУ"}){
 const ctx=canvas.getContext('2d');
 const welcome=LT('shop3.welcome');
 const goods=(rows)=>rows.map(([id,name,price])=>({id,name,price,line:LT('shop3.goodChoice',{item:name})}));
 const catalog=[
  {name:LT('shop3.catFood'),items:goods([['bread',LT('shop3.item_bread'),120],['blackbread',LT('shop3.item_blackbread'),100],['chips_red',LT('shop3.item_chips_red'),160],['chips_green',LT('shop3.item_chips_green'),160],['tin',LT('shop3.item_tin'),240],['sprats',LT('shop3.item_sprats'),210],['stew',LT('shop3.item_stew'),290],['potatoes',LT('shop3.item_potatoes'),140],['candy',LT('shop3.item_candy'),180]])},
  {name:LT('shop3.catAlcohol'),items:goods([['wine',LT('shop3.item_wine'),450],['beer',LT('shop3.item_beer'),180],['spirits',LT('shop3.item_spirits'),750],['beer_red',LT('shop3.item_beer_red'),220],['vodka_blue',LT('shop3.item_vodka_blue'),480],['vodka_red',LT('shop3.item_vodka_red'),560],['vodka_black',LT('shop3.item_vodka_black'),680],['cognac',LT('shop3.item_cognac'),890],['cocktail',LT('shop3.item_cocktail'),250]])},
  {name:LT('shop3.catFishing'),items:goods([['rod',LT('shop3.item_rod'),950],['hooks',LT('shop3.item_hooks'),160],['lure',LT('shop3.item_lure'),320],['reel',LT('shop3.item_reel'),650],['line',LT('shop3.item_line'),180],['float',LT('shop3.item_float'),90],['net',LT('shop3.item_net'),480],['wobbler',LT('shop3.item_wobbler'),390],['sinkers',LT('shop3.item_sinkers'),120]])},
  {name:LT('shop3.catSouvenirs'),items:[{id:'magnet',name:LT('shop3.item_magnet'),price:150,line:LT('shop3.line_magnet')},{id:'mug',name:LT('shop3.item_mug'),price:280,line:LT('shop3.line_mug')},{id:'leviathan',name:LT('shop3.item_leviathan'),price:600,line:LT('shop3.line_leviathan')},...goods([['magnet_lighthouse',LT('shop3.item_magnet_lighthouse'),170],['mug_wave',LT('shop3.item_mug_wave'),300],['magnet_coast',LT('shop3.item_magnet_coast'),190],['mug_sea',LT('shop3.item_mug_sea'),320],['magnet_north',LT('shop3.item_magnet_north'),200],['mug_teriberka',LT('shop3.item_mug_teriberka'),350]]).map(p=>({...p,icon:p.id.startsWith('magnet')?'magnet':'mug'}))]}
 ];
 const bag={x:198,y:176,w:115,h:57};
 let active=false,category=0,money=budget,inventory=[],selected=null,hovered=null,drag=null,won=false,hits=[],comment=welcome;
 function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
 function text(s,x,y,c='#dce5ed',align='left'){drawText(s,x,y,8,c,align)}
 function wrap(s,x,y,w,max=4,color='#cbd6df',gap=10){let lines=[];for(const paragraph of s.toUpperCase().split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(line&&pixelMeasure(line+' '+word)>w){lines.push(line);line=word}else line+=(line?' ':'')+word;}lines.push(line);}lines.slice(0,max).forEach((l,i)=>text(l,x,y+i*gap,color));}
 function speak(s){comment=s;announce(s);render()}
 function hit(label,x,y,w,h,fn){hits.push({label,x,y,w,h,fn})}
 function button(label,x,y,w,h,fn,chosen=false){drawPanel(x,y,w,h,'ui_button');if(chosen)rect(x+4,y+4,w-8,h-8,'#2b4059');currentUI.roleBlock(ctx,label,x,y,w,h,'buttons');hit(label,x,y,w,h,fn)}
 function reset(){money=budget;inventory=[];won=false;drag=null;category=0;selected=null;hovered=null;speak(welcome)}
 function changeCategory(i){category=i;selected=null;hovered=null;drag=null;const lines=[LT('shop3.aboutFood'),LT('shop3.aboutAlcohol'),LT('shop3.aboutFishing'),LT('shop3.aboutSouvenirs')];speak(lines[i])}
 function buy(product){
  hovered=null;if(won)return false;
  if(money<product.price){speak(LT('shop3.tooExpensive'));return false}
  const stack=inventory.find(item=>item.id===product.id);
  if(!stack&&inventory.length>=8){speak(LT('shop3.bagFull'));return false}
  money-=product.price;if(stack)stack.count++;else inventory.push({...product,count:1});
  if(product.id==='leviathan'){won=true;speak(LT('shop3.won'));return true}
  speak(product.line);return true;
 }
 function refund(item){
  const index=inventory.indexOf(item);if(index<0)return;
  money+=item.price;item.count--;if(item.count===0)inventory.splice(index,1);
  if(item.id==='leviathan')won=false;
  hovered=null;speak(LT('shop3.refund',{item:item.name,price:item.price}));
 }
 function icon(id,x,y,size=24){const item=catalog.flatMap(c=>c.items).find(p=>p.id===id);ctx.drawImage(images['shop_'+(item?.icon||id)],Math.round(x),Math.round(y),size,size)}
 let pressedHit=null;
 function render(){PeninsulaPopup.visible=false;
  if(!active)return;ctx.imageSmoothingEnabled=false;hits=[];currentUI.base(ctx,'shop3');
  currentUI.box(ctx,7,161,190,72,'#11171c','dialogue');currentUI.roleBlock(ctx,hovered?(window.PeninsulaDialogue?.itemText('shop:teriberka','hover',hovered.id)||LT('shop3.price',{item:hovered.name,price:hovered.price})+(money<hovered.price?'\n'+LT('shop3.priceShort'):'')):comment.replace(/(?<=[.!?])\s+/g,'\n'),8,166,188,66,'dialogue');
  rect(269,162,40,12,'#11171c');currentUI.resource(ctx,LT('shop3.cash'),money.toLocaleString('ru-RU'));
  catalog.forEach((cat,i)=>{const x=198+(i%2)*58,y=40+Math.floor(i/2)*17;hit(cat.name,x,y,57,16,()=>changeCategory(i));if(category===i){ctx.strokeStyle='#e5c695';ctx.strokeRect(x+.5,y+.5,56,15)}});
  catalog[category].items.forEach((product,i)=>{const x=198+(i%4)*29,y=74+Math.floor(i/4)*29;if(selected?.id===product.id||hovered?.id===product.id)rect(x+1,y+1,26,26,'#635443');icon(product.id,x+2,y+2,24);hit(product.name+' — '+product.price+' рублей',x,y,28,28,()=>{});hits[hits.length-1].product=product;});
  for(let i=0;i<8;i++){const x=198+(i%4)*29,y=176+Math.floor(i/4)*29;const item=inventory[i];if(item){icon(item.id,x+2,y+2,24);if(item.count>1)PeninsulaText.line(ctx,String(item.count),x+25,y+16,'data',currentUI.fonts,'right');hit('Вернуть '+item.name,x,y,28,28,()=>refund(item))}}
  if(won){const b=currentUI.modal(ctx,LT('shop3.popupTitle'),LT('shop3.popupBody'));hits=[];hit(b.label,b.x,b.y,b.w,b.h,onExit)}if(drag)icon(drag.product.id,drag.x-12,drag.y-12,24);currentUI.pressFx(ctx,pressedHit);drawGameBorder(ctx);
 }
 const contains=(p,r)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
 function point(e){const b=inputSurface.getBoundingClientRect();return{x:(e.clientX-b.left)*320/b.width,y:(e.clientY-b.top)*240/b.height}}
 inputSurface.addEventListener('pointerdown',e=>{
  if(!active||e.button!==0)return;e.preventDefault();const p=point(e),target=hits.find(h=>contains(p,h));if(!target)return;
  if(target.product){selected=target.product;hovered=target.product;drag={id:e.pointerId,product:target.product,x:p.x,y:p.y};inputSurface.setPointerCapture(e.pointerId);render()}else{if(pressedHit)return;pressedHit=target;render();setTimeout(()=>{pressedHit=null;target.fn();render()},170)}
 });
 inputSurface.addEventListener('pointermove',e=>{if(!active)return;const p=point(e);if(drag){if(drag.id!==e.pointerId)return;drag.x=p.x;drag.y=p.y;render();return}const product=won?null:hits.find(h=>h.product&&contains(p,h))?.product||null;if(product?.id!==hovered?.id){hovered=product;render();}});
 inputSurface.addEventListener('pointerleave',()=>{if(active&&!drag&&hovered){hovered=null;render();}});
 inputSurface.addEventListener('pointerup',e=>{
  if(!active||!drag||drag.id!==e.pointerId)return;e.preventDefault();const p=point(e),product=drag.product;drag=null;hovered=null;if(inputSurface.hasPointerCapture(e.pointerId))inputSurface.releasePointerCapture(e.pointerId);// Dropped on the merchant: your dialogue card for this item speaks, otherwise the price.
if(contains(p,bag))buy(product);else speak(contains(p,{x:7,y:22,w:190,h:138})&&window.PeninsulaDialogue?.itemText('shop:teriberka','give',product.id)||LT('shop3.price',{item:product.name,price:product.price}));render();
 });
 inputSurface.addEventListener('pointercancel',()=>{if(active){drag=null;render()}});
 window.addEventListener('keydown',e=>{
  if(!active)return;
  if(e.key.toLowerCase()==='r'){e.preventDefault();reset();return}
  if(won){if(e.key==='Enter'||e.key===' '){e.preventDefault();onExit()}return}
  if(['1','2','3','4'].includes(e.key)){e.preventDefault();changeCategory(Number(e.key)-1)}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const list=catalog[category].items,index=list.findIndex(p=>p.id===selected?.id);selected=list[(index+(e.key==='ArrowRight'?1:list.length-1)+list.length)%list.length];hovered=selected;render()}
  if(e.key==='Enter'&&selected){e.preventDefault();buy(selected)}
  if(e.key.toLowerCase()==='r'){e.preventDefault();reset()}
 });
 return{buy,changeCategory,catalog,snapshot:()=>({money,inventory:inventory.map(i=>({...i})),won,category}),start(){active=true;render();announce(comment)},stop(){active=false;drag=null},render};
};
