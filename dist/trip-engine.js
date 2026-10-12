// Shared driving engine adapted from the latest user-supplied fog-race.html.
// The original fog level and the introductory coastal level use separate track rules.

window.createFogRace = function({canvas, inputSurface, drawPanel, mode = "fog", background = null, nearBackground = null, onComplete = () => {}, demoFinish = false, onRender = null, compactUI = false, viewportWidth = 320, viewportHeight = 240}) {
const homeward = mode === "home";
const coastal = mode === "sredny" || homeward;
let active=false, frameHandle=0;
const $ = id => document.getElementById(id === 'snd' ? 'fog-sound' : id);
const W = viewportWidth, H = viewportHeight;
const cv = canvas; cv.width = W; cv.height = H;
const ctx = cv.getContext('2d', {willReadFrequently:true});
ctx.imageSmoothingEnabled = false;

// ---------- constants ----------
const STEP = 1/60;
const HZ = Math.round(H*88/240), PROJECTION_Y = W*120/320;
const SEG = 200, ROADW = 850, DRAW = 80, CAMH = compactUI ? (H-8-HZ)*1350/PROJECTION_Y : 1260, FOV = 100;
const DEPTH = 1/Math.tan((FOV/2)*Math.PI/180);
const PLAYERZ = 1000*DEPTH*1.35;
const MAXSPEED = 6000, KMH = 90;
const ACCEL = coastal ? 650 : MAXSPEED/32, BRAKE = -MAXSPEED*1.2, DECEL = -MAXSPEED/7, CENTRIFUGAL = .3;
const JEEPW = 500, JW = JEEPW/ROADW;
const FOG = '#c8cbcd', FOG_RGB = [200,203,205];
const BUMP_SPEED = MAXSPEED*.07;
const TOP = coastal ? 1050 : MAXSPEED*.4, GUIDE_SPEED = 380;
const BUDDY_LANE = -.38, BUDDY_GAP = 2.5*SEG, BUDDY_MAX = MAXSPEED*.6;

const easeIn = (a,b,p) => a + (b-a)*p*p;
const easeInOut = (a,b,p) => a + (b-a)*((-Math.cos(p*Math.PI)/2) + .5);
const lerp = (a,b,p) => a + (b-a)*p;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
function overlap(x1,w1,x2,w2,pct=1){ const h = pct/2; return !((x1+w1*h) < (x2-w2*h) || (x1-w1*h) > (x2+w2*h)); }
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
function mk(w,h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- sprites: redrawn at exact on-screen size, so slants are always 1px stairs ----------
function makeSprite(def, wpx, o){
  const sx = wpx/def.w, hpx = Math.max(1, Math.round(def.h*sx)), sy = hpx/def.h;
  const c = mk(wpx, hpx), x = c.getContext('2d');
  const fx = v => o.flip ? def.w - v : v;
  const X = v => Math.round(v*sx), Y = v => Math.round(v*sy);
  const hspan = (a, b, py, col) => {
    if (a > b) [a, b] = [b, a];
    const xa = X(a), xb = X(b);
    if (xb > xa){ x.fillStyle = col; x.fillRect(xa, py, xb-xa, 1); }
  };
  const P = {
    rect(x0, y0, x1, y1, col){
      let a = fx(x0), b = fx(x1); if (a > b) [a, b] = [b, a];
      const xa = X(a), xb = X(b), ya = Y(y0), yb = Y(y1);
      if (xb > xa && yb > ya){ x.fillStyle = col; x.fillRect(xa, ya, xb-xa, yb-ya); }
    },
    trap(y0, y1, l0, r0, l1, r1, col){
      const ya = Y(y0), yb = Y(y1), n = yb - ya;
      for (let py = ya; py < yb; py++){
        const t = n <= 1 ? .5 : (py - ya)/(n - 1);
        hspan(fx(lerp(l0, l1, t)), fx(lerp(r0, r1, t)), py, col);
      }
    },
    ellipse(cx, cy, rx, ry, col){
      for (let py = Y(cy-ry); py < Y(cy+ry); py++){
        const v = ((py + .5)/sy - cy)/ry;
        if (Math.abs(v) > 1) continue;
        const hw = rx*Math.sqrt(1 - v*v);
        hspan(fx(cx) - hw, fx(cx) + hw, py, col);
      }
    },
  };
  def.draw(P, o);
  if (o.fog > 0){
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = o.fog; x.fillStyle = FOG; x.fillRect(0, 0, wpx, hpx);
  }
  return c;
}
const spriteCache = new Map();
function getSprite(def, wpx, o){
  o = o || {};
  const key = `${def.id}|${wpx}|${o.flip?1:0}|${o.frame||0}|${o.front?1:0}|${o.brake?1:0}|${o.fog||0}|${o.v||''}`;
  let c = spriteCache.get(key);
  if (c){ spriteCache.delete(key); spriteCache.set(key, c); return c; }
  c = makeSprite(def, wpx, o);
  spriteCache.set(key, c);
  if (spriteCache.size > 700) spriteCache.delete(spriteCache.keys().next().value);
  return c;
}

// drawn from the right half of the sketch; the left half is its mirror
const JEEP = {id:'jeep', w:52, h:48, draw(P, o){
  const grey = o.v === 'grey';
  const BODY = grey ? '#6c6f73' : '#c8401c', SHADE = grey ? '#46484c' : '#8a2a10';
  const GLASS = '#2a3039', INNER = '#181a1e', BLACK = '#1e1f23', TYRE = '#131315';
  const M = (u0, y0, u1, y1, col) => { P.rect(u0, y0, u1, y1, col); P.rect(52 - u1, y0, 52 - u0, y1, col); };
  P.rect(1,46.5,51,48,'rgba(0,0,0,.3)');
  // wheels
  M(41.4,40.1,50.7,47.6, TYRE); M(42.6,40.1,44.7,45, '#2a2c31');
  // body with rounded top corners
  M(26,0,45.4,35, BODY); M(26,.9,46.7,35, BODY); M(26,1.6,48,35, BODY);
  M(48,14.8,48.6,35, SHADE);
  // rear glass with the cabin showing through
  M(26,3.3,41.9,16.7, GLASS); M(26,5.3,42.6,16.7, GLASS);
  M(26,7.3,39.7,15.9, INNER); M(39.7,8.8,40.6,15, INNER);
  P.rect(21,3.3,31,4.6, BLACK);
  // door shading and panel behind the spare
  M(26,23.8,37.5,35, '#24262b'); M(37.5,23.8,39.2,35, SHADE);
  // tail light cages
  M(41.4,22.9,48.3,33.5, BLACK);
  const red = o.brake ? '#ff4a30' : '#b02622', hot = o.brake ? '#ffd0b8' : '#e0603a';
  for (const [a, b] of [[23.8,26.2],[26.9,29.5],[30.4,32.6]]){ M(42,a,47.8,b, red); M(42.7,a + .4,43.9,a + 1.4, hot); }
  M(42.7,24.2,43.9,25.2, o.brake ? '#fff0e0' : '#f07a6a');
  // stepped fender flares
  M(48.3,23,49.6,40.1, BLACK); M(49.6,24.5,50.8,40.1, BLACK); M(50.8,26.2,51.8,40.1, BLACK); M(51.2,26.2,51.8,40.1,'#2c2e33');
  // bumper
  M(26,34.8,52,40.5, BLACK); M(26,39.8,40,40.6,'#2a2c31');
  // big round spare wheel
  P.ellipse(26,25.6,11.8,11.6, TYRE);
  // plate and hitch
  P.rect(20.7,37.7,31.3,39.6,'#ece6d4'); P.rect(20.7,37.7,31.3,38.2,'#2a2c31');
  P.rect(23.6,40.5,28.4,42.3,'#2a2b2f');
}};
const HIKER = {id:'hiker', w:14, h:34, draw(P, o){
  const J = o.v.split(',')[0], HC = o.v.split(',')[1];
  P.rect(2,32,12,34,'rgba(0,0,0,.25)');
  const a = o.frame ? 31 : 33, b = o.frame ? 33 : 31;
  P.rect(4,22,6,a,'#2e3440'); P.rect(8,22,10,b,'#2e3440');
  P.rect(3,a-2,7,a,'#2a1d15'); P.rect(7,b-2,11,b,'#2a1d15');
  P.rect(3,10,11,23, J);
  P.rect(1,11,3,21, J); P.rect(11,11,13,21, J);
  P.rect(1,21,3,23,'#d6a07a'); P.rect(11,21,13,23,'#d6a07a');
  if (o.front){
    P.ellipse(7,6.5,3,3.5,'#d6a07a');
    P.rect(5,6,6,7,'#222'); P.rect(8,6,9,7,'#222');
    P.rect(4,10,5,18,'#3e4a30'); P.rect(9,10,10,18,'#3e4a30');
  } else {
    P.ellipse(7,6.5,3,3.5,'#5a4030');
    P.rect(4,9,10,20,'#3e4a30'); P.rect(5,8,9,9,'#3e4a30'); P.rect(4,13,10,14,'#2e3824');
  }
  P.trap(2,5, 5,9, 4,10, HC);
}};
const GOAT = {id:'goat', w:30, h:22, draw(P, o){
  P.rect(4,20,26,22,'rgba(0,0,0,.2)');
  const l1 = o.frame ? 20 : 21, l2 = o.frame ? 21 : 20;
  P.rect(7,13,9,l1,'#9a948a'); P.rect(11,13,13,l2,'#9a948a'); P.rect(17,13,19,l1,'#9a948a'); P.rect(21,13,23,l2,'#9a948a');
  P.ellipse(14,10,9,4.6,'#e4e0d6');
  P.rect(8,12,20,14,'#ccc6ba');
  P.trap(4,9, 21,24, 20,25,'#e4e0d6');
  P.ellipse(25,5.5,3.2,2.6,'#e4e0d6');
  P.rect(27,5,29,8,'#d4cec2'); P.rect(25,4,26,5,'#222');
  P.trap(0,3, 22,23, 23,24,'#6a5a48');
  P.rect(22,6,24,7,'#c8c2b6'); P.rect(26,8,27,10,'#d4cec2'); P.rect(4,6,6,8,'#e4e0d6');
}};
const CAR = {id:'car', w:44, h:34, draw(P){
  P.rect(1,31,43,34,'rgba(0,0,0,.3)');
  P.rect(4,26,11,34,'#141416'); P.rect(33,26,40,34,'#141416');
  P.trap(1,10, 7,37, 4,40,'#566656');
  P.rect(6,1,38,2,'#6e7e6e');
  P.rect(8,3,36,10,'#2a3138'); P.rect(10,4,16,5,'#56606c');
  P.rect(3,10,41,28,'#566656'); P.rect(3,10,41,11,'#6e7e6e');
  P.rect(15,14,29,23,'#2a2c2e');
  for (let i = 0; i < 4; i++) P.rect(16,15+i*2,28,16+i*2,'#4a4c4e');
  P.ellipse(9,17,3.2,3.2,'#fff6c8'); P.ellipse(35,17,3.2,3.2,'#fff6c8');
  P.rect(2,26,42,30,'#222');
  P.rect(18,26,26,28,'#e8e4d0');
}};
const PINE = {id:'pine', w:40, h:120, draw(P){
  P.rect(17,38,23,120,'#9a4a2a'); P.rect(17,38,19,120,'#6a2e1a'); P.rect(21,38,23,120,'#b8643a');
  for (const y of [50,64,79,93,106]) P.rect(18,y,20,y+3,'#4a2216');
  P.rect(10,56,18,58,'#5a3020'); P.rect(22,44,31,46,'#5a3020');
  const G1 = '#2c4428', G2 = '#3b5a34', G3 = '#4f7244';
  P.ellipse(20,10,9,8,G1); P.ellipse(12,22,9,6,G1); P.ellipse(28,18,10,7,G1); P.ellipse(20,32,13,7,G1); P.ellipse(31,40,8,5,G1); P.ellipse(8,54,6,4,G1);
  P.ellipse(19,8,6,5,G2); P.ellipse(11,20,6,4,G2); P.ellipse(28,16,7,4,G2); P.ellipse(19,30,9,4,G2); P.ellipse(31,38,5,3,G2);
  P.ellipse(17,6,3,2,G3); P.ellipse(26,14,3,2,G3); P.ellipse(16,28,4,2,G3);
}};
const BIRCH = {id:'birch', w:36, h:100, draw(P){
  P.rect(16,30,20,100,'#e6e4dc'); P.rect(19,30,20,100,'#b8b6ae');
  for (const y of [40,52,61,74,86,95]) P.rect(16,y,18 + (y % 3),y+1,'#2a2a28');
  P.rect(10,46,17,47,'#5a5a52'); P.rect(20,38,27,39,'#5a5a52');
  const G1 = '#5f7e3e', G2 = '#7d9c4c', Y = '#d4b03a';
  P.ellipse(18,14,12,12,G1); P.ellipse(9,30,8,9,G1); P.ellipse(27,30,8,8,G1); P.ellipse(18,40,9,6,G1);
  P.ellipse(16,11,8,7,G2); P.ellipse(8,28,5,5,G2); P.ellipse(26,27,5,5,G2);
  P.rect(11,20,13,22,Y); P.rect(24,12,26,14,Y); P.rect(6,34,8,36,Y); P.rect(21,38,23,40,Y);
}};
const YPINE = {id:'ypine', w:24, h:36, draw(P){
  P.rect(11,24,13,36,'#7a4a2a');
  P.trap(0,9, 12,12, 7,17,'#5f8a4a'); P.trap(6,17, 12,12, 4,20,'#5f8a4a'); P.trap(13,26, 12,12, 1,23,'#4e7a3e');
  P.trap(1,8, 12,12, 9,13,'#86b06a'); P.trap(8,15, 12,12, 7,13,'#86b06a'); P.trap(15,24, 12,12, 5,13,'#74a05a');
}};
const HOLE = {id:'hole', w:40, h:12, draw(P){
  P.ellipse(20,7,19,5,'#6d6a62');
  P.ellipse(20,7.5,16,3.8,'#3a3833');
  P.ellipse(20,8.5,12,2.6,'#2a2926');
  P.rect(13,8,19,9,'#55636a');
  P.rect(3,5,8,6,'#a39f95'); P.rect(30,4,35,5,'#a39f95');
}};
const ROCK = {id:'rock', w:30, h:16, draw(P){
  P.rect(2,14,28,16,'rgba(0,0,0,.25)');
  P.ellipse(15,10,14,6,'#5e6064');
  P.ellipse(12,8,8,3.6,'#787b7f');
  P.ellipse(19,12.5,8,2.6,'#4c4e52');
}};
const BOULDER = {id:'boulder', w:40, h:26, draw(P){
  P.ellipse(14,16,13,10,'#55575a'); P.ellipse(12,13,8,6,'#6c6f72');
  P.ellipse(28,19,11,7,'#4a4c4f'); P.ellipse(27,16,6,3.5,'#62656a');
  P.rect(4,23,38,26,'#3e403f');
}};
const TUFT = {id:'tuft', w:16, h:10, draw(P){
  P.trap(2,10, 4,5, 2,7,'#7a8360');
  P.trap(0,10, 8,9, 6,11,'#6a7352');
  P.trap(3,10, 12,13, 10,15,'#7a8360');
}};
const BOLLARD = {id:'bollard', w:8, h:24, draw(P){
  P.rect(2,0,6,24,'#e6e6e2'); P.rect(5,0,6,24,'#b8b8b4');
  P.rect(2,5,6,9,'#c8202a'); P.rect(3,1,5,3,'#f6c22a');
  P.rect(2,22,6,24,'#777');
}};
const HUT = {id:'hut', w:64, h:52, draw(P){
  P.rect(46,4,51,16,'#4a4a4a');
  P.trap(0,20, 30,34, 0,64,'#4a3226');
  P.rect(6,20,58,50,'#7a5a3e');
  P.rect(6,28,58,29,'#6a4a32'); P.rect(6,38,58,39,'#6a4a32');
  P.rect(13,27,25,37,'#ffd27a'); P.rect(18,27,19,37,'#5a3a26'); P.rect(13,31,25,32,'#5a3a26');
  P.rect(36,30,46,50,'#3a281c');
  P.rect(2,49,62,52,'#3e3a34');
}};

// ---------- pixel font ----------
const GLYPHS = {
'↑':'..#../.###./#.#.#/..#../..#../..#../..#..',
'0':'.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1':'..#../.##../..#../..#../..#../..#../.###.',
'2':'.###./#...#/....#/...#./..#../.#.../#####', '3':'#####/...#./..#../...#./....#/#...#/.###.',
'4':'...#./..##./.#.#./#..#./#####/...#./...#.', '5':'#####/#..../####./....#/....#/#...#/.###.',
'6':'..##./.#.../#..../####./#...#/#...#/.###.', '7':'#####/....#/...#./..#../.#.../.#.../.#...',
'8':'.###./#...#/#...#/.###./#...#/#...#/.###.', '9':'.###./#...#/#...#/.####/....#/...#./.##..',
'А':'.###./#...#/#...#/#####/#...#/#...#/#...#', 'Б':'#####/#..../#..../####./#...#/#...#/####.',
'В':'####./#...#/#...#/####./#...#/#...#/####.', 'Г':'#####/#..../#..../#..../#..../#..../#....',
'Д':'..##./.#.#./.#.#./#..#./#..#./#####/#...#', 'Е':'#####/#..../#..../####./#..../#..../#####',
'Ж':'#.#.#/#.#.#/.###./..#../.###./#.#.#/#.#.#', 'З':'.###./#...#/....#/..##./....#/#...#/.###.',
'И':'#...#/#...#/#..##/#.#.#/##..#/#...#/#...#', 'Й':'.#.#./..#../#...#/#..##/#.#.#/##..#/#...#',
'К':'#...#/#..#./#.#../##.../#.#../#..#./#...#', 'Л':'..###/.#..#/.#..#/.#..#/.#..#/.#..#/#...#',
'М':'#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', 'Н':'#...#/#...#/#...#/#####/#...#/#...#/#...#',
'О':'.###./#...#/#...#/#...#/#...#/#...#/.###.', 'П':'#####/#...#/#...#/#...#/#...#/#...#/#...#',
'Р':'####./#...#/#...#/####./#..../#..../#....', 'С':'.###./#...#/#..../#..../#..../#...#/.###.',
'Т':'#####/..#../..#../..#../..#../..#../..#..', 'У':'#...#/#...#/#...#/.####/....#/#...#/.###.',
'Ф':'..#../.###./#.#.#/#.#.#/#.#.#/.###./..#..', 'Х':'#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
'Ц':'#..#./#..#./#..#./#..#./#..#./#####/....#', 'Ч':'#...#/#...#/#...#/.####/....#/....#/....#',
'Ш':'#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####', 'Щ':'#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####/....#',
'Ъ':'##.../.#.../.#.../.###./.#..#/.#..#/.###.', 'Ы':'#...#/#...#/#...#/###.#/#.#.#/#.#.#/###.#',
'Ь':'#..../#..../#..../####./#...#/#...#/####.', 'Э':'.###./#...#/....#/..###/....#/#...#/.###.',
'Ю':'#..#./#.#.#/#.#.#/###.#/#.#.#/#.#.#/#..#.', 'Я':'.####/#...#/#...#/.####/..#.#/.#..#/#...#',
'!':'#/#/#/#/#/./#', '.':'././././././#', ',':'../../../../../.#/#.',
':':'./#/./././#/.', "'":'#/#/./././././.', '"':'#.#/#.#/.../.../.../.../...',
'-':'.../.../.../###/.../.../...', '+':'...../..#../..#../#####/..#../..#../.....',
'/':'....#/...#./...#./..#../.#.../.#.../#....', '?':'.###./#...#/....#/...#./..#../...../..#..',
'Ё':'.#.#./...../#####/#..../####./#..../#####',
};
const FONT = {};
for (const [ch, def] of Object.entries(GLYPHS)){
  const rows = def.split('/');
  FONT[ch] = {w: Math.max(...rows.map(r => r.length)), rows};
}
function textMask(str){
  const chars = [...str];
  let w = 0;
  chars.forEach((ch, i) => { w += (FONT[ch] ? FONT[ch].w : 3) + (i < chars.length - 1 ? 1 : 0); });
  w = Math.max(1, w);
  const m = Array.from({length:7}, () => new Uint8Array(w));
  let x = 0;
  for (const ch of chars){
    const g = FONT[ch];
    if (g) g.rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') m[y][x+i] = 1; });
    x += (g ? g.w : 3) + 1;
  }
  return m;
}
// Scale2x: doubles size while keeping diagonals as clean 1px stairs
function scale2x(m){
  const h = m.length, w = m[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y][x];
  const o = Array.from({length:h*2}, () => new Uint8Array(w*2));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const E = m[y][x], B = at(x,y-1), D = at(x-1,y), F = at(x+1,y), Hh = at(x,y+1);
    let e0 = E, e1 = E, e2 = E, e3 = E;
    if (B !== Hh && D !== F){
      if (D === B) e0 = D; if (B === F) e1 = F; if (D === Hh) e2 = D; if (Hh === F) e3 = F;
    }
    o[y*2][x*2] = e0; o[y*2][x*2+1] = e1; o[y*2+1][x*2] = e2; o[y*2+1][x*2+1] = e3;
  }
  return o;
}
const hex = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
const textCache = new Map();
function getText(str, o){
  const key = `${str}|${o.scale||1}|${o.color}|${o.color2||''}|${o.outline||''}`;
  let t = textCache.get(key);
  if (t) return t;
  let m = textMask(str);
  for (let s = o.scale || 1; s > 1; s /= 2) m = scale2x(m);
  const mh = m.length, mw = m[0].length, pad = o.outline ? 1 : 0;
  const c = mk(mw + pad*2, mh + pad*2), x = c.getContext('2d');
  const id = x.createImageData(c.width, c.height), d = id.data;
  const c1 = hex(o.color), c2 = hex(o.color2 || o.color), oc = o.outline ? hex(o.outline) : null;
  const on = (xx, yy) => yy >= 0 && yy < mh && xx >= 0 && xx < mw && m[yy][xx];
  for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++){
    const sx = xx - pad, sy = yy - pad;
    let col = null;
    if (on(sx, sy)) col = sy >= mh*.55 ? c2 : c1;
    else if (oc){
      for (let dy = -1; dy <= 1 && !col; dy++) for (let dx = -1; dx <= 1; dx++) if (on(sx+dx, sy+dy)){ col = oc; break; }
    }
    if (col){ const k = (yy*c.width + xx)*4; d[k] = col[0]; d[k+1] = col[1]; d[k+2] = col[2]; d[k+3] = 255; }
  }
  x.putImageData(id, 0, 0);
  t = {img:c, pad};
  if (textCache.size > 300) textCache.delete(textCache.keys().next().value);
  textCache.set(key, t);
  return t;
}
function textW(str, scale = 1){ return getText(str, {color:'#ffffff', scale}).img.width; }
function drawText(str, x, y, o, align = 'left'){
  const t = getText(str, o);
  const w = t.img.width - t.pad*2;
  if (align === 'center') x -= Math.floor(w/2);
  else if (align === 'right') x -= w;
  ctx.drawImage(t.img, Math.round(x) - t.pad, Math.round(y) - t.pad);
}



