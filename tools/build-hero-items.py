"""Pixel icons 24x24 for the four inventory slots on each character creation screen.

Usage: py tools/build-hero-items.py <assets dir> <gen dir>
Writes hero-item-<name>.png into assets and hero-item_<name>_24x24.png into Gen.
Wanderer: compass, flask, map, rope.  Mage: warm socks, spell book, crystal, thermos.
Knight: shield, whetstone, pot, rusks.  Every icon gets a dark outline so it reads on the slot background.
"""
import os, sys
from PIL import Image, ImageDraw

assets, gen = sys.argv[1], sys.argv[2]
S = 24
OUT = (20, 16, 14, 255)

def canvas():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); return img, ImageDraw.Draw(img)

def outline(img):
    px = img.load(); solid = [[px[x, y][3] > 0 for x in range(S)] for y in range(S)]
    for y in range(S):
        for x in range(S):
            if not solid[y][x] and any(0 <= x + dx < S and 0 <= y + dy < S and solid[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUT
    return img

def compass():
    img, d = canvas()
    d.ellipse([3, 4, 20, 21], fill=(150, 112, 52)); d.ellipse([4, 5, 19, 20], fill=(196, 152, 72))
    d.ellipse([6, 7, 17, 18], fill=(226, 222, 204)); d.ellipse([6, 7, 17, 18], outline=(120, 90, 40))
    d.rectangle([10, 2, 13, 4], fill=(196, 152, 72))                       # ring
    d.polygon([(11.5, 8), (13, 12.5), (10, 12.5)], fill=(200, 48, 44))      # north needle
    d.polygon([(11.5, 17), (13, 12.5), (10, 12.5)], fill=(70, 80, 96))
    d.point((11, 12), fill=(40, 40, 40)); d.point((8, 8), fill=(255, 255, 255))
    return outline(img)

def flask():
    img, d = canvas()
    d.rectangle([10, 2, 13, 5], fill=(110, 76, 46))                         # cork
    d.rectangle([9, 5, 14, 7], fill=(150, 156, 164))                        # neck
    d.rounded_rectangle([5, 7, 18, 21], 4, fill=(132, 140, 150))
    d.rounded_rectangle([5, 11, 18, 18], 1, fill=(96, 76, 52))              # leather band
    d.line([(7, 9), (7, 19)], fill=(184, 190, 198)); d.point((8, 9), fill=(220, 224, 228))
    return outline(img)

def scroll_map():
    img, d = canvas()
    d.rectangle([4, 6, 19, 18], fill=(214, 196, 150))
    d.rectangle([2, 5, 5, 19], fill=(186, 164, 116)); d.rectangle([18, 5, 21, 19], fill=(186, 164, 116))   # rolls
    d.line([(3, 5), (3, 19)], fill=(220, 204, 160)); d.line([(19, 5), (19, 19)], fill=(220, 204, 160))
    d.line([(7, 15), (10, 11), (13, 13), (16, 9)], fill=(70, 110, 170))        # river
    d.point((15, 15), fill=(200, 48, 44)); d.point((14, 15), fill=(200, 48, 44)); d.point((15, 14), fill=(200, 48, 44))   # cross
    d.point((14, 14), fill=(200, 48, 44)); d.point((16, 16), fill=(200, 48, 44))
    d.line([(8, 8), (11, 8)], fill=(120, 140, 80))
    return outline(img)

def rope():
    img, d = canvas()
    for r, c in ((9, (150, 118, 70)), (7, (184, 150, 96)), (5, (150, 118, 70)), (3, (184, 150, 96))):
        d.ellipse([12 - r, 12 - r, 12 + r - 1, 12 + r - 1], outline=c, width=2)
    d.line([(17, 18), (21, 22)], fill=(184, 150, 96), width=2)               # loose end
    for x, y in ((6, 7), (16, 6), (5, 15), (18, 14)): d.point((x, y), fill=(214, 184, 130))
    return outline(img)

def socks():
    img, d = canvas()
    for ox, col, stripe in ((2, (176, 60, 52), (230, 222, 206)), (10, (70, 96, 150), (230, 222, 206))):
        d.rectangle([ox + 1, 3, ox + 6, 15], fill=col)
        d.rounded_rectangle([ox + 1, 12, ox + 11, 19], 3, fill=col)
        d.rectangle([ox + 1, 3, ox + 6, 5], fill=stripe); d.line([(ox + 1, 9), (ox + 6, 9)], fill=stripe)
        d.rectangle([ox + 8, 14, ox + 11, 19], fill=stripe)                    # toe
    return outline(img)

def book():
    img, d = canvas()
    d.rectangle([4, 4, 19, 20], fill=(70, 50, 110)); d.rectangle([5, 5, 18, 19], fill=(96, 70, 150))
    d.rectangle([4, 4, 6, 20], fill=(56, 40, 90))                               # spine
    d.rectangle([7, 20, 19, 21], fill=(226, 218, 196))                          # pages
    d.ellipse([10, 8, 16, 14], outline=(232, 196, 92)); d.point((13, 11), fill=(240, 220, 120))   # rune
    d.line([(13, 6), (13, 16)], fill=(232, 196, 92)); d.line([(9, 11), (17, 11)], fill=(232, 196, 92))
    return outline(img)

def crystal():
    img, d = canvas()
    d.polygon([(12, 2), (18, 9), (15, 21), (9, 21), (6, 9)], fill=(90, 170, 210))
    d.polygon([(12, 2), (12, 21), (9, 21), (6, 9)], fill=(140, 210, 236))
    d.polygon([(12, 2), (18, 9), (12, 9)], fill=(190, 236, 250))
    d.line([(9, 6), (8, 9)], fill=(240, 252, 255)); d.point((17, 4), fill=(255, 255, 255)); d.point((4, 15), fill=(200, 240, 255))
    return outline(img)

def thermos():
    img, d = canvas()
    d.rectangle([8, 2, 15, 5], fill=(60, 64, 70))                               # cup lid
    d.rectangle([7, 5, 16, 21], fill=(64, 110, 90)); d.rectangle([7, 5, 9, 21], fill=(86, 140, 116))
    d.rectangle([7, 9, 16, 10], fill=(170, 176, 180)); d.rectangle([7, 17, 16, 18], fill=(170, 176, 180))
    for x, y in ((18, 3), (19, 1), (20, 4)): d.point((x, y), fill=(220, 224, 228))   # steam
    return outline(img)

def shield():
    img, d = canvas()
    d.polygon([(4, 3), (19, 3), (19, 12), (11.5, 21), (4, 12)], fill=(150, 156, 166))
    d.polygon([(6, 5), (17, 5), (17, 12), (11.5, 18.5), (6, 12)], fill=(60, 84, 140))
    d.line([(11, 5), (11, 18)], fill=(214, 180, 80), width=2); d.line([(6, 10), (17, 10)], fill=(214, 180, 80), width=2)
    d.line([(4, 3), (19, 3)], fill=(200, 206, 214))
    return outline(img)

def whetstone():
    img, d = canvas()
    d.polygon([(3, 14), (16, 5), (21, 9), (8, 18)], fill=(120, 116, 106))
    d.polygon([(3, 14), (16, 5), (17, 7), (5, 15)], fill=(156, 150, 138))
    d.polygon([(8, 18), (21, 9), (21, 11), (8, 20)], fill=(84, 80, 72))
    for x, y in ((9, 12), (13, 10), (12, 13)): d.point((x, y), fill=(180, 176, 164))
    return outline(img)

def pot():
    img, d = canvas()
    d.arc([5, 2, 18, 14], 180, 360, fill=(110, 112, 118), width=1)               # handle
    d.rectangle([4, 8, 19, 9], fill=(130, 134, 140))
    d.rounded_rectangle([5, 9, 18, 20], 3, fill=(84, 88, 96)); d.rectangle([6, 10, 8, 18], fill=(110, 116, 124))
    d.rectangle([9, 21, 14, 22], fill=(220, 120, 40)); d.point((11, 20), fill=(250, 200, 80))   # small flame
    return outline(img)

def rusks():
    img, d = canvas()
    d.rounded_rectangle([3, 8, 20, 20], 2, fill=(170, 140, 96))                   # cloth bag
    d.polygon([(3, 8), (20, 8), (16, 4), (7, 4)], fill=(196, 168, 120))
    d.line([(7, 8), (16, 8)], fill=(110, 80, 50))                                 # string
    for x, y in ((6, 11), (11, 13), (15, 11)):                                    # rusks peeking out
        d.rectangle([x, y, x + 3, y + 3], fill=(206, 150, 70)); d.point((x + 1, y + 1), fill=(236, 190, 110))
    return outline(img)

ITEMS = {'compass': compass, 'flask': flask, 'map': scroll_map, 'rope': rope,
         'socks': socks, 'book': book, 'crystal': crystal, 'thermos': thermos,
         'shield': shield, 'whetstone': whetstone, 'pot': pot, 'rusks': rusks}
os.makedirs(gen, exist_ok=True)
for name, draw in ITEMS.items():
    img = draw()
    img.save(os.path.join(assets, 'hero-item-%s.png' % name)); img.save(os.path.join(gen, 'hero-item_%s_24x24.png' % name))
sheet = Image.new('RGBA', (len(ITEMS) * 26, 26), (24, 36, 43, 255))
for i, name in enumerate(ITEMS): sheet.alpha_composite(Image.open(os.path.join(assets, 'hero-item-%s.png' % name)), (i * 26 + 1, 1))
sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(gen, 'hero-items_sheet_preview.png'))
print('ok')
