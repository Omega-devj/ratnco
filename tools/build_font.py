#!/usr/bin/env python3
"""Génère la police pixel « Ratcraft » (regular + bold) au format WOFF2.

Police 100 % originale dessinée pixel par pixel dans l'esprit des polices
bitmap 5×7 des jeux de blocs. Chaque glyphe est une grille : '#' = pixel
plein. La ligne 0 est le haut des capitales, la ligne 6 repose sur la ligne
de base, la ligne 7 est le jambage descendant. Les lignes -2/-1 servent aux
accents des capitales.

Usage : python3 tools/build_font.py   (nécessite fonttools + brotli)
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

P = 128            # unités par pixel
UPM = 8 * P        # 1 em = 8 pixels  → net à 8 / 16 / 24 / 32 px
ASC = 9 * P
DESC = 2 * P
OUT = Path(__file__).resolve().parent.parent / "assets" / "fonts"


def g(text, top=0):
    rows = [r for r in text.strip("\n").split("\n")]
    rows = [r.strip() for r in rows]
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, ".") for r in rows]
    return {"rows": rows, "top": top, "w": w}


G = {}

# ── Capitales ──────────────────────────────────────────────────────────
CAPS = {
"A": """
.###.
#...#
#...#
#####
#...#
#...#
#...#""",
"B": """
####.
#...#
####.
#...#
#...#
#...#
####.""",
"C": """
.###.
#...#
#....
#....
#....
#...#
.###.""",
"D": """
####.
#...#
#...#
#...#
#...#
#...#
####.""",
"E": """
#####
#....
###..
#....
#....
#....
#####""",
"F": """
#####
#....
###..
#....
#....
#....
#....""",
"G": """
.####
#....
#..##
#...#
#...#
#...#
.###.""",
"H": """
#...#
#...#
#####
#...#
#...#
#...#
#...#""",
"I": """
###
.#.
.#.
.#.
.#.
.#.
###""",
"J": """
....#
....#
....#
....#
....#
#...#
.###.""",
"K": """
#...#
#..#.
###..
#..#.
#...#
#...#
#...#""",
"L": """
#....
#....
#....
#....
#....
#....
#####""",
"M": """
#...#
##.##
#.#.#
#...#
#...#
#...#
#...#""",
"N": """
#...#
##..#
#.#.#
#..##
#...#
#...#
#...#""",
"O": """
.###.
#...#
#...#
#...#
#...#
#...#
.###.""",
"P": """
####.
#...#
####.
#....
#....
#....
#....""",
"Q": """
.###.
#...#
#...#
#...#
#...#
#..#.
.##.#""",
"R": """
####.
#...#
####.
#...#
#...#
#...#
#...#""",
"S": """
.####
#....
.###.
....#
....#
#...#
.###.""",
"T": """
#####
..#..
..#..
..#..
..#..
..#..
..#..""",
"U": """
#...#
#...#
#...#
#...#
#...#
#...#
.###.""",
"V": """
#...#
#...#
#...#
#...#
#...#
.#.#.
..#..""",
"W": """
#...#
#...#
#...#
#...#
#.#.#
##.##
#...#""",
"X": """
#...#
.#.#.
..#..
.#.#.
#...#
#...#
#...#""",
"Y": """
#...#
.#.#.
..#..
..#..
..#..
..#..
..#..""",
"Z": """
#####
....#
...#.
..#..
.#...
#....
#####""",
}

