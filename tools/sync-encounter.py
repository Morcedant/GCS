#!/usr/bin/env python3
"""Put the Encounter panel into a standalone game page (grimm-west/index.html): the shared modules in
<game>/encounter/ (copies of legend-dynamics/engine/rules/{core,experiments}.js and engine/lab/{encounter,stats,ui}.js
and panel.html on the claude/legend-dynamics branch) and the game's setting data (<game>/encounter/setting.json:
weapons, threats, protective gear, combat rules, terms). Run it after copying newer modules in.

  python3 tools/sync-encounter.py [grimm-west]
"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
game = sys.argv[1] if len(sys.argv) > 1 else "grimm-west"
D = ROOT / game / "encounter"


def inline_module(path, name):
    """An ES module as a plain script constant, as tools/build-legend.py does on the Legend Dynamics branch."""
    src = path.read_text().replace("// @ts-check\n", "")
    names = re.findall(r"^export (?:async )?(?:function|const|let) (\w+)", src, flags=re.M)
    for line in re.findall(r"^import .*$", src, flags=re.M):
        src = src.replace(line + "\n", "")
    src = re.sub(r"^export (async )?(function|const|let) ", r"\1\2 ", src, flags=re.M)
    assert not re.search(r"^\s*export\b", src, flags=re.M), f"{path}: only export function/const/let can be inlined"
    return f"const {name} = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();"


setting = json.loads((D / "setting.json").read_text())
js = "\n".join([
    "const ENC_SETTING = " + json.dumps(setting, ensure_ascii=False, separators=(",", ":")) + ";",
    inline_module(D / "core.js", "LD"), inline_module(D / "experiments.js", "LDX"),
    inline_module(D / "encounter.js", "LAB_ENCOUNTER"), inline_module(D / "stats.js", "LAB_STATS"), inline_module(D / "ui.js", "LAB_UI"),
]).replace("</", "<\\/") + "\n"
page = ROOT / game / "index.html"
s = page.read_text()
s, n = re.subn(r"/\* ENCOUNTER:START \*/.*?/\* ENCOUNTER:END \*/", lambda m: "/* ENCOUNTER:START */\n" + js + "/* ENCOUNTER:END */", s, flags=re.S)
s, m = re.subn(r"<!-- ENCOUNTER-PANEL:START -->.*?<!-- ENCOUNTER-PANEL:END -->", lambda _: "<!-- ENCOUNTER-PANEL:START -->\n" + (D / "panel.html").read_text() + "<!-- ENCOUNTER-PANEL:END -->", s, flags=re.S)
assert n == 1 and m == 1, "ENCOUNTER markers not found"
page.write_text(s)
print("encounter panel synced into", page.relative_to(ROOT))
