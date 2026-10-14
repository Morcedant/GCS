#!/usr/bin/env python3
"""Build the Legend Dynamics website for Cloudflare Pages: legend-dynamics/site/.

Uses the same page blocks and custom.css as the Squarespace kit (tools/build-website.py), adds the
page frame Squarespace would have supplied (header, navigation, footer), and puts everything the site
links to beside it, so nothing points at claude.ai:

  /                                 home
  /<game>/                          each game's page
  /<game>/create/                   that game's character creator
  /<game>/<Players_Guide>.docx      its Players' Guide in Word
  /core-rules/                      the core rules (and the .docx)
  /discord/                         the Discord bot's commands for every setting
  /discord/<game>/                  each game's printable handout, with the bot's setup and code

Run after build-legend.py:

  python3 tools/build-site.py

Then upload legend-dynamics/site/ in Cloudflare (see legend-dynamics/CLOUDFLARE-PAGES.md).
"""
import html, importlib.util, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
LD = ROOT / "legend-dynamics"
SITE = LD / "site"

spec = importlib.util.spec_from_file_location("bw", ROOT / "tools" / "build-website.py")
bw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bw)
e = html.escape

GAMES, SLUGS = bw.GAMES, bw.SLUGS
# The creators live on the site now.
bw.CREATORS = {g: f"{SLUGS[g]}/create/" for g in GAMES}

NAV = [("/", "Home")] + [(SLUGS[g], bw.pack(g)["terms"]["title"]) for g in GAMES] + [(bw.CORE_SLUG, "Core rules"), (bw.DISCORD_SLUG, "Discord")]

FRAME_CSS = """
/* ---------- 5. Site frame (Cloudflare Pages build; Squarespace supplies its own) ---------- */
html, body { margin: 0; }
body { min-height: 100vh; display: flex; flex-direction: column; }
.ld-skip { position: absolute; left: -999px; top: 0; padding: .6rem 1rem; background: var(--ld-accent); color: var(--ld-on-accent); z-index: 10; }
.ld-skip:focus { left: 16px; }
.ld-header { background: var(--ld-header-bg); color: var(--ld-header-fg); padding-top: env(safe-area-inset-top, 0px); }
.ld-header-in { max-width: 72rem; margin: 0 auto; padding: .9rem 16px; display: flex; flex-wrap: wrap; align-items: center; gap: .6rem 1.4rem; }
.ld-brand { font: 600 1.15rem/1 var(--ld-display); color: var(--ld-header-fg); text-decoration: none; letter-spacing: .02em; margin-right: auto; }
.ld-nav { display: flex; flex-wrap: wrap; gap: .2rem .9rem; }
.ld-nav a { font: 600 .78rem/1 var(--ld-label); letter-spacing: .08em; text-transform: uppercase; color: var(--ld-header-fg);
  text-decoration: none; padding: .45rem 0; border-bottom: 2px solid transparent; opacity: .85; }
.ld-nav a:hover, .ld-nav a[aria-current="page"] { opacity: 1; border-bottom-color: var(--ld-accent); }
.ld-nav a:focus-visible, .ld-brand:focus-visible, .ld-button:focus-visible { outline: 2px solid var(--ld-accent); outline-offset: 3px; }
main { flex: 1; }
.page-section { position: relative; isolation: isolate; }
.page-section .section-background { position: absolute; inset: 0; z-index: -1; }
.page-section .content { max-width: 72rem; margin: 0 auto; padding: clamp(2rem, 5vw, 3.5rem) 16px; }
.ld-footer { background: var(--ld-header-bg); color: var(--ld-header-fg); padding-bottom: env(safe-area-inset-bottom, 0px); }
.ld-footer-in { max-width: 72rem; margin: 0 auto; padding: 1.6rem 16px; display: flex; flex-wrap: wrap; gap: .6rem 1.4rem; font-size: .92rem; }
.ld-footer-in span { margin-right: auto; opacity: .8; }
.ld-footer a { color: var(--ld-header-fg); }
.ld-downloads { display: flex; flex-wrap: wrap; gap: .75rem; margin: 0; padding: 0; list-style: none; }
@media (prefers-reduced-motion: reduce) { .ld-button, .ld-game { transition: none !important; } }
"""


