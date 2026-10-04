#!/usr/bin/env python3
"""
Builds public/maps/art_gallery_zones.json (+ art_gallery_map.webp) from the Gemini gallery painting.

Everything below is written in the painting's NATIVE pixels (1264 x 841). `S` scales it to world pixels.
Edit WALK / OBSTACLES / PAINTINGS, re-run, and the blockers are recomputed:

    python3 scripts/build-gallery-zones.py path/to/Gemini_Generated_Image.png

Anything NOT inside a WALK rect (or inside an OBSTACLE) becomes a collision blocker.
Add --debug to also write /tmp/gallery_debug.png (walkable = green, blocked = red, zones = yellow/cyan).
"""
import json, sys, os
from PIL import Image, ImageDraw

SRC = next((a for a in sys.argv[1:] if not a.startswith('--')), 'Gemini_Generated_Image.png')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'maps')
S = 1.5                       # world px per painting px (player is 32x48, doors are ~50px tall in the art)
NW, NH = 1264, 841

# ---------------------------------------------------------------- where the player may stand
WALK = [
    # brick corridors
    (0, 372, 655, 408),        # upper cross corridor, left half
    (1186, 372, 1264, 408),    # upper cross corridor, right edge
    (0, 603, 1264, 640),       # lower cross corridor, full width
    (613, 122, 655, 841),      # central vertical corridor (reception at the top)
    (300, 408, 328, 603),      # short brick passage between the two wood rooms
    # left hall (cream tile + brick strip) and right hall
    (0, 100, 80, 143), (0, 143, 80, 603),
    (1186, 100, 1264, 603),
    # row-2 gallery (7 paintings): left room, right room, and the tile band that links everything
    (118, 298, 302, 343), (340, 298, 578, 343), (80, 343, 613, 372),
    # wood rooms (5 paintings)
    (118, 503, 276, 603), (361, 503, 572, 603),
    # bottom galleries (6 paintings) + the cream strip down the left side
    (0, 640, 80, 841), (80, 744, 110, 776), (110, 724, 390, 815), (390, 780, 420, 815), (420, 724, 572, 815),
]
OBSTACLES = [
    (197, 284, 229, 343), (452, 284, 480, 344),                       # statue pedestals, row-2 gallery
    (138, 490, 160, 537), (437, 485, 457, 537), (531, 485, 554, 537), # statue pedestals, wood rooms
    (123, 571, 134, 600), (368, 571, 380, 600), (556, 571, 568, 600), # lamps
    (172, 726, 198, 746), (292, 726, 316, 746),                       # columns, bottom gallery
    (0, 648, 27, 739),                                                # planter on the left edge
    (58, 80, 80, 120), (1186, 80, 1207, 121),                         # corner pedestals
]

# ---------------------------------------------------------------- paintings: (frame box x0,y0,x1,y1, floor_top_y)
PAINTINGS = [
    ((36, 27, 70, 74), 100),
    ((132, 232, 171, 279), 298), ((183, 237, 217, 272), 298), ((230, 230, 289, 278), 298), ((354, 230, 393, 280), 298),
    ((410, 230, 439, 280), 298), ((455, 234, 523, 275), 298), ((536, 236, 564, 276), 298),
    ((131, 447, 190, 488), 503), ((207, 447, 260, 487), 503),
    ((378, 443, 433, 489), 503), ((452, 438, 494, 494), 503), ((514, 440, 556, 493), 503),
    ((129, 670, 161, 711), 724), ((209, 666, 280, 712), 724), ((330, 666, 374, 714), 724),
    ((438, 668, 467, 710), 724), ((477, 675, 509, 701), 724), ((519, 670, 556, 712), 724),
    ((1195, 28, 1228, 76), 100),
]

EXIT = ('to-coast', 'CoastScene', 'from-gallery', (613, 122, 655, 134))   # top of the central corridor = reception
START = (634, 165)
# edge strips that loop east <-> west (rows where both sides are brick in the art): (y0, y1)
LOOP_ROWS = [(148, 640)]

def inside(r, x, y): return r[0] <= x < r[2] and r[1] <= y < r[3]
def walkable(x, y): return any(inside(r, x, y) for r in WALK) and not any(inside(r, x, y) for r in OBSTACLES)

