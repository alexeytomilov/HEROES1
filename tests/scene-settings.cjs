const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map(),events={},draws=[];
class Image{set src(path){this.path=path;queueMicrotask(()=>this.onload())}}
const s={console,Image,Event:class{},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'))}),addEventListener:(n,f)=>events[n]=f,dispatchEvent(){},PeninsulaColors:{fill(){}}};s.window=s;vm.createContext(s);
for(const p of ['scene-settings.js','intro-parallax.js'])vm.runInContext(fs.readFileSync('dist/'+p,'utf8'),s);
const api=s.PeninsulaScenes;
assert.equal(api.kind('intro1'),'intro');assert.equal(api.kind('intro5'),'intro');assert.equal(api.kind('1.2'),'story');assert.equal(api.kind('drive1'),null);assert.equal(api.kind('q0'),null);
api.updateStory({showSeconds:3});assert.equal(api.duration('1.1'),3);assert.equal(api.duration('5.2'),3);
const clock=api.clock();clock.select('1.1');assert.equal(clock.tick(2),false);assert.equal(clock.tick(20,false),false);assert.equal(clock.tick(1),true);assert.equal(clock.tick(20),false);
clock.select('1.2');assert.equal(clock.snapshot().elapsed,0);assert.equal(clock.tick(2),false);clock.select('hero0');assert.equal(clock.tick(100),false);
api.updateIntro(2,{enabled:false,showSeconds:4,interval:.75});assert.equal(api.intros[3].showSeconds,7);assert.equal(JSON.parse(storage.get(api.key(2))).interval,.75);
assert.equal(api.normalizeIntro(2,{showSeconds:.1}).interval,.045000000000000005);
const c={save(){},restore(){},translate(){},beginPath(){},rect(){},clip(){},drawImage(im,...args){draws.push({path:im.path,args})}};
(async()=>{
 const motion=await s.loadIntroParallax(2);motion.draw(c);assert.ok(draws.some(d=>d.path.endsWith('1a.png')));assert.ok(!draws.some(d=>d.path.endsWith('2a.png')));
 motion.advance(.75);draws.length=0;motion.draw(c);assert.ok(draws.some(d=>d.path.endsWith('2a.png')));assert.ok(!draws.some(d=>d.path.endsWith('3a.png')));
 motion.advance(.75);draws.length=0;motion.draw(c);assert.ok(draws.some(d=>d.path.endsWith('3a.png')));assert.ok(motion.snapshot().offsets.every(o=>o.a===0&&o.b===0&&o.c===0),'disabled motion still reveals frames');
 motion.configure({enabled:true,frames:[{direction:'right',speed:4,multiplier:.5,thirdMultiplier:.25},{direction:'left',speed:6,multiplier:0,thirdMultiplier:0},{direction:'up',speed:2,multiplier:-1,thirdMultiplier:0}]});motion.advance(1);assert.equal(motion.snapshot().offsets[0].a,4);assert.equal(motion.snapshot().offsets[0].b,2);assert.equal(motion.snapshot().offsets[0].c,1);assert.equal(motion.snapshot().offsets[1].a,1.5);assert.equal(motion.snapshot().offsets[2].a,0);
 motion.advance(10);assert.equal(motion.snapshot().elapsed,4);assert.equal(motion.advance(1),false,'motion must not loop the frame reveal sequence');
 for(const n of [1,3,4,5]){const game=await s.loadIntroParallax(n);draws.length=0;game.draw(c);assert.ok(draws.length);for(const d of draws)for(const value of d.args)assert.ok(Number.isInteger(value),'native pixel positions must remain integers')}
 events.storage({key:api.storyKey,newValue:'{"showSeconds":5}'});assert.equal(api.duration('2.3'),5);
 console.log('PASS: five intros, one shared story duration, frame reveal intervals, disabled motion, three layer speeds, screen clock cancellation and integer drawing.');
})().catch(e=>{console.error(e);process.exitCode=1});
