// Screen 2.3 flips the PSD photos inside the phone screen before its show time starts.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const draws=[];
class Image{set src(path){this.path=path;queueMicrotask(()=>this.onload())}}
const context=()=>({save(){},restore(){},translate(){},beginPath(){},rect(){},clip(){},clearRect(){},drawImage(im,...args){draws.push({path:im.path||'card',args})}});
const canvas={getContext:()=>card},card=context();
const nodes=new Map(),events={},raf=[];
function node(id){if(!nodes.has(id))nodes.set(id,{hidden:id==='#level-frame',value:'',innerHTML:'',style:{width:'640px'},classList:{remove(){}},addEventListener(){},setAttribute(k,v){this[k]=v},querySelector(){return this.input||(this.input={value:''})},replaceChildren(){},contentWindow:{postMessage(){},focus(){}}});return nodes.get(id)}
const s={console,Image,Event:class{constructor(type){this.type=type}},URLSearchParams,location:{search:'',origin:'http://test'},
 fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'))}),
 document:{hidden:false,querySelector:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>canvas},localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame:fn=>raf.push(fn),clearInterval(){},setTimeout(){},performance:{now:()=>0},
 addEventListener:(n,f)=>(events[n]||=[]).push(f),dispatchEvent:e=>events[e.type]?.forEach(fn=>fn()),
 screen:'title',dialog:false,journeyNode:null,journeyStarted:false,journeyActive:false,loading:false,timer:null,hero:0,selected:0,visited:new Set(),rewards:{},travelItems:new Set(),chapterQuestions:['','','','',''],points:Array.from({length:5},(_,i)=>({full:'Place '+i})),
 journeyNodes:{'2.3':{type:'story',photos:'screen2-3',next:'ruin'}},controls:node('#controls'),currentUI:{fonts:{cozette:{image:{}}},ready:Promise.resolve()},PeninsulaPopup:{},PeninsulaColors:{fill(){}},ctx:context(),
 render(){},stopGames(){},applyDisplayScale(){},launchCampSearch(){},launchFogRace(){},setScreen(next){s.screen=next;s.render()},showNode(id){s.journeyNode=id;s.screen=/^intro|^\d+\./.test(id)?'story':'embedded';s.render()},selectDestination(){},buildParallaxControls(){},startJourney(){s.showNode('intro2')},advanceStory(){s.showNode(s.journeyNodes[s.journeyNode]?.next||'drive1')}};
s.window=s;s.loadIntroParallax=async number=>({number,reset(){},tick(){},draw(){}});
vm.createContext(s);for(const p of ['scene-settings.js','photo-slides.js','full-bridge.js'])vm.runInContext(fs.readFileSync('dist/'+p,'utf8'),s);
const api=s.PeninsulaScenes,tick=now=>{assert.ok(raf.length);raf.shift()(now)},shown=()=>draws.filter(d=>/photo-\d/.test(d.path)).map(d=>d.path.match(/photo-(\d)/)[1]);
(async()=>{
 assert.equal(api.normalizeStory({}).photoSeconds,1.5);assert.equal(api.normalizeStory({photoSeconds:0}).photoSeconds,.1);assert.equal(api.normalizeStory({photoSeconds:500}).photoSeconds,60);
 // The module alone: order 1..5, swipe, pause and whole-pixel drawing.
 const slides=await s.loadPhotoSlides('screen2-3');
 draws.length=0;slides.draw(s.ctx);assert.deepEqual(shown(),['1']);assert.ok(draws.some(d=>d.path.endsWith('base.png'))&&draws.some(d=>d.path.endsWith('mask.png')));
 assert.equal(slides.advance(1.4),false);assert.equal(slides.advance(.1),true);assert.equal(slides.snapshot().index,1);assert.equal(slides.moving,true);
 draws.length=0;slides.advance(.1);slides.draw(s.ctx);assert.deepEqual(shown(),['1','2'],'both photos are visible during the swipe');for(const d of draws)for(const v of d.args)assert.ok(Number.isInteger(v),'photos stay on whole pixels');
 slides.advance(.3);assert.equal(slides.moving,false);draws.length=0;slides.draw(s.ctx);assert.deepEqual(shown(),['2']);
 slides.setPaused(true);slides.advance(30);assert.equal(slides.snapshot().index,1,'pause stops flipping');slides.setPaused(false);
 assert.equal(slides.previous(),true);assert.equal(slides.previous(),false);for(let i=0;i<4;i++)assert.equal(slides.next(),true);assert.equal(slides.last,true);assert.equal(slides.next(),false);slides.advance(100);assert.equal(slides.snapshot().index,4);
 slides.reset();assert.equal(slides.snapshot().index,0);
 // The full game: photos flip on their own, click and arrows flip, the show time starts on the last photo.
 await new Promise(resolve=>setImmediate(resolve));
 api.updateStory({showSeconds:3,photoSeconds:1});s.journey.select('2.3');const game=()=>vm.runInContext('photoSlides["2.3"].snapshot().index',s);
 assert.ok(node('#scene-settings').innerHTML.includes('data-photo-seconds'),'the panel offers the photo interval on this screen');
 tick(0);tick(500);assert.equal(game(),0);tick(1000);assert.equal(game(),1);
 s.advanceStory();assert.equal(game(),2);assert.equal(s.journeyNode,'2.3','a click shows the next photo instead of leaving');
 events.keydown.forEach(f=>f({key:'ArrowLeft',preventDefault(){}}));assert.equal(game(),1);events.keydown.forEach(f=>f({key:'ArrowRight',preventDefault(){}}));assert.equal(game(),2);
 node('#scene-pause').onclick();tick(10000);tick(20000);assert.equal(game(),2,'pause holds the photo');node('#scene-pause').onclick();
 tick(21000);assert.equal(game(),3);tick(22000);assert.equal(game(),4);tick(24900);assert.equal(s.journeyNode,'2.3','the last photo gets the full show time');tick(25100);assert.equal(s.journeyNode,'ruin');
 s.journey.select('2.3');assert.equal(game(),0,'returning to the screen starts from the first photo');for(let i=0;i<4;i++)s.advanceStory();assert.equal(s.journeyNode,'2.3');s.advanceStory();assert.equal(s.journeyNode,'ruin');
 console.log('PASS: screen 2.3 photos in PSD order, swipe on whole pixels, interval and pause, click/Enter/Space and arrows flip, show time starts on the last photo.');
})().catch(e=>{console.error(e);process.exitCode=1});