# ── Minuscules ─────────────────────────────────────────────────────────
LOWER = {
"a": """
.....
.....
.###.
....#
.####
#...#
.####""",
"b": """
#....
#....
#.##.
##..#
#...#
#...#
####.""",
"c": """
.....
.....
.###.
#...#
#....
#...#
.###.""",
"d": """
....#
....#
.##.#
#..##
#...#
#...#
.####""",
"e": """
.....
.....
.###.
#...#
#####
#....
.####""",
"f": """
..##
.#..
####
.#..
.#..
.#..
.#..""",
"g": """
.....
.....
.####
#...#
#...#
.####
....#
####.""",
"h": """
#....
#....
#.##.
##..#
#...#
#...#
#...#""",
"i": """
#
.
#
#
#
#
#""",
"j": """
...#
....
...#
...#
...#
...#
#..#
.##.""",
"k": """
#...
#...
#..#
#.#.
##..
#.#.
#..#""",
"l": """
#.
#.
#.
#.
#.
#.
.#""",
"m": """
.....
.....
##.#.
#.#.#
#.#.#
#...#
#...#""",
"n": """
.....
.....
####.
#...#
#...#
#...#
#...#""",
"o": """
.....
.....
.###.
#...#
#...#
#...#
.###.""",
"p": """
.....
.....
#.##.
##..#
#...#
####.
#....
#....""",
"q": """
.....
.....
.##.#
#..##
#...#
.####
....#
....#""",
"r": """
.....
.....
#.##.
##..#
#....
#....
#....""",
"s": """
.....
.....
.####
#....
.###.
....#
####.""",
"t": """
.#.
.#.
###
.#.
.#.
.#.
..#""",
"u": """
.....
.....
#...#
#...#
#...#
#...#
.####""",
"v": """
.....
.....
#...#
#...#
#...#
.#.#.
..#..""",
"w": """
.....
.....
#...#
#...#
#.#.#
#.#.#
.####""",
"x": """
.....
.....
#...#
.#.#.
..#..
.#.#.
#...#""",
"y": """
.....
.....
#...#
#...#
#...#
.####
....#
####.""",
"z": """
.....
.....
#####
...#.
..#..
.#...
#####""",
}

DIGITS = {
"0": """
.###.
#...#
#..##
#.#.#
##..#
#...#
.###.""",
"1": """
..#..
.##..
..#..
..#..
..#..
..#..
#####""",
"2": """
.###.
#...#
....#
..##.
.#...
#...#
#####""",
"3": """
.###.
#...#
....#
..##.
....#
#...#
.###.""",
"4": """
...##
..#.#
.#..#
#...#
#####
....#
....#""",
"5": """
#####
#....
####.
....#
....#
#...#
.###.""",
"6": """
..##.
.#...
#....
####.
#...#
#...#
.###.""",
"7": """
#####
#...#
....#
...#.
..#..
..#..
..#..""",
"8": """
.###.
#...#
#...#
.###.
#...#
#...#
.###.""",
"9": """
.###.
#...#
#...#
.####
....#
...#.
.##..""",
}

