const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},storage=new Map(),draws=[];
const context=()=>({drawImage(...args){draws.push(args)},fillRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){}});
const sandbox={window:{addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:()=>{}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{createElement:()=>({getContext:context})},Event:class{}};
vm.runInNewContext(fs.readFileSync('dist/text-presets.js','utf8'),sandbox);
const api=sandbox.window.PeninsulaText;
const glyphs=Object.fromEntries([...'? abcdefABCDEFПриветПРИВЕТ'].map(ch=>[ch,{x:0,y:0,w:6}]));const fonts={cozette:{height:13,glyphs,image:{width:100,height:13}},unifont:{height:16,glyphs,image:{width:100,height:16}}};
assert.equal(Object.keys(api.roles).length,6);assert.equal(Object.keys(api.names).length,4);
let state=JSON.parse(JSON.stringify(api.state));state.assignments.dialogue='large';state.presets.large.size=17;state.presets.large.offset=-3;state.presets.large.padding=0;state.presets.large.uppercase=true;state.presets.large.color='#ff0000';api.update(state);
assert.equal(api.get('dialogue').size,17);assert.equal(api.get('narrator').size,17);assert.equal(api.format('Привет','dialogue'),'ПРИВЕТ');
api.block(context(),'abcdef abcdef',1.5,2.5,40,100,'dialogue',fonts);assert.ok(draws.length);for(const a of draws){if(a.length===9)for(const n of a.slice(5))assert.ok(Number.isInteger(n),'bitmap destinations must use whole pixels')}
const lines=api.lines('abcdefabcdefabcdef',20,'dialogue',fonts);assert.ok(lines.length>1);for(const l of lines)assert.ok(api.measure(l,'dialogue',fonts)<=20);
state.presets.large.size=999;state.presets.large.color='invalid';state.assignments.question='invalid';api.update(state);assert.equal(api.get('large').size,32);assert.equal(api.get('large').color,'#bec4c9');assert.equal(api.state.assignments.question,'large');
// Every role and direct preset obeys both sides of the Caps Lock switch.
state=JSON.parse(JSON.stringify(api.defaults));
for(const preset of Object.keys(api.names))state.presets[preset].uppercase=false;
api.update(state);
for(const role of [...Object.keys(api.roles),...Object.keys(api.names)]){
 assert.equal(api.format('ПРИВЕТ. КАК ДЕЛА?\nНОВАЯ СТРОКА!',role),'Привет. Как дела?\nНовая строка!');
 assert.equal(api.format('пРиВеТ',role),'Привет');
}
const wrapped=api.lines('ABCDEF ABCDEF ABCDEF',42,'dialogue',fonts);
assert.equal(wrapped.join(' '),'Abcdef abcdef abcdef','wrapping must not capitalize continuation lines');
const originalLine=api.line;const prepared=[];api.line=(...args)=>{prepared.push({text:args[1],prepared:args[7]});return originalLine(...args)};
api.block(context(),'ABCDEF ABCDEF ABCDEF',0,0,52,100,'dialogue',fonts);
assert(prepared.length>1);assert(prepared.every(row=>row.prepared===true));assert.equal(prepared.map(row=>row.text).join(' '),'Abcdef abcdef abcdef');api.line=originalLine;
for(const preset of Object.keys(api.names))state.presets[preset].uppercase=true;
api.update(state);
for(const role of [...Object.keys(api.roles),...Object.keys(api.names)])assert.equal(api.format('Привет. Как дела?',role),'ПРИВЕТ. КАК ДЕЛА?');
assert.ok(storage.size);console.log('PASS: six roles, four shared presets, casing, validation, wrapping and integer bitmap drawing.');
