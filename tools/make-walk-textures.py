"""Generate extra walk textures (two grounds, two forests, two stones, the road) as seamless 128x128 pixel art.

Usage: py tools/make-walk-textures.py
Writes dist/assets/<name>.png; the keys (name with "_") are listed in dist/walk-edits.js.
Everything is seeded, so running it again gives the same pictures.
"""
import os
import numpy as np
from PIL import Image

N = 128
OUT = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets')
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - .5
YY, XX = np.mgrid[0:N, 0:N]


def noise(rng, cells, octaves=3):
    """Tileable fractal value noise in 0..1."""
    total, amp, norm = np.zeros((N, N)), 1.0, 0.0
    for o in range(octaves):
        c = cells * 2 ** o
        g = rng.random((c, c))
        fx, fy = XX * c / N, YY * c / N
        x0, y0 = fx.astype(int), fy.astype(int)
        tx, ty = fx - x0, fy - y0
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        x1, y1 = (x0 + 1) % c, (y0 + 1) % c
        top = g[y0, x0] * (1 - tx) + g[y0, x1] * tx
        bot = g[y1, x0] * (1 - tx) + g[y1, x1] * tx
        total += (top * (1 - ty) + bot * ty) * amp
        norm += amp
        amp *= .5
    return total / norm


def cells(rng, grid, sx=1.0, sy=1.0):
    """Tileable Voronoi on a jittered grid x grid of points (so no two centres collide):
    nearest and second-nearest distance and nearest index; sx/sy stretch the cells."""
    step = N / grid
    pts = np.array([((gx + rng.uniform(.15, .85)) * step, (gy + rng.uniform(.15, .85)) * step) for gy in range(grid) for gx in range(grid)])
    d1, d2, idx = np.full((N, N), 1e9), np.full((N, N), 1e9), np.zeros((N, N), int)
    for i, (px, py) in enumerate(pts):
        dx = np.abs(XX - px); dx = np.minimum(dx, N - dx) * sx
        dy = np.abs(YY - py); dy = np.minimum(dy, N - dy) * sy
        d = np.hypot(dx, dy)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        idx = np.where(closer, i, idx)
        d1 = np.where(closer, d, d1)
    return d1, d2, idx


def shade(value, palette, dither=1.0):
    """Map 0..1 to palette indices with ordered dithering."""
    v = np.clip(value + BAYER[YY % 4, XX % 4] * dither / len(palette), 0, .999)
    return np.asarray(palette)[(v * len(palette)).astype(int)]


def put(img, mask, color):
    img[mask] = color


def save(name, img):
    Image.fromarray(img.astype(np.uint8), 'RGB').save(os.path.join(OUT, name.replace('_', '-') + '.png'))
    print(name)


def ground_tundra():
    rng = np.random.default_rng(11)
    img = shade(noise(rng, 4, 4) * .8 + noise(rng, 16, 2) * .2, [(46, 54, 38), (60, 70, 46), (76, 86, 54), (94, 102, 64)])
    lichen = noise(rng, 16, 2)
    put(img, lichen > .66, (128, 136, 98))
    put(img, lichen > .72, (156, 164, 128))
    d1, _, _ = cells(rng, 6)
    put(img, d1 < 1.6, (112, 110, 104))
    put(img, (d1 < 1.6) & (YY % 2 == 0) & (XX % 2 == 0), (146, 144, 136))
    berries = rng.random((N, N)) > .996
    put(img, berries, (168, 40, 44))
    put(img, np.roll(berries, 1, 0), (98, 26, 30))
    return img


def ground_path():
    rng = np.random.default_rng(22)
    img = shade(noise(rng, 4, 4) * .7 + noise(rng, 32, 1) * .3, [(66, 48, 32), (84, 63, 40), (104, 80, 52), (124, 98, 64)])
    d1, d2, _ = cells(rng, 5)
    put(img, (d2 - d1 < 1.2) & (noise(rng, 8, 2) > .55), (52, 38, 26))
    p1, _, _ = cells(rng, 6)
    peb = p1 < 2.6
    put(img, peb, (118, 112, 102))
    put(img, peb & (np.roll(p1, 1, 0) >= 2.6), (158, 152, 140))
    put(img, (np.roll(peb, -1, 0) | np.roll(peb, -1, 1)) & ~peb, (56, 42, 30))
    return img


