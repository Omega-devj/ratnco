#!/usr/bin/env python3
"""Recalcule les empreintes sha256 des scripts en ligne de index.html
et les remplace dans la CSP du fichier _headers."""
import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text()
hashes = [
    "'sha256-%s'" % base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode()
    for m in re.finditer(r"<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>(.*?)</script>", html, re.S)
]
hdr = ROOT / "_headers"
text = hdr.read_text()
text = re.sub(r"script-src 'self'[^;]*;", "script-src 'self' " + " ".join(hashes) + ";", text)
hdr.write_text(text)
print("CSP mise à jour :", " ".join(hashes))
