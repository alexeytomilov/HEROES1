"""Bring the platformer pictures to the size they are shown at, so platform.js draws every one of them at 100%.
Run after build-platform-wanderer.py / build-platform-walk.py (they draw the hero 24x40) or after a new room background.

Usage: py tools/build-platform-100.py <assets dir>
platform-hero0..7.png   the figure's box (alpha > 128) scaled to 24 px tall, the box is the whole picture
platform-walk0..7.png   the whole 24x40 frame at the standing frame's scale (24 / its box height); platform.js anchors
                        it 7 px left of the feet (the standing frame's centre at that scale)
platform-bg1..4.png     320x208 room pictures scaled to 410x267: the 304 px view over a 608 px room with parallax .35
Scaling is nearest-neighbour, as the canvas drew them before. Pictures already at their 100% size are left as they are.
"""
import os, sys
import numpy as np
from PIL import Image

H = 24
assets = sys.argv[1]
path = lambda n: os.path.join(assets, n + '.png')

def box(im):
    a = np.array(im.convert('RGBA'))[..., 3]
    ys, xs = np.where(a > 128)
    return xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1

stand = Image.open(path('platform-hero0'))
if stand.height != H:
    s = H / box(stand)[3]
    for i in range(8):
        im = Image.open(path('platform-walk%d' % i)).convert('RGBA')
        if im.height != H:
            im.resize((round(im.width * s), round(im.height * s)), Image.NEAREST).save(path('platform-walk%d' % i))
    for i in range(8):
        im = Image.open(path('platform-hero%d' % i)).convert('RGBA')
        x, y, w, h = box(im)
        im.crop((x, y, x + w, y + h)).resize((round(H * w / h), H), Image.NEAREST).save(path('platform-hero%d' % i))
for k in range(1, 5):
    im = Image.open(path('platform-bg%d' % k))
    scale = max((304 + (608 - 304) * .35) / im.width, 174 / im.height)
    if scale > 1.01:
        im.resize((round(im.width * scale), round(im.height * scale)), Image.NEAREST).save(path('platform-bg%d' % k))
print('platform pictures at 100%')