PUNCT = {
"!": ("#\n#\n#\n#\n#\n.\n#", 0),
"\"": ("#.#\n#.#", 0),
"'": ("#\n#", 0),
"#": (""".#.#.
.#.#.
#####
.#.#.
#####
.#.#.
.#.#.""", 0),
"$": ("""..#..
.####
#.#..
.###.
..#.#
####.
..#..""", 0),
"%": ("""#...#
#..#.
...#.
..#..
.#...
.#..#
#...#""", 0),
"&": ("""..#..
.#.#.
..#..
.##.#
#..#.
#..#.
.##.#""", 0),
"(": ("""..#
.#.
#..
#..
#..
.#.
..#""", 0),
")": ("""#..
.#.
..#
..#
..#
.#.
#..""", 0),
"*": (""".....
#.#.#
.###.
#.#.#
.....""", 1),
"+": ("""..#..
..#..
#####
..#..
..#..""", 1),
",": ("#\n#", 6),
"-": ("#####", 3),
".": ("#", 6),
"/": ("""....#
...#.
...#.
..#..
.#...
.#...
#....""", 0),
":": ("#\n.\n.\n.\n#", 2),
";": ("#\n.\n.\n.\n#\n#", 2),
"<": ("""...#
..#.
.#..
#...
.#..
..#.
...#""", 0),
"=": ("#####\n.....\n#####", 2),
">": ("""#...
.#..
..#.
...#
..#.
.#..
#...""", 0),
"?": (""".###.
#...#
....#
...#.
..#..
.....
..#..""", 0),
"@": (""".####.
#....#
#.##.#
#.#..#
#.####
#.....
.####.""", 0),
"[": ("###\n#..\n#..\n#..\n#..\n#..\n###", 0),
"\\": ("""#....
.#...
.#...
..#..
...#.
...#.
....#""", 0),
"]": ("###\n..#\n..#\n..#\n..#\n..#\n###", 0),
"^": ("..#..\n.#.#.\n#...#", 0),
"_": ("#####", 7),
"`": ("#.\n.#", 0),
"{": ("""..##
.#..
.#..
#...
.#..
.#..
..##""", 0),
"|": ("#\n#\n#\n#\n#\n#\n#\n#", 0),
"}": ("""##..
..#.
..#.
...#
..#.
..#.
##..""", 0),
"~": (".##..#\n#..##.", 2),
"«": ("""..#.#
.#.#.
#.#..
.#.#.
..#.#""", 1),   # «
"»": ("""#.#..
.#.#.
..#.#
.#.#.
#.#..""", 1),   # »
"…": ("#.#.#", 6),  # …
"•": ("##\n##", 3),  # •
"·": ("#", 3),        # ·
"–": ("####", 3),     # –
"—": ("#######", 3),  # —
"×": ("""#...#
.#.#.
..#..
.#.#.
#...#""", 1),  # ×
"✕": ("""#...#
.#.#.
..#..
.#.#.
#...#""", 1),  # ✕
"°": (".#.\n#.#\n.#.", 0),  # °
"€": ("""..###
.#...
####.
.#...
####.
.#...
..###""", 0),  # €
"©": (""".#####.
#.....#
#..##.#
#.#...#
#..##.#
#.....#
.#####.""", 0),  # ©
"→": ("""....#..
.....#.
#######
.....#.
....#..""", 1),  # →
"←": ("""..#....
.#.....
#######
.#.....
..#....""", 1),  # ←
"↑": ("""..#..
.###.
#.#.#
..#..
..#..
..#..
..#..""", 0),  # ↑
"↓": ("""..#..
..#..
..#..
..#..
#.#.#
.###.
..#..""", 0),  # ↓
"↗": ("""..###
...##
..#.#
.#...
#....""", 1),  # ↗
"♥": (""".##.##.
#######
#######
.#####.
..###..
...#...""", 0),  # ♥
"★": ("""...#...
..###..
#######
.#####.
.##.##.
.#...#.""", 0),  # ★
"▶": ("""#...
##..
###.
####
###.
##..
#...""", 0),  # ▶
"♪": ("""..##.
..#.#
..#..
..#..
###..
###..""", 0),  # ♪
"✓": ("""....#
...#.
#.#..
.#...""", 2),  # ✓
}

for ch, t in CAPS.items():
    G[ch] = g(t)
for ch, t in LOWER.items():
    G[ch] = g(t)
for ch, t in DIGITS.items():
    G[ch] = g(t)
for ch, (t, top) in PUNCT.items():
    G[ch] = g(t, top)

# Équivalences typographiques
G["’"] = G["'"]   # ’
G["‘"] = G["'"]   # ‘
G["“"] = G['"']   # “
G["”"] = G['"']   # ”
G["′"] = G["'"]

# ── Accents ────────────────────────────────────────────────────────────
ACC5 = {
    "acute": ["...#.", "..#.."],
    "grave": [".#...", "..#.."],
    "circ":  ["..#..", ".#.#."],
    "diaer": [".#.#.", "....."],
    "tilde": [".##.#", "#.##."],
}
ACC3 = {
    "acute": ["..#", ".#."],
    "grave": ["#..", ".#."],
    "circ":  [".#.", "#.#"],
    "diaer": ["#.#", "..."],
}


def lower_acc(base, acc):
    b = G[base]
    rows = list(b["rows"])
    if b["w"] == 5:
        rows[0], rows[1] = ACC5[acc]
        return {"rows": rows, "top": 0, "w": 5}
    # i (largeur 1) → glyphe de largeur 3
    body = [".#." if r == "#" else "..." for r in rows]
    body[0], body[1] = ACC3[acc]
    return {"rows": body, "top": 0, "w": 3}


def cap_acc(base, acc):
    b = G[base]
    pat = ACC5[acc] if b["w"] == 5 else ACC3[acc]
    return {"rows": pat + list(b["rows"]), "top": -2, "w": b["w"]}