def blocks(text):
    """The <!-- Block … --> sections of a Squarespace block file, without the comments."""
    parts = re.split(r"<!-- Block \d+:[^>]*-->", text)[1:]
    out = [re.sub(r"<!--.*?-->", "", p, flags=re.S).strip() for p in parts]
    return [p for p in out if p] or [re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()]


def same_tab(s):
    """Links within the site open in the same tab."""
    return re.sub(r'(href="/[^"]*")\s+target="_blank"\s+rel="noopener"', r"\1", s)


def page(path, title, desc, body_blocks, theme="", fonts=None):
    here = "/" + path.strip("/")
    here = "/" if here == "/" else here
    nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == here else ""}>{e(n)}</a>' for h, n in NAV)
    sections = "\n".join(f'<section class="page-section"><div class="section-background"></div><div class="content">\n{same_tab(b)}\n</div></section>' for b in body_blocks)
    cls = f' class="ld-{theme}"' if theme else ""
    return f"""<!doctype html>
<html lang="en"{cls}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<link rel="stylesheet" href="/site.css">
</head>
<body>
<a class="ld-skip" href="#main">Skip to content</a>
<header class="ld-header"><div class="ld-header-in"><a class="ld-brand" href="/">Legend Dynamics</a><nav class="ld-nav" aria-label="Site">{nav}</nav></div></header>
<main id="main">
{sections}
</main>
<footer class="ld-footer"><div class="ld-footer-in"><span>Legend Dynamics RPG system, created by Don Smallwood. This RPG is released under the <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener" target="_blank">Creative Commons Attribution 4.0 International License</a>. You may share, adapt, and use it for any purpose, including commercially, as long as you give appropriate credit to the author.</span>
<a href="{bw.CORE_SLUG}">Core rules</a><a href="{bw.DISCORD_SLUG}">Discord bot</a></div></footer>
</body>
</html>
"""


def write(rel, text):
    path = SITE / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def copy(src, rel):
    path = SITE / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, path)


