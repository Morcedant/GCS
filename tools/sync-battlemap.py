#!/usr/bin/env python3
"""Put the battle map (grimm-west/battlemap.js, a copy of legend-dynamics/engine/battlemap.js on the
claude/legend-dynamics branch) into grimm-west/index.html, between the BATTLEMAP markers. Run it after
copying a newer battlemap.js in.

  python3 tools/sync-battlemap.py
"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
page, src = ROOT / "grimm-west" / "index.html", (ROOT / "grimm-west" / "battlemap.js").read_text().replace("</", "<\\/")
s = page.read_text()
s, n = re.subn(r"/\* BATTLEMAP:START \*/.*?/\* BATTLEMAP:END \*/", lambda m: "/* BATTLEMAP:START */\n" + src + "/* BATTLEMAP:END */", s, flags=re.S)
assert n == 1, "markers not found"
page.write_text(s)
print("battle map synced into", page.relative_to(ROOT))
