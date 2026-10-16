"""Make the 1-bit dialogue portrait of the mage (shown in a dark frame while he speaks).

Usage: py tools/make-radio-portrait.py
Reads the latest small mage portrait dist/assets/rpg-portrait-mage.png (34x42, the one in the walk levels)
and dithers it to black and white with local contrast (Floyd-Steinberg). Writes dist/assets/radio-mage.png:
white = light pixels, black = dark pixels. The game shows only the light ones on a dark background
(or only the dark ones on a light background, see «Видны пиксели портрета»).
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets')
LOCAL, CONTRAST, BIAS = .5, 2.5, -.08  # share of local contrast, its strength, overall darkening

c = np.asarray(Image.open(os.path.join(ASSETS, 'rpg-portrait-mage.png')).convert('RGB')).astype(float)
lum = (.3 * c[..., 0] + .59 * c[..., 1] + .11 * c[..., 2]) / 255
H, W = lum.shape
blur = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float) / 255
glob = (lum - lum.min()) / (lum.max() - lum.min())
err = (1 - LOCAL) * glob + LOCAL * np.clip((lum - blur) * CONTRAST + .5, 0, 1) + BIAS

out = np.zeros((H, W, 4), np.uint8)
for y in range(H):
    for x in range(W):
        light = err[y, x] >= .5
        out[y, x] = (255, 255, 255, 255) if light else (0, 0, 0, 255)
        e = err[y, x] - (1.0 if light else 0.0)
        for dx, dy, w in ((1, 0, 7 / 16), (-1, 1, 3 / 16), (0, 1, 5 / 16), (1, 1, 1 / 16)):
            if 0 <= x + dx < W and 0 <= y + dy < H:
                err[y + dy, x + dx] += e * w
Image.fromarray(out, 'RGBA').save(os.path.join(ASSETS, 'radio-mage.png'))
print('radio-mage.png', W, 'x', H)