def forest(rng, back, canopy, trunk_colors, bark, ground, trunks, width, leaves, marks=None):
    img = shade(noise(rng, 4, 3), back)
    top = noise(rng, 8, 3)
    put(img, top * (1 - YY / N) > .35, canopy[0])
    put(img, top * (1 - YY / N) > .45, canopy[1])
    for x in np.linspace(0, N, trunks, endpoint=False) + rng.integers(0, N // trunks, trunks):
        w = width + int(rng.integers(-1, 2))
        dx = (XX - x) % N
        body = dx < w
        light, dark = body & (dx < w // 3 + 1), body & (dx >= w - 2)
        img[body] = trunk_colors[1]
        img[light] = trunk_colors[2]
        img[dark] = trunk_colors[0]
        if marks:
            m = body & (noise(rng, 16, 1) > .62) & (YY % 3 == 0)
            put(img, m, marks)
        else:
            put(img, body & (noise(rng, 32, 1) > .7), bark)
    leaf = noise(rng, 16, 2)
    put(img, (leaf > .62) & (YY < N * .55), leaves[0])
    put(img, (leaf > .70) & (YY < N * .55), leaves[1])
    grass = noise(rng, 32, 1) * .5 + YY / N
    put(img, grass > .95, ground[0])
    put(img, grass > 1.05, ground[1])
    return img


def forest_birch():
    rng = np.random.default_rng(33)
    return forest(rng, [(34, 44, 30), (46, 58, 36), (58, 72, 42)], [(70, 92, 44), (96, 122, 56)],
                  [(150, 150, 140), (196, 196, 184), (228, 228, 216)], None, [(74, 96, 42), (104, 128, 56)],
                  6, 6, [(132, 156, 64), (176, 190, 86)], marks=(30, 30, 30))


def forest_pine():
    rng = np.random.default_rng(44)
    return forest(rng, [(18, 30, 30), (26, 40, 38), (34, 52, 46)], [(28, 58, 42), (42, 78, 52)],
                  [(92, 46, 26), (148, 78, 40), (190, 112, 60)], (70, 34, 22), [(40, 62, 34), (58, 84, 42)],
                  5, 8, [(36, 72, 48), (56, 98, 60)])


def stone_granite():
    rng = np.random.default_rng(55)
    d1, d2, idx = cells(rng, 4, 1, 1.25)
    tone = rng.random(16)[idx] * .35 + noise(rng, 8, 3) * .5 + (1 - np.clip(d1 / 26, 0, 1)) * .25
    img = shade(tone, [(104, 82, 80), (126, 100, 94), (148, 118, 108), (172, 140, 126)])
    speck = rng.random((N, N))
    put(img, speck > .975, (62, 54, 58))
    put(img, speck < .02, (210, 194, 184))
    put(img, (speck > .5) & (speck < .515), (186, 110, 96))
    edge = d2 - d1 < 2.0
    put(img, edge, (48, 40, 42))
    put(img, np.roll(edge, 1, 0) & ~edge, (190, 160, 146))
    return img


def stone_slate():
    rng = np.random.default_rng(66)
    wave = noise(rng, 4, 2)
    layer = (YY + wave * 8) / 8.0  # 16 layers per tile, so it repeats vertically
    band = layer - np.floor(layer)
    shift = rng.random(16)[np.floor(layer).astype(int) % 16]
    img = shade(shift * .55 + noise(rng, 16, 2) * .45, [(42, 48, 58), (54, 62, 74), (68, 78, 90), (84, 96, 108)])
    put(img, band < .12, (28, 32, 40))
    put(img, (band >= .12) & (band < .22), (110, 122, 134))
    d1, d2, _ = cells(rng, 5, .35, 1)
    put(img, (d2 - d1 < 1.0) & (band > .3) & (noise(rng, 8, 1) > .5), (32, 36, 44))
    return img


def walk_road():
    """The coast road: the shore ground lit like the trail used to be drawn (x1.18), so the game looks the same."""
    ground = np.asarray(Image.open(os.path.join(OUT, 'shore-ground.png')).convert('RGB')).astype(float)
    return np.clip(ground * 1.18, 0, 255)


for fn in [ground_tundra, ground_path, forest_birch, forest_pine, stone_granite, stone_slate, walk_road]:
    save(fn.__name__, fn())
