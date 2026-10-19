"""Draw the platformer hero as the Wanderer from the character art: grey hooded cloak, staff, olive tunic,
belt with a pouch, olive-grey trousers and brown boots. Every frame is 24x40, facing right, feet on row 39.

Usage: py tools/build-platform-wanderer.py <assets dir> <gen dir>
platform-hero0.png        standing
platform-walk0..7.png     walk cycle: contact, down, passing, up for each leg; the cloak hem and the staff swing
platform-hero5.png        jump: knees tucked, cloak blown up
platform-hero6.png        hanging from a ledge by both hands
A dark outline is added around the figure so it reads against the landscape.
"""
import math, os, sys
from PIL import Image, ImageDraw

assets, gen = sys.argv[1], sys.argv[2]
W, H, GROUND = 24, 40, 39
OUT = (22, 22, 26, 255)
CLOAK = [(56, 60, 68), (88, 94, 104), (122, 128, 138), (156, 162, 172)]
SKIN, SKIN_D, HAIR = (198, 154, 124), (150, 108, 86), (66, 46, 34)
TUNIC = [(60, 64, 42), (90, 96, 62), (120, 124, 84)]
TROUSERS = [(46, 48, 38), (70, 72, 56), (92, 94, 74)]
TROUSERS_FAR = [(36, 38, 30), (54, 56, 44), (70, 72, 56)]
LEATHER = [(66, 42, 26), (98, 66, 40)]
BOOT = [(60, 36, 20), (96, 58, 32), (128, 82, 48)]
BOOT_FAR = [(46, 28, 16), (74, 46, 26), (96, 60, 34)]
WOOD = [(70, 48, 28), (112, 78, 46)]
THIGH, SHIN = 7.0, 7.4
CYCLE = [(28, 4), (17, 14), (2, 4), (-15, 5), (-25, 14), (-8, 48), (15, 56), (31, 24)]

def leg_points(hip, thigh, bend):
    t1, t2 = math.radians(thigh), math.radians(thigh - bend)
    knee = (hip[0] + THIGH * math.sin(t1), hip[1] + THIGH * math.cos(t1))
    return knee, (knee[0] + SHIN * math.sin(t2), knee[1] + SHIN * math.cos(t2))

def thick(d, a, b, width, color):
    d.line([a, b], fill=color, width=width)

def leg(d, hip, thigh, bend, trousers, boot):
    knee, ankle = leg_points(hip, thigh, bend)
    thick(d, hip, knee, 4, trousers[1]); thick(d, knee, ankle, 3, trousers[1])
    thick(d, (hip[0] + 1, hip[1] + 1), (knee[0] + 1, knee[1]), 1, trousers[2])
    ax, ay = round(ankle[0]), round(ankle[1])
    lift = thigh - bend < -20
    # a tall boot: shaft up the shin, foot pointing forward
    d.rectangle([ax - 1, ay - 3, ax + 1, ay], fill=boot[1])
    d.rectangle([ax - 1, ay - 1 - (1 if lift else 0), ax + 3, ay - (1 if lift else 0)], fill=boot[0])
    d.point((ax, ay - 3), fill=boot[2]); d.point((ax + 2, ay - 1 - (1 if lift else 0)), fill=boot[1])
    return ankle

