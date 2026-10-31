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
CSS = """:root { color-scheme: light; --bg: #ecebe6; --card: #f7f6f2; --fg: #1a1b1f; --muted: #50535b; --line: rgba(26, 27, 31, .2); --accent: #5e1f3a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.55 Georgia, "Times New Roman", serif; }
main { max-width: 52rem; margin: 0 auto; padding: 40px 16px 60px; }
h1 { font-size: 2rem; margin: 0 0 6px; }
.lede { color: var(--muted); margin: 0 0 28px; }
.games { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.game { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 18px; display: grid; gap: 10px; align-content: start; }
.game h2 { margin: 0; font-size: 1.35rem; }
.game p { margin: 0; color: var(--muted); }
.links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.links a { color: var(--fg); text-decoration: none; border: 1px solid var(--muted); border-radius: 3px; padding: 6px 12px; font-size: .92rem; }
.links a.primary { background: var(--accent); border-color: var(--accent); color: #f7f6f2; }
.links a:hover { border-color: var(--accent); color: var(--accent); }
.links a.primary:hover { color: #f7f6f2; opacity: .9; }
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


SERVER = (ROOT / "legend-dynamics" / "table-server" / "server-url.txt").read_text().strip()
FORM_CSS = """form { display: grid; gap: 14px; max-width: 40rem; }
label { display: grid; gap: 6px; font-weight: 700; font-size: .95rem; }
input, select, textarea { font: inherit; font-weight: 400; color: var(--fg); background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; width: 100%; }
textarea { min-height: 6.5rem; resize: vertical; }
fieldset { border: 1px solid var(--line); border-radius: 4px; display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 8px 12px; margin: 0; }
legend { font-weight: 700; font-size: .95rem; padding: 0 4px; }
fieldset label { display: flex; align-items: center; gap: 6px; font-weight: 400; }
fieldset input { width: auto; }
button { font: inherit; background: var(--accent); color: #f7f6f2; border: 0; border-radius: 3px; padding: 9px 18px; cursor: pointer; justify-self: start; }
.hp { position: absolute; left: -10000px; }
.bad { color: #8a1c1c; }
ul.how { padding-left: 1.2rem; } ul.how li { margin-bottom: 6px; }"""


def playtest():
    """The fan games' playtest page: how to play in a minute, then the questions, sent to the table server (only the
    author reads them, on the main site's Write page)."""
    games = "".join(f"<option>{html.escape(t)}</option>" for t, *_ in GAMES.values())
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Playtest · Fan games</title><meta name="robots" content="noindex, nofollow"><style>{CSS}{FORM_CSS}</style></head>
<body><main>
<p><a href="/" style="color:var(--muted)">← Fan games</a></p>
<h1>Play it, then tell us how it went</h1>
<p class="lede">Thanks for playing. You don't need to read anything first: the GM brings your character and explains as you go.</p>
<h2>The game in a minute</h2>
<ul class="how">
<li><b>Roll low.</b> Each skill on your sheet has a number, usually 10 to 15. Roll three six-sided dice: equal to or under it succeeds, and the further under, the better. A 3 or 4 always works; a 17 or 18 always fails.</li>
<li><b>Say what you do.</b> The GM tells you what to roll, with +2 when things are on your side or −2 when they aren't.</li>
<li><b>Close isn't failure.</b> Miss by 1 or 2 and the GM may offer success at a cost.</li>
<li><b>Fights.</b> On your turn, move and do one thing. You can dodge once a round. Three boxes of injury and you're down.</li>
<li><b>Points.</b> You start with two (Duty in <i>USS Pelion</i>, Grit in <i>Grimm</i>): spend one to reroll, to take a box less from a hit, or to have just the thing you need.</li>
<li><b>Find out what it is.</b> What you prove about the unknown becomes a card on your sheet: a library record, or a diary entry.</li>
</ul>
<h2 id="feedback">A few questions</h2>
<p class="lede">Answer as many as you like; short answers are perfect. Only the game's maker reads them.</p>
<form id="pt" novalidate>
<label>Which game <select name="game"><option value="">Choose…</option>{games}</select></label>
<label>Who you played <input type="text" name="role" maxlength="120"></label>
<fieldset><legend>How much fun was it?</legend>{"".join(f'<label><input type="radio" name="rating" value="{n}"> {n}{" (not much)" if n == 1 else " (a lot)" if n == 5 else ""}</label>' for n in range(1, 6))}</fieldset>
<fieldset><legend>Would you play again?</legend>{"".join(f'<label><input type="radio" name="again" value="{x}"> {x}</label>' for x in ["Yes", "Maybe", "No"])}</fieldset>
<label>What was confusing? <textarea name="confusing" maxlength="2000"></textarea></label>
<label>What did you never use? <textarea name="unused" maxlength="2000"></textarea></label>
<label>What was the best moment? <textarea name="best" maxlength="2000"></textarea></label>
<label>Anything else? <textarea name="other" maxlength="2000"></textarea></label>
<label>Your name (optional) <input type="text" name="name" maxlength="120"></label>
<label class="hp" aria-hidden="true">Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
<button type="submit">Send</button>
<p id="st" role="status"></p>
</form>
<script>
(function () {{
  var f = document.getElementById("pt"), st = document.getElementById("st");
  f.onsubmit = function (e) {{
    e.preventDefault();
    var v = function (n) {{ return f.elements[n] ? f.elements[n].value : ""; }}, r = f.querySelector('input[name="rating"]:checked'), a = f.querySelector('input[name="again"]:checked');
    var fb = {{ game: v("game"), role: v("role"), rating: r ? +r.value : null, again: a ? a.value : "", confusing: v("confusing"), unused: v("unused"), best: v("best"), other: v("other"), name: v("name") }};
    if (!fb.rating && !fb.again && !fb.confusing.trim() && !fb.unused.trim() && !fb.best.trim() && !fb.other.trim()) {{ st.textContent = "Answer at least one question first."; st.className = "bad"; return; }}
    st.textContent = "Sending…"; st.className = "";
    fetch({SERVER!r} + "/api/feedback", {{ method: "POST", headers: {{ "Content-Type": "application/json" }}, body: JSON.stringify({{ feedback: fb, website: v("website") }}) }})
      .then(function (res) {{ return res.json().catch(function () {{ return {{}}; }}).then(function (j) {{ if (!res.ok) throw new Error(j.error || "The server didn't take it."); }}); }})
      .then(function () {{ f.innerHTML = "<p><b>Thank you!</b> Your answers are in.</p>"; }})
      .catch(function (err) {{ st.textContent = /hour|at least one/.test(err.message) ? err.message : "Your answers couldn't be sent just now. Tell your GM, or try again later."; st.className = "bad"; }});
  }};
}})();
</script>
</main></body></html>
"""


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
        extra = ""
        # USS Pelion: Frontier, the strategy game (pelion-frontier/, built by its own build.mjs).
        frontier = ROOT / "pelion-frontier" / "dist" / "play.html"
        if slug == "uss-pelion" and frontier.exists():
            write(f"{slug}/frontier/index.html", frontier.read_text())
            extra = f'\n  <a href="/{slug}/frontier/">Frontier (strategy game)</a>'
        cards.append(f"""<section class="game"><h2>{html.escape(title)}</h2><p>{html.escape(tagline)}</p>
  <div class="links"><a class="primary" href="/{slug}/">Open the creator</a><a href="/{slug}/{guide}" download>Players' Guide (Word)</a>
  <a href="/{slug}/discord-commands.html">Discord commands</a>{extra}</div></section>""")
    write("index.html", f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fan games</title><meta name="robots" content="noindex, nofollow"><style>{CSS}</style></head>
<body><main>
<h1>Fan games</h1>
<p class="lede">Private games for our table, run on the Legend Dynamics rules. Not for sharing: these use settings owned by others.</p>
<div class="games">
{chr(10).join(cards)}
</div>
<p style="margin-top:22px">Played a session? <a href="/playtest/">Tell us how it went</a>: a few quick questions.</p>
<footer>The GM view and the GM's Guides open with your GM access code, the same one that starts a shared table.
Fan works, not for sale or distribution; Star Trek and Grimm belong to their owners.</footer>
</main></body></html>
""")
    write("playtest/index.html", playtest())
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
