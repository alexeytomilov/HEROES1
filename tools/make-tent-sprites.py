"""Tent art for the camp: the pitched tent sprite and the green inventory icon.

Usage: py tools/make-tent-sprites.py
- dist/assets/camp-tent-pitched.png: 72x42, the size of the tourists sprite — one green dome tent with a warm
  light inside the open door and a bit of that light on the ground. Shown in the camp once the tent is set up.
- dist/assets/camp-tent.png: the inventory icon, recoloured from orange to green (kept as camp-tent-orange.png
  the first time, so running the script again starts from the original).
"""
import colorsys
import os
import numpy as np
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets')
W, H = 72, 42
GREEN = [(34, 52, 30), (48, 72, 38), (64, 94, 46), (84, 118, 56), (108, 142, 70)]  # dark .. light
WARM = [(120, 52, 20), (186, 92, 30), (232, 148, 52), (252, 206, 110), (255, 240, 190)]


def pitched():
    img = np.zeros((H, W, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - .5
    cx, base, rx, ry = 36, 38, 27, 27  # dome: a half-ellipse standing on the ground line
    ell = lambda a, b, oy=0: (((xx - cx) / a) ** 2 + ((yy - base - oy) / b) ** 2 <= 1)
    # Soft ground shadow.
    img[ell(32, 3.2, 1)] = (16, 20, 14, 140)
    dome = ell(rx, ry) & (yy <= base)
    # Light from the upper left, ordered dithering into five greens.
    nx, ny = (xx - cx) / rx, (yy - base) / ry
    light = np.clip(.55 - .38 * nx - .28 * ny, 0, 1)
    level = np.clip(light + bayer[yy % 4, xx % 4] * .22, 0, .999)
    img[dome, :3] = np.asarray(GREEN)[(level * len(GREEN)).astype(int)][dome]
    img[dome, 3] = 255
    # Panel seams along the poles (a narrower arch) and a hem near the ground.
    seam = dome & ell(rx * .52, ry * .98) & ~ell(rx * .52 - 1.2, ry * .98 - 1.2)
    img[seam, :3] = GREEN[1]
    img[dome & (yy == base - 2), :3] = GREEN[1]
    edge = dome & ~(np.roll(dome, 1, 0) & np.roll(dome, -1, 0) & np.roll(dome, 1, 1) & np.roll(dome, -1, 1))
    img[edge, :3] = (20, 30, 18)
    # Open door: a small arch, dark at the edges, a warm lantern glow low in the middle.
    door = ell(7.5, 14) & (yy <= base - 1)
    glow = np.clip(1 - np.hypot((xx - cx) / 6.5, (yy - (base - 5)) / 8), 0, 1) ** 1.3
    wl = np.clip(.12 + glow * .95 + bayer[yy % 4, xx % 4] * .2, 0, .999)
    img[door, :3] = np.asarray(WARM)[(wl * len(WARM)).astype(int)][door]
    img[door, 3] = 255
    rim = door & ~(np.roll(door, 1, 0) & np.roll(door, 1, 1) & np.roll(door, -1, 1))
    img[rim, :3] = (34, 28, 16)
    # Rolled-up flap over the door.
    flap = dome & (np.abs(xx - cx) <= 6) & (yy >= base - 16) & (yy <= base - 15)
    img[flap, :3] = GREEN[3]
    img[flap & (yy == base - 15), :3] = GREEN[1]
    # A little of the light on the ground in front of the door.
    s = np.clip(1 - np.hypot((xx - cx) / 9, (yy - base - 1.5) / 2.2), 0, 1)
    spill = (s + bayer[yy % 4, xx % 4] * .45 > .4) & (yy > base) & ~dome
    img[spill] = (214, 128, 46, 0)
    img[spill, 3] = (s[spill] * 150 + 40).astype(np.uint8)
    # Guy lines and pegs.
    for gx, gy, tx, ty in ((cx - 24, base - 11, 4, base + 1), (cx + 24, base - 11, W - 5, base + 1)):
        n = max(abs(tx - gx), abs(ty - gy))
        for i in range(n + 1):
            px, py = round(gx + (tx - gx) * i / n), round(gy + (ty - gy) * i / n)
            if not dome[py, px]:
                img[py, px] = (150, 152, 132, 190)
        img[ty - 1:ty + 1, tx] = (60, 50, 36, 255)
    return img


def icon():
    src = os.path.join(ASSETS, 'camp-tent.png')
    orig = os.path.join(ASSETS, 'camp-tent-orange.png')
    if not os.path.exists(orig):
        Image.open(src).save(orig)
    im = np.asarray(Image.open(orig).convert('RGBA')).astype(float)
    out = im.copy()
    for y in range(im.shape[0]):
        for x in range(im.shape[1]):
            r, g, b, a = im[y, x]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > .35 and (h < .14 or h > .95):  # orange / red fabric
                h, s, v = .26, s * .5, v * .72  # muted forest green
                out[y, x, :3] = np.array(colorsys.hsv_to_rgb(h, s, v)) * 255
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(src)


Image.fromarray(pitched(), 'RGBA').save(os.path.join(ASSETS, 'camp-tent-pitched.png'))
icon()
print('camp-tent-pitched.png, camp-tent.png')
