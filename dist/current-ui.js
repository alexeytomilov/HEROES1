// Shared presentation for the complete journey and restored engines.
window.currentUI={rpgPortraits:{},images:{},glyphs:{},fonts:{},layouts:[],assets:{},settings:{textColor:'#bec4c9',lineColor:'#91a1ad',headingBackground:'#293640',headingColor:'#bec4c9',lineStep:13,padding:5,resourcePadding:5,narratorOffset:0,resourceOffset:1}};
try{Object.assign(currentUI.settings,JSON.parse(localStorage.getItem('peninsula-layout-settings')||'{}'))}catch{}
const uiLoad=path=>new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=()=>reject(Error(path));im.src=path});
const uiKeys=['entry0','q0','1.1','drive1','1.2','camp1','1.3','sleep','1.4','win1','entry1','q1','2.1','bear2','2.2','2.3','ruin','house2','win2','entry2','q2','3.1','village3','3.2','shop3','win3','entry3','q3','4.1','fog4','4.2','exchange4','win4','entry4','q4','5.1','platform5','5.2','home','traffic5','win5','title','intro2','intro3','intro4','hero2','hero0','hero1','intro5','map'];
currentUI.ready=Promise.all([
 PeninsulaVictoryAnimation.ready,
 ...['knight','wanderer','mage'].map(async name=>currentUI.rpgPortraits[name]=await uiLoad('assets/rpg-portrait-'+name+'.png')),
 ...uiKeys.map(async k=>currentUI.images[k]=await uiLoad('assets/sharp/'+k+'-bg.png')),
 ...['cozette','unifont'].map(async name=>{const [image,rows]=await Promise.all([uiLoad('assets/'+name+'.png'),fetch('assets/'+name+'.json').then(r=>r.json())]);currentUI.fonts[name]={image,height:name==='unifont'?16:13,glyphs:Object.fromEntries(rows.map(g=>[g.ch,g]))}}),
 fetch('assets/current/native-text.json').then(r=>r.json()).then(r=>currentUI.rows=r),
 fetch('figma-layouts.json').then(r=>r.json()).then(async layouts=>{currentUI.layouts=layouts;const hashes=[...new Set(layouts.flatMap(s=>s.items.flatMap(n=>(n.fills||[]).filter(p=>p.type==='IMAGE').map(p=>p.hash))))];await Promise.all(hashes.map(async hash=>currentUI.assets[hash]=await uiLoad('assets/'+hash+'.png')))}),
 uiLoad('assets/intro5-full.png').then(im=>currentUI.intro5Full=im),
 uiLoad('assets/latest-stone.png').then(im=>currentUI.stone=im)
]).then(()=>currentUI.tint());
currentUI.tint=()=>{currentUI.backgrounds={};for(const [name,f]of Object.entries(currentUI.fonts)){const c=document.createElement('canvas');c.width=f.image.width;c.height=f.image.height;const g=c.getContext('2d');g.drawImage(f.image,0,0);g.globalCompositeOperation='source-in';g.fillStyle=name==='unifont'?currentUI.settings.headingColor:currentUI.settings.textColor;g.fillRect(0,0,c.width,c.height);f.atlas=c;}currentUI.glyphs=currentUI.fonts.cozette.glyphs};
// Case belongs to the assigned preset, never to an individual screen.
currentUI.case=s=>String(s);
currentUI.measure=(s,name='cozette')=>{const chars=[...String(s)],spacing=PeninsulaText.get(name==='unifont'?'heading':'technical').letterSpacing;return chars.reduce((n,ch)=>n+(currentUI.fonts[name].glyphs[ch]?.w||6),0)+Math.max(0,chars.length-1)*spacing};
currentUI.text=(c,s,x,y,align='left',color,name='cozette')=>{const role=name==='unifont'?'heading':'technical',style=PeninsulaText.get(role),f=currentUI.fonts[name],original=s;s=PeninsulaText.format(PeninsulaText.text(s),role);{const w=Math.max(...String(s).split('\n').map(l=>currentUI.measure(l,name)));PeninsulaText.record(c,original,Math.round(x-(align==='center'?w/2:align==='right'?w:0)),Math.round(y),w,String(s).split('\n').length*(f.height+style.lineSpacing))}c.imageSmoothingEnabled=false;for(const [i,line]of String(s).split('\n').entries()){let ox=Math.round(x-(align==='center'?currentUI.measure(line,name)/2:align==='right'?currentUI.measure(line,name):0));for(const ch of line){const g=f.glyphs[ch]||f.glyphs['?'];if(g&&ch!==' ')c.drawImage(f.atlas,g.x,g.y,10,f.height,ox,Math.round(y)+i*(f.height+style.lineSpacing),10,f.height);ox+=(g?.w||6)+style.letterSpacing}}};
currentUI.lines=(s,w)=>{const result=[];for(const para of String(s).split('\n')){let line='';for(const word of para.split(/\s+/)){if(line&&currentUI.measure(line+' '+word)>w){result.push(line);line=word}else line+=(line?' ':'')+word}result.push(line)}return result};
currentUI.clip=(c,x,y,w,h,fn)=>{c.save();c.beginPath();c.rect(x,y,w,h);c.clip();fn();c.restore()};
currentUI.block=(c,s,x,y,w,h,align='left',offset=0)=>{const pad=align==='center'?0:currentUI.settings.padding;const rows=currentUI.lines(s,w-pad*2);currentUI.clip(c,x,y,w,h,()=>rows.forEach((line,i)=>currentUI.text(c,line,align==='center'?x+w/2:align==='right'?x+w-pad:x+pad,y+offset+i*currentUI.settings.lineStep,align)))};
currentUI.wrap=(c,s,x,y,w,max=6)=>currentUI.block(c,currentUI.case(s),x,y,w,max*currentUI.settings.lineStep);
currentUI.box=(c,x,y,w,h,fill='#293640',role='default')=>PeninsulaColors.box(c,x,y,w,h,role);
currentUI.header=(c,title)=>{currentUI.box(c,0,0,320,22,currentUI.settings.headingBackground,'heading');currentUI.text(c,currentUI.case(title),160,2,'center',null,'unifont')};
currentUI.resource=(c,label,value)=>{currentUI.box(c,198,161,115,14,'#11171c','power');currentUI.roleBlock(c,label+' '+value,199,161,113,13,'data')};
currentUI.slots=c=>{for(let i=0;i<8;i++)currentUI.box(c,198+i%4*29,176+Math.floor(i/4)*29,28,28,'#18242b','inventory')};
currentUI.patterns={left:['00100','01100','11111','01100','00100'],up:['00100','01110','11111','00100','00100'],right:['00100','00110','11111','00110','00100'],down:['00100','00100','11111','01110','00100'],sword:['000001','000011','000110','001100','111000','010000'],eye:['0011100','0100010','1001001','0100010','0011100']};
currentUI.controls=c=>{for(const [kind,x,y]of [['left',118,161],['up',145,161],['right',172,161],['sword',118,183],['down',145,183],['eye',172,183]]){currentUI.box(c,x,y,x===172?25:26,21,['eye','sword'].includes(kind)?'#655848':'#293640','buttons');const rows=currentUI.patterns[kind],left=Math.round(x+(26-rows[0].length*2)/2),top=Math.round(y+(21-rows.length*2)/2);c.fillStyle=currentUI.settings.textColor;rows.forEach((r,yy)=>[...r].forEach((v,xx)=>{if(v==='1')c.fillRect(left+xx*2,top+yy*2,2,2)}))}};
currentUI.paint=(c,im,p,n)=>{if(p.mode==='FIT'){const ratio=Math.min(n.w/im.width,n.h/im.height),w=Math.round(im.width*ratio),h=Math.round(im.height*ratio);c.drawImage(im,Math.round(n.x+(n.w-w)/2),Math.round(n.y+(n.h-h)/2),w,h)}else c.drawImage(im,Math.round(n.x),Math.round(n.y),Math.round(n.w),Math.round(n.h))};
currentUI.layout=(c,key)=>{const layout=currentUI.layouts.find(s=>s.key===key);if(!layout)return;PeninsulaColors.fill(c,0,0,320,240);
 for(const n of layout.items){if(n.type==='TEXT'||key==='title'&&(n.name.includes('НАЧАТЬ ИГРУ')||n.id.includes('67:1537')))continue;
  const role=PeninsulaColors.role(n),root=n.x===0&&n.y===0&&n.w===320&&n.h===240;
  const pictures=(n.fills||[]).filter(p=>p.type==='IMAGE');
  if(root){if(n.stroke)PeninsulaColors.outline(c,0,0,320,240);continue}
  if(n.stroke||n.color||(n.fills||[]).some(p=>p.type==='SOLID')){
   // One-pixel icon masks are foreground art, not surface blocks.
   if(n.w===1&&n.h===1){c.fillStyle=currentUI.settings.textColor;c.fillRect(n.x,n.y,1,1);continue}
   PeninsulaColors.fill(c,n.x,n.y,n.w,n.h,role);
  }
  for(const p of pictures)currentUI.paint(c,currentUI.assets[p.hash],p,n);
  if(n.stroke)PeninsulaColors.outline(c,n.x,n.y,n.w,n.h,role);
 }
};
currentUI.hero=(c,key)=>{
 currentUI.layout(c,key);
 const texts=currentUI.layouts.find(s=>s.key===key).items.filter(n=>n.type==='TEXT'&&n.text),get=s=>texts.find(n=>n.id.endsWith(s));
 // Hero texts come from the level text catalog (heroes.*), keyed by the layout's hero name.
 const hk=key.replace('hero-',''),name={text:LT('heroes.'+hk+'_name')},labels={text:LT('heroes.statLabels')},values={text:LT('heroes.'+hk+'_stats')},ability={text:LT('heroes.'+hk+'_caste')+'\n'+LT('heroes.'+hk+'_ability')},description={text:LT('heroes.'+hk+'_description')};
 // Character stats use their own text type; padding, size, color and line spacing come from its preset.
 const st=PeninsulaText.metrics('stats',currentUI.fonts),pad=st.s.padding,step=st.step,top=st.s.offset,line=(t,x,y,align='left')=>PeninsulaText.line(c,t,x,y,'stats',currentUI.fonts,align);
 currentUI.header(c,LT('heroes.header'));
 currentUI.box(c,7,22,190,140,'#293640','stats');
 currentUI.clip(c,8,23,188,138,()=>{
  line(name.text,102,24+top,'center');
  const ls=labels.text.split('\n').filter(Boolean),vs=values.text.split('\n').filter(Boolean);
  ls.forEach((l,i)=>{line(l.replace(/:$/,'')+':',7+pad,43+top+i*step);line(vs[i]||'',197-pad,43+top+i*step,'right')});
  const y=43+top+ls.length*step+3,a=ability.text.split('\n');
  line(LT('heroes.casteLabel'),7+pad,y);line(a[0],120+pad-5,y);
  line(LT('heroes.abilityLabel'),7+pad,y+step);line(a[1],120+pad-5,y+step);
 });
 currentUI.box(c,7,163,190,48,'#293640','narrator');
 currentUI.roleBlock(c,description.text.replace(/\s+/g,' '),8,164,188,46,'heroDescription');
 for(const n of texts.filter(n=>n.id.endsWith(';3:23')))currentUI.roleBlock(c,n.text==='←'?'<':n.text==='→'?'>':currentUI.case(n.text),n.x,214,n.w,20,'buttons');
};
currentUI.base=(c,key)=>{c.imageSmoothingEnabled=false;c.clearRect(0,0,320,240);PeninsulaColors.fill(c,0,0,320,240);
 if(key==='intro5'){c.drawImage(currentUI.intro5Full,0,0);return}
 if(key==='title'){currentUI.layout(c,'title');currentUI.roleBlock(c,LT('ui.firstScreen'),8,138,304,45,'firstScreen');return}
 if(/^hero[012]$/.test(key)){currentUI.hero(c,['hero-wanderer','hero-mage','hero-knight'][Number(key.at(-1))]);return}
 if(['shop3','exchange4'].includes(key)){currentUI.layout(c,key==='shop3'?'merchant':'wanderer');currentUI.header(c,key==='shop3'?'Териберка':'Перевал Геологов');currentUI.slots(c);const cats=key==='shop3'?[LT('shop3.tabFood'),LT('shop3.tabAlcohol'),LT('shop3.tabFishing'),LT('shop3.tabSouvenirs')]:[LT('exchange4.tabExchange'),LT('exchange4.tabThings'),LT('exchange4.tabFood'),LT('exchange4.tabGear')];cats.forEach((label,i)=>{const x=198+i%2*58,y=40+Math.floor(i/2)*17;currentUI.box(c,x,y,57,16,'#655848','tabs');currentUI.roleBlock(c,label,x,y,57,16,'tabs')});return}
 const background=currentUI.images[key];if(background){if(!currentUI.backgrounds[key]){const out=document.createElement('canvas');out.width=320;out.height=240;const g=out.getContext('2d');g.drawImage(background,0,0);const data=g.getImageData(0,0,320,240),color=currentUI.settings.lineColor.match(/\w\w/g).map(v=>parseInt(v,16));for(let i=0;i<data.data.length;i+=4)if(data.data[i]===145&&data.data[i+1]===161&&data.data[i+2]===173){for(let j=0;j<3;j++)data.data[i+j]=color[j]}g.putImageData(data,0,0);currentUI.backgrounds[key]=out;}c.drawImage(currentUI.backgrounds[key],0,0);}
 if(['camp1','bear2','house2','village3'].includes(key)){PeninsulaColors.fill(c,1,22,318,217);PeninsulaColors.fill(c,7,22,306,212);currentUI.box(c,7,22,190,138);currentUI.box(c,198,22,115,138,'#293640','situation');currentUI.text(c,LT('ui.situationTitle'),255.5,27,'center');currentUI.controls(c);currentUI.box(c,7,205,190,28,'#11171c','dialogue');currentUI.resource(c,LT('ui.power'),'80%');currentUI.slots(c);currentUI.header(c,key==='camp1'?LT('ui.placeFull_sredny'):key==='village3'?LT('ui.placeFull_teriberka'):LT('ui.placeFull_zelentsy'));return}
 if(['drive1','fog4','traffic5','platform5'].includes(key)){PeninsulaColors.outline(c,7,22,306,138);for(const [x,y,w,h]of [[1,22,6,217],[313,22,6,217],[7,160,306,1],[197,161,1,78],[7,234,306,5]])PeninsulaColors.fill(c,x,y,w,h);currentUI.box(c,7,161,190,72,'#11171c','dialogue');currentUI.resource(c,'','');currentUI.slots(c);}
 const rows=currentUI.rows[key]||[];
 // A story screen without a drawn background yet (like «Экран 0») still gets the picture frame and its text from the script.
 const isStory=rows.some(r=>r.y>=150&&r.w>280)&&!['platform5','drive1','fog4','traffic5','map'].includes(key)||!background&&!rows.length&&window.PENINSULA_STORY?.nodes?.[key]?.type==='story';
 // Image and text blocks share one 1px divider at row 152 instead of stacking two outlines.
 if(isStory){PeninsulaColors.box(c,1,1,318,152,'storyImage');if(background)currentUI.clip(c,2,2,316,150,()=>c.drawImage(currentUI.backgrounds[key],0,0));if(key==='win1')PeninsulaVictoryAnimation.draw(c);currentUI.box(c,1,152,318,87,'#11171c','narrator');// Screen text comes from the journey script (dist/story.js); the Figma export is only a fallback.
 const scripted=window.PENINSULA_STORY?.nodes?.[key]?.body,body=(scripted!=null&&scripted!==''?scripted:rows.filter(r=>r.y>=150&&r.w>280).map(r=>r.text).join('\n')).replace(/\n\s*\n/g,'\n');currentUI.roleBlock(c,body,8,164,304,69,'narrator')}
 for(const r of rows){if(isStory&&r.y>=150&&r.w>280)continue;if(r.y<22&&r.w>200){currentUI.header(c,r.text);continue}const align=(r.align||'LEFT').toLowerCase();currentUI.roleBlock(c,currentUI.case(r.text),Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.max(13,Math.round(r.h)),r.x>=198&&r.y>=161&&r.y<176?'data':r.x>=198&&r.y>=40&&r.y<160?'situation':r.y>=160?'dialogue':'technical')}
 PeninsulaColors.outline(c,0,0,320,240);
};
currentUI.modal=(c,title,body)=>{currentUI.box(c,50,70,220,100,'#11171c','question');currentUI.text(c,currentUI.case(title),160,76,'center');currentUI.block(c,currentUI.case(body),56,93,208,47);currentUI.box(c,105,144,110,19,'#655848','buttons');currentUI.text(c,LT('ui.continue'),160,146,'center')};
currentUI.bag=(c,items,images)=>items.slice(0,8).forEach((id,i)=>{if(images[id])c.drawImage(images[id],200+i%4*29,178+Math.floor(i/4)*29,24,24)});

// Semantic blocks share the four user-editable text presets.
currentUI.roleBlock=(c,s,x,y,w,h,role='narrator')=>PeninsulaText.block(c,s,x,y,w,h,role,currentUI.fonts);
currentUI.block=(c,s,x,y,w,h)=>currentUI.roleBlock(c,s,x,y,w,h,'narrator');
currentUI.header=(c,title)=>{currentUI.box(c,0,0,320,22,currentUI.settings.headingBackground,'heading');currentUI.roleBlock(c,currentUI.case(title),1,2,318,20,'heading')};
