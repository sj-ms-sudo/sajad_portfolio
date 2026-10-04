#!/usr/bin/env python3
"""Draws public/sprites/npc_seagull.png (6 x 32x32) and npc_shark.png (4 x 48x32). Art faces RIGHT.
Re-run after tweaking:  python3 scripts/make-coast-sprites.py   (placeholder art - swap in your own PNGs any time,
just keep the frame sizes and update game/frontend/data/coast-npcs.ts if they change)."""
from PIL import Image
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')

def pal(d): return {k: tuple(int(v[i:i+2], 16) for i in (1, 3, 5)) + (255,) for k, v in d.items()}

# ------------------------------------------------------------------ seagull
GULL = pal({'K': '#2b3340', 'W': '#f7fafc', 'B': '#d6e0ea', 'D': '#8697aa', 'T': '#2b3340', 'Y': '#ffb627', 'O': '#f28a2a', 'E': '#101418', 'R': '#e8453c'})
HEAD = [  # 11 wide x 7 high; (0,0) sits at body-relative x=9, y=0
    "...KKKK....",
    "..KWWWWK...",
    ".KWWWEWWKK.",
    ".KWWWWWWYYK",
    ".KWWWWWKYYK",
    "..KBWWWK.KK",
    "...KKKK....",
]
HEAD_BLINK = [r.replace('E', 'W') for r in HEAD]
BODY = [   # 21 wide x 11 high
    "...KKKKKK............",
    "..KWWWWWWKKKK........",
    ".KWWWWWWWWWWWK.......",
    "KWWDDDDDDDWWWWK......",
    "KTDDDDDDDDDWWWWK.....",
    "KTDDDDDDDDDDWWK......",
    ".KTDDDDDDDDBWWK......",
    "..KKDDDDDDBBWK.......",
    "...KKBBBBBBBK........",
    ".....KKKKKKK.........",
    ".....................",
]
BODY_WINGUP = [
    "..........KK.........",
    ".........KWWK........",
    "........KWWWWK.......",
    ".......KWWWDWWKK.....",
    "KK....KWWDDDDDWWK....",
    "KTK..KWWDDDDDDWWK....",
    ".KTKKWWDDDDDDDWWK....",
    "..KKDDDDDDDBBWWK.....",
    "...KKBBBBBBBWWK......",
    ".....KKKKKKKKK.......",
    ".....................",
]
LEGS = [(8, 'O'), (12, 'O')]

def blit(img, rows, ox, oy, p):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.' and ch in p: img.putpixel((ox + x, oy + y), p[ch])

def gull_frame(head=HEAD, hx=9, hy=3, body=BODY, bob=0, legs=True):
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    by = 14 + bob
    blit(im, body, 4, by, GULL)
    blit(im, head, 4 + hx, by - 4 + hy - 3, GULL)  # head sits on the shoulders
    if legs:
        for lx, c in LEGS:
            for yy in range(by + 10, 29): im.putpixel((4 + lx, yy), GULL[c])
            for dx in (0, 1, 2): im.putpixel((4 + lx + dx, 29), GULL[c])
    return im

def make_gull():
    frames = [
        gull_frame(),                                   # 0 stand
        gull_frame(head=HEAD_BLINK),                    # 1 blink
        gull_frame(hx=11, hy=7),                        # 2 peck (head down + forward)
        gull_frame(hx=12, hy=8),                        # 3 peck lower
        gull_frame(body=BODY_WINGUP, bob=-1),           # 4 wings up
        gull_frame(bob=-1, legs=True),                  # 5 settle
    ]
    sheet = Image.new('RGBA', (32 * len(frames), 32), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (32 * i, 0))
    sheet.save(os.path.join(OUT, 'npc_seagull.png'))

# ------------------------------------------------------------------ shark (swimming on the surface, with ripples)
SH = pal({'K': '#1c2a3d', 'G': '#5e7fa3', 'H': '#7c9cbf', 'L': '#d8e6f2', 'F': '#486888', 'E': '#0b1118', 'M': '#7a1f2b', 'T': '#ffffff', 'R': '#cfe8ff', 'S': '#a7cdf0'})
SHARK = [  # 44 wide x 20 high. tail on the left, nose on the right
    "..........................KK..................",
    ".........................KFFK.................",
    "........................KFFFFK................",
    "....KK..................KFFFFFK...............",
    "...KFFK................KFFFFFFFK..............",
    "..KFFFFK.......KKKKKKKKGGGGGGGGGGKKK..........",
    ".KFFFFFFKKKKKKGGGGGGGGGGGGGGGGGGGGGGGKK.......",
    "KFFFFFFFGGGGGGGGGGGGGGGGGGGGGGGGGGGEEGGGKK....",
    ".KFFFFFFGGGGGGGGGGGGGGGGGGGGGGGGGGGGEEGGGGK...",
    "..KFFFFKLLGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK..",
    "...KFFKKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLK.",
    "....KKK.KLLLLLLLLLLLLLLLLLLLLLLLLLLLLLTMTMTMTK",
    "........KKKLLLLLLLLLLLLLLLLLLLLLLLLLKMMMMMMMKK",
    "..........KKKFFLLLLLLLLLLLLLLLLKKKKKK.KKKKKK..",
    "...............KFFKKKKKKKKKKKKK.KFFFK.........",
    "................KKK.............KKK...........",
]
def make_shark():
    frames = []
    for i in range(4):
        im = Image.new('RGBA', (48, 32), (0, 0, 0, 0))
        # body bobs a pixel, tail wags by shearing the left 10 columns up/down
        bob = (0, 1, 1, 0)[i]; wag = (-2, 0, 2, 0)[i]
        body = Image.new('RGBA', (48, 32), (0, 0, 0, 0)); blit(body, SHARK, 2, 6 + bob, SH)
        tail = body.crop((0, 0, 12, 32)); body.paste((0, 0, 0, 0), (0, 0, 12, 32)); body.paste(tail, (0, wag), tail)
        im.alpha_composite(body)
        # ripples under the belly, shifting each frame
        for k, x in enumerate(range(4 + ((i * 3) % 6), 44, 8)):
            for dx in range(4):
                if 0 <= x + dx < 48: im.putpixel((x + dx, 25 + (k % 2)), SH['R'] if (x + k) % 2 else SH['S'])
        frames.append(im)
    sheet = Image.new('RGBA', (48 * 4, 32), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (48 * i, 0))
    sheet.save(os.path.join(OUT, 'npc_shark.png'))

if __name__ == '__main__':
    make_gull(); make_shark(); print('ok')