// ---------- pixel primitives ----------
function pxDisc(cx, cy, r, col){
  ctx.fillStyle = col;
  for (let dy = -r; dy <= r; dy++){
    const hw = Math.floor(Math.sqrt((r + .5)**2 - dy*dy));
    ctx.fillRect(cx - hw, cy + dy, hw*2 + 1, 1);
  }
}
function circlePts(r){
  const pts = []; let x = r, y = 0, e = 1 - r;
  while (x >= y){
    for (const [a, b] of [[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]]) pts.push([a, b]);
    y++;
    if (e < 0) e += 2*y + 1; else { x--; e += 2*(y - x) + 1; }
  }
  return pts;
}
function pxLine(x0, y0, x1, y1, col){
  ctx.fillStyle = col;
  const dx = Math.abs(x1-x0), dy = -Math.abs(y1-y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;){
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2*err;
    if (e2 >= dy){ err += dy; x0 += sx; }
    if (e2 <= dx){ err += dx; y0 += sy; }
  }
}
const A0 = Math.PI*.75, SPAN = Math.PI*1.5;
const inArc = (px, py, from, to) => { let a = Math.atan2(py, px); while (a < A0) a += Math.PI*2; return a >= A0 + SPAN*from && a <= A0 + SPAN*to; };


// ---------- track ----------
let segments = [], finishIndex = 0, ents = [], guidePath = [], detours = [];
function pathAt(z){
  const f = z/SEG, i = clamp(Math.floor(f), 0, guidePath.length - 2);
  return lerp(guidePath[i], guidePath[i + 1], clamp(f - i, 0, 1));
}
const lastY = () => segments.length ? segments[segments.length-1].p2.world.y : 0;
let curCliff = 1, rng = Math.random;
function addSegment(curve, y){
  const n = segments.length;
  const specks = [];
  for (let i = 0; i < 7; i++) specks.push({u: rng()*2-1, v: rng(), c: rng() < .5 ? '#625f58' : '#8e8a80'});
  const gs = [];
  for (let i = 0; i < 4; i++) gs.push({u: 1.1 + rng()*2.2, side: rng() < .5 ? -1 : 1, v: rng(), c: rng() < .5 ? '#7a8360' : '#4c4d47'});
  const rubble = [];
  for (let i = 0; i < 20; i++){ const g = 70 + (rng()*60|0); rubble.push({u: rng()*2.1 - 1.05, v: rng(), s: .8 + rng()*2.4, c: `rgb(${g},${g - 2},${g - 6})`, hi: `rgb(${g + 45},${g + 42},${g + 36})`}); }
  const stones = [];
  for (let i = 0; i < 4; i++){ const side = rng() < .5 ? -1 : 1; stones.push({side, u: .9 + rng()*.2, v: rng(), s: .8 + rng()*1.6, c: rng() < .5 ? '#55534c' : '#6e6b63'}); }
  segments.push({index:n,
    p1:{world:{y:lastY(), z:n*SEG}, camera:{}, screen:{}},
    p2:{world:{y, z:(n+1)*SEG}, camera:{}, screen:{}},
    curve, cliff:curCliff, light: Math.floor(n/3)%2, sprites:[], specks, gs, stones, rubble, clip:0});
}
function addRoad(enter, hold, leave, curve, y){
  const sy = lastY(), ey = sy + y*SEG, total = enter+hold+leave;
  for (let n = 0; n < enter; n++) addSegment(easeIn(0,curve,n/enter), easeInOut(sy,ey,n/total));
  for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(sy,ey,(enter+n)/total));
  for (let n = 0; n < leave; n++) addSegment(easeInOut(curve,0,n/leave), easeInOut(sy,ey,(enter+hold+n)/total));
}
const segAt = z => segments[clamp(Math.floor(z/SEG), 0, segments.length-1)];
const wallSide = seg => seg.cliff ? -seg.cliff : 1;

