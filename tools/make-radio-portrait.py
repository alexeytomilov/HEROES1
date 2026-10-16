"""Make the 1-bit radio portrait of the mage (shown next to the radio while he speaks in the races).

Usage: py tools/make-radio-portrait.py
Reads dist/mage.png (character select art), cuts out the hooded head, drops the sky and dithers the
figure to black and white with local contrast, like an engraving. Writes dist/assets/radio-mage.png:
black and white pixels, transparent around the figure. The race shows only its light or only its dark pixels.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'dist')
SIZE, BOX = 56, (720, 170, 900, 350)   # 56x56 game pixels from the head area of the art
LOCAL, CONTRAST, BIAS = .75, 3.0, -.03  # share of local contrast, its strength, overall darkening

rgb = Image.open(os.path.join(ROOT, 'mage.png')).convert('RGB').crop(BOX).resize((SIZE, SIZE), Image.LANCZOS)
c = np.asarray(rgb).astype(float)
r, g, b = c[..., 0], c[..., 1], c[..., 2]
lum = (.3 * r + .59 * g + .11 * b) / 255
figure = ~((b > 150) & (lum > .58) & (b >= r))  # everything but the light bluish sky
blur = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SIZE / 10))).astype(float) / 255
glob = (lum - lum[figure].min()) / (lum[figure].max() - lum[figure].min() + 1e-6)
value = (1 - LOCAL) * glob + LOCAL * np.clip((lum - blur) * CONTRAST + .5, 0, 1) + BIAS

# Floyd-Steinberg dithering inside the figure only.
out = np.zeros((SIZE, SIZE, 4), np.uint8)
err = value.copy()
for y in range(SIZE):
    for x in range(SIZE):
        if not figure[y, x]:
            continue
        light = err[y, x] >= .5
        out[y, x] = (255, 255, 255, 255) if light else (0, 0, 0, 255)
        e = err[y, x] - (1.0 if light else 0.0)
        for dx, dy, w in ((1, 0, 7 / 16), (-1, 1, 3 / 16), (0, 1, 5 / 16), (1, 1, 1 / 16)):
            xx, yy = x + dx, y + dy
            if 0 <= xx < SIZE and 0 <= yy < SIZE and figure[yy, xx]:
                err[yy, xx] += e * w
Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, 'assets', 'radio-mage.png'))
print('radio-mage.png', SIZE, 'x', SIZE)
