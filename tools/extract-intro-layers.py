import json,hashlib
from pathlib import Path
from psd_tools import PSDImage
root=Path(__file__).resolve().parents[1]/'dist'
modified={2:'2026-10-09T20:36:11.927Z',3:'2026-10-09T20:30:43.507Z',4:'2026-10-09T20:32:35.396Z'}
for n in (2,3,4):
 source=Path(f'/workspace/scratch/5880b8472b91/intro{n}-latest.psd');psd=PSDImage.open(source);out=root/'assets'/f'intro{n}';out.mkdir(exist_ok=True)
 dx=-(psd.width-318)//2 if n!=2 else 0;dy=-39 if n==2 else 0
 layers={}
 for layer in psd:
  key=layer.name.lower().replace('_','');image=layer.topil();image.save(out/f'{key}.png')
  layers[key]={'src':f'assets/intro{n}/{key}.png','x':layer.left+dx,'y':layer.top+dy,'w':image.width,'h':image.height}
 frames=[{'frame':layers[f'{i}frame'],'a':layers[f'{i}a'],'b':layers[f'{i}b']} for i in (1,2,3)] if n==2 else [{'frame':{'x':0,'y':0,'w':318,'h':152},'a':layers['a'],'b':layers['b']}]
 manifest={'width':318,'height':152,'sourceCanvas':list(psd.size),'source':f'Заставка {n}.psd','sourceModified':modified[n],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'frames':frames,'background':layers.get('back',layers.get('c'))}
 (out/'layers.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 print(n,psd.size,len(frames))