const JACKETS = ['#c83a2a','#2a5ab8','#3a7a3a','#d8b02a','#5a5e66','#8a3aa8'];
function buildCoastalTrack(){
  rng = mulberry(1047); segments = []; ents = []; detours = []; curCliff = 0;
  addRoad(0,homeward?6:16,0,0,0);
  const bends = homeward ? [] : [6,-8,7,-6,9,-8,6,-9,7,-7,9,-6,8,-9,7,-6];
  bends.forEach((curve,i) => {
    addRoad(7,8,7,curve,[4,-3,6,-5,3,-6,5,-4][i%8]);
    if(i === 2 || i === 5)addRoad(0,8,0,0,0);
  });
  addRoad(0,12,0,0,0);
  finishIndex = segments.length;
  addRoad(0,DRAW+30,0,0,0);
  guidePath = segments.map(() => 0);
  if(!homeward){
    for(const [start,side,type] of [[32,1,'rocks'],[104,-1,'hole'],[180,1,'rocks'],[260,-1,'hole'],[328,1,'rocks']]){
      const end=start+34,blockedStart=start+13,blockedEnd=start+21;
      detours.push({start,end,side,type,blockedStart,blockedEnd});
      for(let i=start;i<=end;i++){
        const ramp=i<blockedStart?(i-start)/(blockedStart-start):i>blockedEnd?(end-i)/(end-blockedEnd):1;
        guidePath[i]=side*1.6*(.5-.5*Math.cos(Math.PI*clamp(ramp,0,1)));
        segments[i].detour=true;
      }
      for(let i=blockedStart;i<=blockedEnd;i+=3){
        if(type==='hole')ents.push({kind:'hole',z:(i+.5)*SEG,x:0,w:1550,blocking:true});
        else for(const x of [-.75,-.25,.25,.75])ents.push({kind:'rock',big:true,z:(i+.3+rng()*.4)*SEG,x,w:340+rng()*100,blocking:true});
      }
    }
  }
  for (const seg of segments){
    seg.zone = 'coast';
    if(seg.index % 3 === 0){
      for(const side of [-1,1]){
        const rocky = !seg.detour&&rng() < .6;
        seg.sprites.push({def:rocky ? BOULDER : TUFT,w:rocky ? 420+rng()*240 : 250,offset:side*(1.5+rng()*2)});
      }
    }
    if(seg.index > 20 && seg.index % 7 === 0)seg.sprites.push({def:BIRCH,w:260,offset:1.9+rng()});
  }
  ents.push({kind:'buddy',z:PLAYERZ+7*SEG,x:0,vz:0,w:JEEPW,brake:false});
}
function buildTrack(stage){
  if(coastal){buildCoastalTrack();return;}
  rng = mulberry(stage*7919 + 3);
  const r = rng;
  segments = []; ents = [];
  curCliff = 0;
  addRoad(0,40,0,0,0);
  const len = 110 + stage*30;
  while (segments.length < len){
    const n = [10,14,20][r()*3|0];
    const curve = (r() < .5 ? -1 : 1) * [14,22,30][r()*3|0];
    const hill = (r() - .3) * [0,20,36][r()*3|0];
    const c = r();
    curCliff = c < .2 ? 0 : (c < .6 ? -1 : 1);
    if (r() < .7 && curCliff !== 0) curCliff = curve > 0 ? -1 : 1;   // the drop is usually on the outside of the bend
    if (r() < .06) addRoad(n,n,n,0,hill);
    else addRoad(n,n,n,curve,hill);
  }
  curCliff = 0;
  addRoad(20,20,20,0,10);
  finishIndex = segments.length + 10;
  addRoad(0,DRAW+60,0,0,0);

  // roadside dressing
  for (let i = 0; i < segments.length; i++){
    const s = segments[i];
    if (s.cliff && i % 6 === 0) s.sprites.push({def:BOLLARD, w:90, offset:s.cliff*1.1});
    if (i % 3 === 0){
      const ws = s.cliff ? -s.cliff : (r() < .5 ? -1 : 1);
      const big = r() < .35;
      s.sprites.push({def: big ? BOULDER : TUFT, w: big ? 700 : 260, offset: ws*(1.3 + r()*1.6)});
      if (!s.cliff && r() < .5) s.sprites.push({def:TUFT, w:260, offset: -ws*(1.3 + r()*1.6)});
    }
  }
  // forest at the end, then a meadow and a lake
  const LAKE0 = finishIndex + 1, SHORE = finishIndex + 7;
  for (let i = finishIndex - 45; i < segments.length; i++){
    const s = segments[i];
    s.zone = i >= LAKE0 && i < SHORE ? 'lake' : i >= finishIndex - 4 && i < LAKE0 ? 'meadow' : 'forest';
    s.sprites = s.sprites.filter(sp => sp.def !== BOULDER && sp.def !== TUFT);
    if (s.zone === 'forest' && i < SHORE){
      for (const side of [-1, 1]){
        if (r() < .75) s.sprites.push({def:YPINE, w:260 + r()*120, offset: side*(1.08 + r()*.35)});
        if (r() < .8) s.sprites.push({def: r() < .6 ? PINE : BIRCH, w:600 + r()*200, offset: side*(1.6 + r()*2.4)});
      }
    } else if (s.zone === 'meadow'){
      for (const side of [-1, 1]) if (r() < .7) s.sprites.push({def: r() < .5 ? PINE : BIRCH, w:600 + r()*200, offset: side*(2.2 + r()*2)});
    } else if (s.zone === 'lake'){
      for (const side of [-1, 1]) if (r() < .55) s.sprites.push({def: r() < .6 ? PINE : BIRCH, w:600 + r()*200, offset: side*(2.6 + r()*2.5)});
    } else if (i >= SHORE && i < SHORE + 4){
      for (let o = -6; o <= 6; o += .45 + r()*.4) s.sprites.push({def: r() < .65 ? PINE : BIRCH, w:600 + r()*250, offset:o, shore:true});
    }
  }

  // slow grey car ahead of the player
  // the guide's safe line through the stones
  const ph = [r()*6, r()*6, r()*6];
  guidePath = segments.map((_, i) => clamp(.32*Math.sin(i*.04 + ph[0]) + .22*Math.sin(i*.075 + ph[1]) + .05*Math.sin(i*.16 + ph[2]), -.5, .5));
  for (let i = 0; i < 8; i++) guidePath[i] = lerp(.45, guidePath[8], i/8);
  ents.push({kind:'guide', z: PLAYERZ + 9.5*SEG, x: pathAt(PLAYERZ + 9.5*SEG), vz:0, front:false, w:270, v:'#5a5e66,#3a3c40', anim:0, wait:0});
  // stones and potholes everywhere except the guide's line
  for (let i = 10; i < finishIndex - 4; i++){
    const n = 1 + (r()*2.6|0);
    for (let k = 0; k < n; k++){
      const z = i*SEG + r()*SEG, hole = r() < .4, big = !hole && r() < .3;
      const w = hole ? 300 + r()*120 : big ? 340 + r()*80 : 230 + r()*140, ow = w/ROADW;
      const x = (r()*2 - 1)*.95;
      if (Math.abs(x - pathAt(z)) < JW/2 + ow/2 + .18) continue;
      ents.push({kind: hole ? 'hole' : 'rock', z, x, w, big});
    }
  }

  // the odd goat
  for (let i = 40; i < finishIndex - 20; i += 50 + (r()*50|0)){
    if (r() < .5) continue;
    const z = i*SEG, n = 1 + (r()*2|0), dir = r() < .5 ? -1 : 1;
    for (let k = 0; k < n; k++)
      ents.push({kind:'goat', z: z + k*SEG*(.5 + r()*.8), x: -dir*(.4 + r()*.5), vx: dir*(.12 + r()*.08), w:300, anim:r()*2, pause:0});
  }
}

// ---------- state ----------
let stage = 1, position = 0, playerX = .45, speed = 0, damage = 0, timeLeft = 0, totalTime = 0;
let state = 'title', shake = 0, steer = 0, fallT = 0, fallDir = 0, warnT = 0, hornT = 0, endT = 0, startMsgT = 0;
let vis = 15, visM = 15, visBase = 15, clock = 0, bgOffset = 0;
const keys = {left:false, right:false, up:false, down:false};
let msg = {t1:'ТУМАННАЯ\nГОНКА', t2:'ДОБЕРИСЬ ДО ЛЕСНОЙ ЛУЖАЙКИ.\nЕДЬ СЛЕД В СЛЕД ЗА ПРОВОДНИКОМ:\nОН ВИДИТ КАМНИ И ЯМЫ. НЕ ОБГОНЯЙ.\n\nПРОБЕЛ ИЛИ ТАП - ПОЕХАЛИ', dim:true, big:2};
if(coastal)msg = {t1:'СРЕДНИЙ',t2:'ДОБЕРИСЬ ДО МЕСТА,\nНЕ РАЗБИВ МАШИНУ\nНА НЕПРОСТОЙ ДОРОГЕ.\n\nЕДЬ ЗА СЕРЫМ ДЖИПОМ.\nГАЗ - ВВЕРХ, ТОРМОЗ - ВНИЗ.\n\nПРОБЕЛ ИЛИ ТАП - ПОЕХАЛИ',dim:true,big:2};
if(homeward)msg={t1:'ДОРОГА ДОМОЙ',t2:'ВЫ ЕДЕТЕ В МОСКВУ.\nВПЕРЕДИ ПРОБКА.\nДЖИП ТО ЕДЕТ, ТО ОСТАНАВЛИВАЕТСЯ.\nДЕРЖИТЕ ДИСТАНЦИЮ.\n\nВВЕРХ - ГАЗ, ВНИЗ - ТОРМОЗ.\nПРОБЕЛ ИЛИ ТАП - ПОЕХАЛИ',dim:true,big:2};
function showMsg(t1, t2 = '', dim = true, big = 2){ msg = t1 ? {t1, t2, dim, big} : null; }

