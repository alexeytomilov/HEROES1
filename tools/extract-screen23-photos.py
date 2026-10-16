"""Export the phone photos of screen 2.3 from screen_2-3.psd.

Usage: python3 tools/extract-screen23-photos.py path/to/screen_2-3.psd

The PSD holds a group "old" with layers 1-5, masked to the phone screen.
Each photo is composited with the rest of the scene and cropped to that
mask, so the game can draw it over the 2.3 background at the same spot.
"""
import json, sys
from pathlib import Path
from psd_tools import PSDImage

root = Path(__file__).resolve().parents[1] / 'dist'
out = root / 'assets' / 'screens' / 'photos2-3'
out.mkdir(exist_ok=True)
psd = PSDImage.open(sys.argv[1])
group = next(layer for layer in psd if layer.is_group() and layer.name.strip().lower() == 'old')
left, top, right, bottom = group.mask.bbox
photos = sorted(group, key=lambda layer: int(layer.name))
for photo in photos:
    for other in photos:
        other.visible = other is photo
    psd.composite(force=True).crop((left, top, right, bottom)).save(out / f'photo{photo.name}.png')
# The PSD picture sits at (1, 1) inside the 320x240 screen.
manifest = {'x': left + 1, 'y': top + 1, 'w': right - left, 'h': bottom - top, 'photos': [f'assets/screens/photos2-3/photo{p.name}.png' for p in photos]}
(out / 'photos.json').write_text(json.dumps(manifest, indent=2))
print(manifest)
