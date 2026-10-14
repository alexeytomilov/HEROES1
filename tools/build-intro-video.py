"""Pack the rendered "Intro Main v1" PNG sequence into one lossless sprite sheet per intro.

Usage: py tools/build-intro-video.py "<folder with Intro Main v1_0000.png ...>"
Frame ranges must match INTRO_VIDEO in dist/intro-video.js.
"""
import json, math, os, sys
from PIL import Image

RANGES = {1: (50, 91), 2: (92, 135), 3: (136, 177), 4: (178, 203), 5: (204, 246)}
COLUMNS = 8
src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets', 'intro-video')
os.makedirs(out, exist_ok=True)
manifest = {}
for n, (first, last) in RANGES.items():
    frames = [Image.open(os.path.join(src, f'Intro Main v1_{i:04d}.png')).convert('RGB') for i in range(first, last + 1)]
    w, h = frames[0].size
    rows = math.ceil(len(frames) / COLUMNS)
    sheet = Image.new('RGB', (w * COLUMNS, h * rows))
    for i, f in enumerate(frames):
        sheet.paste(f, (i % COLUMNS * w, i // COLUMNS * h))
    name = f'intro{n}.webp'
    sheet.save(os.path.join(out, name), lossless=True, quality=100, method=6)
    manifest[n] = {'src': name, 'first': first, 'last': last, 'frames': len(frames), 'columns': COLUMNS, 'width': w, 'height': h}
    print(name, len(frames), os.path.getsize(os.path.join(out, name)) // 1024, 'KB')
with open(os.path.join(out, 'sheets.json'), 'w') as f:
    json.dump(manifest, f, indent=1)