function startStage(){
  supplies=[true,true,true,true];fuel=80;neededItem=null;rescueImmunity=0;
  buildTrack(stage);
  position = 0; playerX = coastal ? 0 : .45; speed = 0; damage = 0; fallT = 0; shake = 0; bgOffset=0;warnT=0;endT=0;
  visBase = Math.max(7, 17 - stage*2);
  timeLeft = Math.round((finishIndex*SEG)/(MAXSPEED*.24) + 25);
  totalTime = timeLeft;
  state = 'drive'; startMsgT = 1.4;
  showMsg(coastal ? 'ЕДЬ ЗА ДЖИПОМ' : `ПЕРЕВАЛ ${stage}`, coastal ? 'ДЕРЖИ ДИСТАНЦИЮ' : 'ПОЕХАЛИ!', false, coastal ? 1 : 2);
}
function press(){
  audioOn();
  if (state === 'title' || state === 'over') startStage();
  else if (state === 'clear'){ if(demoFinish){onComplete();return;}if(coastal){onComplete();return;}stage++; startStage(); }
}
function fail(t1, t2){
  if (state !== 'drive') return;
  state = 'crash'; endT = .9; shake = .5;
  noiseBurst(.5, .16);
  pendingMsg = [t1, t2];
}
let pendingMsg = null;
let supplies=[true,true,true,true],fuel=80,neededItem=null,rescueImmunity=0;
function roadsideStop(kind){
 if(state!=='drive')return;
 speed=0;steer=0;
 const available=kind==='wheel'?(supplies[1]||supplies[2]):supplies[kind==='chains'?3:0];
 const speech=kind==='wheel'?'Надо менять колесо.':kind==='chains'?'Ты забуксовал.':'Что, кончился бензин?';
 if(!available){state='over';neededItem=null;showMsg(speech,'Запасов больше нет. Дальше не поедем.',false,1);return;}
 state='repair';neededItem=kind;
 showMsg(speech,kind==='wheel'?'Используй запаску.':kind==='chains'?'Используй цепи.':'Используй канистру.',false,1);
}
function useItem(index){
 const kind=index===0?'fuel':index===3?'chains':'wheel';
 if(state!=='repair'||neededItem!==kind||!supplies[index])return false;
 supplies[index]=false;
 if(kind==='fuel')fuel=Math.min(100,fuel+60);
 else if(kind==='chains')playerX=pathAt(position+PLAYERZ);
 damage=0;rescueImmunity=5;neededItem=null;state='drive';startMsgT=2;
 showMsg(kind==='wheel'?'Колесо поменяли.':kind==='chains'?'Выбрались!':'Заправились.','Двигайся за мной.',false,1);
 return true;
}


// ---------- audio ----------
let actx = null, eng = null, engGain = null, grav = null, gravGain = null, soundOn = true;
function audioOn(){
  try {
    if (!actx){
      actx = new (window.AudioContext || window.webkitAudioContext)();
      eng = actx.createOscillator(); eng.type = 'sawtooth';
      const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      engGain = actx.createGain(); engGain.gain.value = 0;
      eng.connect(f).connect(engGain).connect(actx.destination); eng.start();
      const buf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
      grav = actx.createBufferSource(); grav.buffer = buf; grav.loop = true;
      const gf = actx.createBiquadFilter(); gf.type = 'bandpass'; gf.frequency.value = 1400;
      gravGain = actx.createGain(); gravGain.gain.value = 0;
      grav.connect(gf).connect(gravGain).connect(actx.destination); grav.start();
    }
    if (actx.state === 'suspended') actx.resume();
  } catch(e) {}
}
function beep(f1, f2, dur, type = 'square', vol = .05){
  if (!actx || !soundOn) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t+dur);
}
function noiseBurst(dur, vol){
  if (!actx || !soundOn) return;
  const buf = actx.createBuffer(1, actx.sampleRate*dur|0, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2 - 1)*(1 - i/d.length);
  const s = actx.createBufferSource(), g = actx.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g).connect(actx.destination); s.start();
}
function horn(){
  if (hornT > 0 || state !== 'drive') return;
  hornT = .7;
  beep(350, 350, .45, 'square', .045); beep(440, 440, .45, 'square', .035);
  const pz = position + PLAYERZ;
  for (const e of ents){
    const d = (e.z - pz)/SEG;
    if (d < -2 || d > 30) continue;
    if (e.kind === 'hiker'){ e.tx = playerX > 0 ? -.85 : .85; e.think = 6; }
    if (e.kind === 'goat' && e.vx) e.vx *= 1.8;
  }
}

// ---------- update ----------
const kmh = () => speed/MAXSPEED*KMH;
function updateEnts(dt){
  const pz = position + PLAYERZ;
  for (const e of ents){
    const d = (e.z - pz)/SEG;
    if(coastal && e.kind === 'buddy'){
      const stopZ = (finishIndex+3)*SEG, lead = e.z-pz;
      let target = Math.min(1050,Math.sqrt(Math.max(0,2*650*(stopZ-e.z))));
      if(!homeward&&Math.abs(pathAt(e.z))>.25)target=Math.min(target,540);
      if(homeward)target = Math.floor(clock/4)%2===0 ? Math.min(target,360) : 0;
      if(lead > 10*SEG)target = 0;
      e.brake = target < e.vz-30;
      e.vz += clamp(target-e.vz,-1200*dt,600*dt);
      e.z = Math.min(stopZ,e.z+e.vz*dt);
      if(e.z >= stopZ){e.vz=0;e.brake=true;}
      e.x = pathAt(e.z);
      continue;
    }
    if (e.kind !== 'buddy' && (d > 90 || d < -12)) continue;
    if (e.kind === 'guide'){
      const lead = e.z - pz;
      // waits for us if we fall back into the fog, turns round to look
      const target = e.z > (finishIndex + 1)*SEG || lead > 11*SEG ? 0 : GUIDE_SPEED;
      e.vz += clamp(target - e.vz, -900*dt, 600*dt);
      e.z += e.vz*dt;
      if (e.vz > 40) e.anim += dt*e.vz/GUIDE_SPEED;
      e.front = e.vz < 40 && lead > 10.5*SEG;
      e.x = pathAt(e.z);
      continue;
    }
    if (e.kind === 'hiker'){
      e.z += e.vz*dt; e.anim += dt;
      e.think -= dt;
      if (e.think <= 0){ e.think = 3 + Math.random()*5; if (Math.random() < .25) e.tx = (Math.random()*2 - 1)*.8; }
      e.x += clamp(e.tx - e.x, -.35*dt, .35*dt);
    } else if (e.kind === 'goat'){
      e.anim += dt;
      if (e.pause > 0) e.pause -= dt;
      else if (e.vx){
        e.x += e.vx*dt;
        if (Math.abs(e.x) > .95){ e.x = Math.sign(e.x)*.95; e.vx = -e.vx; e.pause = 1 + Math.random()*3; }
      }
    } else if (e.kind === 'car'){
      let target = e.cruise;
      // oncoming drivers can't see far either: they stop for anything in their path
      const inPath = (x2, w2, dist) => dist > 0 && dist < 7*SEG && overlap(e.x, e.w/ROADW, x2, w2);
      if (inPath(playerX, JW, e.z - pz)) target = 0;
      for (const o of ents) if (o !== e && o.kind !== 'car' && inPath(o.x, o.w/ROADW, e.z - o.z)) target = 0;
      e.vz += clamp(target - e.vz, -3000*dt, 3000*dt);
      e.z += e.vz*dt;
    } else if (e.kind === 'buddy'){
      // grey jeep from our group: keeps a little ahead on the left,
      // drops in behind us when an oncoming car or a rock blocks its side
      const bw = e.w/ROADW, ahead = (o, dist) => { const dz = o.z - e.z; return dz > 0 && dz < dist; };
      let oncoming = false, rock = null;
      for (const o of ents){
        if (o === e) continue;
        if (o.kind === 'car' && ahead(o, 14*SEG)) oncoming = true;
        if (o.kind === 'rock' && ahead(o, 5*SEG) && (!rock || o.z < rock.z)) rock = o;
      }
      const free = l => !rock || !overlap(l, bw, rock.x, rock.w/ROADW, 1.05);
      const left = [BUDDY_LANE, -.6, -.15].filter(free);
      const tuck = oncoming || !left.length;
      let lane = tuck ? ([.45, .7, .2].filter(free)[0] ?? .45) : left[0];
      const lead = e.z - pz;
      if (lane > 0 && e.x < 0 && lead > -1.4*SEG) lane = e.x; // wait until we're behind before cutting in
      if (Math.abs(lead) < 1.6*SEG && overlap(lane, bw, playerX, JW, 1.1)) lane = e.x;
      e.tx = lane;
      e.x += clamp(e.tx - e.x, -.45*dt, .45*dt);
      const want = tuck ? -2.2*SEG : BUDDY_GAP;
      let target = speed + (want - lead)*1.4;
      for (const o of ents){
        if (o === e || o.kind === 'rock') continue;
        if (ahead(o, o.kind === 'car' ? 6*SEG : 3*SEG) && overlap(e.x, bw, o.x, o.w/ROADW)) target = 0;
      }
      if (lead < 0 && -lead < 2.4*SEG && overlap(e.x, bw, playerX, JW)) target = Math.min(target, speed*clamp((-lead - SEG)/SEG, 0, 1));
      if (e.z > (finishIndex - 3)*SEG) target = 0;
      target = clamp(target, 0, BUDDY_MAX);
      e.brake = target < e.vz - 60;
      e.vz += clamp(target - e.vz, -3200*dt, 1600*dt);
      e.z += e.vz*dt;
    }
  }
}

