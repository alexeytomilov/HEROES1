"""Starter PSDs for the waterfall platformer: one PSD per picture of dist/assets/waterfall, one layer named after the
picture, the merged image (what «Картинки из PSD» in the game reads) written as Photoshop does with Maximize
Compatibility: RGB + transparency. Existing PSDs are never overwritten.

Usage: py tools/make-waterfall-psd.py <dist/assets/waterfall> <Game/Online>
Room backgrounds go to Screens/PSD, everything else to Assets/PSD, as waterfall-<picture>.psd.
"""
import io, os, struct, sys
from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

src, online = sys.argv[1], sys.argv[2]

def with_merged_rgba(data, im):
    # header: channels 3 -> 4; layer count -> negative (first alpha = merged transparency); merged image: raw RGBA planes
    o = 26
    o += 4 + struct.unpack('>I', data[o:o + 4])[0]          # colour mode data
    o += 4 + struct.unpack('>I', data[o:o + 4])[0]          # image resources
    lm = struct.unpack('>I', data[o:o + 4])[0]
    layers = bytearray(data[o:o + 4 + lm])
    if lm >= 6 and struct.unpack('>I', layers[4:8])[0] > 0:
        count = struct.unpack('>h', layers[8:10])[0]
        layers[8:10] = struct.pack('>h', -abs(count))
    head = bytearray(data[:o])
    head[12:14] = struct.pack('>H', 4)
    r, g, b, a = im.split()
    merged = struct.pack('>H', 0) + b''.join(ch.tobytes() for ch in (r, g, b, a))
    return bytes(head) + bytes(layers) + merged

made = []
for name in sorted(os.listdir(src)):
    if not name.endswith('.png'):
        continue
    base = name[:-4]
    folder = os.path.join(online, 'Screens' if base.startswith('platform-bg') else 'Assets', 'PSD')
    out = os.path.join(folder, 'waterfall-' + base + '.psd')
    if os.path.exists(out):
        continue
    im = Image.open(os.path.join(src, name)).convert('RGBA')
    psd = PSDImage.new('RGB', im.size, depth=8)
    psd.append(PixelLayer.frompil(im, psd, base))
    buf = io.BytesIO(); psd.save(buf)
    open(out, 'wb').write(with_merged_rgba(buf.getvalue(), im))
    made.append(os.path.relpath(out, online))
print('\n'.join(made) or 'nothing new')
