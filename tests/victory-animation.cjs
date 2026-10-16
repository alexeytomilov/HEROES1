const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s={Image:class{set src(value){this.srcValue=value;this.onload()}}};s.window=s;
vm.runInNewContext(fs.readFileSync('dist/victory-animation.js','utf8'),s);
const a=s.PeninsulaVictoryAnimation,draws=[],ctx={drawImage(...args){draws.push(args)}};
a.tick(0,true);assert.equal(a.frame(),0);
for(const [dt,frame]of [[.3,1],[.22,2],[.22,3],[.24,4],[.8,0]]){
 a.tick(dt,true);assert.equal(a.frame(),frame,'preserve GIF frame durations and loop');
}
a.tick(.52,true);assert.equal(a.frame(),2);
a.tick(10,true,false);assert.equal(a.frame(),2,'pause must freeze animation');
a.draw(ctx);assert.deepEqual(draws[0].slice(1),[637,1,316,150,2,2,316,150],'draw only inside picture frame');
a.tick(0,false);a.tick(10,true);assert.equal(a.frame(),0,'re-entering victory restarts the animation');
console.log('PASS: victory GIF timing, loop, pause, restart and picture bounds.');