function update(dt){
  clock += dt;
  visM = clamp(visBase + 9*Math.sin(clock*.13) + 5*Math.sin(clock*.41 + 1), 1, 30);
  { const endF = clamp(((position + PLAYERZ)/SEG - (finishIndex - 30))/26, 0, 1); visM = lerp(visM, 30, endF*.9); }
  vis = coastal ? DRAW : PLAYERZ/SEG + visM/4;
  mtnA = .6*clamp((visM - 3)/12, 0, 1)*clamp(.45 + .8*Math.sin(clock*.045 + .5) + .3*Math.sin(clock*.17), 0, 1);
  if (hornT > 0) hornT -= dt;
  if(coastal)warnT=Math.max(0,warnT-dt);
  if (shake > 0) shake -= dt;
  if (startMsgT > 0){ startMsgT -= dt; if (startMsgT <= 0 && state === 'drive') showMsg(null); }
  if(coastal&&state==='repair')return;
  if(coastal)rescueImmunity=Math.max(0,rescueImmunity-dt);
  updateEnts(dt);

  const pz = position + PLAYERZ;
  const pSeg = segAt(pz);
  const sp = speed/MAXSPEED;
  const ctrl = state === 'drive';
  if(coastal && ctrl){
    if(keys.left)playerX -= dt*.65*clamp(sp*8,0,1);
    if(keys.right)playerX += dt*.65*clamp(sp*8,0,1);
    playerX -= dt*sp*pSeg.curve*.04;
    steer = keys.left ? -1 : keys.right ? 1 : 0;
    if(keys.up)speed += ACCEL*dt;
    else if(keys.down)speed += BRAKE*dt;
    else speed += DECEL*dt;
    speed = clamp(speed,0,TOP);
    const buddy = ents.find(e=>e.kind==='buddy');
    // Closing on the guide slows us down; only a rock can damage a wheel.
    const guideGap=buddy.z-pz;
    if(guideGap<SEG*2.5&&overlap(playerX,JW,buddy.x,buddy.w/ROADW,.8))
      speed=Math.min(speed,Math.max(0,(guideGap-SEG*.7)*2));
    // The last few metres ease both jeeps into their stopping places.
    if(pz > (finishIndex-4)*SEG)speed = Math.min(speed,Math.max(120,(finishIndex*SEG-pz)*1.1));
    fuel=Math.max(0,fuel-speed*dt/(finishIndex*SEG)*130);
    if(fuel<=0){roadsideStop('fuel');return;}
    position += speed*dt;
    bgOffset += pSeg.curve*speed*dt/SEG*.5;
    // The whole visible bypass plus its grassy shoulders is safe to drive.
    const safeTrail=Math.abs(pathAt(pz))>.15&&Math.abs(playerX-pathAt(pz))<.95;
    playerX=clamp(playerX,-2.25,2.25);
    if(Math.abs(playerX)>1.35&&!safeTrail&&speed>80&&rescueImmunity<=0){
      warnT=.3;roadsideStop('chains');return;
    }
    for(const obstacle of ents){
      if(safeTrail||rescueImmunity>0||!obstacle.blocking||!['rock','hole'].includes(obstacle.kind)||Math.abs(obstacle.z-pz)>SEG*.22)continue;
      if(overlap(playerX,JW*.65,obstacle.x,obstacle.w/ROADW,.65)){
        roadsideStop(obstacle.kind==='hole'?'chains':'wheel');return;
      }
    }
    if(position+PLAYERZ >= finishIndex*SEG && buddy.z >= (finishIndex+2.8)*SEG){
      position=finishIndex*SEG-PLAYERZ;speed=0;state='clear';
      showMsg('ПРИЕХАЛИ!',homeward?'ПРОБКА ПОЗАДИ. ВЫ ДОЕХАЛИ ДОМОЙ.\n\nПРОБЕЛ ИЛИ ТАП - ДАЛЕЕ':'ОСТАНОВКА У МОРЯ.\nВЫ ДОЕХАЛИ ВМЕСТЕ С ДЖИПОМ.\nНАЙДИТЕ МЕСТО ДЛЯ ЛАГЕРЯ.\n\nПРОБЕЛ ИЛИ ТАП - ИСКАТЬ');
      beep(523,659,.35,'square',.05);
    }
    if(engGain){eng.frequency.setTargetAtTime(38+sp*150,actx.currentTime,.05);engGain.gain.setTargetAtTime(soundOn ? .035 : 0,actx.currentTime,.1);}
    return;
  }
  if(coastal && state==='clear'){speed=0;endT+=dt;if(endT>=1.5&&active){onComplete();}return;}

  if (state === 'fall'){
    fallT += dt;
    if (fallT > 1.3 && pendingMsg){ showMsg(...pendingMsg); pendingMsg = null; state = 'over'; }
    return;
  }
  if (state === 'crash'){
    speed = 0; endT -= dt;
    if (endT <= 0 && pendingMsg){ showMsg(...pendingMsg); pendingMsg = null; state = 'over'; }
    return;
  }

  const start = position;
  position += dt*speed;
  const dx = dt*.9*clamp(sp*8, 0, 1);
  steer = 0;
  if (ctrl && keys.left){ playerX -= dx; steer = -1; }
  else if (ctrl && keys.right){ playerX += dx; steer = 1; }
  playerX -= dx*sp*pSeg.curve*CENTRIFUGAL;

  if (ctrl && keys.up) speed += ACCEL*dt;
  else if (ctrl && keys.down) speed += BRAKE*dt;
  else speed += (ctrl ? DECEL : BRAKE*.5)*dt;
  speed = clamp(speed, 0, TOP);
  bgOffset += pSeg.curve*(position - start)/SEG*1.2;

  if (ctrl){
    // road edges
    const cs = pSeg.cliff;
    let edgeNoise = 0, cliffWarn = false;
    for (const side of [-1, 1]){
      const out = playerX*side;
      if (cs === side){
        if (out > .85){ edgeNoise = Math.max(edgeNoise, (out - .85)*4); cliffWarn = true; }
        if (out > 1 + JW*.35){
          state = 'fall'; fallT = 0; fallDir = side;
          noiseBurst(1.2, .12);
          pendingMsg = ['ОБРЫВ', 'МАШИНА СОРВАЛАСЬ В ПРОПАСТЬ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ'];
          return;
        }
      } else if (out > 1 - JW*.15){
        playerX = side*(1 - JW*.15);
        if (speed > 50){
          speed += -MAXSPEED*2.2*dt;
          damage += (4 + sp*30)*dt;
          shake = Math.max(shake, .08);
          edgeNoise = 1;
        }
      }
    }
    warnT = cliffWarn ? warnT + dt : 0;
    if (gravGain) gravGain.gain.setTargetAtTime(soundOn ? Math.min(.05, edgeNoise*.05*Math.min(1, sp*4)) : 0, actx.currentTime, .05);

    // overtaking the guide: blind in the fog, we hit the first stone
    const g = ents.find(e => e.kind === 'guide');
    if (g && pz > g.z + SEG*.3 && !overlap(playerX, JW, g.x, g.w/ROADW, .9)){
      fail('УДАР', 'ВЫ ОБОГНАЛИ ПРОВОДНИКА\nИ НАЛЕТЕЛИ НА КАМЕНЬ В ТУМАНЕ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ'); return;
    }
    // collisions
    for (const e of ents){
      const dz = e.z - pz;
      const len = (e.kind === 'car' || e.kind === 'buddy') ? SEG*.9 : e.kind === 'hole' ? SEG*.3 : SEG*.45;
      if (dz < -len || dz > len) continue;
      if (!overlap(playerX, JW, e.x, e.w/ROADW, .9)) continue;
      const closing = speed - (e.vz || 0);
      if (e.kind === 'buddy' && Math.abs(dz) < SEG*.5){
        // side contact: scrape along, get pushed back into our lane
        const sd = Math.sign(playerX - e.x) || 1;
        playerX = e.x + sd*((JW + e.w/ROADW)/2*.9 + .01);
        speed = Math.max(0, speed - MAXSPEED*1.2*dt); shake = Math.max(shake, .1);
        continue;
      }
      if (e.kind === 'buddy' && dz < 0) continue;
      if (e.kind === 'rock'){
        fail('УДАР', 'ВЫ НАЛЕТЕЛИ НА КАМЕНЬ.\nЕДЬТЕ СЛЕД В СЛЕД ЗА ПРОВОДНИКОМ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ'); return;
      } else if (e.kind === 'hole'){
        fail('ЯМА', 'КОЛЕСО ПРОВАЛИЛОСЬ В ЯМУ.\nЕДЬТЕ СЛЕД В СЛЕД ЗА ПРОВОДНИКОМ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ'); return;
      } else if (closing > BUMP_SPEED){
        if (e.kind === 'guide') fail('АВАРИЯ', 'ВЫ СБИЛИ ПРОВОДНИКА.\nДЕРЖИТЕ ДИСТАНЦИЮ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ');
        else if (e.kind === 'hiker') fail('АВАРИЯ', 'ВЫ СБИЛИ ТУРИСТА.\nВ ТУМАНЕ НАДО ЕХАТЬ МЕДЛЕННЕЕ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ');
        else if (e.kind === 'goat') fail('АВАРИЯ', 'ВЫ СБИЛИ КОЗУ.\nОНИ ВНЕЗАПНО ВЫХОДЯТ ИЗ ТУМАНА.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ');
        else if (e.kind === 'buddy') fail('АВАРИЯ', 'ВЫ ВРЕЗАЛИСЬ В СЕРЫЙ ДЖИП.\nДЕРЖИТЕ ДИСТАНЦИЮ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ');
        else fail('АВАРИЯ', 'ЛОБОВОЕ СТОЛКНОВЕНИЕ.\nДЕРЖИТЕСЬ СВОЕЙ ПОЛОСЫ.\n\nПРОБЕЛ ИЛИ ТАП - ЕЩЁ РАЗ');
        return;
      } else {
        speed = e.kind === 'buddy' ? Math.min(speed, e.vz) : 0; position = e.z - len - PLAYERZ - 10;
      }
    }

    if (pz >= finishIndex*SEG){
      state = 'clear';
      beep(392, 392, .2, 'square', .05); setTimeout(() => beep(523, 523, .4, 'square', .05), 200);
      showMsg('ПРИЕХАЛИ!', `ЛЕСНАЯ ЛУЖАЙКА У ОЗЕРА.\nВЫСОТА ${altitude()} М\n\nПРОБЕЛ ИЛИ ТАП - ${demoFinish?'ДАЛЕЕ':'СЛЕДУЮЩИЙ ПЕРЕВАЛ'}`, false);
    }
  } else if (gravGain) gravGain.gain.setTargetAtTime(0, actx.currentTime, .05);

  if (engGain){
    eng.frequency.setTargetAtTime(38 + sp*150, actx.currentTime, .05);
    engGain.gain.setTargetAtTime(soundOn && state !== 'title' ? .035 : 0, actx.currentTime, .1);
  }
}

