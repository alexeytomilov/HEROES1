// Rebuild the board's file catalog from the runtime's actual screen paths.
const fs=require('node:fs'),vm=require('node:vm');
const s={};s.window=s;vm.createContext(s);
for(const file of ['screen-assets','story'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),s);
const paths=s.PeninsulaScreenAssets,nodes=s.PENINSULA_STORY.nodes;
const records={};
const add=(id,kind,files,preview,extra={})=>records[id]={kind,files,preview,...extra};
for(let n=1;n<=5;n++)add(n===1?'title':'intro'+n,'intro',[paths.introVideo+'intro'+n+'.webp',paths.introVideo+'sheets.json'],paths.root+'previews/intro'+n+'.png',{note:'Превью кадра середины заставки; игра проигрывает спрайт-лист.'});
add('map','map',[paths.root+'map-terrain-expanded.png'],paths.root+'previews/map.png',{note:'Изображение местности; маркеры и интерфейс рисуются кодом.'});
for(let i=0;i<3;i++)add('hero'+i,'character',[paths.layout('hero'+i)],paths.root+'previews/hero'+i+'.png',{note:'Фон экспорта; текущие портреты и интерфейс собираются из figma-layouts.json и общих ассетов.'});
for(const [id,node]of Object.entries(nodes)){
 if(records[id])continue;
 if(node.type==='epilogue'){add(id,node.type,[paths.layout('win5')],paths.layout('win5'));continue}
 if(node.type==='question'){
  const chapter=id==='ruin'?2:id==='home'?5:1;
  add(id,node.type,[paths.layout(chapter+'.1')],paths.layout(chapter+'.1'),{note:'Вопрос поверх сюжетного экрана; окно и текст рисуются кодом.'});continue;
 }
 add(id,node.type,[paths.layout(id)],paths.layout(id),node.type==='game'?{note:'Статичный фон интерфейса; сам уровень рисуется движком.'}:{});
}
records.win1.files.push(paths.root+'victory1/fish-pickup.gif',paths.victory);
records.win1.preview=paths.root+'victory1/fish-pickup.gif';
records.win1.note='В игре анимация из спрайт-листа с таймингом исходного GIF.';
for(let i=1;i<=5;i++)records['2.3'].files.push(paths.root+'photos2-3/photo'+i+'.png');
for(let i=0;i<5;i++){
 const id='q'+i,base=paths.layout((i+1)+'.1');
 add(id,'question',[base],base,{note:'Вопрос поверх сюжетного экрана; окно и текст рисуются кодом.'});
 add('entry'+i,'map',[paths.root+'map-terrain-expanded.png'],paths.root+'previews/map.png',{note:'Выбор локации на карте; окно рисуется кодом.'});
}
for(const [id,record]of Object.entries(records))for(const path of [...record.files,record.preview])if(!fs.existsSync('dist/'+path))throw Error(id+': missing '+path);
fs.writeFileSync('dist/assets/screens/catalog.json',JSON.stringify({root:paths.root,pathBase:'dist/',screens:records},null,2)+'\n');
console.log('Catalog: '+Object.keys(records).length+' screens, all files exist.');
