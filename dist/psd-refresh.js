// «Картинки из PSD»: the waterfall pictures straight from the PSD files in Game/Online, without exporting anything.
// The first press asks for the Game/Online folder (the browser remembers it); every press re-reads the PSDs.
// A file waterfall-<picture>.psd (in Screens/PSD, Assets/PSD or the chosen folder itself) replaces the waterfall's
// assets/waterfall/<picture>.png, e.g. waterfall-platform-bg1.psd → the first room background.
// Only this browser sees the change until the PSDs are exported into the game and published.
// The PSD is read from its merged image, which Photoshop writes when «Maximize Compatibility» is on (the default).
(()=>{
 const bar=document.querySelector('.toolbar');if(!bar||!window.showDirectoryPicker)return;
 const button=document.createElement('button');button.id='psd-refresh';button.textContent='Картинки из PSD';
 button.title='Перечитать картинки Водопада из PSD в папке Game/Online (waterfall-*.psd в Screens/PSD и Assets/PSD)';
 const note=document.createElement('span');note.className='psd-refresh-note';note.style.cssText='margin-left:6px;font-size:12px;opacity:.8';
 bar.append(button,note);

 // the chosen folder is kept in IndexedDB, so it is asked for only once
 const db=()=>new Promise((ok,no)=>{const r=indexedDB.open('peninsula-psd',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
 const keep=async h=>{const d=await db();await new Promise(ok=>{const t=d.transaction('h','readwrite');t.objectStore('h').put(h,'root');t.oncomplete=ok})};
 const kept=async()=>{try{const d=await db();return await new Promise(ok=>{const r=d.transaction('h').objectStore('h').get('root');r.onsuccess=()=>ok(r.result||null);r.onerror=()=>ok(null)})}catch{return null}};
 async function folder(){
  let h=await kept();
  if(h&&(await h.queryPermission({mode:'read'}))!=='granted'&&(await h.requestPermission({mode:'read'}))!=='granted')h=null;
  if(!h){h=await window.showDirectoryPicker({id:'peninsula-online',mode:'read'});await keep(h)}
  return h;
 }
 async function sub(dir,...names){try{for(const n of names)dir=await dir.getDirectoryHandle(n);return dir}catch{return null}}

 // The merged image of a PSD (8-bit RGB, raw or RLE) as a canvas; its alpha is the document's transparency.
 function readPsd(buf){
  const v=new DataView(buf);let o=0;const u16=()=>{o+=2;return v.getUint16(o-2)},u32=()=>{o+=4;return v.getUint32(o-4)};
  const len=big=>big?Number(v.getBigUint64((o+=8)-8)):u32();
  if(u32()!==0x38425053)throw Error('это не PSD');const psb=u16()===2;o+=6;
  const channels=u16(),h=u32(),w=u32(),depth=u16(),mode=u16();
  if(depth!==8)throw Error('глубина '+depth+' бит, нужна 8');if(mode!==3)throw Error('режим не RGB');
  for(let i=0;i<2;i++){const n=u32();o+=n}   // colour mode data, image resources
  let transparent=false;const layers=len(psb),end=o+layers;
  if(layers>0){const info=len(psb);if(info>0)transparent=v.getInt16(o)<0}
  o=end;
  const comp=u16(),planes=[];
  if(comp===0)for(let c=0;c<channels;c++){planes.push(new Uint8Array(buf,o,w*h));o+=w*h}
  else if(comp===1){const counts=[];for(let i=0;i<channels*h;i++)counts.push(psb?u32():u16());
   for(let c=0;c<channels;c++){const p=new Uint8Array(w*h);for(let y=0;y<h;y++){const stop=o+counts[c*h+y];let x=y*w;
    while(o<stop){const n=v.getInt8(o++);if(n>=0){for(let i=0;i<=n;i++)p[x++]=v.getUint8(o++)}else if(n!==-128){const b=v.getUint8(o++);for(let i=0;i<1-n;i++)p[x++]=b}}}planes.push(p)}}
  else throw Error('сжатие '+comp+' не поддерживается');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const g=canvas.getContext('2d'),img=g.createImageData(w,h),d=img.data,alpha=transparent&&channels>=4?planes[3]:null;
  for(let i=0;i<w*h;i++){d[i*4]=planes[0][i];d[i*4+1]=planes[1][i];d[i*4+2]=planes[2][i];d[i*4+3]=alpha?alpha[i]:255}
  g.putImageData(img,0,0);return canvas;
 }
 window.PeninsulaPsd={readPsd};

 async function refresh(){
  button.disabled=true;note.textContent='читаю PSD…';
  try{
   const root=await folder(),dirs=[await sub(root,'Screens','PSD'),await sub(root,'Assets','PSD'),root].filter(Boolean);
   const done=[],skipped=[];
   for(const dir of dirs)for await(const [name,file] of dir.entries()){
    if(file.kind!=='file'||!/^waterfall-.+\.psd$/i.test(name))continue;
    const key='waterfall_'+name.slice(10,-4).replace(/-/g,'_');
    if(!(key in images)){skipped.push(name+': такой картинки в Водопаде нет');continue}
    try{const pic=readPsd(await (await file.getFile()).arrayBuffer()),old=images[key];
     if(old&&(old.width!==pic.width||old.height!==pic.height))skipped.push(name+': '+pic.width+'×'+pic.height+' вместо '+old.width+'×'+old.height+' (поставил как есть)');
     images[key]=pic;done.push(name.slice(10,-4))}
    catch(e){skipped.push(name+': '+e.message)}
   }
   if(typeof platformGame!=='undefined'&&platformGame?.render&&screen==='platform')platformGame.render();else if(typeof render==='function')render();
   note.textContent=done.length?'обновлено '+done.length+(skipped.length?', замечаний '+skipped.length:''):'waterfall-*.psd не найдены';
   note.title=[...done.map(n=>'✓ '+n),...skipped.map(s=>'! '+s)].join('\n');
   if(skipped.length)console.warn('Картинки из PSD:\n'+skipped.join('\n'));
  }catch(e){note.textContent=e.name==='AbortError'?'папка не выбрана':'не вышло: '+e.message}
  button.disabled=false;
 }
 button.onclick=refresh;
})();