def blockers():
    xs = sorted({0, NW, *[v for r in WALK + OBSTACLES for v in (r[0], r[2])]})
    ys = sorted({0, NH, *[v for r in WALK + OBSTACLES for v in (r[1], r[3])]})
    xs = [x for x in xs if 0 <= x <= NW]; ys = [y for y in ys if 0 <= y <= NH]
    grid = [[not walkable((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2) for i in range(len(xs) - 1)] for j in range(len(ys) - 1)]
    # merge runs along x, then stack identical runs along y
    rows = []
    for j, row in enumerate(grid):
        runs, i = [], 0
        while i < len(row):
            if row[i]:
                k = i
                while k + 1 < len(row) and row[k + 1]: k += 1
                runs.append((xs[i], xs[k + 1])); i = k + 1
            else: i += 1
        rows.append(runs)
    out, open_ = [], {}
    for j, runs in enumerate(rows + [[]]):
        cur = set(runs)
        for key in list(open_):
            if key not in cur:
                y0 = open_.pop(key); out.append((key[0], y0, key[1], ys[j]))
        for key in cur:
            open_.setdefault(key, ys[j])
    return out

def w(v): return round(v * S)
def rect(r): return {'x': w(r[0]), 'y': w(r[1]), 'w': w(r[2]) - w(r[0]), 'h': w(r[3]) - w(r[1])}

def stand_point(cx, top):
    """Nearest reachable spot just below a painting (used by 'travel to this painting')."""
    y = top + 14
    for dx in sorted(range(-40, 41, 4), key=abs):
        x = cx + dx
        if all(walkable(x + ox, y + oy) for ox in (-7, 0, 7) for oy in (-4, 0, 4)): return x, y
    raise SystemExit(f'no standing spot for painting at x={cx}')

def main():
    assert walkable(*START), 'START is inside a wall'
    bl = blockers()
    data = {
        'world': {'width': w(NW), 'height': w(NH)},
        'background': 'art-gallery-bg',
        'blockers': [{'name': f'b{i}', **rect(b)} for i, b in enumerate(bl)],
        'exits': [{'name': EXIT[0], 'target': EXIT[1], 'spawn': EXIT[2], **rect(EXIT[3])}],
        'warps': [], 'paintings': [],
        'spawns': {'start': {'x': w(START[0]), 'y': w(START[1])}},
    }
    for (y0, y1) in LOOP_ROWS:
        data['warps'].append({'name': 'loop-west-to-east', **rect((0, y0, 8, y1)), 'toX': w(NW - 24)})
        data['warps'].append({'name': 'loop-east-to-west', **rect((NW - 8, y0, NW, y1)), 'toX': w(24)})
    for i, ((x0, y0, x1, y1), top) in enumerate(PAINTINGS):
        cx = (x0 + x1) // 2
        sx, sy = stand_point(cx, top)
        data['paintings'].append({
            'id': f'painting-{i + 1:02d}', 'slot': i,
            **rect((x0, y0, x1, y1)),
            'zone': rect((cx - 22, top - 2, cx + 22, top + 14)),
            'stand': {'x': w(sx), 'y': w(sy)},
        })
    with open(os.path.join(OUT, 'art_gallery_zones.json'), 'w') as f: json.dump(data, f, indent=1)
    im = Image.open(SRC).convert('RGB'); assert im.size == (NW, NH), im.size
    im.save(os.path.join(OUT, 'art_gallery_map.webp'), 'WEBP', lossless=True, quality=100, method=6)
    print(f'{len(bl)} blockers, {len(PAINTINGS)} paintings, world {data["world"]}')

    if '--debug' in sys.argv:
        dbg = im.convert('RGBA'); ov = Image.new('RGBA', dbg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        for b in bl: d.rectangle([b[0], b[1], b[2], b[3]], fill=(255, 0, 0, 90))
        for p in PAINTINGS: d.rectangle(list(p[0]), outline=(255, 215, 0, 255))
        for p in data['paintings']:
            z = p['zone']; d.rectangle([z['x'] / S, z['y'] / S, (z['x'] + z['w']) / S, (z['y'] + z['h']) / S], outline=(0, 255, 255, 255))
            d.ellipse([p['stand']['x'] / S - 3, p['stand']['y'] / S - 3, p['stand']['x'] / S + 3, p['stand']['y'] / S + 3], fill=(0, 255, 0, 255))
            d.text((p['x'] / S + 2, p['y'] / S + 2), str(p['slot'] + 1), fill=(255, 255, 255, 255))
        e = EXIT[3]; d.rectangle(list(e), outline=(255, 0, 255, 255), width=2)
        d.ellipse([START[0] - 4, START[1] - 4, START[0] + 4, START[1] + 4], fill=(255, 255, 0, 255))
        for wp in data['warps']: d.rectangle([wp['x'] / S, wp['y'] / S, (wp['x'] + wp['w']) / S, (wp['y'] + wp['h']) / S], outline=(255, 128, 0, 255), width=2)
        Image.alpha_composite(dbg, ov).save('/tmp/gallery_debug.png')

if __name__ == '__main__': main()
