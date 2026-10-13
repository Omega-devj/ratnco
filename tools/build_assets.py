#!/usr/bin/env python3
"""Génère tout le pixel-art du site (100 % original, aucun asset Mojang) :
textures 16×16, icônes, bloc cassable, logo, skin, paysages de secours,
favicons, curseurs et image de partage (og.png).

Usage : python3 tools/build_assets.py   (nécessite Pillow ; lancer
tools/build_font.py avant pour disposer de tools/_ratcraft.ttf)
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
TEX = IMG / "tex"
SCENES = IMG / "scenes"
for d in (IMG, TEX, SCENES):
    d.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(Path(__file__).parent))
import build_font  # noqa: E402  (glyphes réutilisés pour le logo)


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))),
            max(0, min(255, int(c[2] * f))), c[3] if len(c) > 3 else 255)


def noise_tex(seed, palette, size=16):
    rnd = random.Random(seed)
    cols = [hexc(c) for c, _ in palette]
    w = [wt for _, wt in palette]
    im = Image.new("RGBA", (size, size))
    for y in range(size):
        for x in range(size):
            im.putpixel((x, y), rnd.choices(cols, w)[0])
    return im


# ═══ Textures 16×16 ═══════════════════════════════════════════════════
def make_textures():
    t = {}
    t["dirt"] = noise_tex(1, [("866043", 40), ("79553a", 28), ("966c4a", 16),
                              ("5d412d", 11), ("b9855c", 5)])
    t["grass_top"] = noise_tex(2, [("5d9b3c", 36), ("6aa845", 26), ("4f8833", 20),
                                   ("7bb852", 10), ("44752b", 8)])
    side = t["dirt"].copy()
    rnd = random.Random(3)
    greens = [hexc("5d9b3c"), hexc("6aa845"), hexc("4f8833"), hexc("7bb852")]
    for x in range(16):
        depth = 3 + rnd.choice([0, 0, 1, 1, 2])
        for y in range(depth):
            side.putpixel((x, y), rnd.choice(greens))
        side.putpixel((x, depth), hexc("44752b"))
    t["grass_side"] = side
    t["stone"] = noise_tex(4, [("7f7f7f", 40), ("747474", 25), ("8b8b8b", 18),
                               ("686868", 11), ("9a9a9a", 6)])
    # Ardoise des abîmes : stries horizontales
    rnd = random.Random(5)
    ds = Image.new("RGBA", (16, 16))
    pal = [hexc("4d4d55"), hexc("3f3f47"), hexc("58585f"), hexc("34343a")]
    for y in range(16):
        c = rnd.choice(pal)
        for x in range(16):
            if rnd.random() < 0.45:
                c = rnd.choice(pal)
            ds.putpixel((x, y), c)
    t["deepslate"] = ds
    # Bedrock : taches contrastées
    rnd = random.Random(6)
    br = Image.new("RGBA", (16, 16))
    pal = [hexc("565656"), hexc("333333"), hexc("7a7a7a"), hexc("222222"), hexc("999999")]
    coarse = [[rnd.choice(pal) for _ in range(9)] for _ in range(9)]
    for y in range(16):
        for x in range(16):
            c = coarse[(y + rnd.randint(0, 1)) // 2][(x + rnd.randint(0, 1)) // 2]
            br.putpixel((x, y), c)
    t["bedrock"] = br
    # Planches
    rnd = random.Random(7)
    pl = Image.new("RGBA", (16, 16))
    base = [hexc("a2824e"), hexc("9a7a48"), hexc("ad8b55"), hexc("8f7041")]
    seams = [3, 11, 6, 13]
    for y in range(16):
        plank = y // 4
        for x in range(16):
            c = rnd.choice(base)
            if y % 4 == 3:
                c = hexc("6b512f")
            elif x == seams[plank]:
                c = hexc("75583a")
            pl.putpixel((x, y), c)
    t["planks"] = pl
    t["obsidian"] = noise_tex(8, [("14101e", 34), ("1d162b", 30), ("0e0b16", 22),
                                  ("3b295a", 9), ("5a3f8a", 5)])
    t["button_twitch"] = noise_tex(15, [("8a52f5", 40), ("8149ec", 25), ("9360fa", 20), ("7a42e2", 15)])
    t["button"] = noise_tex(9, [("707070", 40), ("6b6b6b", 25), ("767676", 20), ("666666", 15)])
    t["dirt_dark"] = Image.eval(t["dirt"], lambda v: v)  # copie
    px = t["dirt_dark"].load()
    for y in range(16):
        for x in range(16):
            r, g, b, a = px[x, y]
            px[x, y] = (r // 4, g // 4, b // 4, 255)
    # Netherrack / end stone pour les ambiances
    t["netherrack"] = noise_tex(10, [("6f3534", 40), ("5e2a29", 25), ("834443", 20), ("4a1f1e", 15)])
    t["endstone"] = noise_tex(11, [("dbdca0", 40), ("cfd093", 25), ("e7e8b1", 20), ("b9ba7f", 15)])
    # TNT
    tnt = Image.new("RGBA", (16, 16), hexc("db3b2b"))
    tp = tnt.load()
    for y in range(16):
        for x in range(16):
            if x % 4 == 0:
                tp[x, y] = hexc("a82a1d")
            elif x % 4 == 1:
                tp[x, y] = hexc("e8574a")
    for y in range(5, 11):
        for x in range(16):
            tp[x, y] = hexc("eeeeee") if y not in (5, 10) else hexc("c8c8c8")
    letters = ["###.#..#.###", ".#..##.#..#.", ".#..#.##..#.", ".#..#..#..#."]
    for j, row in enumerate(letters):
        for i, ch in enumerate(row):
            if ch == "#":
                tp[2 + i, 6 + j] = hexc("1e1e1e")
    t["tnt_side"] = tnt
    tt = Image.new("RGBA", (16, 16), hexc("c9372a"))
    ttp = tt.load()
    for y in range(16):
        for x in range(16):
            if (x // 4 + y // 4) % 2 == 0:
                ttp[x, y] = hexc("b53023")
    for y in range(6, 10):
        for x in range(6, 10):
            ttp[x, y] = hexc("3a3a3a")
    ttp[7, 7] = ttp[8, 8] = hexc("ffd84a")
    t["tnt_top"] = tt
    for k, im in t.items():
        im.save(TEX / f"{k}.png", optimize=True)
    return t


# ═══ Rendu isométrique ════════════════════════════════════════════════
def iso_block(top, left, right, size=32):
    """Cube isométrique : chaque face reçoit sa texture 16×16."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size
    h = s / 2           # largeur d'une face
    q = s / 4
    for py in range(s):
        for px in range(s):
            x, y = px + 0.5, py + 0.5
            # face du dessus : losange (h,0) (s,q) (h,2q) (0,q)
            u = (x / h + (y - q) / q) / 2       # le long de (0,q)->(h,0)
            v = (x / h - (y - q) / q) / 2       # le long de (0,q)->(h,2q)
            if 0 <= u < 1 and 0 <= v < 1 and y < q * 2 + 0.01 + (0 if x < h else 0):
                # u : axe vers le haut-droite ; v : vers le bas-droite
                tx, ty = int(v * 16), int((1 - u) * 16)
                tx, ty = min(tx, 15), min(ty, 15)
                im.putpixel((px, py), shade(top.getpixel((tx, ty)), 1.0))
                continue
            if x < h:
                yy = y - (q + x / 2)
                if 0 <= yy < h:
                    tx, ty = int(x / h * 16), int(yy / h * 16)
                    im.putpixel((px, py), shade(left.getpixel((min(tx, 15), min(ty, 15))), 0.82))
            else:
                yy = y - (2 * q - (x - h) / 2)
                if 0 <= yy < h:
                    tx, ty = int((x - h) / h * 16), int(yy / h * 16)
                    im.putpixel((px, py), shade(right.getpixel((min(tx, 15), min(ty, 15))), 0.62))
    return im


