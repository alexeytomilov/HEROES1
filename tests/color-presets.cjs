const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map(),events={},calls=[];
class Image{complete=true;naturalWidth=320;naturalHeight=240;}
const sandbox={Image,Event:class{},window:null,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},addEventListener:(k,f)=>events[k]=f,dispatchEvent(){}};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync('dist/color-presets.js','utf8'),sandbox);
const api=sandbox.PeninsulaColors;
let state=JSON.parse(JSON.stringify(api.state));state.situation={background:'#123456',border:'#abcdef',textureOpacity:50};api.update(state);
assert.equal(api.get('situation').background,'#123456');assert.equal(api.get('unknown').background,api.get('default').background);assert.notEqual(api.get('heading').background,'#123456');
const c={globalAlpha:1,save(){this.alpha=this.globalAlpha},restore(){this.globalAlpha=this.alpha},beginPath(){},rect(){},clip(){},fillRect(...r){calls.push(['fill',this.fillStyle,...r])},drawImage(...r){calls.push(['texture',this.globalAlpha,...r.slice(1)])}};
api.box(c,1.4,2.6,40,30,'situation');assert.deepEqual(calls[0],['fill','#123456',1,3,40,30]);assert.equal(calls[1][0],'texture');assert.equal(calls[1][1],.5);assert.equal(calls[2][1],'#abcdef');assert.equal(c.globalAlpha,1);
state.situation.textureOpacity=0;api.update(state);calls.length=0;api.box(c,1,2,40,30,'situation');assert.equal(calls.filter(c=>c[0]==='texture').length,0);
assert.equal(api.normalize({situation:{textureOpacity:500,border:'bad'}}).situation.textureOpacity,100);assert.equal(api.normalize({situation:{border:'bad'}}).situation.border,'#91a1ad');
assert.equal(api.role({x:198,y:22,w:115,h:138}),'situation');assert.equal(api.role({x:0,y:0,w:320,h:22}),'heading');assert.equal(api.role({name:'Общее / Кнопка',x:198,y:40,w:57,h:16}),'tabs');assert.equal(api.role({name:'Общее / Кнопка',x:118,y:196,w:39,h:18}),'buttons');assert.equal(api.role({x:7,y:205,w:190,h:28}),'dialogue');assert.equal(api.role({x:1,y:154,w:318,h:85}),'narrator');assert.equal(api.role({x:198,y:176,w:28,h:28}),'inventory');assert.equal(api.role({x:198,y:161,w:115,h:14}),'power');assert.equal(api.role({x:6,y:22,w:192,h:140}),'stats');
events.storage({key:api.key,newValue:JSON.stringify({...state,heading:{background:'#112233'}})});assert.equal(api.get('heading').background,'#112233');
console.log('PASS: category isolation, fallback, texture blending, transparent texture, pixel outlines and persisted colors.');

assert.equal(api.role({name:'Описание героя',x:7,y:163,w:190,h:48}),'narrator','hero description shares the screen text surface');assert.equal(api.names.heroDescription,undefined);
assert.deepEqual(Object.keys(api.names),['heading','storyImage','narrator','situation','dialogue','question','buttons','tabs','power','stats','inventory','default']);
{const old=api.normalize({dialogue:{background:'#010203',border:'#040506',textureOpacity:20},buttons:{background:'#0a0b0c',border:'#0d0e0f',textureOpacity:30}});assert.deepEqual(old.question,old.dialogue,'question windows keep the dialogue surface until changed');assert.deepEqual(old.tabs,old.buttons,'tabs keep the button surface until changed');}

assert.equal(api.names.storyImage,'Экран картинка');assert.equal(api.role({x:1,y:1,w:318,h:152,fills:[{type:'IMAGE'}]}),'storyImage');