LOWER_ACC = {
    "à": ("a", "grave"), "â": ("a", "circ"), "ä": ("a", "diaer"), "á": ("a", "acute"),
    "é": ("e", "acute"), "è": ("e", "grave"), "ê": ("e", "circ"), "ë": ("e", "diaer"),
    "î": ("i", "circ"), "ï": ("i", "diaer"), "í": ("i", "acute"), "ì": ("i", "grave"),
    "ô": ("o", "circ"), "ö": ("o", "diaer"), "ó": ("o", "acute"), "ò": ("o", "grave"),
    "ù": ("u", "grave"), "û": ("u", "circ"), "ü": ("u", "diaer"), "ú": ("u", "acute"),
    "ñ": ("n", "tilde"), "ÿ": ("y", "diaer"),
}
CAP_ACC = {
    "À": ("A", "grave"), "Â": ("A", "circ"), "Ä": ("A", "diaer"), "Á": ("A", "acute"),
    "É": ("E", "acute"), "È": ("E", "grave"), "Ê": ("E", "circ"), "Ë": ("E", "diaer"),
    "Î": ("I", "circ"), "Ï": ("I", "diaer"), "Í": ("I", "acute"),
    "Ô": ("O", "circ"), "Ö": ("O", "diaer"), "Ó": ("O", "acute"),
    "Ù": ("U", "grave"), "Û": ("U", "circ"), "Ü": ("U", "diaer"), "Ú": ("U", "acute"),
    "Ñ": ("N", "tilde"),
}
for ch, (b, a) in LOWER_ACC.items():
    G[ch] = lower_acc(b, a)
for ch, (b, a) in CAP_ACC.items():
    G[ch] = cap_acc(b, a)

G["ç"] = {"rows": list(G["c"]["rows"]) + ["..##."], "top": 0, "w": 5}
G["Ç"] = {"rows": list(G["C"]["rows"]) + ["..##."], "top": 0, "w": 5}
G["œ"] = g(""".......
.......
.##.##.
#..#..#
#..####
#..#...
.##.###""")
G["Œ"] = g(""".######
#..#...
#..###.
#..#...
#..#...
#..#...
.######""")
G["¡"] = g("#\n.\n#\n#\n#\n#\n#")
G["¿"] = g("""..#..
.....
..#..
.#...
#....
#...#
.###.""")

SPACES = {" ": 3, " ": 3, " ": 1, " ": 1}


# ── Contours ───────────────────────────────────────────────────────────
def pixels(glyph, bold=False):
    if bold and glyph is G.get("\u2026"):
        glyph = {"rows": ["#..#..#"], "top": 6, "w": 7}
    px = set()
    for i, row in enumerate(glyph["rows"]):
        r = glyph["top"] + i
        for c, v in enumerate(row):
            if v == "#":
                px.add((c, r))
                if bold:
                    px.add((c + 1, r))
    return px


def contours(px):
    """Trace les contours (sens horaire, axe Y vers le haut) d'un ensemble de pixels."""
    edges = {}
    for (c, r) in px:
        x0, x1 = c * P, (c + 1) * P
        y0, y1 = (6 - r) * P, (7 - r) * P
        sq = [((x0, y0), (x0, y1)), ((x0, y1), (x1, y1)),
              ((x1, y1), (x1, y0)), ((x1, y0), (x0, y0))]
        for a, b in sq:
            if (b, a) in edges:
                del edges[(b, a)]
            else:
                edges[(a, b)] = True
    out = {}
    for a, b in edges:
        out.setdefault(a, []).append(b)
    loops = []
    while out:
        start = next(iter(out))
        loop = [start]
        prev = None
        cur = start
        while True:
            nexts = out[cur]
            if len(nexts) == 1:
                nxt = nexts.pop()
            else:
                # Sommet ambigu (pixels en diagonale) : tourner à droite
                dx0, dy0 = (cur[0] - prev[0], cur[1] - prev[1]) if prev else (0, 1)
                def turn(n):
                    dx1, dy1 = n[0] - cur[0], n[1] - cur[1]
                    return dx0 * dy1 - dy0 * dx1  # <0 = droite
                nexts.sort(key=turn)
                nxt = nexts.pop(0)
            if not nexts:
                del out[cur]
            prev, cur = cur, nxt
            if cur == start:
                break
            loop.append(cur)
        # Supprime les points colinéaires
        simp = []
        n = len(loop)
        for i in range(n):
            p0, p1, p2 = loop[i - 1], loop[i], loop[(i + 1) % n]
            if (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]) != 0:
                simp.append(p1)
        loops.append(simp)
    return loops


