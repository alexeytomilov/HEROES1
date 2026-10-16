// Game button feedback: a short pixel "click" when a button over the game is pressed.
// The sound is synthesised (no file); the audio context starts on the first press, as browsers require.
window.PeninsulaSound=(()=>{
 let ac=null;
 function click(){
  try{
   ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
   const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
   o.type='square';o.frequency.setValueAtTime(1300,t);o.frequency.exponentialRampToValueAtTime(520,t+.035);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.055);
   o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.06);
  }catch{}
 }
 // Buttons drawn on the game (not the full-screen "continue" area), map points and the level buttons under the game.
 document.addEventListener('pointerdown',e=>{if(e.button!==0)return;const b=e.target.closest?.('#controls .hotspot:not(.hotspot-full), #level-tools button, .race-pad button');if(b&&!b.disabled)click()},true);
 return {click};
})();
