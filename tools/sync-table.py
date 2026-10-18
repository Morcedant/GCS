#!/usr/bin/env python3
"""Put the shared table's page side (grimm-west/table-client.js, a copy of legend-dynamics/engine/table-client.js on the
claude/legend-dynamics branch) into grimm-west/index.html, between the TABLECLIENT markers. Run it after copying a newer
table-client.js in.

  python3 tools/sync-table.py
"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
page, src = ROOT / "grimm-west" / "index.html", (ROOT / "grimm-west" / "table-client.js").read_text().replace("</", "<\\/")
s = page.read_text()
s, n = re.subn(r"/\* TABLECLIENT:START \*/.*?/\* TABLECLIENT:END \*/", lambda m: "/* TABLECLIENT:START */\n" + src + "/* TABLECLIENT:END */", s, flags=re.S)
assert n == 1, "markers not found"
page.write_text(s)
print("shared table synced into", page.relative_to(ROOT))