def build(bold=False):
    family = "Ratcraft"
    style = "Bold" if bold else "Regular"
    names = [".notdef", "space"]
    cmap = {}
    glyf = {}
    metrics = {}

    pen = TTGlyphPen(None)
    # .notdef = rectangle creux
    for loop in contours({(c, r) for c in range(4) for r in range(7)
                          if c in (0, 3) or r in (0, 6)}):
        pen.moveTo(loop[0])
        for pt in loop[1:]:
            pen.lineTo(pt)
        pen.closePath()
    glyf[".notdef"] = pen.glyph()
    metrics[".notdef"] = (5 * P, 0)

    pen = TTGlyphPen(None)
    glyf["space"] = pen.glyph()
    metrics["space"] = ((SPACES[" "] + 1 + (1 if bold else 0)) * P, 0)
    cmap[ord(" ")] = "space"

    for ch, w in SPACES.items():
        if ch == " ":
            continue
        name = "uni%04X" % ord(ch)
        names.append(name)
        glyf[name] = TTGlyphPen(None).glyph()
        metrics[name] = ((w + 1) * P, 0)
        cmap[ord(ch)] = name

    for ch, glyph in sorted(G.items(), key=lambda kv: ord(kv[0])):
        name = "uni%04X" % ord(ch)
        names.append(name)
        cmap[ord(ch)] = name
        pen = TTGlyphPen(None)
        for loop in contours(pixels(glyph, bold)):
            pen.moveTo(loop[0])
            for pt in loop[1:]:
                pen.lineTo(pt)
            pen.closePath()
        glyf[name] = pen.glyph()
        gw = 7 if (bold and ch == "\u2026") else glyph["w"]
        width = gw + 1 + (1 if bold else 0)
        metrics[name] = (width * P, 0)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    # lsb réel = xMin de chaque glyphe
    hm = {}
    for n in names:
        gl = fb.font["glyf"][n]
        gl.recalcBounds(fb.font["glyf"])
        hm[n] = (metrics[n][0], getattr(gl, "xMin", 0) if gl.numberOfContours else 0)
    fb.setupHorizontalMetrics(hm)
    fb.setupHorizontalHeader(ascent=ASC, descent=-DESC, lineGap=0)
    fb.setupNameTable({
        "familyName": family,
        "styleName": style,
        "uniqueFontIdentifier": f"{family}-{style}",
        "fullName": f"{family} {style}",
        "psName": f"{family}-{style}",
        "version": "Version 1.000",
        "copyright": "Ratcraft — police pixel originale créée pour ratnco.",
        "licenseDescription": "Utilisation libre pour le site de ratnco.",
    })
    fb.setupOS2(
        version=4,
        sTypoAscender=ASC, sTypoDescender=-DESC, sTypoLineGap=0,
        usWinAscent=ASC, usWinDescent=DESC,
        sxHeight=5 * P, sCapHeight=7 * P,
        usWeightClass=700 if bold else 400,
        fsSelection=(0x20 if bold else 0x40) | 0x80,
        achVendID="RTNC",
    )
    fb.setupPost(isFixedPitch=0, underlinePosition=-P, underlineThickness=P)
    fb.setupHead(unitsPerEm=UPM, macStyle=1 if bold else 0)
    OUT.mkdir(parents=True, exist_ok=True)
    fname = OUT / ("ratcraft-bold.woff2" if bold else "ratcraft.woff2")
    fb.font.flavor = "woff2"
    fb.save(str(fname))
    fb.font.flavor = None
    fb.save(str(OUT.parent.parent / "tools" / ("_ratcraft-bold.ttf" if bold else "_ratcraft.ttf")))
    print(fname.name, fname.stat().st_size, "octets,", len(names), "glyphes")


if __name__ == "__main__":
    build(False)
    build(True)