def downloads(links):
    items = "".join(f'<li><a class="ld-button ld-button--ghost" href="{h}" download>{e(t)}</a></li>' for h, t in links)
    return f'<div class="ld"><div class="ld-eyebrow">Downloads</div><ul class="ld-downloads">{items}</ul></div>'


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    fonts_all = {bw.BRAND_FONTS} | {bw.pack(g)["terms"]["fontsHref"] for g in GAMES}
    font_links = lambda hrefs: "\n".join(f'<link rel="stylesheet" href="{e(h)}">' for h in sorted(hrefs))

    write("site.css", (LD / "website" / "custom.css").read_text() + FRAME_CSS)
    write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#15171c"/>'
          '<path d="M32 9 52 21v22L32 55 12 43V21Z" fill="none" stroke="#9b6b1f" stroke-width="4"/>'
          '<text x="32" y="41" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#efe6d2">LD</text></svg>')

    write("index.html", page("/", "Legend Dynamics RPG", "A tabletop roleplaying system on 3d6 roll-under: Gothic Westerns, science fiction, swords against sorcery and superheroes.",
                             [b for b in blocks(bw.home()) if "rel=\"license" not in b], fonts=font_links(fonts_all)))

    for g in GAMES:
        t = bw.pack(g)["terms"]
        slug = SLUGS[g].strip("/")
        guide = next((LD / g).glob("*.docx"))
        copy(guide, f"{slug}/{guide.name}")
        copy(LD / g / "index.html", f"{slug}/create/index.html")
        b = blocks(bw.game_page(g))
        b.append(downloads([(f"{SLUGS[g]}/{guide.name}", f"{t['title']} Players' Guide (Word)")]))
        write(f"{slug}/index.html", page(SLUGS[g], f"{t['title']} · Legend Dynamics", re.sub(r"<[^>]+>", "", bw.first_para(g))[:300],
                                          b, theme=g, fonts=font_links({bw.BRAND_FONTS, t["fontsHref"]})))

    core_docx = LD / "Legend_Dynamics_Core_Rules.docx"
    copy(core_docx, f"core-rules/{core_docx.name}")
    write("core-rules/index.html", page(bw.CORE_SLUG, "Core rules · Legend Dynamics", "The Legend Dynamics core rules, shared by every setting.",
                                        [downloads([(f"{bw.CORE_SLUG}/{core_docx.name}", "Core rules (Word)")])] + blocks(bw.core_rules()),
                                        fonts=font_links({bw.BRAND_FONTS})))

    d = blocks(bw.discord_page())
    rows = "".join(f'<li><a class="ld-button ld-button--ghost" href="{bw.DISCORD_SLUG}/{SLUGS[g].strip("/")}/">{e(bw.pack(g)["terms"]["title"])}</a></li>' for g in GAMES)
    d.append(f"""<div class="ld">
  <div class="ld-eyebrow">For the GM</div>
  <h2 style="margin:.2rem 0 .8rem">Run the bot for your group</h2>
  <p style="max-width:40rem">Each setting has a one-page handout for your table, with the steps to set the bot up (about 15 minutes, free) and the bot's code to copy.</p>
  <ul class="ld-downloads">{rows}</ul>
</div>""")
    for g in GAMES:
        # The handout is written as an artifact page (no document skeleton); give it one, and a way back.
        h = (LD / g / "discord-commands.html").read_text()
        h = h.replace('<div class="wrap">', f'<div class="wrap">\n  <a href="{bw.DISCORD_SLUG}/">← Legend Dynamics · Play on Discord</a>', 1)
        write(f"discord/{SLUGS[g].strip('/')}/index.html",
              '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
              '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' + h)
    write("discord/index.html", page(bw.DISCORD_SLUG, "Play on Discord · Legend Dynamics", "The Legend Dynamics dice bot's commands for every setting.",
                                     d, fonts=font_links({bw.BRAND_FONTS})))

    write("404.html", page("/404", "Not found · Legend Dynamics", "Page not found.",
                           ['<div class="ld ld-hero"><div class="ld-eyebrow">404</div><h1>Lost on the trail.</h1><hr class="ld-rule">'
                            '<p class="ld-lede">That page isn\'t here. Try the home page or the core rules.</p>'
                            f'<div class="ld-actions"><a class="ld-button" href="/">Home</a><a class="ld-button ld-button--ghost" href="{bw.CORE_SLUG}">Core rules</a></div></div>'],
                           fonts=font_links({bw.BRAND_FONTS})))
    # Cloudflare Pages redirects: old addresses keep working after a rename (first match wins).
    # The game was Dust & Damnation, then Pact of Bones; both old addresses go straight to the current one.
    new, guide = "/trails-of-blood-and-dust", "Trails_of_Blood_Dust_Players_Guide.docx"
    rules = []
    for old, old_guide in [("/dust-and-damnation", "Dust_Damnation_Players_Guide.docx"), ("/pact-of-bones", "Pact_of_Bones_Players_Guide.docx")]:
        rules += [(f"{old}/{old_guide}", f"{new}/{guide}"), (old, f"{new}/"), (f"{old}/*", f"{new}/:splat"),
                  (f"/discord{old}", f"/discord{new}/"), (f"/discord{old}/*", f"/discord{new}/:splat")]
    write("_redirects", "".join(f"{a} {b} 301\n" for a, b in rules))
    n = sum(1 for p in SITE.rglob("*") if p.is_file())
    print(f"wrote {n} files into {SITE.relative_to(ROOT)}/")


def make_zip(dest):
    """The upload for Cloudflare Pages: the site's files at the zip's top level (index.html first), never inside a folder."""
    import zipfile
    dest = pathlib.Path(dest)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(SITE.rglob("*"), key=lambda p: (p.name != "index.html" or p.parent != SITE, str(p))):
            if p.is_file():
                z.write(p, p.relative_to(SITE).as_posix())
    print(f"wrote {dest} (index.html at the top level)")


if __name__ == "__main__":
    import sys
    main()
    if "--zip" in sys.argv:
        make_zip(sys.argv[sys.argv.index("--zip") + 1])
