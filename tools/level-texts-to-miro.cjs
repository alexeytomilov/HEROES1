// Builds the Miro "texts inside levels" section (Canvas Composer SVG) from dist/level-texts.js:
// one frame per level with its logic paragraph and one card per text ("level.key", when it appears, the text).
// Usage: node tools/level-texts-to-miro.cjs out-prefix  -> out-prefix-1.svg, out-prefix-2.svg ... (each under the tool size limit)
const fs=require('fs'),path=require('path');const w={};new Function('window',fs.readFileSync(path.join(__dirname,'../dist/level-texts.js'),'utf8'))(w);
const levels=w.PENINSULA_LEVEL_TEXTS,K=12,X0=287768,Y0=2000,COLS=6,cw=300,ch=170,gap=24,pad=64,colGap=160;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const frames=[];let col=[Y0,Y0];const frameW=pad*2+COLS*cw+(COLS-1)*gap;
const header=`<text x="${X0}" y="${Y0-1200}" font-size="${90*K}" font-weight="bold" font-family="noto_sans" fill="#1a1a1a">Тексты внутри уровней</text>`;
Object.entries(levels).forEach(([lid,lv],li)=>{
 const keys=Object.keys(lv.texts),rows=Math.ceil(keys.length/COLS),logicH=150,top=pad+60+logicH+32;
 const fh=top+rows*ch+(rows-1)*gap+pad,c=col[0]<=col[1]?0:1,fx=X0+c*(frameW+colGap)*K,fy=col[c];col[c]+=fh*K+colGap*K;
 const cards=keys.map((k,i)=>{const t=lv.texts[k],x=pad+(i%COLS)*(cw+gap),y=top+Math.floor(i/COLS)*(ch+gap);
  const label=`<b>${lid}.${k}</b><br><i>${t.when}</i><br><br>${t.text.replace(/\n/g,'<br>')}`;
  return `<rect x="${x*K}" y="${y*K}" width="${cw*K}" height="${ch*K}" fill="#FFFFFF" stroke="#757575" data-font-size="${12*K}" data-text-align="left" data-text-align-vertical="top" data-content="${esc(label)}"/>`}).join('');
 frames.push(`<g id="lf${li}" transform="translate(${fx},${fy})" data-frame="${esc(lv.title)}"><rect data-type="frame" x="0" y="0" width="${frameW*K}" height="${fh*K}" fill="#ffffff" data-title="${esc(lv.title)}" /><text x="${pad*K}" y="${(pad+44)*K}" font-size="${44*K}" font-weight="bold" font-family="noto_sans" fill="#1a1a1a">${esc(lv.title)}</text><textArea x="${pad*K}" y="${(pad+70)*K}" width="${(frameW-pad*2)*K}" font-size="${16*K}" fill="#595959">${esc('Как появляются тексты: '+lv.logic)}</textArea>${cards}</g>`);});
const out=process.argv[2]||'level-texts-miro';let part=[header],n=1,size=0;
for(const f of frames){if(size+f.length>180000){fs.writeFileSync(`${out}-${n++}.svg`,'<svg xmlns="http://www.w3.org/2000/svg">\n'+part.join('\n')+'\n</svg>');part=[];size=0}part.push(f);size+=f.length}
fs.writeFileSync(`${out}-${n}.svg`,'<svg xmlns="http://www.w3.org/2000/svg">\n'+part.join('\n')+'\n</svg>');console.log('parts',n,'frames',frames.length);