def crack_frames(seed=12):
    """10 stades de fissure (pixels assombris) sur 16×16."""
    rnd = random.Random(seed)
    order = []
    seen = set()
    walkers = [(8, 8)]
    while len(order) < 120:
        x, y = rnd.choice(walkers)
        dx, dy = rnd.choice([(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)])
        nx, ny = x + dx, y + dy
        if 0 <= nx < 16 and 0 <= ny < 16:
            walkers.append((nx, ny))
            if (nx, ny) not in seen:
                seen.add((nx, ny))
                order.append((nx, ny))
    frames = []
    for k in range(10):
        n = int(len(order) * (k + 1) / 10)
        frames.append(set(order[:n]))
    return frames


def cracked(tex, pxset):
    im = tex.copy()
    for (x, y) in pxset:
        r, g, b, a = im.getpixel((x, y))
        im.putpixel((x, y), (r // 3, g // 3, b // 3, a))
    return im


# ═══ Icônes 16×16 ═════════════════════════════════════════════════════
def grid(rows, pal):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != "." and ch != " ":
                im.putpixel((x, y), hexc(pal[ch]))
    return im


def make_icons(t):
    icons = []
    names = []

    def add(name, im):
        names.append(name)
        icons.append(im.resize((16, 16), Image.NEAREST) if im.size != (16, 16) else im)

    add("grass", iso_block(t["grass_top"], t["grass_side"], t["grass_side"], 16))

    add("eye", grid([
        "................",
        "................",
        ".....oooooo.....",
        "....oGGggGGo....",
        "...oGggLLggGo...",
        "..oGgLLkkLLgGo..",
        "..oGgLkkkkLggo..",
        "..oggLkkkkLggo..",
        "..oggLkkkkLggo..",
        "..oGgLkkkkLggo..",
        "..oGgLLkkLLgGo..",
        "...oGggLLggGo...",
        "....oGGggGGo....",
        ".....oooooo.....",
        "................",
        "................"], {"o": "0d3b2e", "G": "1f7a5f", "g": "2fa983", "L": "7be0c0", "k": "0a1612"}))

    add("book", grid([
        "................",
        "................",
        "...oooooooooo...",
        "..oSBBBBBBBBBo..",
        "..oSBBBBBBBBBPo.",
        "..oSBYYYYYYBBPo.",
        "..oSBBBBBBBBBPo.",
        "..oSBBBBBBBBBPo.",
        "..oSBBBBBBBBBPo.",
        "..oSBBBBBBBBBPo.",
        "..oSBBBBBBBBBPo.",
        "..oSDDDDDDDDDPo.",
        "..oSPPPPPPPPPPo.",
        "...oooooooooooo.",
        "................",
        "................"], {"o": "2b160b", "S": "5e3419", "B": "8a4f2a", "D": "6e3d20",
                              "Y": "e0b84a", "P": "eee6cf"}))

    add("pickaxe", grid([
        "................",
        "...ooooooo......",
        "..oLdddddDo.....",
        "...ooooooLdo....",
        "........oSLdo...",
        ".......oSo.oLdo.",
        "......oSo...oLo.",
        ".....oSo....oLo.",
        "....oSo.....oo..",
        "...oSo..........",
        "..oSo...........",
        ".oSo............",
        "oSo.............",
        ".o..............",
        "................",
        "................"], {"o": "0b2a28", "L": "a6f6ef", "d": "3dcfc4", "D": "1b8f87",
                              "S": "8a6236"}))

    add("clock", grid([
        "................",
        ".....oooooo.....",
        "....oYYYYYYo....",
        "...oYbbbbbbYo...",
        "..oYbbbybbbbYo..",
        "..oYbbyyybbbYo..",
        "..oYbbbybbbbYo..",
        "..oYYYYYYYYYYo..",
        "..oYddddddddYo..",
        "..oYddwddddwYo..",
        "..oYdddddwddYo..",
        "...oYddddddYo...",
        "....oYYYYYYo....",
        ".....oooooo.....",
        "................",
        "................"], {"o": "4a3200", "Y": "f2c53d", "b": "4f8fe0", "y": "ffe36b",
                              "d": "232a52", "w": "ffffff"}))

    add("chest", grid([
        "................",
        "................",
        "..oooooooooooo..",
        "..oLLLLLLLLLLo..",
        "..oWWWWWWWWWWo..",
        "..oWWWWWWWWWWo..",
        "..oDDDDggDDDDo..",
        "..oooooGGooooo..",
        "..oWWWWggWWWWo..",
        "..oWWWWWWWWWWo..",
        "..oWWWWWWWWWWo..",
        "..oWWWWWWWWWWo..",
        "..oDDDDDDDDDDo..",
        "..oooooooooooo..",
        "................",
        "................"], {"o": "2a1606", "L": "c08a4a", "W": "a06a32", "D": "6f4520",
                              "g": "d8d8d8", "G": "8a8a8a"}))

    add("map", grid([
        "................",
        ".oooooooooooooo.",
        ".oPPPPPPPPPPPPo.",
        ".oPwwwwPPggPPPo.",
        ".oPwwwggggggPPo.",
        ".oPwwgggGGggwPo.",
        ".oPPggGGGGgwwPo.",
        ".oPPgggGGggwwPo.",
        ".oPwwggggrgwwPo.",
        ".oPwwwggrrrwwPo.",
        ".oPwwwwggrwwwPo.",
        ".oPPwwwwwwwwPPo.",
        ".oPPPPPPPPPPPPo.",
        ".oooooooooooooo.",
        "................",
        "................"], {"o": "5a4a2a", "P": "e9ddb4", "w": "6b9bd6", "g": "7bb852",
                              "G": "4f8833", "r": "d33a2c"}))

    add("chestplate", grid([
        "................",
        "...ooo....ooo...",
        "..oLLLo..oLLLo..",
        "..oLSSSooSSSDo..",
        "..oLSSSSSSSSDo..",
        "..oooSSSSSSooo..",
        "....oLSSSSDo....",
        "....oLSSSSDo....",
        "....oLSSSSDo....",
        "....oLSSSSDo....",
        "....oLDDDDDo....",
        "....oooooooo....",
        "................",
        "................",
        "................",
        "................"], {"o": "2a2a2a", "L": "f2f2f2", "S": "c6c6c6", "D": "8a8a8a"}))

    add("emerald", grid([
        "................",
        "......oooo......",
        ".....oLLggo.....",
        "....oLLgggGo....",
        "...oLLggggGGo...",
        "...oLgggggGGo...",
        "...oLgggggGGo...",
        "...oLgggggGGo...",
        "...oLgggggGGo...",
        "...oggggggGGo...",
        "....oggggGGo....",
        ".....oggGGo.....",
        "......oooo......",
        "................",
        "................",
        "................"], {"o": "063d1d", "L": "9bf5b8", "g": "17c35a", "G": "0b8a3d"}))

    add("diamond", grid([
        "................",
        "................",
        "....oooooooo....",
        "...oLLLddddDo...",
        "..oLLddddddDDo..",
        ".oLLddddddddDDo.",
        ".oddddddddddDDo.",
        "..odddddddddDo..",
        "...oddddddddo...",
        "....oddddddo....",
        ".....oddddo.....",
        "......oddo......",
        ".......oo.......",
        "................",
        "................",
        "................"], {"o": "0b3533", "L": "d5fffb", "d": "4ae3d7", "D": "1b9e96"}))

    add("redstone", grid([
        "................",
        "................",
        "................",
        "......r.........",
        "....rRr..r......",
        "...rRRRrrRr.....",
        "....rRRRRRRr....",
        "..r.rRRLRRRRr...",
        ".rRrRRRRRRRRr...",
        "..rRRRRRLRRRrr..",
        "...rRRRRRRRRRr..",
        "....rrRRRRRrr...",
        "......rrr.rr....",
        "................",
        "................",
        "................"], {"r": "6e0b0b", "R": "d81c1c", "L": "ff6b6b"}))

    add("gold", grid([
        "................",
        "................",
        "................",
        "................",
        "......oooooooo..",
        ".....oLLLLLLLo..",
        "....oLLLLLLLoDo.",
        "...ooooooooo.Do.",
        "...oYYYYYYYYoDo.",
        "...oYYYYYYYYoDo.",
        "...oYYYYYYYYooo.",
        "...oooooooooo...",
        "................",
        "................",
        "................",
        "................"], {"o": "5a3c00", "L": "fff3a0", "Y": "f2c22e", "D": "b8860b"}))

    add("tnt", iso_block(t["tnt_top"], t["tnt_side"], t["tnt_side"], 16))

    add("compass", grid([
        "................",
        ".....oooooo.....",
        "....oSSSSSSo....",
        "...oSddddddSo...",
        "..oSddddddrdSo..",
        "..oSdddddrrdSo..",
        "..oSddddrrddSo..",
        "..oSdddwwdddSo..",
        "..oSddwwddddSo..",
        "..oSdwwdddddSo..",
        "..oSddddddddSo..",
        "...oSddddddSo...",
        "....oSSSSSSo....",
        ".....oooooo.....",
        "................",
        "................"], {"o": "222222", "S": "9a9a9a", "d": "3a3a46", "r": "e23b2e", "w": "e8e8e8"}))

    add("feather", grid([
        "................",
        "............ww..",
        "...........wWWw.",
        "..........wWWgw.",
        ".........wWWgWw.",
        "........wWWgWw..",
        ".......wWWgWw...",
        "......wWWgWw....",
        ".....wWWgWw.....",
        "....wWWgWw......",
        "....wWgWw.......",
        "....wgWw........",
        "...ggww.........",
        "..gg............",
        ".gg.............",
        "................"], {"w": "8a8a8a", "W": "f4f4f4", "g": "5a5a5a"}))

    add("disc", grid([
        "................",
        ".....oooooo.....",
        "....okkkkkko....",
        "...okkhkkkkko...",
        "..okkhkkkkkkko..",
        "..okhkkPPkkkko..",
        "..okkkPpPPkkko..",
        "..okkkPPPPkkko..",
        "..okkkkPPkkkko..",
        "..okkkkkkkkhko..",
        "..okkkkkkkhkko..",
        "...okkkkkkkko...",
        "....okkkkkko....",
        ".....oooooo.....",
        "................",
        "................"], {"o": "000000", "k": "2a2a2a", "h": "5a5a5a", "P": "9147ff", "p": "e8dcff"}))

    add("obsidian", iso_block(t["obsidian"], t["obsidian"], t["obsidian"], 16))

    add("painting", grid([
        "................",
        ".oooooooooooooo.",
        ".oFFFFFFFFFFFFo.",
        ".oFbbbbbbbbbbFo.",
        ".oFbbbbbbyybbFo.",
        ".oFbbbbbbyybbFo.",
        ".oFbbwwbbbbbbFo.",
        ".oFbbbbbbbbbbFo.",
        ".oFbbbbbgbbbbFo.",
        ".oFbbggggggbbFo.",
        ".oFggGGggGGggFo.",
        ".oFGGGGGGGGGGFo.",
        ".oFFFFFFFFFFFFo.",
        ".oooooooooooooo.",
        "................",
        "................"], {"o": "3b2410", "F": "a2824e", "b": "8fc1f0", "y": "ffe36b",
                              "w": "ffffff", "g": "7bb852", "G": "4f8833"}))

    add("bedrock", iso_block(t["bedrock"], t["bedrock"], t["bedrock"], 16))

    add("sound_on", grid([
        "................",
        "................",
        "......oo........",
        ".....owo....w...",
        "....owwo..w..w..",
        ".oooowwo...w.w..",
        ".owwwwwo.w.w..w.",
        ".owwwwwo.w.w..w.",
        ".owwwwwo.w.w..w.",
        ".owwwwwo.w.w..w.",
        ".oooowwo...w.w..",
        "....owwo..w..w..",
        ".....owo....w...",
        "......oo........",
        "................",
        "................"], {"o": "3a3a3a", "w": "ffffff"}))

    add("sound_off", grid([
        "................",
        "................",
        "......oo........",
        ".....owo........",
        "....owwo........",
        ".oooowwo........",
        ".owwwwwo.r...r..",
        ".owwwwwo..r.r...",
        ".owwwwwo...r....",
        ".owwwwwo..r.r...",
        ".oooowwo.r...r..",
        "....owwo........",
        ".....owo........",
        "......oo........",
        "................",
        "................"], {"o": "3a3a3a", "w": "ffffff", "r": "ff5555"}))

    add("gear", grid([
        "................",
        "......oooo......",
        "...oo.oLLo.oo...",
        "..oLLooLLooLLo..",
        "..oLSSSSSSSSDo..",
        "...oSSSSSSSDo...",
        ".ooSSSooooSSDoo.",
        ".oLSSSo..oSSSDo.",
        ".oLSSSo..oSSSDo.",
        ".ooSSSooooSSDoo.",
        "...oSSSSSSSDo...",
        "..oLSSSSSSSSDo..",
        "..oDDooDDooDDo..",
        "...oo.oDDo.oo...",
        "......oooo......",
        "................"], {"o": "222222", "L": "e0e0e0", "S": "a8a8a8", "D": "6a6a6a"}))

    add("planks", iso_block(t["planks"], t["planks"], t["planks"], 16))

    add("sword", grid([
        "................",
        "............ooo.",
        "...........oLLo.",
        "..........oLSDo.",
        ".........oLSDo..",
        "........oLSDo...",
        ".......oLSDo....",
        "..oo..oLSDo.....",
        "..oWooLSDo......",
        "...oWLSDo.......",
        "....oWDo........",
        "...oHoWWo.......",
        "..oHo.oooo......",
        ".oHo............",
        ".oo.............",
        "................"], {"o": "1e1e1e", "L": "ffffff", "S": "d4d4d4", "D": "8a8a8a",
                              "W": "6b4a24", "H": "8a6236"}))

    add("heart", grid([
        "................",
        "................",
        "................",
        "..ooo....ooo....",
        ".oRRRo..oRRRo...",
        "oRwwRRooRRRRRo..",
        "oRwRRRRRRRRRRo..",
        "oRRRRRRRRRRRRo..",
        ".oRRRRRRRRRRo...",
        "..oRRRRRRRRo....",
        "...oRRRRRRo.....",
        "....oRRRRo......",
        ".....oRRo.......",
        "......oo........",
        "................",
        "................"], {"o": "2a0000", "R": "e22b2b", "w": "ffb3b3"}))

    add("star", grid([
        "................",
        ".......oo.......",
        ".......oYo......",
        "......oYYo......",
        "......oYYYo.....",
        "ooooooYYYYoooooo",
        "oYYYYYYWWYYYYYo.",
        ".oYYYYWWWYYYYo..",
        "..oYYYYWYYYYo...",
        "...oYYYYYYYo....",
        "...oYYYooYYYo...",
        "..oYYYo..oYYYo..",
        "..oYYo....oYYo..",
        ".oYo.......oYo..",
        ".oo.........oo..",
        "................"], {"o": "5a3c00", "Y": "ffd84a", "W": "fffbe0"}))

    add("command", iso_block(noise_tex(13, [("c58a5a", 40), ("b57a4a", 30), ("d39a6a", 30)]),
                             grid(["oooooooooooooooo", "oDDDDDDDDDDDDDDo", "oDggggggggggggDo",
                                   "oDgkkkkkkkkkkgDo", "oDgkwkkkkkkkkgDo", "oDgkkwkkkkkkkgDo",
                                   "oDgkwkkwwwkkkgDo", "oDgkkkkkkkkkkgDo", "oDgkkkkkkkkkkgDo",
                                   "oDgkkkkkkkkkkgDo", "oDggggggggggggDo", "oDDDDDDDDDDDDDDo",
                                   "oDDDDDDDDDDDDDDo", "oDDDDDDDDDDDDDDo", "oDDDDDDDDDDDDDDo",
                                   "oooooooooooooooo"],
                                  {"o": "6a3d1c", "D": "c58a5a", "g": "8a8a8a", "k": "1e1e1e", "w": "e8e8e8"}),
                             noise_tex(14, [("b57a4a", 50), ("a56a3a", 50)]), 16))

    add("twitch", grid([
        "................",
        "..PPPPPPPPPPPPP.",
        ".PPWWWWWWWWWWWP.",
        ".PWWWWWWWWWWWWP.",
        ".PWWWPPWWPPWWWP.",
        ".PWWWPPWWPPWWWP.",
        ".PWWWPPWWPPWWWP.",
        ".PWWWWWWWWWWWWP.",
        ".PWWWWWWWWWWWPP.",
        ".PWWWWWWWWWWPP..",
        ".PWWWWWWWWWPP...",
        ".PPPPWWPPPPP....",
        "....PWPP........",
        "....PPP.........",
        "................",
        "................"], {"P": "9147ff", "W": "ffffff"}))

    add("discord", grid([
        "................",
        "................",
        "...BB......BB...",
        "..BBBBBBBBBBBB..",
        ".BBBBBBBBBBBBBB.",
        ".BBBBBBBBBBBBBB.",
        ".BBBWWWBBWWWBBB.",
        "BBBBWWWBBWWWBBBB",
        "BBBBWWWBBWWWBBBB",
        "BBBBBBBBBBBBBBBB",
        "BBBBBBBBBBBBBBBB",
        ".BBBBWBBBBWBBBB.",
        "..BBBBWWWWBBBB..",
        "...BB......BB...",
        "................",
        "................"], {"B": "5865f2", "W": "ffffff"}))

    add("youtube", grid([
        "................",
        "................",
        "................",
        ".RRRRRRRRRRRRRR.",
        "RRRRRRRRRRRRRRRR",
        "RRRRRRWRRRRRRRRR",
        "RRRRRRWWRRRRRRRR",
        "RRRRRRWWWRRRRRRR",
        "RRRRRRWWWWRRRRRR",
        "RRRRRRWWWRRRRRRR",
        "RRRRRRWWRRRRRRRR",
        "RRRRRRWRRRRRRRRR",
        "RRRRRRRRRRRRRRRR",
        ".RRRRRRRRRRRRRR.",
        "................",
        "................"], {"R": "ff0033", "W": "ffffff"}))

    sheet = Image.new("RGBA", (16 * len(icons), 16), (0, 0, 0, 0))
    for i, im in enumerate(icons):
        sheet.paste(im, (16 * i, 0), im)
    sheet.save(IMG / "icons.png", optimize=True)
    (IMG / "icons.txt").write_text("\n".join(f"{i} {n}" for i, n in enumerate(names)) + "\n")
    return names, sheet


# ═══ Bloc cassable (11 images 32×32) ══════════════════════════════════
def make_block(t):
    frames = crack_frames()
    strip = Image.new("RGBA", (32 * 11, 32), (0, 0, 0, 0))
    for k in range(11):
        if k == 0:
            top, side = t["grass_top"], t["grass_side"]
        else:
            top, side = cracked(t["grass_top"], frames[k - 1]), cracked(t["grass_side"], frames[k - 1])
        strip.paste(iso_block(top, side, side, 32), (32 * k, 0))
    strip.save(IMG / "block.png", optimize=True)
    iso_block(t["tnt_top"], t["tnt_side"], t["tnt_side"], 32).save(IMG / "tnt.png", optimize=True)


# ═══ Logo « RATNCO » en blocs de pierre ══════════════════════════════
def make_logo(word="RATNCO", B=6, depth=8):
    glyphs = [build_font.G[c] for c in word]
    # version « grasse » : chaque pixel est doublé vers la droite
    cols = sum(gl["w"] + 1 for gl in glyphs) + len(glyphs) - 1
    mask = [[False] * cols for _ in range(7)]
    x0 = 0
    for gl in glyphs:
        for r, row in enumerate(gl["rows"]):
            for c, v in enumerate(row):
                if v == "#":
                    mask[r][x0 + c] = True
                    mask[r][x0 + c + 1] = True
        x0 += gl["w"] + 2
    W, H = cols * B + 2, 7 * B + depth + 2
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    rnd = random.Random(21)
    stone = [hexc("9c9c9c"), hexc("8f8f8f"), hexc("a8a8a8"), hexc("858585"), hexc("b0b0b0")]

    def filled(x, y):
        bx, by = (x - 1) // B, (y - 1) // B
        return 0 <= by < 7 and 0 <= bx < cols and x >= 1 and y >= 1 and mask[by][bx]

    # Extrusion vers le bas
    for d in range(depth, 0, -1):
        f = 0.30 + 0.22 * (1 - d / depth)
        for y in range(H):
            for x in range(W):
                if filled(x, y - d):
                    px[x, y] = shade(hexc("8a8a8a"), f)
    # Face avant texturée, biseau par bloc
    for y in range(H):
        for x in range(W):
            if filled(x, y):
                lx, ly = (x - 1) % B, (y - 1) % B
                bx, by = (x - 1) // B, (y - 1) // B
                c = rnd.choice(stone)
                top_open = by == 0 or not mask[by - 1][bx]
                left_open = bx == 0 or not mask[by][bx - 1]
                bot_open = by == 6 or not mask[by + 1][bx]
                right_open = bx == cols - 1 or not mask[by][bx + 1]
                if (ly == 0 and top_open) or (lx == 0 and left_open):
                    c = hexc("dcdcdc")
                elif (ly == B - 1 and bot_open) or (lx == B - 1 and right_open):
                    c = hexc("666666")
                elif ly == 0 or lx == 0:
                    c = shade(c, 1.08)
                elif ly == B - 1 or lx == B - 1:
                    c = shade(c, 0.86)
                px[x, y] = c
    # Contour noir
    out = im.copy()
    op = out.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny][3]:
                        op[x, y] = (12, 12, 12, 255)
                        break
    out.save(IMG / "logo.png", optimize=True)
    return out


# ═══ Skin original 64×64 (streamer au casque) ═════════════════════════
def make_skin():
    sk = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    p = sk.load()
    rnd = random.Random(31)

    def rect(x, y, w, h, cols, weights=None):
        cols = [hexc(c) if isinstance(c, str) else c for c in cols]
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                p[xx, yy] = rnd.choices(cols, weights)[0] if weights else cols[0]

    HAIR = ["3b2417", "4a2d1c", "33200f"]
    SKIN = ["e0a676"]
    SKIN_D = ["c98d5f"]
    HOOD = ["5b2fa0", "5f33a6", "552b98"]
    HOOD_D = ["432277"]
    HOOD_L = ["7448c0"]
    PANTS = ["2b2f3a", "2f3340", "272a34"]
    SHOE = ["1a1a1a"]

    # Tête : dessus / dessous / côtés / face / arrière
    rect(8, 0, 8, 8, HAIR, [5, 3, 2])
    rect(16, 0, 8, 8, SKIN_D)
    for face_x in (0, 16, 24):
        rect(face_x, 8, 8, 8, SKIN)
        rect(face_x, 8, 8, 3, HAIR, [5, 3, 2])
    rect(24, 8, 8, 6, HAIR, [5, 3, 2])           # arrière : cheveux
    rect(0, 11, 2, 1, HAIR); rect(22, 11, 2, 1, HAIR)
    # Face
    rect(8, 8, 8, 8, SKIN)
    rect(8, 8, 8, 2, HAIR, [5, 3, 2])
    for x in (8, 9, 14, 15):
        p[x, 10] = hexc("3b2417")
    p[8, 11] = hexc("3b2417"); p[15, 11] = hexc("3b2417")
    # yeux
    p[9, 12] = hexc("ffffff"); p[10, 12] = hexc("6a3fb5")
    p[13, 12] = hexc("6a3fb5"); p[14, 12] = hexc("ffffff")
    p[11, 13] = p[12, 13] = hexc("c98d5f")
    # bouche
    p[10, 14] = hexc("9a5a3a"); p[11, 14] = hexc("9a5a3a"); p[12, 14] = hexc("9a5a3a"); p[13, 14] = hexc("9a5a3a")
    p[11, 15] = p[12, 15] = hexc("c98d5f")

    # Casque (calque « chapeau ») : arceau + écouteurs + micro
    rect(32 + 8, 3, 8, 2, ["1a1a1a"])                   # dessus : arceau (oreille à oreille)
    for side_x in (32 + 0, 32 + 16):                      # côtés : arceau + écouteur
        rect(side_x + 3, 8, 2, 3, ["1a1a1a"])
        rect(side_x + 2, 11, 4, 4, ["222222"])
        rect(side_x + 3, 12, 2, 2, ["b06fff"])
    # micro (face, côté droit du perso = gauche de l'image)
    p[32 + 8 + 0, 8 + 4] = hexc("222222")
    p[32 + 8 + 0, 8 + 5] = hexc("222222")
    p[32 + 8 + 1, 8 + 6] = hexc("222222")
    p[32 + 8 + 2, 8 + 6] = hexc("b06fff")

    # Corps (sweat à capuche)
    rect(20, 16, 8, 4, HOOD); rect(28, 16, 8, 4, HOOD_D)
    rect(16, 20, 4, 12, HOOD, [4, 3, 3]); rect(28, 20, 4, 12, HOOD, [4, 3, 3])
    rect(32, 20, 8, 12, HOOD, [4, 3, 3])
    rect(32, 20, 8, 3, HOOD_L)                             # capuche dans le dos
    rect(20, 20, 8, 12, HOOD, [4, 3, 3])
    rect(20, 20, 8, 1, HOOD_D)
    p[22, 21] = p[22, 22] = p[22, 23] = hexc("e8e8e8")     # cordons
    p[25, 21] = p[25, 22] = p[25, 23] = hexc("e8e8e8")
    # logo « R » sur la poitrine
    for (x, y) in [(23, 23), (23, 24), (23, 25), (24, 23), (24, 24), (25, 24), (23, 26), (25, 25)]:
        p[x, y] = hexc("fcdc5f")
    rect(21, 28, 6, 3, HOOD_D)                             # poche
    rect(20, 31, 8, 1, HOOD_D)

    def arm(bx, by):
        rect(bx + 4, by, 4, 4, HOOD)          # dessus
        rect(bx + 8, by, 4, 4, SKIN)          # dessous (main)
        for fx in (0, 4, 8, 12):
            rect(bx + fx, by + 4, 4, 10, HOOD, [4, 3, 3])
            rect(bx + fx, by + 13, 4, 1, HOOD_D)
            rect(bx + fx, by + 14, 4, 2, SKIN)

    arm(40, 16)
    arm(32, 48)

    def leg(bx, by):
        rect(bx + 4, by, 4, 4, PANTS)
        rect(bx + 8, by, 4, 4, SHOE)
        for fx in (0, 4, 8, 12):
            rect(bx + fx, by + 4, 4, 9, PANTS, [5, 3, 2])
            rect(bx + fx, by + 13, 4, 2, SHOE)
            rect(bx + fx, by + 15, 4, 1, ["d0d0d0"])

    leg(0, 16)
    leg(16, 48)
    sk.save(IMG / "skin.png", optimize=True)
    return sk


# ═══ Paysages pixel-art (fonds de secours, 320×180) ═══════════════════
SCENE_DEFS = {
    "jour":    dict(sky=("6fa8ff", "bcd9ff"), sun="fff27a", clouds=True, stars=False,
                    top="5d9b3c", fill=("866043", "79553a"), far=("7aa5c8", "6a95b8"), trees=True),
    "coucher": dict(sky=("3a2a6b", "ff9a5a"), sun="ffcf6b", sun_low=True, clouds=True, cloud_col="ffc9a8",
                    stars=False, top="4a7a33", fill=("6b4c35", "5e432f"), far=("6d4a7a", "5a3d68"), trees=True),
    "nuit":    dict(sky=("05070f", "1b2350"), moon="e8ecf5", clouds=False, stars=True,
                    top="2f5524", fill=("4a3626", "3f2e20"), far=("1c2440", "161d36"), trees=True),
    "pluie":   dict(sky=("3b4250", "6b7484"), clouds=True, cloud_col="8a919c", stars=False,
                    top="4a7a3a", fill=("6b4c35", "5e432f"), far=("4c5566", "434b5b"), trees=True),
    "neige":   dict(sky=("8fa9c9", "d9e4f2"), clouds=True, stars=False, snow=True,
                    top="f4f8ff", fill=("866043", "79553a"), far=("aebfd6", "9fb2cc"), trees=True),
    "nether":  dict(sky=("1a0303", "5a1410"), stars=False, clouds=False, lava=True,
                    top="6f3534", fill=("5e2a29", "4a1f1e"), far=("3a0d0b", "2e0a08"), trees=False),
    "end":     dict(sky=("07030d", "1a0f2a"), stars=True, star_col="c9a8ff", clouds=False,
                    top="dbdca0", fill=("cfd093", "b9ba7f"), far=("2a1a40", "22143a"), trees=False, islands=True),
    "eau":     dict(sky=("0b2a4a", "1f6a8a"), stars=False, clouds=False, water=True,
                    top="c9b98a", fill=("b0a174", "9e9068"), far=("164a66", "123f58"), trees=False, kelp=True),
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def make_scene(name, d, W=320, H=180, seed=40):
    rnd = random.Random(seed)
    im = Image.new("RGBA", (W, H))
    p = im.load()
    top, bot = hexc(d["sky"][0]), hexc(d["sky"][1])
    bands = 14
    for y in range(H):
        t = min(1, (y / (H * 0.75)))
        t = round(t * bands) / bands
        c = lerp(top, bot, t)
        for x in range(W):
            p[x, y] = c
    dr = ImageDraw.Draw(im)
    if d.get("stars"):
        sc = hexc(d.get("star_col", "ffffff"))
        for _ in range(140):
            x, y = rnd.randrange(W), rnd.randrange(int(H * 0.6))
            p[x, y] = sc if rnd.random() < 0.6 else shade(sc, 0.6)
    if d.get("sun"):
        cy = 92 if d.get("sun_low") else 26
        dr.rectangle([236, cy, 255, cy + 19], fill=hexc(d["sun"]))
        dr.rectangle([240, cy + 4, 251, cy + 15], fill=shade(hexc(d["sun"]), 1.08))
    if d.get("moon"):
        dr.rectangle([240, 22, 255, 37], fill=hexc(d["moon"]))
        for (x, y) in [(244, 26), (249, 31), (245, 33), (251, 25)]:
            dr.rectangle([x, y, x + 1, y + 1], fill=hexc("b9c0d0"))
    if d.get("clouds"):
        cc = hexc(d.get("cloud_col", "ffffff"))
        for _ in range(7):
            x, y = rnd.randrange(-20, W), rnd.randrange(8, 60)
            w = rnd.randrange(24, 60)
            dr.rectangle([x, y, x + w, y + 5], fill=cc)
            dr.rectangle([x + 6, y - 3, x + w - 8, y], fill=cc)
    if d.get("islands"):
        for (x, y, w) in [(40, 60, 50), (190, 45, 36), (250, 85, 44)]:
            for k in range(8):
                dr.rectangle([x + k * 2, y + k * 2, x + w - k * 3, y + k * 2 + 1], fill=hexc("cfd093") if k < 2 else hexc("b9ba7f"))
    # Collines lointaines
    far1, far2 = hexc(d["far"][0]), hexc(d["far"][1])
    h = 105
    for x in range(0, W, 4):
        h += rnd.choice([-4, 0, 0, 4])
        h = max(80, min(125, h))
        dr.rectangle([x, h, x + 3, H], fill=far1)
    h = 120
    for x in range(0, W, 4):
        h += rnd.choice([-4, 0, 0, 4])
        h = max(105, min(135, h))
        dr.rectangle([x, h, x + 3, H], fill=far2)
    # Terrain proche en blocs de 8 px
    ground = []
    h = 144
    for x in range(0, W, 8):
        h += rnd.choice([-8, 0, 0, 0, 8])
        h = max(128, min(160, h))
        ground.append((x, h))
    topc = hexc(d["top"])
    for (x, gy) in ground:
        for y in range(gy, H):
            c = hexc(d["fill"][0]) if rnd.random() < 0.6 else hexc(d["fill"][1])
            dr.rectangle([x, y, x + 7, y], fill=c)
        dr.rectangle([x, gy, x + 7, gy + 2], fill=topc)
        for k in range(8):
            if rnd.random() < 0.35:
                p[x + k, gy + 3] = shade(topc, 0.85)
    if d.get("trees"):
        for (x, gy) in rnd.sample(ground[2:-2], 5):
            trunk = hexc("6b4a24")
            leaf = hexc("3e7a2a") if not d.get("snow") else hexc("e9f1ff")
            if name == "nuit":
                leaf = hexc("1f4a1a")
            dr.rectangle([x + 3, gy - 18, x + 4, gy - 1], fill=trunk)
            dr.rectangle([x - 4, gy - 28, x + 11, gy - 16], fill=leaf)
            dr.rectangle([x, gy - 33, x + 7, gy - 28], fill=leaf)
    if d.get("lava"):
        for (x, gy) in rnd.sample(ground[1:-1], 4):
            dr.rectangle([x, gy, x + 15, gy + 3], fill=hexc("ff7a12"))
            dr.rectangle([x + 2, gy + 1, x + 9, gy + 1], fill=hexc("ffc23a"))
    if d.get("kelp"):
        for _ in range(10):
            x = rnd.randrange(0, W, 4)
            hh = rnd.randrange(20, 60)
            gy = next(g for gx, g in ground if gx <= x < gx + 8)
            for k in range(0, hh, 2):
                dr.rectangle([x + (k // 6) % 2, gy - k, x + 1 + (k // 6) % 2, gy - k + 1], fill=hexc("3f8a3a"))
    im.convert("RGB").save(SCENES / f"{name}.png", optimize=True)
    return im


# ═══ Curseurs ═════════════════════════════════════════════════════════
def make_cursors():
    arrow = [
        "o...........",
        "oo..........",
        "owo.........",
        "owwo........",
        "owwwo.......",
        "owwwwo......",
        "owwwwwo.....",
        "owwwwwwo....",
        "owwwwwwwo...",
        "owwwwwoooo..",
        "owwowwo.....",
        "owo.owwo....",
        "oo..owwo....",
        "o....owwo...",
        ".....owwo...",
        "......oo....",
    ]
    hand = [
        "....oo..........",
        "...owwo.........",
        "...owwo.........",
        "...owwo.........",
        "...owwooo.......",
        "...owwowwoo.....",
        "...owwowwowoo...",
        "oo.owwowwowwwo..",
        "owoowwwwwwwwwo..",
        "owwowwwwwwwwwo..",
        ".owwwwwwwwwwwo..",
        "..owwwwwwwwwwo..",
        "..owwwwwwwwwo...",
        "...owwwwwwwo....",
        "....owwwwwwo....",
        "....oooooooo....",
    ]
    for name, rows in (("cursor", arrow), ("cursor-pointer", hand)):
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch == "o":
                    im.putpixel((x, y), (20, 20, 20, 255))
                elif ch == "w":
                    im.putpixel((x, y), (255, 255, 255, 255))
        im.resize((32, 32), Image.NEAREST).save(IMG / f"{name}.png", optimize=True)


# ═══ Favicons + image de partage ═════════════════════════════════════
def make_favicons(t, skin):
    head = skin.crop((8, 8, 16, 16))
    hat = skin.crop((40, 8, 48, 16))
    face = Image.new("RGBA", (8, 8))
    face.paste(head, (0, 0))
    face.alpha_composite(hat)
    face.resize((120, 120), Image.NEAREST).save(IMG / "avatar.png", optimize=True)
    block = iso_block(t["grass_top"], t["grass_side"], t["grass_side"], 32)
    for size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"),
                       (192, "icon-192.png"), (512, "icon-512.png")):
        bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        if size >= 180:
            bg = Image.new("RGBA", (size, size), hexc("1a1028"))
            pad = size // 8
            b = block.resize((size - 2 * pad, size - 2 * pad), Image.NEAREST)
            bg.alpha_composite(b, (pad, pad))
        else:
            bg.alpha_composite(block.resize((size, size), Image.NEAREST))
        bg.save(IMG / name, optimize=True)
    block.resize((32, 32), Image.NEAREST).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32)])


def make_og(logo):
    W, H = 1200, 630
    scene = Image.open(SCENES / "nuit.png").convert("RGBA")
    bg = scene.resize((W, int(W * 180 / 320)), Image.NEAREST).crop((0, 30, W, 30 + H))
    shade_layer = Image.new("RGBA", (W, H), (8, 4, 20, 110))
    bg.alpha_composite(shade_layer)
    lg = logo.resize((logo.width * 4, logo.height * 4), Image.NEAREST)
    bg.alpha_composite(lg, ((W - lg.width) // 2, 150))
    font = ImageFont.truetype(str(ROOT / "tools" / "_ratcraft.ttf"), 48)
    fontb = ImageFont.truetype(str(ROOT / "tools" / "_ratcraft-bold.ttf"), 40)
    dr = ImageDraw.Draw(bg)

    def text_c(y, s, f, col, sh):
        w = dr.textlength(s, font=f)
        x = (W - w) // 2
        dr.text((x + 6, y + 6), s, font=f, fill=sh)
        dr.text((x, y), s, font=f, fill=col)

    text_c(400, "Streamer Minecraft · Twitch FR", font, (255, 255, 255), (63, 63, 63))
    text_c(470, "twitch.tv/ratnco", font, (196, 167, 255), (49, 41, 63))
    # splash jaune incliné
    splash = Image.new("RGBA", (520, 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(splash)
    sd.text((10 + 5, 10 + 5), "Rejoins l'aventure !", font=fontb, fill=(63, 63, 0))
    sd.text((10, 10), "Rejoins l'aventure !", font=fontb, fill=(255, 255, 0))
    splash = splash.rotate(18, resample=Image.NEAREST, expand=True)
    bg.alpha_composite(splash, (760, 250))
    bg.convert("RGB").save(IMG / "og.png", optimize=True)


if __name__ == "__main__":
    tex = make_textures()
    names, _ = make_icons(tex)
    make_block(tex)
    logo = make_logo()
    skin = make_skin()
    for n, dd in SCENE_DEFS.items():
        make_scene(n, dd)
    make_cursors()
    make_favicons(tex, skin)
    make_og(logo)
    print("icônes :", ", ".join(names))
    for f in sorted(IMG.rglob("*.png")):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size} o")
