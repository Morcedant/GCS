#!/usr/bin/env python3
"""Build the Squarespace kit for the Legend Dynamics website: legend-dynamics/website/.

Writes the font snippet, the per-page theme snippets, ready-to-paste Code Block HTML for the
home page, one page per game, the core rules and the Discord bot page, and preview.html to see it all locally.
custom.css is written by hand. Run after build-legend.py:

  python3 tools/build-website.py
"""
import html, json, pathlib, re, subprocess
import discord_handout

ROOT = pathlib.Path(__file__).resolve().parent.parent
LD = ROOT / "legend-dynamics"
WEB = LD / "website"
GAMES = ["western", "spaceopera", "fantasy", "exlaw"]
# Where each game's creator is published (share it publicly from its Share menu first).
CREATORS = {
    "western": "https://claude.ai/artifact/UjmEHKxZzVJG4yhupZkoXo",
    "spaceopera": "https://claude.ai/artifact/AdxunyoqKyErJ6cTz5ujtL",
    "fantasy": "https://claude.ai/artifact/8XnPkroZN3TsAzhsLaZCLM",
    "exlaw": "https://claude.ai/artifact/12nhXbM26KpVjHk68yvFLh",
}
# Suggested Squarespace page URLs (set in each page's settings).
SLUGS = {"western": "/dust-and-damnation", "spaceopera": "/fracture-lines", "fantasy": "/the-shattered-crown", "exlaw": "/exlaw"}
GENRE = {"western": "Gothic Western", "spaceopera": "Science fiction", "fantasy": "Sword and sorcery", "exlaw": "Superheroes"}
CORE_SLUG = "/core-rules"
DISCORD_SLUG = "/discord"

BRAND_FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap"

e = html.escape


def pack(pid):
    return json.loads((LD / "packs" / pid / "pack.json").read_text())


def first_para(pid):
    s = (LD / "packs" / pid / "setting.md").read_text()
    intro = s.split("<!-- SECTION:intro -->", 1)[1].split("<!-- SECTION:", 1)[0].strip()
    para = intro.split("\n\n")[0]
    return md_inline(para)


def md_inline(t):
    t = e(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)


def odds(target):
    ways = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1]
    return sum(w for t, w in zip(range(3, 19), ways) if t <= 4 or (t <= 16 and t <= target)) / 216


def game_card(pid, href):
    p = pack(pid); t = p["terms"]
    tags = [f"{len(p['roles'])} {t.get('role', 'Role').lower()}s", f"{len([o for o in p['origins'] if not o.get('restricted')])} {t.get('originPlural', 'Origins').lower()}", f"{t['point']} points"]
    return f"""  <a class="ld-game ld-game--{pid}" href="{href}">
    <div class="ld-eyebrow">{e(GENRE[pid])}</div>
    <h3>{e(t['title'])}</h3>
    <p>{first_para(pid)}</p>
    <div class="ld-game-meta">{''.join(f'<span class="ld-tag">{e(x)}</span>' for x in tags)}</div>
    <div class="ld-go">Enter →</div>
  </a>"""


def home():
    cards = "\n".join(game_card(g, SLUGS[g]) for g in GAMES)
    cells = "\n".join(f'    <div><b>{n}</b><span>{round(odds(n) * 100)}%</span><div class="ld-bar" style="--p:{round(odds(n) * 100)}%"></div></div>' for n in range(8, 17))
    return f"""<!-- Home page. Paste each block into its own Code Block (Display Source off). -->

<!-- Block 1: hero -->
<div class="ld ld-hero">
  <div class="ld-eyebrow">Legend Dynamics RPG system</div>
  <h1>Heroes are made of skill, nerve and a little luck.</h1>
  <hr class="ld-rule">
  <p class="ld-lede">A tabletop roleplaying system built on three six-sided dice and concrete skills. One core, many worlds: Gothic Westerns, starships, swords against sorcery, and superheroes under the law.</p>
  <div class="ld-actions">
    <a class="ld-button" href="#games">Choose a game</a>
    <a class="ld-button ld-button--ghost" href="{CORE_SLUG}">Read the core rules</a>
  </div>
</div>

<!-- Block 2: what makes it tick -->
<ul class="ld ld-pillars">
  <li><b>Roll 3d6 under your skill</b><span>One roll for everything. Your sheet shows the number to beat, and the margin tells you how well you did.</span></li>
  <li><b>Skills, not classes</b><span>Train what your character knows. A specialty is worth +3, an expert's craft +5; everything else is plausible, just harder.</span></li>
  <li><b>Flaws that pay</b><span>Complications cause trouble at the worst moment, and earn the points that let you reroll, soak a wound or be ready.</span></li>
</ul>

<!-- Block 3: the games (give this section the anchor id "games" in Squarespace, or keep the id below) -->
<div class="ld" id="games">
  <div class="ld-eyebrow">The games</div>
  <div class="ld-games">
{cards}
  </div>
</div>

<!-- Block 4: the odds -->
<div class="ld ld-callout">
  <b>The odds</b>
  <p>Roll three dice and total them; at or under your target is a success. A natural 3 or 4 always succeeds and a 17 or 18 always fails. Most trained skills sit at 12 to 14.</p>
  <div class="ld-odds">
{cells}
  </div>
</div>

<!-- Block 5: license (or paste this text into your Squarespace footer) -->
<p class="ld" style="font-size:.9rem;color:var(--ld-ink-2)">This RPG is released under the <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener" target="_blank">Creative Commons Attribution 4.0 International License</a>. You may share, adapt, and use it for any purpose, including commercially, as long as you give appropriate credit to the author.</p>
"""