def figure(legs, hip_y, sway=0, staff_dx=0, pose='walk'):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    top = hip_y - 20                      # head top for this frame (follows the bob)
    hip = (11.5, hip_y)
    # cloak behind the body, hem swaying (and blown up in a jump)
    hem = hip_y + (2 if pose == 'jump' else 8)
    back = [(9, top + 9), (13, top + 9), (12, hem - 2), (8 - sway, hem), (4 - sway, hem - 1), (5 - sway // 2, top + 18)]
    d.polygon(back, fill=CLOAK[0])
    d.polygon([(9, top + 10), (11, top + 10), (10, hem - 3), (6 - sway, hem - 2)], fill=CLOAK[1])
    # far leg, tunic, near leg
    leg(d, (hip[0] - .5, hip[1]), *legs[1], TROUSERS_FAR, BOOT_FAR)
    d.rectangle([9, top + 9, 15, hip_y + 1], fill=TUNIC[1])
    d.line([(15, top + 10), (15, hip_y)], fill=TUNIC[2]); d.line([(9, top + 11), (9, hip_y + 1)], fill=TUNIC[0])
    d.line([(9, hip_y - 2), (15, hip_y - 2)], fill=LEATHER[0])                           # belt
    d.rectangle([8, hip_y - 2, 10, hip_y + 1], fill=LEATHER[1]); d.point((8, hip_y + 1), fill=LEATHER[0])   # pouch
    d.line([(10, top + 10), (14, hip_y - 3)], fill=LEATHER[0])                           # shoulder strap
    leg(d, hip, *legs[0], TROUSERS, BOOT)
    # cloak over the shoulders and the back
    d.polygon([(8, top + 8), (14, top + 8), (12, top + 13), (9, top + 17), (7, top + 14)], fill=CLOAK[1])
    d.line([(8, top + 9), (13, top + 9)], fill=CLOAK[2])
    # hood with the face in its opening
    d.ellipse([9, top, 16, top + 9], fill=CLOAK[1])
    d.line([(10, top + 1), (14, top)], fill=CLOAK[2]); d.point((11, top + 1), fill=CLOAK[3])
    d.rectangle([13, top + 3, 16, top + 8], fill=SKIN)
    d.line([(13, top + 3), (16, top + 3)], fill=HAIR); d.point((13, top + 4), fill=HAIR)  # fringe under the hood
    d.point((15, top + 5), fill=OUT[:3]); d.point((16, top + 7), fill=SKIN_D); d.point((13, top + 8), fill=SKIN_D)
    d.line([(12, top + 2), (12, top + 9)], fill=CLOAK[0])                               # hood edge
    if pose == 'hang':
        # both arms up to the ledge, staff slung across the back
        d.line([(4, top + 22), (14, top + 6)], fill=WOOD[0], width=1)
        thick(d, (13, top + 10), (14, top - 1), 2, CLOAK[1]); d.rectangle([13, top - 3, 15, top - 2], fill=SKIN)
        thick(d, (10, top + 10), (9, top - 1), 2, CLOAK[0]); d.rectangle([8, top - 3, 10, top - 2], fill=SKIN_D)
    else:
        # near arm forward, hand around the staff
        sx = 18 + staff_dx
        st_top, st_bot = (top - 2, GROUND) if pose != 'jump' else (top + 2, hip_y + 8)
        d.line([(sx, st_top), (sx - 1 if pose != 'jump' else sx + 2, st_bot)], fill=WOOD[1], width=1)
        d.line([(sx + 1, st_top + 1), (sx, st_bot)], fill=WOOD[0], width=1)
        d.rectangle([sx - 1, st_top - 1, sx + 1, st_top], fill=WOOD[0])                 # knob
        thick(d, (13, top + 10), (sx - 1, top + 15), 2, CLOAK[1])
        d.rectangle([sx - 1, top + 14, sx, top + 16], fill=SKIN)
    # dark outline around the whole figure
    px = img.load(); solid = [[px[x, y][3] > 0 for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if not solid[y][x] and any(0 <= x + dx < W and 0 <= y + dy < H and solid[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUT
    return img

def hip_for(a, b):
    lowest = max(leg_points((0, 0), *a)[1][1], leg_points((0, 0), *b)[1][1])
    return GROUND - 1 - lowest

os.makedirs(gen, exist_ok=True)
def save(img, name, genname):
    img.save(os.path.join(assets, name)); img.save(os.path.join(gen, genname))

stand = [(5, 2), (-4, 2)]
save(figure(stand, hip_for(*stand)), 'platform-hero0.png', 'platform-hero_wanderer-stand_24x40.png')
for f in range(8):
    a, b = CYCLE[f], CYCLE[(f + 4) % 8]
    sway = [1, 2, 2, 1, 0, 1, 2, 2][f]
    staff = [1, 1, 0, 0, -1, -1, 0, 0][f]
    save(figure([a, b], hip_for(a, b), sway, staff), 'platform-walk%d.png' % f, 'platform-hero_wanderer-walk%d_24x40.png' % (f + 1))
jump = [(40, 75), (-5, 55)]
save(figure(jump, hip_for(*jump) - 2, sway=3, pose='jump'), 'platform-hero5.png', 'platform-hero_wanderer-jump_24x40.png')
hang = [(4, 6), (-6, 10)]
save(figure(hang, GROUND - 14, sway=1, pose='hang'), 'platform-hero6.png', 'platform-hero_wanderer-hang_24x40.png')
print('ok')