// ---------- render ----------
function project(p, cx, cy, cz){
  p.camera.x = -cx;
  p.camera.y = p.world.y - cy;
  p.camera.z = p.world.z - cz;
  p.screen.scale = DEPTH/p.camera.z;
  p.screen.x = Math.round(W/2 + p.screen.scale*p.camera.x*W/2);
  p.screen.y = Math.round(HZ - p.screen.scale*p.camera.y*PROJECTION_Y);
  p.screen.w = Math.round(p.screen.scale*ROADW*W/2);
}
// fog is measured from the jeep, not the camera: the patch right around the car stays clear
function fogAt(d){
  if(coastal)return 0;
  const ahead = d - PLAYERZ/SEG, v = vis - PLAYERZ/SEG, n = Math.min(.8, v*.5);
  const f = clamp((ahead - n)/(v - n), 0, 1);
  return Math.round(Math.pow(f, 1.15)*10)/10;
}
function span(xa, xb, py, col){
  xa = Math.max(0, Math.round(xa)); xb = Math.min(W, Math.round(xb));
  if (xb > xa){ ctx.fillStyle = col; ctx.fillRect(xa, py, xb - xa, 1); }
}
const ABYSS = '#b6babd';
const hsh = k => { let t = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b); t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35); t ^= t >>> 16; return (t >>> 0)/4294967296; };
// ragged stony edge, tied to the world so it doesn't shimmer
function jag(z, side){
  const o = side > 0 ? 1 : 0;
  return (hsh(Math.floor(z*4)*2 + o) - .5)*.13 + (hsh(Math.floor(z*13)*2 + o + 777777) - .5)*.07;
}
function drawSegment(seg, fog){
  const a = seg.p1.screen, b = seg.p2.screen;
  const y0 = Math.max(0, b.y), y1 = Math.min(H, a.y);
  if (y1 <= y0) return;
  if (fog >= 1){ ctx.fillStyle = FOG; ctx.fillRect(0, y0, W, y1 - y0); return; }
  const L = seg.light, Z = seg.zone;
  if (Z === 'lake'){
    for (let py = y0; py < y1; py++){
      const t = (a.y - (py + .5))/(a.y - b.y);
      const cx = lerp(a.x, b.x, t), w = lerp(a.w, b.w, t), k = seg.index*97 + Math.floor(t*6);
      ctx.fillStyle = L ? '#8e9ea1' : '#8a9a9d'; ctx.fillRect(0, py, W, 1);
      if (hsh(k) < .4){ const sx = cx + (hsh(k + 1)*2 - 1)*w*2.2; span(sx, sx + w*(.15 + hsh(k + 2)*.35), py, '#a9b7b9'); }
      if (hsh(k + 5) < .25){ const sx = cx + (hsh(k + 6)*2 - 1)*w*2.2; span(sx, sx + w*.2, py, '#7c8c8f'); }
    }
    if (fog > 0){ ctx.fillStyle = `rgba(${FOG_RGB},${fog*.6})`; ctx.fillRect(0, y0, W, y1 - y0); }
    return;
  }
  const ground = coastal ? (L ? '#747b54' : '#707650') : Z === 'meadow' ? (L ? '#6a8a46' : '#668542') : Z === 'forest' ? (L ? '#4f6a3a' : '#4b6536') : (L ? '#525449' : '#4e5046');
  const road = coastal ? (L ? '#aaa494' : '#a49e90') : Z === 'forest' ? (L ? '#86735e' : '#806d59') : (L ? '#8b877e' : '#86827a');
  const edge = coastal ? '#686958' : Z === 'forest' ? '#3e4f2e' : '#44453e', track = coastal ? (L ? '#959080' : '#908b7c') : Z === 'forest' ? (L ? '#766450' : '#715f4c') : (L ? '#7a776f' : '#76736b');
  for (let py = y0; py < y1; py++){
    const t = (a.y - (py + .5))/(a.y - b.y);
    const cx = lerp(a.x, b.x, t), w = lerp(a.w, b.w, t);
    ctx.fillStyle = ground; ctx.fillRect(0, py, W, 1);
    if (Z === 'meadow'){
      const k = seg.index*53 + Math.floor(t*5);
      if (hsh(k) < .5){ const sx = cx + (hsh(k + 1)*2 - 1)*w*2; span(sx, sx + w*.25, py, '#7c9a50'); }
      continue;
    }
    const zz = seg.index + t, jl = jag(zz, -1), jr = jag(zz, 1);
    for (const side of [-1, 1]){
      const e = cx + side*w*(1 + (side < 0 ? jl : jr));
      if (seg.cliff === side){
        if (side < 0){ span(0, e - w*.05, py, ABYSS); span(e - w*.05, e, py, '#9a968b'); }
        else { span(e + w*.05, W, py, ABYSS); span(e, e + w*.05, py, '#9a968b'); }
      } else {
        if (side < 0) span(e - w*.12, e, py, edge); else span(e, e + w*.12, py, edge);
      }
    }
    span(cx - w*(1 + jl), cx + w*(1 + jr), py, road);
    for (const u of [-.72, -.28, .28, .72]) span(cx + (u - .07)*w, cx + (u + .07)*w, py, track);
    if(coastal&&seg.detour){
      const trail=lerp(guidePath[seg.index]||0,guidePath[seg.index+1]||0,clamp(t,0,1));
      span(cx+(trail-.65)*w,cx+(trail+.65)*w,py,L?'#838361':'#7b7d59');
      for(const rut of [-.23,.23])span(cx+(trail+rut-.055)*w,cx+(trail+rut+.055)*w,py,L?'#a19a73':'#96916b');
    }
  }
  // gravel & grass specks tied to the world, so they don't shimmer
  const sz = Math.max(1, Math.round(a.w/260));
  if (Z === 'meadow'){
    for (const s of seg.specks){
      const py = Math.round(lerp(a.y, b.y, s.v));
      if (py < y0 || py >= y1) continue;
      const px = Math.round(lerp(a.x, b.x, s.v) + s.u*lerp(a.w, b.w, s.v)*2);
      ctx.fillStyle = s.c === '#625f58' ? '#e8d84a' : '#d8dce8'; ctx.fillRect(px, py, sz, sz);
    }
    if (fog > 0){ ctx.fillStyle = `rgba(${FOG_RGB},${fog})`; ctx.fillRect(0, y0, W, y1 - y0); }
    return;
  }
  for (const s of seg.specks){
    const py = Math.round(lerp(a.y, b.y, s.v));
    if (py < y0 || py >= y1) continue;
    const px = Math.round(lerp(a.x, b.x, s.v) + s.u*lerp(a.w, b.w, s.v)*.95);
    ctx.fillStyle = s.c; ctx.fillRect(px, py, sz, sz);
  }
  for (const s of seg.rubble){
    const py = Math.round(lerp(a.y, b.y, s.v));
    if (py < y0 || py >= y1) continue;
    const ww = lerp(a.w, b.w, s.v), px = Math.round(lerp(a.x, b.x, s.v) + s.u*ww);
    const r = Math.max(1, Math.round(ww/260*s.s*4.2));
    ctx.fillStyle = '#3a3935'; ctx.fillRect(px - r, py, r*2 + 1, 1);
    ctx.fillStyle = s.c; ctx.fillRect(px - r, py - r, r*2, r);
    if (r > 2){ ctx.fillRect(px - r + 1, py - r - Math.floor(r/2), r*2 - 3, Math.floor(r/2)); }
    if (r > 1){ ctx.fillStyle = s.hi; ctx.fillRect(px - r + 1, py - r - (r > 2 ? Math.floor(r/2) : 0), Math.max(1, r - 1), 1); }
  }
  for (const s of seg.stones){
    const py = Math.round(lerp(a.y, b.y, s.v));
    if (py < y0 || py >= y1) continue;
    const u = seg.cliff === s.side ? Math.min(s.u, .97) : s.u;
    const px = Math.round(lerp(a.x, b.x, s.v) + s.side*u*lerp(a.w, b.w, s.v));
    const r = Math.max(1, Math.round(sz*s.s*1.6));
    ctx.fillStyle = s.c; ctx.fillRect(px - r, py - r + 1, r*2, r);
    if (r > 1){ ctx.fillStyle = '#a29e94'; ctx.fillRect(px - r + 1, py - r + 1, Math.max(1, r - 1), 1); }
  }
  for (const s of seg.gs){
    if (seg.cliff === s.side) continue;
    const py = Math.round(lerp(a.y, b.y, s.v));
    if (py < y0 || py >= y1) continue;
    const px = Math.round(lerp(a.x, b.x, s.v) + s.side*s.u*lerp(a.w, b.w, s.v));
    ctx.fillStyle = s.c; ctx.fillRect(px, py, sz, sz);
  }
  if (fog > 0){ ctx.fillStyle = `rgba(${FOG_RGB},${fog})`; ctx.fillRect(0, y0, W, y1 - y0); }
}
function drawSprite(def, o, worldW, scale, x, y, clip){
  const dw = Math.round(worldW*scale*W/2);
  if (dw < 2 || dw > 520) return null;
  const img = getSprite(def, dw, o), dh = img.height;
  const dx = Math.round(x - dw/2), top = Math.round(y) - dh;
  let v = dh;
  if (clip != null && top + dh > clip) v = Math.round(clip) - top;
  if (v > 0) ctx.drawImage(img, 0, 0, dw, v, dx, top, dw, v);
  return {dw, dh, top};
}

// drifting fog wisps (domes with 1px stairs)
const WISPS = [];
{
  const r = mulberry(5);
  for (let i = 0; i < 6; i++){
    const w = 70 + (r()*90|0), h = 6 + (r()*6|0), c = mk(w, h + 1), x = c.getContext('2d');
    x.fillStyle = '#eef0f1';
    for (let dy = 0; dy < h; dy++){
      const hw = (w/2)*Math.sqrt(1 - ((h - dy)/(h + .5))**2);
      x.fillRect(Math.round(w/2 - hw), dy, Math.round(w/2 + hw) - Math.round(w/2 - hw), 1);
    }
    x.fillRect(0, h, w, 1);
    WISPS.push({img:c, y: HZ - 28 + (r()*48|0), base: r()*600, sp: 4 + r()*10, par: .4 + r()*.8});
  }
}
const MTN_W = 640;
const MOUNTAINS = (() => {
  const c = mk(MTN_W, 60), x = c.getContext('2d'), r = mulberry(42);
  const ridge = (base, amp, col, snow, seed) => {
    const pk = []; for (let i = 0; i < 9; i++) pk.push({x: i*MTN_W/9 + r()*50, h: amp*(.45 + r()*.55)});
    for (let px = 0; px < MTN_W; px++){
      let h = 0;
      for (const p of pk) for (const o of [-MTN_W, 0, MTN_W]){
        const d = Math.abs(px - p.x - o); h = Math.max(h, p.h - d*(.38 + (seed % 3)*.06));
      }
      h += Math.sin(px*.21 + seed)*1.5 + Math.sin(px*.53 + seed*2)*1;
      const top = Math.round(60 - base - Math.max(0, h));
      x.fillStyle = col; x.fillRect(px, top, 1, 60 - top);
      if (snow && h > amp*.62){ x.fillStyle = snow; x.fillRect(px, top, 1, Math.max(1, Math.round((h - amp*.62)*.5))); }
    }
  };
  ridge(4, 44, '#a7adb3', '#dfe3e6', 1);
  ridge(0, 26, '#9aa0a5', null, 5);
  return c;
})();
let mtnA = 0;
// ---- dash radio, bottom right ----
const RAD_X = 246, RAD_Y = 104;
const RADIO = (() => {
  const c = mk(74, 140), x = c.getContext('2d');
  const R = (x0, y0, x1, y1, col) => { x.fillStyle = col; x.fillRect(x0, y0, x1 - x0, y1 - y0); };
  // antenna, tapering
  for (let i = 0; i <= 60; i++){
    const t = i/60, ax = Math.round(lerp(47, 68, t)), ay = Math.round(lerp(50, 0, t)), wd = t < .5 ? 3 : 2;
    R(ax - 1, ay, ax - 1 + wd, ay + 1, '#141518'); if (t < .8) R(ax - 1, ay, ax, ay + 1, '#3a3c42');
  }
  R(44, 46, 51, 52, '#232428');
  // mount arm and ball
  R(30, 34, 38, 52, '#1c1d20'); R(30, 34, 31, 52, '#34363b');
  x.fillStyle = '#2a2b2f'; for (let dy = -4; dy <= 4; dy++){ const hw = Math.floor(Math.sqrt(20 - dy*dy)); x.fillRect(34 - hw, 32 + dy, hw*2 + 1, 1); }
  R(32, 29, 35, 31, '#55585e');
  R(22, 24, 44, 29, '#1c1d20'); R(22, 24, 44, 25, '#3a3c42');
  // holder & body
  R(26, 66, 66, 118, '#0c0d0f');
  R(30, 52, 62, 140, '#18191c'); R(30, 52, 31, 140, '#34363b'); R(61, 52, 62, 140, '#0e0f11');
  R(33, 47, 39, 52, '#232428'); R(53, 45, 59, 52, '#232428'); R(54, 45, 58, 46, '#45474d');
  // screen frame
  R(32, 60, 60, 77, '#0b0c0e');
  // keypad
  for (let rr = 0; rr < 4; rr++) for (let cc = 0; cc < 3; cc++){
    const kx = 34 + cc*8, ky = 82 + rr*6, col = rr === 3 && cc === 2 ? '#a82a2a' : '#34363b';
    R(kx, ky, kx + 6, ky + 4, col); R(kx, ky, kx + 6, ky + 1, rr === 3 && cc === 2 ? '#d04a40' : '#55585e');
  }
  R(36, 108, 56, 112, '#232428');
  // hand mic with its grille
  R(4, 58, 22, 104, '#151619'); R(5, 56, 21, 58, '#151619'); R(4, 58, 5, 104, '#2e3035');
  for (let gy = 62; gy < 84; gy += 2) R(7, gy, 19, gy + 1, '#26282c');
  R(22, 70, 24, 82, '#232428');
  // coiled cords
  for (let cy = 104; cy < 140; cy += 3){ R(9, cy, 17, cy + 1, '#0d0e10'); R(9, cy + 1, 17, cy + 2, '#2c2e33'); }
  for (let i = 0; i < 14; i++){ const t = i/13, cx = Math.round(lerp(14, 34, t)), cy = Math.round(56 - Math.sin(t*Math.PI)*12); R(cx, cy, cx + 2, cy + 1, '#2c2e33'); }
  return c;
})();
let radT = 0;
function drawRadio(now,RAD_X=246,RAD_Y=104){
  ctx.drawImage(RADIO, RAD_X, RAD_Y);
  // backlit screen, flares up when the guide's group calls in
  const rx = (now/1000) % 11 < 1.6;
  ctx.fillStyle = rx ? '#a8dcf8' : '#7aaed2'; ctx.fillRect(RAD_X + 33, RAD_Y + 61, 26, 15);
  ctx.fillStyle = rx ? '#d03a2a' : (Math.floor(now/700) % 2 ? '#3ac84a' : '#1a4a22'); ctx.fillRect(RAD_X + 40, RAD_Y + 54, 2, 2);
  drawText('145', RAD_X + 46, RAD_Y + 65, {color:'#1a2a3a'}, 'center');
}
const SKY = ['#d8dadb','#d4d6d7','#d0d3d4','#cdd0d1','#cacdcf','#c8cbcd'];

