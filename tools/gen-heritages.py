#!/usr/bin/env python3
"""Write grimm-west/data/heritages.json into the Grimm creator and the Players' Guide.

The creator gets the data as a script constant between the HERITAGES markers; the guide gets the
generated "Heritages" chapter between its HERITAGES markers. Run it after editing the JSON, then
rebuild the guide:

  python3 tools/gen-heritages.py && python3 tools/build-guide.py --game grimm-west --docx
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "grimm-west"
DATA = json.loads((GAME / "data" / "heritages.json").read_text())
ATTRS = ["Body", "Agility", "Intellect", "Presence", "Will"]
TIER_NAMES = {0: "Tier 0", 1: "Tier 1 (Minor)", 2: "Tier 2 (Major)", 3: "Tier 3 (Apex)"}
EDGES = 3


def signed(n):
    return f"+{n}" if n > 0 else f"−{abs(n)}"


def adj_text(adj):
    return ", ".join(f"{a} {signed(adj[a])}" for a in ATTRS if adj.get(a)) or "None"


def woge_line(w):
    bits = [f"{a} {signed(w['attrs'][a])}" for a in ATTRS if w["attrs"].get(a)]
    if w.get("dodge"):
        bits.append(f"Dodge {signed(w['dodge'])}")
    return "; ".join(bits + w["traits"])


def replace_between(text, start, end, body, path):
    if start not in text or end not in text:
        sys.exit(f"markers {start} … {end} missing from {path}")
    return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: start + body + end, text, flags=re.S)


def guide_chapter():
    hs = sorted(DATA["heritages"], key=lambda h: (h["tier"], h["name"]))
    out = ["", "# Heritages", "",
           "Each heritage has a **tier**. A character has 3 points to split between heritage power and Edges: "
           "the higher the tier, the fewer Edges (see Step 2). Adjustments always total zero. "
           "Heritages marked *horror* are only available when the whole table has agreed to a horror-tinged campaign.", "",
           "| Heritage | Tier | Edges | Adjustments |", "|---|---|---|---|"]
    for h in hs:
        out.append(f"| {h['name']}{' (horror)' if h.get('horror') else ''} | {h['tier']} | {EDGES - h['tier']} | {adj_text(h['adj'])} |")
    out += ["", "## Core Wesen rules", "",
            "Every Wesen heritage has these, on top of its own entry below. They come from the traits all the Wesen templates share.", "",
            "| Rule | What it means |", "|---|---|"]
    out += [f"| {n} | {t} |" for n, t in DATA["wesenCore"]]
    out += ["", "**Woge profiles.** While you're in full woge, your profile's attribute bonuses apply to rolls using those attributes "
            "(including the skills based on them), even above the starting maximum. Its other traits and drawbacks apply too. "
            "\"Tough\" means each hit that marks 2 or more boxes marks one fewer, never below 1.", ""]
    for h in hs:
        out += [f"## {h['name']}", ""]
        meta = f"*{TIER_NAMES[h['tier']]} · {EDGES - h['tier']} Edge{'s' if EDGES - h['tier'] != 1 else ''} · {adj_text(h['adj'])}"
        meta += " · horror campaigns only*" if h.get("horror") else "*"
        out += [meta, "", h["desc"], ""]
        if h["core"]:
            out += ["**Heritage rules:**", ""] + [f"- {c}" for c in h["core"]] + [""]
        if h.get("woge"):
            out += [f"**Woge profile:** {woge_line(h['woge'])}." + (f" **Drawbacks:** {'; '.join(h['woge']['drawbacks'])}." if h["woge"]["drawbacks"] else ""), ""]
        if h["skills"]:
            out += [f"**Suggested skills:** {', '.join(h['skills'])}.", ""]
        label = "Lens" if h["id"] == "incantare" else "Gift" if h["id"] == "grimm" else "Advantage"
        out += [f"| {label} | Effect | Companion complication |", "|---|---|---|"]
        for t in h["traits"]:
            out.append(f"| {t[1]} | {t[2]} | **{t[5]}.** {t[6]} |")
    return "\n".join(out) + "\n"


def main():
    app = GAME / "index.html"
    js = "const HERITAGE_DATA = " + json.dumps(DATA, ensure_ascii=False, separators=(",", ":")) + ";"
    app.write_text(replace_between(app.read_text(), "/* HERITAGES:START */", "/* HERITAGES:END */", js, app))
    guide = GAME / "players-guide.md"
    guide.write_text(replace_between(guide.read_text(), "<!-- HERITAGES:START -->", "<!-- HERITAGES:END -->", guide_chapter(), guide))
    print("wrote heritages into", app.relative_to(ROOT), "and", guide.relative_to(ROOT))


if __name__ == "__main__":
    main()
