"""Split the Intro 4 picture (misty cliff) into four parallax layers and paint in what each layer hides.

Usage: py tools/split-intro4-layers.py "<source png>" "<output folder>"
1-foreground.png  stones and the sword
2-cliff.png       the land: grass slope, cliff, heroes (filled in behind the stones and the sword)
3-sea-sky.png     water and sky without clouds (filled in behind the land, the sword and the clouds)
4-clouds.png      the clouds
Every layer gets a margin of PAD pixels on each side, so small parallax shifts never reveal an empty edge.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
img = np.array(Image.open(src).convert('RGB')).astype(np.int32)
H, W = img.shape[:2]
PAD, HORIZON = 60, 402
r, g, b = img[..., 0], img[..., 1], img[..., 2]
lum = img.sum(2)
rows = np.arange(H)[:, None]

def polygon(points):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(points, fill=255); return np.array(m) > 0

def dilate(m, n=1):
    for _ in range(n):
        d = m.copy(); d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]; m = d
    return m

# Land: everything under a rough outline, minus water connected to the open sea (sea rocks stay water).
outline = [(0, 560), (250, 560), (450, 545), (600, 518), (700, 488), (800, 428), (860, 398), (1090, 395), (1090, 330), (1250, 330),
           (1250, 395), (1290, 395), (1310, 430), (1345, 560), (1365, 660), (1450, 688), (1600, 718), (1815, 732), (1815, 867), (0, 867)]
candidate = polygon(outline)
waterlike = ((b - g) >= 14) & (lum >= 330)
water = waterlike & ~candidate
while True:
    grown = dilate(water) & waterlike
    if (grown == water).all(): break
    water = grown
land = candidate & ~water

# The sword: its dark pixels inside a loose outline, grown a little to take the light edge of the blade.
sword_loose = polygon([(280, 505), (322, 512), (316, 572), (362, 586), (358, 612), (312, 605), (288, 750), (225, 750), (248, 603), (220, 590), (222, 558), (260, 565), (268, 515)])
sword = (dilate(sword_loose & (lum < 260), 6) | (dilate(sword_loose & (lum < 260), 10) & (lum > 430) & (rows > 600))) & sword_loose
# The stones: the outline plus the blue-grey stone pixels just outside it (their light rims).
stone_outlines = [
    [(0, 867), (0, 830), (40, 800), (80, 772), (120, 742), (150, 735), (200, 726), (250, 729), (300, 728), (360, 735), (400, 748), (440, 762), (480, 776), (505, 800), (515, 830), (522, 867)],
    [(640, 867), (650, 800), (680, 775), (720, 762), (770, 765), (810, 775), (835, 795), (845, 820), (850, 867)],
    [(1035, 867), (1040, 800), (1060, 770), (1100, 745), (1150, 738), (1200, 735), (1260, 740), (1300, 750), (1340, 770), (1365, 800), (1375, 840), (1380, 867)],
]
stones = np.zeros((H, W), bool)
rocklike = ((b - g) >= 6) | (lum > 450)
for s in stone_outlines:
    p = polygon(s); stones |= p | (dilate(p, 10) & rocklike & (rows > 700))
fg = sword | stones

# Clouds: darker than the clear sky of their row, above the horizon and not part of the land (heroes).
cloud = np.zeros((H, W), bool)
for y in range(HORIZON):
    cloud[y] = lum[y] < np.percentile(lum[y], 92) - 14
cloud = dilate(cloud, 2) & (rows < HORIZON) & ~land

def wave_fill(layer, fill, valid, rows_=range(H)):
    """Fill pixels of each row from the valid run next to the gap, bouncing back and forth through that run."""
    out = layer.copy(); bad = []
    for y in rows_:
        f = fill[y]
        if not f.any(): continue
        v = valid[y]
        if v.sum() < 30: bad.append(y); continue
        vis = np.where(v)[0]
        for x in np.where(f)[0]:
            i = np.searchsorted(vis, x)
            cand = [vis[i - 1]] if i > 0 else []
            if i < len(vis): cand.append(vis[i])
            near = min(cand, key=lambda c: abs(c - x)); step = 1 if near > x else -1
            # length of the valid run that starts at `near` and goes away from the gap
            L = 1
            while 0 <= near + step * L < len(v) and v[near + step * L] and L < 400: L += 1
            d = abs(x - near) - 1
            pos = d % (2 * L); pos = pos if pos < L else 2 * L - pos - 1
            out[y, x] = layer[y, near + step * pos]
    return out, bad

# Layer 3: sea and sky. Above the horizon clouds, heroes and the cliff top become the clear sky of their row;
# below it the land and the sword become the water of their row.
sea = img.copy(); xs = np.arange(W)
for y in range(HORIZON):
    hide = cloud[y] | land[y] | fg[y]
    if hide.any():
        for ch in range(3): sea[y, hide, ch] = np.interp(xs[hide], xs[~hide], img[y, ~hide, ch])
hidden = land | fg
sea, bad = wave_fill(sea, hidden & (rows >= HORIZON), ~hidden, range(HORIZON, H))
good = [y for y in range(HORIZON, H) if y not in bad]
for y in bad:
    if y > good[-1]: sea[y] = sea[good[-1] - ((y - good[-1]) % 36)]

# Layer 2: land. Under the sword and the stones the ground is painted in only below the land line of each column.
solid = land & ~fg
top = np.full(W, -1)
for x in range(W):
    ys = np.where(solid[:, x])[0]
    if len(ys): top[x] = ys[0]
known = top >= 0
top = np.interp(np.arange(W), np.where(known)[0], top[known]).astype(int)
# a column fully covered by the sword takes the land line of its neighbours
top = np.array([top[max(0, x - 40):x + 41].min() for x in range(W)])
ground_fg = fg & (rows >= top[None, :])
# The sword is narrow: fill along rows. The stones are wide: fill each column upwards from the grass above them.
ground, bad2 = wave_fill(img, ground_fg & sword & ~stones, solid, range(H))
for y in bad2: ground[y] = ground[y - 1]
cols, _ = wave_fill(ground.transpose(1, 0, 2), (ground_fg & stones).T, (solid | (ground_fg & sword & ~stones)).T, range(W))
ground = cols.transpose(1, 0, 2)

def save(name, rgb, alpha):
    a = np.dstack([rgb.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='reflect')
    Image.fromarray(a, 'RGBA').save(os.path.join(out, name))

save('1-foreground.png', img, fg)
save('2-cliff.png', ground, solid | ground_fg)
save('3-sea-sky.png', sea, np.ones((H, W), bool))
save('4-clouds.png', img, cloud)
print('land %.1f%%  foreground %.1f%%  clouds %.1f%%' % (land.mean() * 100, fg.mean() * 100, cloud.mean() * 100))