const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5)/16 - .5);
const DQ = 20;
const DBUF = new Uint8ClampedArray(W*H*4);
function ditherFrame(){
  const img = ctx.getImageData(0, 0, W, H), d = img.data, o = DBUF;
  o.set(d);
  const diff = (k, j) => Math.abs(o[k] - o[j]) + Math.abs(o[k+1] - o[j+1]) + Math.abs(o[k+2] - o[j+2]);
  for (let y = 3; y < H - 3; y++){
    const row = (y & 3)*4;
    for (let x = 3; x < W - 3; x++){
      const k = (y*W + x)*4;
      const m = Math.max(diff(k, k - W*12), diff(k, k + W*12), diff(k, k - 12), diff(k, k + 12), diff(k, k - W*4), diff(k, k + W*4));
      if (m === 0 || m > 42) continue;
      const t = BAYER[row + (x & 3)]*DQ;
      d[k] = Math.min(255, Math.round((o[k] + t)/DQ)*DQ);
      d[k+1] = Math.min(255, Math.round((o[k+1] + t)/DQ)*DQ);
      d[k+2] = Math.min(255, Math.round((o[k+2] + t)/DQ)*DQ);
    }
  }
  ctx.putImageData(img, 0, 0);
}
function render(now){
  ctx.save();
  if (shake > 0) ctx.translate((Math.random()*4|0) - 2, (Math.random()*3|0) - 1);
  const bandH = Math.ceil(HZ/SKY.length);
  SKY.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-4, i*bandH - 4, W + 8, bandH + 4); });
  // far mountains, only faintly through the fog and sometimes gone
  if (mtnA > .01){
    ctx.globalAlpha = mtnA;
    const ox = ((-bgOffset*.035) % MTN_W + MTN_W) % MTN_W;
    ctx.drawImage(MOUNTAINS, Math.round(ox) - MTN_W, HZ - 56); ctx.drawImage(MOUNTAINS, Math.round(ox), HZ - 56);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = FOG; ctx.fillRect(-4, HZ, W + 8, H - HZ + 4);
  if(coastal && background){
    const bs=W/background.width,by=Math.round(HZ-62*bs);
    function layer(image,factor){if(!image)return;const shift=Math.round(-bgOffset*factor),iw=W,ih=Math.round(image.height*W/image.width),start=((shift%iw)+iw)%iw-iw;for(let x=start;x<W;x+=iw)ctx.drawImage(image,x,by,iw,ih)}
    layer(background,.22);layer(nearBackground,.85);
  }

  const base = segAt(position), basePct = (position % SEG)/SEG;
  const pz = position + PLAYERZ, pSeg = segAt(pz), pPct = (pz % SEG)/SEG;
  const playerY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
  let maxy = H, x = 0, dx = -(base.curve*basePct);
  const last = Math.min(segments.length, base.index + DRAW);
  for (let i = base.index; i < last; i++){
    const seg = segments[i];
    seg.clip = maxy;
    project(seg.p1, playerX*ROADW - x, playerY + CAMH, position);
    project(seg.p2, playerX*ROADW - x - dx, playerY + CAMH, position);
    x += dx; dx += seg.curve;
    seg.vis = !(seg.p1.camera.z <= DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy);
    if (!seg.vis) continue;
    drawSegment(seg, fogAt((seg.p1.world.z - position)/SEG));
    maxy = seg.p2.screen.y;
  }

  // things, far to near
  const list = [];
  for (let i = base.index; i < last; i++){
    const seg = segments[i];
    if (seg.p1.camera.z <= DEPTH) continue;
    for (const s of seg.sprites) list.push({z: seg.p1.world.z, seg, pct:0, x:s.offset, def:s.def, o:{}, w:s.w, glow:s.glow, shore:s.shore});
  }
  for (const e of ents){
    const idx = Math.floor(e.z/SEG);
    if (idx < base.index || idx >= last) continue;
    const seg = segments[idx];
    if (seg.p1.camera.z <= DEPTH) continue;
    let def, o = {};
    if (e.kind === 'guide'){ def = HIKER; o = {frame: Math.floor(e.anim*3) % 2, front: e.front, v: e.v}; }
    else if (e.kind === 'hiker'){ def = HIKER; o = {frame: Math.floor(e.anim*3) % 2, front: e.front, v: e.v}; }
    else if (e.kind === 'goat'){ def = GOAT; o = {frame: e.vx && e.pause <= 0 ? Math.floor(e.anim*5) % 2 : 0, flip: e.vx < 0}; }
    else if (e.kind === 'car') def = CAR;
    else if (e.kind === 'buddy'){ def = JEEP; o = {brake: e.brake, v:'grey'}; }
    else if (e.kind === 'hole') def = HOLE;
    else def = e.big ? BOULDER : ROCK;
    list.push({z:e.z, seg, pct:(e.z % SEG)/SEG, x:e.x, def, o, w:e.w, guide: e.kind === 'guide', glow: e.kind === 'car' ? 'car' : e.kind === 'buddy' ? (e.brake ? 'brake' : 'tail') : null});
  }
  list.push({z: pz, player:true});
  list.sort((a, b) => b.z - a.z);
  const glows = [];
  for (const it of list){
    if (it.player){ if(!compactUI)drawPlayer(now); continue; }
    const s = it.seg;
    const sc = lerp(s.p1.screen.scale, s.p2.screen.scale, it.pct);
    const sx = lerp(s.p1.screen.x, s.p2.screen.x, it.pct) + sc*it.x*ROADW*W/2;
    const sy = lerp(s.p1.screen.y, s.p2.screen.y, it.pct);
    const d = (it.z - position)/SEG;
    let f = it.shore ? Math.min(fogAt(d), .72) : fogAt(d);
    // the guide stays readable through the fog and only fades out far away
    if (it.guide){ const ah = d - PLAYERZ/SEG; f = Math.round(clamp((ah - 1)/((vis - PLAYERZ/SEG)*2.5 + 7), 0, 1)*.75*10)/10; if (ah > (vis - PLAYERZ/SEG)*2.5 + 8) f = 1; }
    let box = null;
    const dw = Math.round(it.w*sc*W/2), dh = dw*it.def.h/it.def.w;
    if (f < 1){ it.o.fog = f; box = drawSprite(it.def, it.o, it.w, sc, sx, sy, s.clip); }
    if (it.glow){
      const gi = 1 - clamp((d - vis*.5)/(vis*2.2), 0, 1);
      if (gi > .04){
        if (it.glow === 'tail' || it.glow === 'brake'){
          if (d - PLAYERZ/SEG > 1.5){
            const r = Math.max(1, Math.round(dw*(it.glow === 'brake' ? .06 : .04)));
            const g2 = gi*(it.glow === 'brake' ? 1 : .45)*clamp((d - PLAYERZ/SEG)/(vis - PLAYERZ/SEG), .25, 1);
            glows.push({x: sx - dw*.37, y: sy - dh*.41, r, gi:g2, red:true});
            glows.push({x: sx + dw*.37, y: sy - dh*.41, r, gi:g2, red:true});
          }
        } else if (it.glow === 'car'){
          glows.push({x: sx - dw*.3, y: sy - dh*.5, r: Math.max(1, Math.round(dw*.07)), gi, warm:false});
          glows.push({x: sx + dw*.3, y: sy - dh*.5, r: Math.max(1, Math.round(dw*.07)), gi, warm:false});
        } else glows.push({x: sx - dw*.22, y: sy - dh*.4, r: Math.max(1, Math.round(dw*.09)), gi, warm:true});
      }
    }
  }
  for (const g of glows){
    const gx = Math.round(g.x), gy = Math.round(g.y);
    if (g.red){
      pxDisc(gx, gy, g.r*4 + 2, `rgba(255,60,40,${.16*g.gi})`);
      pxDisc(gx, gy, g.r*2 + 1, `rgba(255,70,50,${.32*g.gi})`);
      pxDisc(gx, gy, g.r, `rgba(255,140,120,${.85*g.gi})`);
      continue;
    }
    pxDisc(gx, gy, g.r*4 + 2, `rgba(255,${g.warm ? 220 : 245},${g.warm ? 150 : 210},${.18*g.gi})`);
    pxDisc(gx, gy, g.r*2 + 1, `rgba(255,${g.warm ? 230 : 250},${g.warm ? 170 : 225},${.35*g.gi})`);
    pxDisc(gx, gy, g.r, `rgba(255,255,240,${.9*g.gi})`);
  }

  // wisps drifting through
  ctx.globalAlpha = .32;
  for (const w of coastal ? [] : WISPS){
    const loopW = W + w.img.width + 40;
    const xx = ((w.base + clock*w.sp - bgOffset*w.par - position/SEG*w.par*2) % loopW + loopW) % loopW - w.img.width - 20;
    ctx.drawImage(w.img, Math.round(xx), w.y);
  }
  ctx.globalAlpha = 1;
  if(!compactUI)drawRadio(now);
  ctx.restore();

  if(!coastal)ditherFrame();
  drawHUD(now);
  if(!compactUI)drawGameBorder(ctx);
}
function drawPlayer(now){
  const dw = Math.round(JEEPW*(DEPTH/PLAYERZ)*W/2*1.2);
  const img = getSprite(JEEP, dw, {brake: keys.down && state === 'drive'});
  let ox = 0, oy = 0;
  if (state === 'fall'){
    const t = fallT;
    ox = fallDir*Math.round(t*t*90); oy = Math.round(t*t*140);
  } else if (speed > 30 && Math.floor(now/90) % 2 && Math.random() < .5) oy = -1;
  ctx.drawImage(img, Math.round(W/2 - dw/2) + ox + steer*1, Math.round(HZ + DEPTH*CAMH/PLAYERZ*PROJECTION_Y) - 2 - img.height + oy);
}

