// Builds the Miro story map (Canvas Composer SVG) from dist/story.js: one frame per chapter,
// one card per screen ("code · type" on the first line, then the player-facing text), arrows for transitions.
// Usage: node tools/story-to-miro.cjs out.svg
const fs=require('fs');const w={};new Function('window',fs.readFileSync(require('path').join(__dirname,'../dist/story.js'),'utf8'))(w);
const {nodes,chapterQuestions}=w.PENINSULA_STORY;
const K=12,X0=287768,Y0=-50000;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const games={sredny:'гонка',coast:'лагерь',bear:'медведь',house:'заброшка',village:'поиск лавки',shop:'торговец',fog:'туманная гонка',exchange:'странник',platform:'платформер',home:'дорога домой'};
const typeName={story:'экран',game:'уровень',question:'вопрос',victory:'награда',epilogue:'эпилог'};
const style={story:['#9CE6FF','#2C97BB','#1C4657','rect'],game:['#B3E65F','#6E9A24','#2F440B','flow_chart_predefined_process'],question:['#FFE86D','#A28E26','#574900','rect'],victory:['#B8ACFB','#8A7BE0','#231266','rect'],epilogue:['#B8ACFB','#8A7BE0','#231266','rect'],special:['#DDDDD8','#8A8A7E','#434339','round_rectangle']};
const places=['Полуостров Средний','Дальние Зеленцы','Териберка','Перевал Геологов','Хибины'];
const specials={title:'Заставка 1',hero:'Создание персонажа',map:'Карта'};
// rows: [title, [items]] ; item = node id | special id with suffix
const rows=[
 ['Вступление',['@title','intro2','intro3','intro4','@hero','intro5','@map']],
];
for(let c=0;c<5;c++){const ids=Object.keys(nodes).filter(k=>k.startsWith((c+1)+'.')||['drive1','camp1','sleep','win1','bear2','ruin','house2','win2','village3','shop3','win3','fog4','exchange4','win4','platform5','home','traffic5','win5','epilogue'].includes(k)&&chapterOf(k)===c);
 rows.push(['Глава '+(c+1)+' · '+places[c],['@map','q'+c,...order(c)]]);}
function chapterOf(k){const m={drive1:0,camp1:0,sleep:0,win1:0,bear2:1,ruin:1,house2:1,win2:1,village3:2,shop3:2,win3:2,fog4:3,exchange4:3,win4:3,platform5:4,home:4,traffic5:4,win5:4,epilogue:4};return m[k]}
function order(c){const out=[];let id=(c+1)+'.1';while(id&&nodes[id]&&!out.includes(id)){out.push(id);id=nodes[id].next}if(id&&specials[id])out.push('@'+id+'#end');if(!out.includes('@map#end'))out.push('@map#end');return out}
const all={...nodes};for(let c=0;c<5;c++)all['q'+c]={type:'question',body:chapterQuestions[c],next:(c+1)+'.1',no:c===3?'4.1':'map'};
const cw=300,ch=170,gap=90,pad=64,top=150;let y=Y0,out=[];
out.push(`<textArea x="${X0}" y="${-57500}" width="${60000}" font-size="${40*K}" fill="#595959">Схема сюжета игры, собрана из файла dist/story.js. Каждая карточка — экран игры: в первой строке его код и тип (код не менять), ниже — текст, который видит игрок. Стрелки — переходы; у вопросов подписаны «Да» и «Нет». Цвет: голубой — экран, зелёный — уровень, жёлтый — вопрос, фиолетовый — награда, серый — карта и служебные экраны. Правьте тексты и стрелки здесь, затем напишите Claude «синхронизируй Miro».</textArea>`);
rows.forEach(([title,items],ri)=>{
 const fw=pad*2+items.length*cw+(items.length-1)*gap,fh=top+ch+pad+130;
 const fid='f'+ri;let body=[],lines=[];const pos={};
 items.forEach((it,i)=>{const lid=fid+'_'+i;pos[it.replace('#end','')+(it.endsWith('#end')?'#end':'')]=lid;
  const x=pad+i*(cw+gap),yy=top;let st,label;
  if(it.startsWith('@')){const sp=it.slice(1).replace('#end','');st=style.special;label=`<b>${specials[sp]}</b>`;}
  else{const n=all[it];st=style[n.type];const kind=n.type==='game'?'уровень: '+games[n.game]:typeName[n.type];label=`<b>${it} · ${kind}</b>`+(n.type==='game'?'':`<br><br>${(n.body||'(без текста)').replace(/\n/g,'<br>')}`);}
  body.push(`<rect id="${lid}" x="${x*K}" y="${yy*K}" width="${cw*K}" height="${ch*K}" ${st[3]==='rect'?'':`data-shape="${st[3]}" `}fill="${st[0]}" stroke="${st[1]}" stroke-width="2" data-text-color="${st[2]}" data-font-size="${14*K}" data-font-family="noto_sans" data-text-align="left" data-text-align-vertical="top" data-content="${esc(label)}" />`);});
 // connectors
 const idx=it=>items.indexOf(it);
 items.forEach((it,i)=>{if(i===items.length-1)return;const a=fid+'_'+i;
  if(it.startsWith('@')){if(i===0||it==='@hero')lines.push([a,fid+'_'+(i+1),'']);return}
  const n=all[it];const nextIt=items[i+1];
  if(n.type==='question'){lines.push([a,fid+'_'+(i+1),'Да']);
   const noTarget=n.no==='map'?items.indexOf('@map#end'):idx(n.no);
   if(noTarget>=0)lines.push([a,fid+'_'+noTarget,'Нет','bottom']);
   else {/* no-branch to map with no end chip */}
  } else lines.push([a,fid+'_'+(i+1),'']);});
 const conn=lines.map(([a,b,l,side])=>`<line x1="0" y1="0" x2="0" y2="0" stroke="#313131" stroke-width="2" data-arrow="end" data-shape="elbowed" data-start="${a}" data-end="${b}" data-start-side="${side||'right'}" data-end-side="${side||'left'}"${l?` data-content="${l}"`:''} />`);
 out.push(`<g id="${fid}" transform="translate(${X0},${y})" data-frame="${esc(title)}"><rect data-type="frame" x="0" y="0" width="${fw*K}" height="${fh*K}" fill="#ffffff" data-title="${esc(title)}" /><text x="${pad*K}" y="${(pad+44)*K}" font-size="${44*K}" font-weight="bold" font-family="noto_sans" fill="#1a1a1a">${esc(title)}</text>${conn.join('')}${body.join('')}</g>`);
 y+=fh*K+160*K;});
fs.writeFileSync(process.argv[2]||'story-miro.svg','<svg xmlns="http://www.w3.org/2000/svg">\n'+out.join('\n')+'\n</svg>');
console.log(rows.map(r=>r[0]+': '+r[1].join(' ')).join('\n'));console.log('bytes',fs.statSync(process.argv[2]||'story-miro.svg').size);
