#!/usr/bin/env python3
"""Build the private fan-games site: USS Pelion and Grimm, kept off the public Legend Dynamics site.

Writes fan-games/site/ (and, with --zip, a zip of it) for its own Cloudflare Pages project, locked to invited
players with Cloudflare Access (see fan-games/README.md). Each game gets its creator, its Players' Guide in Word
and its Discord commands handout (with the fan-games bot's code). The GM's Guides aren't here: registered GMs
get them from the table server, as on the main site.

  python3 tools/build-fansite.py [--zip PATH]
"""
import argparse, html, re, shutil, sys, zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fan_sources

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "fan-games" / "site"
# slug → (title, tagline, folder, Players' Guide file)
GAMES = {
    "uss-pelion": ("USS Pelion", "Star Trek, campaign year 2268: the crew of a Starfleet ship.", "uss-pelion", "USS_Pelion_Players_Guide.docx"),
    "grimm": ("Grimm", "Gothic horror in the Grimm-verse, the late 1800s.", "grimm-west", "Grimm_Players_Guide.docx"),
}
CSS = """:root { color-scheme: dark; --bg: #121318; --card: #1b1d24; --fg: #ece6da; --muted: #a59d8f; --line: #343744; --gold: #c99a3f; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.55 Georgia, "Times New Roman", serif; }
main { max-width: 52rem; margin: 0 auto; padding: 40px 16px 60px; }
h1 { font-size: 2rem; margin: 0 0 6px; letter-spacing: .02em; }
.lede { color: var(--muted); margin: 0 0 28px; }
.games { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.game { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px; display: grid; gap: 10px; align-content: start; }
.game h2 { margin: 0; font-size: 1.35rem; }
.game p { margin: 0; color: var(--muted); }
.links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.links a { color: var(--fg); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: .92rem; }
.links a.primary { background: var(--gold); border-color: var(--gold); color: #17130b; }
.links a:hover { border-color: var(--gold); }
footer { color: var(--muted); font-size: .85rem; margin-top: 36px; border-top: 1px solid var(--line); padding-top: 14px; }
"""
BACK = ('<nav class="no-print" aria-label="Site" style="max-width:1200px;margin:0 auto;padding:10px 16px 0;font:.78rem system-ui,sans-serif;letter-spacing:.06em">'
        '<a href="/" style="color:inherit;opacity:.8;text-decoration:none">← Fan games</a></nav>')


def write(rel, data):
    p = SITE / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    (p.write_bytes if isinstance(data, bytes) else p.write_text)(data)


def creator(page):
    """The creator, with a link back to the fan-games home above its page."""
    return re.sub(r'<div class="wrap" id="app"', lambda m: BACK + "\n" + m.group(0), page, count=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", help="also write the site as a zip, index.html at the top")
    a = ap.parse_args()
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    cards = []
    for slug, (title, tagline, folder, guide) in GAMES.items():
        write(f"{slug}/index.html", creator(fan_sources.read_text(f"{folder}/index.html")))
        write(f"{slug}/{guide}", fan_sources.read_bytes(f"{folder}/{guide}"))
        write(f"{slug}/discord-commands.html", (ROOT / folder / "discord-commands.html").read_text())
        cards.append(f"""<section class="game"><h2>{html.escape(title)}</h2><p>{html.escape(tagline)}</p>
  <div class="links"><a class="primary" href="/{slug}/">Open the creator</a><a href="/{slug}/{guide}" download>Players' Guide (Word)</a>
  <a href="/{slug}/discord-commands.html">Discord commands</a></div></section>""")
    write("index.html", f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fan games</title><meta name="robots" content="noindex, nofollow"><style>{CSS}</style></head>
<body><main>
<h1>Fan games</h1>
<p class="lede">Private games for our table, run on the Legend Dynamics rules. Not for sharing: these use settings owned by others.</p>
<div class="games">
{chr(10).join(cards)}
</div>
<footer>The GM view and the GM's Guides open with your GM access code, the same one that starts a shared table.
Fan works, not for sale or distribution; Star Trek and Grimm belong to their owners.</footer>
</main></body></html>
""")
    write("robots.txt", "User-agent: *\nDisallow: /\n")
    n = sum(1 for p in SITE.rglob("*") if p.is_file())
    print(f"wrote {SITE.relative_to(ROOT)} ({n} files)")
    if a.zip:
        dest = Path(a.zip)
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
            for p in sorted(SITE.rglob("*")):
                if p.is_file():
                    z.write(p, p.relative_to(SITE))
        print(f"wrote {dest} (index.html at the top level)")


if __name__ == "__main__":
    main()