// ---------- HUD ----------
const fmtTime = t => { t = Math.max(0, Math.ceil(t)); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };
const NAVY = '#0c1420';
function labelBox(str, x, y, bg, fg, border){
  const w = textW(str) + 6;
  ctx.fillStyle = border; ctx.fillRect(x, y, w, 11);
  ctx.fillStyle = bg; ctx.fillRect(x+1, y+1, w-2, 9);
  drawText(str, x+3, y+2, {color:fg});
  return w;
}
function drawGauge(cx, cy, r, frac){
  pxDisc(cx, cy, r + 2, '#14171b');
  pxDisc(cx, cy, r, '#2c3036');
  ctx.fillStyle = '#d8202a';
  for (const [px, py] of circlePts(r - 2)) if (inArc(px, py, .34, 1)) ctx.fillRect(cx + px, cy + py, 1, 1);
  ctx.fillStyle = '#7ac86a';
  for (const [px, py] of circlePts(r - 2)) if (inArc(px, py, 0, .33)) ctx.fillRect(cx + px, cy + py, 1, 1);
  ctx.fillStyle = '#e8eaf2';
  for (let i = 0; i <= 9; i++){
    const a = A0 + SPAN*i/9;
    ctx.fillRect(Math.round(cx + Math.cos(a)*(r - 4)), Math.round(cy + Math.sin(a)*(r - 4)), 1, 1);
  }
  const a = A0 + SPAN*clamp(frac, 0, 1);
  pxLine(cx, cy, Math.round(cx + Math.cos(a)*(r - 3)), Math.round(cy + Math.sin(a)*(r - 3)), '#ff3a2a');
  ctx.fillStyle = '#e8eaf2'; ctx.fillRect(cx, cy, 1, 1);
}
function altitude(){
  const pz = position + PLAYERZ, sg = segAt(pz);
  const y = lerp(sg.p1.world.y, sg.p2.world.y, (pz % SEG)/SEG);
  return Math.round((coastal ? 42 : 1850 + stage*250) + y/50);
}
// ---- phone ----
const PH_W = 54, PH_H = 104, PH_X = 6, PH_Y = 168;
function rrect(c2, x0, y0, w, h, r, col){
  c2.fillStyle = col;
  for (let dy = 0; dy < h; dy++){
    const ty = dy < r ? r - dy - .5 : dy >= h - r ? dy - (h - r) + .5 : -1;
    const ins = ty >= 0 ? Math.round(r - Math.sqrt(Math.max(0, r*r - ty*ty))) : 0;
    c2.fillRect(x0 + ins, y0 + dy, w - 2*ins, 1);
  }
}
function disc2(c2, cx, cy, r, col){
  c2.fillStyle = col;
  for (let dy = -r; dy <= r; dy++){ const hw = Math.floor(Math.sqrt((r + .5)**2 - dy*dy)); c2.fillRect(cx - hw, cy + dy, hw*2 + 1, 1); }
}
const MAP_H = 256, MAP_W = PH_W - 6;
const trackX = y => Math.round(MAP_W/2 + 7*Math.sin(y/MAP_H*Math.PI*4) + 3*Math.sin(y/MAP_H*Math.PI*10 + 1));
const MAP = (() => {
  const c = mk(MAP_W, MAP_H), x = c.getContext('2d');
  const pal = ['#5d7c44','#78944e','#9fa25e','#c09a5c','#b97a4e','#a8603e','#d6c49c'];
  const T = Math.PI*2/MAP_H;
  const hgt = (px, py) => .5*Math.sin(2*T*py + px*.13) + .35*Math.sin(3*T*py - px*.21 + 1.3) + .25*Math.sin(5*T*py + px*.07 + Math.sin(px*.3)) + .15*Math.sin(7*T*py + px*.4);
  const band = (px, py) => clamp(Math.floor((hgt(px, py) + 1.25)*2.6), 0, pal.length - 1);
  for (let py = 0; py < MAP_H; py++) for (let px = 0; px < MAP_W; px++){
    const b = band(px, py);
    x.fillStyle = (b !== band(px + 1, py) || b !== band(px, (py + 1) % MAP_H)) ? '#6a4a30' : pal[b];
    x.fillRect(px, py, 1, 1);
  }
  x.fillStyle = '#2f6fe0';
  for (let py = 0; py < MAP_H; py += 3) x.fillRect(trackX(py), py, 2, 2);
  return c;
})();
const PH_FRAME = (() => {
  const c = mk(PH_W, PH_H), x = c.getContext('2d');
  rrect(x, 0, 0, PH_W, PH_H, 9, '#6a6d73');
  rrect(x, 1, 1, PH_W - 2, PH_H - 2, 8, '#121316');
  x.globalCompositeOperation = 'destination-out';
  rrect(x, 3, 3, PH_W - 6, PH_H - 6, 6, '#000');
  return c;
})();
const PH_MASK = (() => { const c = mk(PH_W, PH_H); rrect(c.getContext('2d'), 3, 3, PH_W - 6, PH_H - 6, 6, '#fff'); return c; })();
const PH_CV = mk(PH_W, PH_H);
function drawPhone(PH_X=6,PH_Y=168,scene=true){
  const p = PH_CV.getContext('2d');
  p.globalCompositeOperation = 'source-over';
  p.clearRect(0, 0, PH_W, PH_H);
  const sc = Math.floor(position/SEG*.8) % MAP_H;
  p.drawImage(MAP, 3, 3 + sc - MAP_H); p.drawImage(MAP, 3, 3 + sc);
  p.globalCompositeOperation = 'destination-in';
  p.drawImage(PH_MASK, 0, 0);
  p.globalCompositeOperation = 'source-over';
  // our position on the track
  const ay = 46, my = ((ay - 3 - sc) % MAP_H + MAP_H) % MAP_H, ax = 3 + trackX(my) + 1;
  disc2(p, ax, ay, 4, '#ffffff'); disc2(p, ax, ay, 3, '#2f6fe0');
  p.fillStyle = '#ffffff'; p.fillRect(ax, ay - 2, 1, 1); p.fillRect(ax - 1, ay - 1, 3, 1); p.fillRect(ax, ay, 1, 2);
  // status bar & island
  p.fillStyle = 'rgba(20,20,24,.75)'; p.fillRect(7, 5, 6, 2); p.fillRect(PH_W - 13, 5, 6, 2);
  rrect(p, 19, 4, 16, 5, 2, '#000');
  // altitude pill
  rrect(p, 5, 11, PH_W - 10, 11, 3, 'rgba(250,250,247,.92)');
  // map buttons
  for (const by of [56]){ disc2(p, PH_W - 10, by, 4, 'rgba(250,250,247,.92)'); p.fillStyle = '#5a5e66'; p.fillRect(PH_W - 11, by - 1, 3, 3); }
  disc2(p, PH_W - 10, 68, 4, '#d8303a'); p.fillStyle = '#ffffff'; p.fillRect(PH_W - 11, 67, 3, 3);
  p.drawImage(PH_FRAME, 0, 0);
  if(scene){ctx.drawImage(PH_CV, PH_X, PH_Y);drawText('↑' + altitude() + ' М', PH_X + PH_W/2, PH_Y + 13, {color:NAVY}, 'center')}else if(window.PeninsulaText&&typeof fonts!=='undefined'&&fonts.cozette?.image){PeninsulaText.line(p,'↑'+altitude()+' М',27,13,'technical',fonts,'center')}else{const t=getText('↑'+altitude()+' М',{color:NAVY});p.drawImage(t.img,27-Math.floor((t.img.width-t.pad*2)/2)-t.pad,13-t.pad);}
}
function drawHUD(now){
  if(compactUI)return;
  // visibility
  if(!coastal)drawText(`ВИДИМОСТЬ ${Math.round(visM)} М`, 6, 6, {color:'#ffffff', outline:NAVY});
  if(coastal && state==='drive'){
    const buddy = ents.find(e=>e.kind==='buddy'), gap = (buddy.z-position-PLAYERZ)/SEG*4;
    if(gap<10)drawText('ТОРМОЗИ! ДЖИП БЛИЗКО',W/2,23,{color:gap < 10 ? '#ff8a7a' : '#e4e6e8',outline:NAVY},'center');
  }
  // distance left
  const left = Math.max(0, (finishIndex*SEG - position - PLAYERZ)/SEG*4/1000);
  if (state !== 'clear') drawText(`ЕХАТЬ ЕЩЁ ПРИМЕРНО ${left.toFixed(1)} КМ`, 314, 6, {color:'#ffffff', outline:NAVY}, 'right');
  // phone with altitude, speed as text
  drawPhone();
  drawText(Math.round(kmh()) + ' КМ/Ч', PH_X + PH_W + 6, 226, {color: kmh() > 35 ? '#ff8a7a' : '#fff4a0', outline:NAVY});
  // edge warning
  if (warnT > 0 && Math.floor(now/180) % 2 === 0)
    drawText('КРАЙ ОБРЫВА!', W/2, 150, {color:'#ff8a7a', outline:NAVY}, 'center');
  // messages
  if (msg){
    if (msg.dim){ ctx.fillStyle = 'rgba(30,34,40,.55)'; ctx.fillRect(0, 0, W, H); }
    const l1 = msg.t1.split('\n'), l2 = msg.t2 ? msg.t2.split('\n') : [];
    const bh = 7*msg.big + 4, sh = 10;
    const total = l1.length*bh + (l2.length ? 8 + l2.length*sh : 0);
    let y = Math.round(H/2 - total/2) - (msg.dim ? 0 : 30);
    if(msg.dim)drawPanel(8,Math.max(5,y-12),304,Math.min(H-10,total+28));
    for (const l of l1){ drawText(l, W/2, y, {scale:msg.big, color:'#fff4a0', color2:'#ffc83a', outline:NAVY}, 'center'); y += bh; }
    y += 8;
    for (const l of l2){ if (l) drawText(l, W/2, y, {color:'#ffffff', outline:NAVY}, 'center'); y += sh; }
  }
}

// ---------- input ----------
const KEYMAP = {ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down'};
addEventListener('keydown', e => {
  if(!active||e.target?.matches?.('input,select,textarea'))return;
  if (e.code === 'Space' || e.code === 'Enter'){ e.preventDefault(); if (!e.repeat) press(); return; }
  if (e.code === 'KeyH'){ audioOn(); horn(); return; }
  if (e.code === 'KeyM'){ toggleSound(); return; }
  const k = KEYMAP[e.code]; if (k){ e.preventDefault(); keys[k] = true; audioOn(); }
});
addEventListener('keyup', e => { if(!active)return; const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
inputSurface.addEventListener('pointerdown', e => { if(!active)return; e.preventDefault(); press(); });
document.querySelectorAll('#fog-pad button').forEach(b => {
  const k = b.dataset.k;
  const on = e => {
    if(!active)return;
    e.preventDefault(); b.classList.add('on'); audioOn();
    if (k === 'horn'){ if (state === 'drive') horn(); else press(); return; }
    keys[k] = true;
    if (state !== 'drive' && state !== 'fall' && state !== 'crash') press();
  };
  const off = () => { if (k !== 'horn') keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
function toggleSound(){ soundOn = !soundOn; $('snd').textContent = 'Звук: ' + (soundOn ? 'вкл' : 'выкл'); }
$('snd').addEventListener('click', e => { if(!active)return; toggleSound(); e.currentTarget.blur(); });

// ---------- loop ----------
buildTrack(1);
visBase = 15;
timeLeft = Math.round((finishIndex*SEG)/(MAXSPEED*.24) + 25);
let lastT = performance.now(), acc = 0;
function pzForHUD(){return (position+PLAYERZ)/SEG}
function frame(now){
  if(!active)return;
  acc += Math.min(.25, (now - lastT)/1000); lastT = now;
  while (acc >= STEP && active){ update(STEP); acc -= STEP; }
  if(!active)return;
  render(now);
  if(onRender)onRender({state,msg,inventory:[...supplies],fuel:Math.ceil(fuel),neededItem,speed:Math.round(kmh()),altitude:altitude(),progress:clamp((position+PLAYERZ)/(finishIndex*SEG),0,1),steer,warning:warnT>0,detour:detours.find(d=>pzForHUD()>=d.start-5&&pzForHUD()<=d.end)||null});
  frameHandle=requestAnimationFrame(frame);
}
return {
 artwork:{radio:RADIO},
 phoneImage(){drawPhone(0,0,false);return PH_CV;},
 drawInstruments(target,offsetX,offsetY){
  const radioX=W-74,radioY=H-140,phoneX=6,phoneY=H-104;
  drawRadio(performance.now(),radioX,radioY);drawPhone(phoneX,phoneY);drawText(Math.round(kmh())+' КМ/Ч',64,H-12,{color:'#fff4a0',outline:NAVY});
  target.drawImage(cv,offsetX,offsetY);
 },
 start(){if(coastal && state==='clear'){state='title';msg={t1:'СРЕДНИЙ',t2:'ДОБЕРИСЬ ДО МЕСТА,\nНЕ РАЗБИВ МАШИНУ\nНА НЕПРОСТОЙ ДОРОГЕ.\n\nПРОБЕЛ ИЛИ ТАП - ПОЕХАЛИ',dim:true,big:2};buildTrack(1);position=0;speed=0;playerX=0;}active=true;$('snd').textContent='Звук: '+(soundOn?'вкл':'выкл');lastT=performance.now();acc=0;render(lastT);if(onRender)onRender({state,msg,inventory:[...supplies],fuel:Math.ceil(fuel),neededItem,speed:Math.round(kmh()),altitude:altitude(),progress:clamp((position+PLAYERZ)/(finishIndex*SEG),0,1),steer,warning:false});if(actx&&actx.state==='suspended')actx.resume();frameHandle=requestAnimationFrame(frame)},
 stop(){active=false;cancelAnimationFrame(frameHandle);for(const k in keys)keys[k]=false;if(actx)actx.suspend()},
 restart(){startStage()},
 press, horn, toggleSound, useItem,
 setControl(k,value){if(k in keys)keys[k]=value}
};
};
