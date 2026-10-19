"""Build the platformer hero's 8-frame walk cycle (24x40 each) from the existing walking sprite.

Usage: py tools/build-platform-walk.py <assets dir> <gen dir>
The head, backpack, torso and arm come from platform-hero2.png; the legs are redrawn per frame from a
classic walk cycle (contact, down, passing, up for each leg), and the hip height follows the leg that
stands on the ground, so the body bobs naturally. Writes platform-walk0..7.png and a copy to Gen.
"""
import math, os, sys
import numpy as np
from PIL import Image

assets, gen = sys.argv[1], sys.argv[2]
src = np.array(Image.open(os.path.join(assets, 'platform-hero2.png')).convert('RGBA'))
W, H, CUT = 24, 40, 26          # sprite size; the legs start below row CUT
upper = src.copy(); upper[CUT:] = 0

FRONT = [(88, 56, 40), (63, 40, 28), (35, 24, 15)]   # light edge, trouser, shadow
BACK = [(63, 40, 28), (45, 30, 20), (26, 18, 11)]
BOOT, BOOT_HI = (14, 10, 5), (41, 27, 17)
THIGH, SHIN, GROUND = 7.2, 7.0, 39
# (thigh angle from vertical, knee bend) in degrees for one leg through the 8 frames; forward is +.
CYCLE = [(28, 4), (17, 14), (2, 4), (-15, 5), (-25, 14), (-8, 48), (15, 56), (31, 24)]

def leg_points(hip, thigh, bend):
    t1 = math.radians(thigh); t2 = math.radians(thigh - bend)
    knee = (hip[0] + THIGH * math.sin(t1), hip[1] + THIGH * math.cos(t1))
    ankle = (knee[0] + SHIN * math.sin(t2), knee[1] + SHIN * math.cos(t2))
    return knee, ankle

def stamp(img, x, y, r, color):
    for yy in range(int(math.floor(y - r)), int(math.ceil(y + r)) + 1):
        for xx in range(int(math.floor(x - r)), int(math.ceil(x + r)) + 1):
            if 0 <= xx < W and 0 <= yy < H and (xx + .5 - x) ** 2 + (yy + .5 - y) ** 2 <= r * r:
                img[yy, xx] = (*color, 255)

def segment(img, a, b, r, color):
    n = max(2, int(math.dist(a, b) * 3))
    for i in range(n + 1):
        t = i / n; stamp(img, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, color)

def draw_leg(img, hip, thigh, bend, pal):
    knee, ankle = leg_points(hip, thigh, bend)
    # shadow first, then the trouser body, then a light edge on the front side
    segment(img, hip, knee, 2.1, pal[2]); segment(img, knee, ankle, 1.7, pal[2])
    segment(img, (hip[0] + .3, hip[1]), (knee[0] + .3, knee[1]), 1.5, pal[1]); segment(img, (knee[0] + .3, knee[1]), (ankle[0] + .2, ankle[1]), 1.1, pal[1])
    segment(img, (hip[0] + 1.2, hip[1] + 1), (knee[0] + 1.1, knee[1]), .6, pal[0])
    # boot: points forward, tips up a little when the heel leaves the ground
    ax, ay = round(ankle[0]), round(ankle[1])
    lift = 1 if thigh - bend < -20 else 0
    for x in range(ax - 1, ax + 4):
        for y in range(ay - 1, ay + 1):
            yy = y - (lift if x > ax + 1 else 0)
            if 0 <= x < W and 0 <= yy < H: img[yy, x] = (*BOOT, 255)
    if 0 <= ax + 2 < W and 0 <= ay - 1 < H: img[ay - 1, ax + 2] = (*BOOT_HI, 255)
    return ankle

os.makedirs(gen, exist_ok=True)
for f in range(8):
    a, b = CYCLE[f], CYCLE[(f + 4) % 8]
    # the hip sits so that the lower foot touches the ground: this is the walk's up-and-down bob
    lowest = max(leg_points((0, 0), *a)[1][1], leg_points((0, 0), *b)[1][1])
    hip_y = GROUND - 1 - lowest
    bob = int(round(hip_y - CUT))
    img = np.zeros((H, W, 4), np.uint8)
    hip = (10.5, hip_y)
    draw_leg(img, (hip[0] - .5, hip[1]), *b, BACK)       # far leg behind
    body = np.zeros_like(img)
    if bob >= 0: body[bob:] = upper[:H - bob]
    else: body[:bob] = upper[-bob:]
    m = body[..., 3] > 0; img[m] = body[m]
    draw_leg(img, hip, *a, FRONT)                         # near leg in front of the body edge
    out = Image.fromarray(img, 'RGBA')
    out.save(os.path.join(assets, 'platform-walk%d.png' % f))
    out.save(os.path.join(gen, 'platform-hero_walk-frame%d_24x40.png' % (f + 1)))
    print(f, 'bob', bob)