def game_page(pid):
    p = pack(pid); t = p["terms"]
    groups = {g["id"]: g["name"] for g in p["groups"]}
    by_group = {}
    for r in p["roles"]:
        by_group.setdefault(groups[r["group"]], []).append(r["name"])
    roles = "".join(f"<li><b>{e(g)}</b><span>{e(', '.join(n))}</span></li>" for g, n in by_group.items())
    origins = ", ".join(o["name"] for o in sorted(p["origins"], key=lambda o: o["tier"]) if not o.get("restricted"))
    tracks = ", ".join(x["name"] for x in p.get("tracks", []))
    role, origin = t.get("role", "Role"), t.get("origin", "Origin")
    return f"""<!-- {t['title']} page. In this page's Settings → Advanced → Page Header Code Injection,
     paste page-injection/{pid}.html so the page takes the {t['title']} theme.
     Then paste each block below into its own Code Block (Display Source off). -->

<!-- Block 1: hero -->
<div class="ld ld-hero">
  <div class="ld-eyebrow">Legend Dynamics · {e(GENRE[pid])}</div>
  <h1>{e(t['title'])}</h1>
  <hr class="ld-rule">
  <p class="ld-lede">{first_para(pid)}</p>
  <div class="ld-actions">
    <a class="ld-button" href="{CREATORS[pid]}" target="_blank" rel="noopener">Create a character</a>
    <a class="ld-button ld-button--ghost" href="{CORE_SLUG}">Core rules</a>
    <a class="ld-button ld-button--ghost" href="{DISCORD_SLUG}">Play on Discord</a>
  </div>
</div>

<!-- Block 2: at a glance -->
<dl class="ld ld-facts">
  <div><dt>Genre</dt><dd>{e(GENRE[pid])}</dd></div>
  <div><dt>{e(role)}s</dt><dd>{len(p['roles'])}, in {len(p['groups'])} groups</dd></div>
  <div><dt>{e(t.get('originPlural', 'Origins'))}</dt><dd>{len([o for o in p['origins'] if not o.get('restricted')])} to choose from</dd></div>
  <div><dt>Points</dt><dd>{e(t['point'])}</dd></div>
  <div><dt>Shared tracks</dt><dd>{e(tracks or '—')}</dd></div>
</dl>

<!-- Block 3: who you can play -->
<div class="ld">
  <div class="ld-eyebrow">Who you can play</div>
  <ul class="ld-pillars">{roles}</ul>
  <p style="margin-top:1.4rem"><b>{e(t.get('originPlural', 'Origins'))}:</b> {e(origins)}. Or build your own {e(t.get('roleLower', 'role'))} or {e(t.get('originLower', 'origin'))} with the GM: the Players' Guide shows how.</p>
</div>

<!-- Block 4: how to start -->
<div class="ld">
  <div class="ld-eyebrow">Start playing</div>
  <ol class="ld-steps">
    <li><b>Open the creator.</b> It walks you through five steps and checks every rule as you go. Or load one of the ready-made characters.</li>
    <li><b>Choose a {e(role.lower())} and {e(origin.lower())}.</b> Your {e(role.lower())}'s core skills are marked for you; your {e(origin.lower())} sets your attributes and Edges.</li>
    <li><b>Save your character file.</b> Bring it to the table, print the sheet, or keep it in the browser.</li>
    <li><b>Read the Players' Guide.</b> It's in the creator's guide tab: the full rules, the setting and its dangers.</li>
  </ol>
</div>
"""


