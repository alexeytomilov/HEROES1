"""Pack the rendered "Intro Main" frame sequence (PNG or TIFF) into one lossless sprite sheet per intro.

Usage: py tools/build-intro-video.py "<folder with Intro Main v2_0000.tif ...>"
Frame ranges must match INTRO_VIDEO in dist/intro-video.js.
"""
import glob, json, math, os, sys
from PIL import Image

RANGES = {1: (50, 95), 2: (96, 142), 3: (143, 189), 4: (190, 219), 5: (220, 266)}
COLUMNS = 8
src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets', 'screens', 'intros')
os.makedirs(out, exist_ok=True)
manifest = {}
for n, (first, last) in RANGES.items():
    frames = [Image.open(glob.glob(os.path.join(src, f'*_{i:04d}.*'))[0]).convert('RGB') for i in range(first, last + 1)]
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
