"""Draw the platformer's floating props in the colours of the rock ledge: a stone-bridge tile and the lens block.

Usage: py tools/build-platform-props.py <assets dir> <gen dir>
platform-bridge.png     32x10 tile of two staggered rows of stones with moss on top (repeats sideways)
platform-lens.png       14x14 stone block with a camera lens, hit from below to take a photo
platform-lens-used.png  the same block once the photo is taken: dull glass, no glint
"""
import math, os, sys
from PIL import Image

assets, gen = sys.argv[1], sys.argv[2]
MORTAR = (16, 20, 16, 255)
STONE = [(58, 62, 62), (88, 90, 92), (120, 122, 126), (150, 152, 156)]   # shadow, body, light, glint
MOSS = [(56, 64, 16), (80, 88, 32), (112, 112, 40)]

def put(img, x, y, c):
    if 0 <= x < img.width and 0 <= y < img.height: img.putpixel((x, y), c if len(c) == 4 else (*c, 255))

def stone(img, x0, y0, w, h, tone=0):
    body, light, dark = STONE[1 + tone], STONE[2 + tone], STONE[0]
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c = body
            if y == y0 or x == x0: c = light
            if y == y0 + h - 1 or x == x0 + w - 1: c = dark
            put(img, x, y, c)
    put(img, x0 + 1, y0, STONE[3])   # a glint on the top edge

# Bridge tile: mortar everywhere, then stones; widths add up to the tile width so it repeats seamlessly.
bridge = Image.new('RGBA', (32, 10), MORTAR)
x = 0
for i, w in enumerate([7, 9, 8, 8]):
    stone(bridge, x, 2, w - 1, 4, tone=i % 2); x += w
x = -4
for i, w in enumerate([8, 9, 7, 8, 4]):
    if x + w > 0: stone(bridge, max(0, x), 6, min(w - 1, w - 1 + x if x < 0 else w - 1), 4, tone=(i + 1) % 2)
    x += w
for x in range(32):  # moss along the top, thicker in tufts
    put(bridge, x, 1, MOSS[1 if x % 5 else 2])
    if x % 7 in (2, 3): put(bridge, x, 0, MOSS[0])
    if x % 9 == 4: put(bridge, x, 2, MOSS[0])

def lens(used):
    img = Image.new('RGBA', (14, 14), (0, 0, 0, 0))
    for y in range(14):
        for x in range(14):
            put(img, x, y, MORTAR)
    stone(img, 1, 1, 12, 12, tone=0)
    for y in range(14):
        for x in range(14):
            d = math.hypot(x + .5 - 7, y + .5 - 7)
            if d <= 5.2:
                if d > 4.3: c = (12, 14, 16)                       # black barrel
                elif d > 3.4: c = (70, 74, 80) if not used else (52, 54, 58)   # metal ring
                else:
                    t = d / 3.4
                    c = (int(24 + 30 * t), int(36 + 40 * t), int(70 + 50 * t)) if not used else (int(40 + 12 * t), int(42 + 12 * t), int(46 + 12 * t))
                put(img, x, y, c)
    if not used:
        put(img, 5, 5, (230, 240, 250)); put(img, 6, 5, (120, 180, 220)); put(img, 5, 6, (120, 180, 220)); put(img, 8, 9, (90, 130, 170))
    return img

os.makedirs(gen, exist_ok=True)
for name, img, genname in [('platform-bridge.png', bridge, 'platform-bridge_stone_32x10.png'),
                           ('platform-lens.png', lens(False), 'platform-lens_block_14x14.png'),
                           ('platform-lens-used.png', lens(True), 'platform-lens_block-used_14x14.png')]:
    img.save(os.path.join(assets, name)); img.save(os.path.join(gen, genname))
print('ok')