def core_rules():
    md = (LD / "Legend_Dynamics_Core_Rules.md").read_text()
    body = subprocess.run(["pandoc", "-f", "markdown", "-t", "html5", "--id-prefix=ld-"], input=md, text=True, capture_output=True, check=True).stdout
    heads = re.findall(r'<h1 id="([^"]+)">(.*?)</h1>', body)
    toc = "".join(f'<a href="#{i}">{t}</a>' for i, t in heads)
    return f"""<!-- Core rules page. Paste into one Code Block (Display Source off). If Squarespace says the
     block is too long, split it at any <h1> and use two or more Code Blocks. -->
<div class="ld ld-rules">
<div class="ld-eyebrow">Legend Dynamics RPG system</div>
<nav class="ld-toc">{toc}</nav>
{body}
</div>
"""


def discord_page():
    """One page for the bot: the commands every setting shares, then what changes from one setting to the next."""
    generic = {"title": "Dust & Damnation", "point": "Legend", "target": 13, "skill": "Shooting", "foe": "Bandit", "foeTarget": 14, "contest": "Grapple",
               "assist": "Hold the door", "helperSkill": "Athletics", "track": "heat", "trackFull": "Heat",
               "tracks": ["listed under Differences by setting"], "trackTitle": "setting's", "clock": "The mob forms", "clockSize": 4}
    rows_p, rows_gm = discord_handout.rows(generic)
    table = lambda rows: ("<table><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>"
                          + "".join(f"<tr><td><code>{e(c.strip('`'))}</code></td><td>{discord_handout.inline(t)}</td></tr>" for c, t in rows)
                          + "</tbody></table>")
    diff = []
    for g in GAMES:
        p = pack(g); t = p["terms"]
        tr = p.get("tracks", [])
        diff.append(f"<tr><td><a href=\"{SLUGS[g]}\"><strong>{e(t['title'])}</strong></a></td>"
                    f"<td><code>/game set game:{e(t['title'])}</code></td>"
                    f"<td><strong>{e(t['point'])}</strong> points; the reroll button reads “Spend a {e(t['point'])} point to reroll”</td>"
                    f"<td>{e(', '.join(x['name'] for x in tr))}<br><code>/track mark name:{e(tr[0]['name'].lower().replace('the ', ''))}</code></td>"
                    f"<td>{e(', '.join(v[0] for v in p['seeds'].values()))}</td>"
                    f"<td>{'<br>'.join(f'{e(n)} ({k})' for n, k in p['seeds']['clock'][1][:3])}</td></tr>")
    return f"""<!-- Discord page (suggested URL {DISCORD_SLUG}). No theme injection: it uses the Legend Dynamics brand.
     Paste each block below into its own Code Block (Display Source off). -->

<!-- Block 1: hero -->
<div class="ld ld-hero">
  <div class="ld-eyebrow">Legend Dynamics · Every setting</div>
  <h1>Play on Discord</h1>
  <hr class="ld-rule">
  <p class="ld-lede">One dice bot runs every Legend Dynamics setting. It rolls 3d6 under your target and keeps your table's points, clocks and tracks.
  The commands are the same everywhere; only a few names change with the setting.</p>
</div>

<!-- Block 2: getting started -->
<div class="ld">
  <div class="ld-eyebrow">Getting started</div>
  <ol class="ld-steps">
    <li><b>The GM picks the setting.</b> Run <code>/game set</code> once per Discord server; <code>/game show</code> checks it.</li>
    <li><b>Type <code>/</code> in the game channel.</b> Discord lists every command and shows each option as you fill it in.</li>
    <li><b>Bring your sheet.</b> The bot doesn't know your character: read your target number off your sheet and add up every modifier yourself.</li>
  </ol>
</div>

<!-- Block 3: commands -->
<div class="ld ld-rules">
<h2>For players</h2>
<p>The examples use Dust &amp; Damnation names; swap in your own skill, foe and track. “Legend points” are your setting's points: Grit, Resolve or Fortune.</p>
{table(rows_p)}
<p>Only the player who rolled can press the reroll button. Rolls that miss by 1 or 2 remind the GM that success at a cost is on offer.</p>
<h2>Clocks</h2>
<p>{discord_handout.inline(discord_handout.CLOCK_INTRO)}</p>
{table(discord_handout.clock_rows(generic))}
<p>{discord_handout.inline(discord_handout.CLOCK_NOTE)}</p>
<h2>For the GM</h2>
<p>GM commands need the <strong>Manage Server</strong> permission on the Discord server. Everyone can see clocks, tracks and points.</p>
{table(rows_gm)}
<p>Each server keeps its own points, clocks and tracks, and tracks are kept separately per setting, so switching settings doesn't lose them.</p>
</div>

<!-- Block 4: differences by setting -->
<div class="ld ld-rules" id="differences">
<h2>Differences by setting</h2>
<p>Everything not listed here works the same in every setting, clocks included: the commands, sizes and rules don't change, only the dangers they count down to. A partial track name works: <code>heat</code> finds Heat, <code>dark</code> finds The Dark.</p>
<table><thead><tr><th>Setting</th><th>Choose it with</th><th>Points</th><th>Shared tracks</th><th><code>/seed</code> tables</th><th>Example ticking clocks</th></tr></thead>
<tbody>{"".join(diff)}</tbody></table>
</div>
"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print("wrote", path.relative_to(ROOT))


def main():
    fonts = {BRAND_FONTS} | {pack(g)["terms"]["fontsHref"] for g in GAMES}
    links = "\n".join(f'<link rel="stylesheet" href="{e(h)}">' for h in sorted(fonts))
    write(WEB / "header-injection.html",
          "<!-- Settings → Advanced → Code Injection → HEADER. Loads the brand and game fonts. -->\n"
          '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + links + "\n")
    for g in GAMES:
        write(WEB / "page-injection" / f"{g}.html",
              f"<!-- {pack(g)['terms']['title']} page → Settings → Advanced → Page Header Code Injection. -->\n"
              f'<script>document.documentElement.classList.add("ld-{g}");</script>\n')
    write(WEB / "blocks" / "home.html", home())
    for g in GAMES:
        write(WEB / "blocks" / f"game-{g}.html", game_page(g))
    write(WEB / "blocks" / "core-rules.html", core_rules())
    write(WEB / "blocks" / "discord.html", discord_page())

    # preview.html: the three kinds of page in a plain wrapper, using custom.css, with a tab per theme.
    css = (WEB / "custom.css").read_text()
    strip = lambda s: re.sub(r"<!--.*?-->\n?", "", s, flags=re.S)
    pages = {"home": ("Home", "", strip(home()))}
    for g in GAMES:
        pages[g] = (pack(g)["terms"]["title"], f"ld-{g}", strip(game_page(g)))
    pages["rules"] = ("Core rules", "", strip(core_rules()))
    pages["discord"] = ("Discord", "", strip(discord_page()))
    tabs = "".join(f'<button data-p="{k}" data-c="{c}">{e(n)}</button>' for k, (n, c, _) in pages.items())
    sections = "".join(f'<main class="pv" id="pv-{k}" hidden><section class="page-section"><div class="section-background"></div><div class="content">{body}</div></section></main>' for k, (_, _, body) in pages.items())
    write(WEB / "preview.html", f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Legend Dynamics site preview</title>
{links}
<style>{css}
/* preview only: a stand-in for Squarespace's page frame */
body {{ margin: 0; }}
.pv-bar {{ position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 16px; background: var(--ld-header-bg); }}
.pv-bar b {{ color: var(--ld-header-fg); font-family: var(--ld-display); margin-right: auto; align-self: center; letter-spacing: .04em; }}
.pv-bar button {{ font: 600 .72rem/1 var(--ld-mono); letter-spacing: .1em; text-transform: uppercase; padding: 8px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,.18); background: none; color: var(--ld-header-fg); cursor: pointer; }}
.pv-bar button[aria-pressed="true"] {{ background: var(--ld-accent); color: var(--ld-on-accent); border-color: var(--ld-accent); }}
.page-section {{ position: relative; }}
.page-section .section-background {{ position: absolute; inset: 0; z-index: -1; }}
.content {{ max-width: 72rem; margin: 0 auto; padding: 0 16px 4rem; display: grid; gap: 3rem; }}
</style></head>
<body><div class="pv-bar"><b>Legend Dynamics</b>{tabs}</div>{sections}
<script>
const show = (k) => {{ document.querySelectorAll(".pv").forEach((m) => (m.hidden = m.id !== "pv-" + k));
  document.querySelectorAll(".pv-bar button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === k));
  document.documentElement.className = document.querySelector(`.pv-bar button[data-p="${{k}}"]`).dataset.c; scrollTo(0, 0); }};
document.querySelector(".pv-bar").onclick = (ev) => {{ const b = ev.target.closest("button"); if (b) show(b.dataset.p); }};
document.addEventListener("click", (ev) => {{ const a = ev.target.closest("a[href^='/']"); if (!a) return; ev.preventDefault();
  const k = {{ "{SLUGS['western']}": "western", "{SLUGS['spaceopera']}": "spaceopera", "{SLUGS['fantasy']}": "fantasy", "{SLUGS['exlaw']}": "exlaw", "{CORE_SLUG}": "rules", "{DISCORD_SLUG}": "discord" }}[a.getAttribute("href")]; if (k) show(k); }});
show(location.hash.slice(1) || "home");
</script></body></html>
""")


if __name__ == "__main__":
    main()
