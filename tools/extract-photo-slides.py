# Export the photos of screen 2.3 ("old" group in screen_2-3.psd) for the in-phone slideshow.
# Usage: python3 tools/extract-photo-slides.py /path/to/screen_2-3.psd "2026-10-13T00:40:29.684Z"
# Needs psd-tools. Writes dist/assets/screen2-3/: base.png (every layer outside the group),
# mask.png (the group's mask, which is the phone screen), photo-N.png cut to the screen and layers.json.
import hashlib, json, sys
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

source = Path(sys.argv[1]); modified = sys.argv[2] if len(sys.argv) > 2 else None
out = Path(__file__).resolve().parents[1] / 'dist' / 'assets' / 'screen2-3'; out.mkdir(parents=True, exist_ok=True)
psd = PSDImage.open(source); W, H = psd.size

def paste(canvas, layer):
    image = layer.topil().convert('RGBA'); x, y = layer.left, layer.top
    image = image.crop((max(0, -x), max(0, -y), image.width, image.height))
    canvas.alpha_composite(image, (max(0, x), max(0, y)))

group = next(l for l in psd if l.is_group() and l.name.strip() == 'old')
base = Image.new('RGBA', (W, H))
for layer in psd:
    if layer is not group and layer.visible: paste(base, layer)
base.save(out / 'base.png')

m = group.mask; mask = m.topil().convert('L')
Image.merge('RGBA', [Image.new('L', mask.size, 255)] * 3 + [mask]).save(out / 'mask.png')

# Layers named 1..5 are shown in that order; each photo slides as one card the size of the screen.
photos = []
for layer in sorted(group, key=lambda l: int(l.name.strip())):
    name = layer.name.strip(); card = Image.new('RGBA', (m.width, m.height))
    card.alpha_composite(layer.topil().convert('RGBA').crop((m.left - layer.left, m.top - layer.top, m.right - layer.left, m.bottom - layer.top)))
    card.save(out / f'photo-{name}.png')
    photos.append({'name': name, 'src': f'assets/screen2-3/photo-{name}.png', 'x': m.left, 'y': m.top, 'w': m.width, 'h': m.height})

manifest = {'width': W, 'height': H, 'source': source.name, 'sourceModified': modified,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'base': {'src': 'assets/screen2-3/base.png', 'x': 0, 'y': 0, 'w': W, 'h': H},
            'mask': {'src': 'assets/screen2-3/mask.png', 'x': m.left, 'y': m.top, 'w': m.width, 'h': m.height},
            'photos': photos}
(out / 'layers.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(psd.size, 'mask', (m.left, m.top, m.width, m.height), 'photos', [p['name'] for p in photos])
