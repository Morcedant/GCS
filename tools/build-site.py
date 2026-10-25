#!/usr/bin/env python3
"""Build the Legend Dynamics website for Cloudflare Pages: legend-dynamics/site/.

Uses the same page blocks and custom.css as the Squarespace kit (tools/build-website.py), adds the
page frame Squarespace would have supplied (header, navigation, footer), and puts everything the site
links to beside it, so nothing points at claude.ai:

  /                                 home
  /<game>/                          each game's page
  /<game>/create/                   that game's character creator
  /<game>/<Players_Guide>.docx      its Players' Guide in Word (and its GM's Guide, where it has one)
  /start/                           Start here: choose a setting, create a character, play
  /core-rules/                      the core rules (and the .docx)
  /changelog/                       rules changes and website updates (from rules-version.json)
  /discord/                         the Discord bot's commands for every setting
  /discord/<game>/                  each game's printable handout, with the bot's setup and code
  /blog/                            the dev blog: posts from the table server (/blog/?p=<id> for one post)
  /blog/write/                      the author's page for writing them, behind the DEV code (not linked or indexed)

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

BLOG_SLUG = "/blog"
# The table server holds the blog's posts (legend-dynamics/table-server/server-url.txt, as for the creators).
_url = (LD / "table-server" / "server-url.txt")
BLOG_SERVER = _url.read_text().strip() if _url.exists() else ""
NAV = [("/", "Home"), (bw.START_SLUG, "Start here"), (bw.WHY_SLUG, "About")] + [(SLUGS[g], bw.pack(g)["terms"]["title"]) for g in GAMES] + [(bw.CORE_SLUG, "Core rules"), (bw.TABLE_SLUG, "Shared table"), (bw.DISCORD_SLUG, "Discord"), (BLOG_SLUG, "Dev blog"), (bw.CONTACT_SLUG, "Contact")]

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
/* The dev blog (/blog/, website/blog.js) */
.ld-posts { display: grid; gap: 1rem; }
.ld-post-card { background: var(--ld-panel); border: 1px solid var(--ld-line); border-radius: var(--ld-radius); padding: 1.1rem 1.2rem; }
.ld-post-card h2 { margin: .25rem 0 .5rem; font-size: clamp(1.1rem, 2vw, 1.4rem); }
.ld-post-card h2 a { color: var(--ld-ink); text-decoration: none; }
.ld-post-card h2 a:hover { color: var(--ld-accent); }
.ld-post-card p { margin: 0 0 .6rem; }
.ld-post-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.ld-post-tags .ld-tag { font: .72rem/1 var(--ld-mono); letter-spacing: .08em; padding: .35rem .6rem; border: 1px solid currentColor; border-radius: 999px; color: var(--ld-accent); }
[hidden] { display: none !important; }
.ld-blog-tags { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1.4rem; }
.ld-blog-tags a { border: 1px solid var(--ld-line); border-radius: 999px; padding: .3rem .8rem; font: 600 .78rem/1.2 var(--ld-label); color: var(--ld-ink); text-decoration: none; }
.ld-blog-tags a[aria-current="page"], .ld-blog-tags a:hover { border-color: var(--ld-accent); color: var(--ld-accent); }
.ld-post { max-width: 46rem; margin: 0 auto; }
.ld-post h1 { margin: .3rem 0 .6rem; }
.ld-post .ld-rules { max-width: none; }
.ld-note { font-size: .9rem; color: var(--ld-ink-2); }
.ld-bad { color: var(--ld-accent-2, #b8383a); }
.ld-w-list { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: .5rem; max-width: 46rem; }
.ld-w-list button { width: 100%; text-align: left; display: grid; gap: .2rem; background: var(--ld-panel); color: var(--ld-ink); border: 1px solid var(--ld-line); border-radius: var(--ld-radius); padding: .8rem 1rem; font: inherit; cursor: pointer; }
.ld-w-list button:hover { border-color: var(--ld-accent); }
.ld-w-list span { font-size: .85rem; color: var(--ld-ink-2); }
.ld-w-tags { border: 1px solid var(--ld-line); border-radius: var(--ld-radius); display: flex; flex-wrap: wrap; gap: .5rem 1rem; padding: .6rem .8rem; margin: 0; }
.ld-w-tags legend { font: 600 .76rem/1.2 var(--ld-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ld-ink-2); padding: 0 .3rem; }
.ld-form .ld-w-tags label { display: flex; align-items: center; gap: .35rem; font: 400 .95rem/1.3 var(--ld-body); letter-spacing: normal; text-transform: none; color: var(--ld-ink); }
.ld-form .ld-w-tags input { width: auto; }
.ld-w-tools { display: flex; flex-wrap: wrap; gap: .4rem; }
.ld-w-tools button { background: var(--ld-panel); color: var(--ld-ink); border: 1px solid var(--ld-line); border-radius: var(--ld-radius); padding: .4rem .7rem; font: 600 .85rem/1 var(--ld-body); cursor: pointer; min-height: 2.2rem; }
.ld-w-tools button:hover, .ld-w-tools button[aria-pressed="true"] { border-color: var(--ld-accent); }
.ld-w-preview { border: 1px dashed var(--ld-line); border-radius: var(--ld-radius); padding: .4rem 1rem; max-width: none; }
.ld-w-edit textarea { min-height: 22rem; font-size: 1rem; }
"""


def blocks(text):
    """The <!-- Block … --> sections of a Squarespace block file, without the comments."""
    parts = re.split(r"<!-- Block \d+:[^>]*-->", text)[1:]
    out = [re.sub(r"<!--.*?-->", "", p, flags=re.S).strip() for p in parts]
    return [p for p in out if p] or [re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()]


def same_tab(s):
    """Links within the site open in the same tab."""
    return re.sub(r'(href="/[^"]*")\s+target="_blank"\s+rel="noopener"', r"\1", s)


# The playtest label (build-website.py SITE_PLAYTEST): a band above the home page's header (only there).
PLAYTEST_BAR = (f'<div class="ld-playtest" role="note"><span class="ld-playtest-tag">Playtest</span> {e(bw.PLAYTEST_TEXT)}</div>' if bw.SITE_PLAYTEST else "")


# The light copy deterrent on a page of rules: no selecting, copying or right-click menu in the main text.
PROTECT = """<style>.ld-protected { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }</style>
<script>(() => { const m = document.getElementById("main"); m.classList.add("ld-protected");
  for (const ev of ["copy", "cut", "contextmenu", "dragstart"]) m.addEventListener(ev, (e) => e.preventDefault()); })();</script>"""


def page(path, title, desc, body_blocks, theme="", fonts=None, protect=False, blog=False, robots=""):
    here = "/" + path.strip("/")
    here = "/" if here == "/" else here
    nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == here else ""}>{e(n)}</a>' for h, n in NAV)
    sections = "\n".join(f'<section class="page-section"><div class="section-background"></div><div class="content">\n{same_tab(b)}\n</div></section>' for b in body_blocks)
    cls = (f' class="ld-{theme}"' if theme else "") + (f' data-blog-server="{e(BLOG_SERVER)}"' if blog else "")
    return f"""<!doctype html>
<html lang="en"{cls}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">{f'<meta name="robots" content="{robots}">' if robots else ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<link rel="stylesheet" href="/site.css">
</head>
<body>
<a class="ld-skip" href="#main">Skip to content</a>
{PLAYTEST_BAR if here == "/" else ""}
<header class="ld-header"><div class="ld-header-in"><a class="ld-brand" href="/">Legend Dynamics</a><nav class="ld-nav" aria-label="Site">{nav}</nav></div></header>
<main id="main">
{sections}
</main>
<footer class="ld-footer"><div class="ld-footer-in"><span>Legend Dynamics RPG system, created by Don Smallwood. Copyright © Don Smallwood. All rights reserved.</span>
<a href="{bw.CORE_SLUG}">Core rules</a><a href="{bw.TABLE_SLUG}">Shared table</a><a href="{bw.DISCORD_SLUG}">Discord bot</a><a href="{bw.CHANGELOG_SLUG}">Changelog</a><a href="{BLOG_SLUG}/">Dev blog</a><a href="/join">Join our Discord</a><a href="{bw.CONTACT_SLUG}">Contact</a> · <a href="mailto:{bw.CONTACT_EMAIL}">{bw.CONTACT_EMAIL}</a></div></footer>{PROTECT if protect else ""}{'<script src="/blog.js" defer></script>' if blog else ""}
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

    home = [b for b in blocks(bw.home()) if "All rights reserved" not in b]
    home.insert(next(i for i, b in enumerate(home) if 'id="online"' in b), '<div class="ld" id="ld-blog-latest" hidden></div>')  # filled when there are posts
    write("index.html", page("/", "Legend Dynamics RPG", "A tabletop roleplaying system on 3d6 roll-under: Gothic Westerns, science fiction, swords against sorcery and superheroes.",
                             home, fonts=font_links(fonts_all), blog=True))
    copy(LD / "website" / "blog.js", "blog.js")
    write("blog/index.html", page(BLOG_SLUG, "Dev blog · Legend Dynamics", "News from the making of Legend Dynamics: rules changes, the settings, and what's coming.",
                                  ['<div class="ld ld-hero" id="ld-blog-hero"><div class="ld-eyebrow">Legend Dynamics RPG system</div><h1>Dev blog</h1><hr class="ld-rule">'
                                   '<p class="ld-lede">News from the making of the game: rules changes, the settings, playtest notes and what\'s coming. '
                                   f'For the list of every rules change, see the <a href="{bw.CHANGELOG_SLUG}">changelog</a>.</p></div>',
                                   '<div class="ld" id="ld-blog"><noscript>The dev blog needs JavaScript.</noscript></div>'],
                                  fonts=font_links({bw.BRAND_FONTS}), blog=True))
    write("blog/write/index.html", page(BLOG_SLUG + "/write", "Write · Dev blog · Legend Dynamics", "The dev blog's author page.",
                                        ['<div class="ld ld-hero"><div class="ld-eyebrow">Dev blog</div><h1>Write a post</h1><hr class="ld-rule"></div>',
                                         '<div class="ld" id="ld-blog-write"><noscript>Writing needs JavaScript.</noscript></div>'],
                                        fonts=font_links({bw.BRAND_FONTS}), blog=True, robots="noindex, nofollow"))

    for g in GAMES:
        t = bw.pack(g)["terms"]
        slug = SLUGS[g].strip("/")
        # The Players' Guide only: the GM's Guide goes to registered GMs, from the table server (tools/gm_guides.py).
        guide = next((LD / g).glob("*_Players_Guide.docx"))
        links = [(f"{SLUGS[g]}/{guide.name}", f"{t['title']} Players' Guide (Word)")]
        copy(guide, f"{slug}/{guide.name}")
        # The creator, with links back to the site above its header (the published creator has none).
        nav = (f'<nav class="site-back no-print" aria-label="Site"><a href="/">← Legend Dynamics home</a>'
               f'<a href="{SLUGS[g]}">{e(t["title"])}</a></nav>')
        write(f"{slug}/create/index.html", re.sub(r"<!-- SITE-NAV:.*?-->", lambda _: nav, (LD / g / "index.html").read_text(), count=1))
        b = blocks(bw.game_page(g))
        b.append(downloads(links))
        write(f"{slug}/index.html", page(SLUGS[g], f"{t['title']} · Legend Dynamics", re.sub(r"<[^>]+>", "", bw.first_para(g))[:300],
                                          b, theme=g, fonts=font_links({bw.BRAND_FONTS, t["fontsHref"]})))

    core_docx = LD / "Legend_Dynamics_Core_Rules.docx"
    copy(core_docx, f"core-rules/{core_docx.name}")
    write("core-rules/index.html", page(bw.CORE_SLUG, "Core rules · Legend Dynamics", "The Legend Dynamics core rules, shared by every setting.",
                                        (lambda cr: cr[:1] + [downloads([(f"{bw.CORE_SLUG}/{core_docx.name}", "Core rules (Word)")])] + cr[1:])(  # the title first, then the download
                                            [b for b in blocks(bw.core_rules()) if "All rights reserved" not in b]),
                                        fonts=font_links({bw.BRAND_FONTS}), protect=True))

    write(bw.WHY_SLUG.strip("/") + "/index.html", page(bw.WHY_SLUG, "Why Legend Dynamics · Legend Dynamics", "Why the Legend Dynamics roleplaying game system was made: the 3d6 bell curve married to Fate's narrative heart.",
                                                     blocks(bw.why_page()), fonts=font_links({bw.BRAND_FONTS})))

    write(bw.TABLE_SLUG.strip("/") + "/index.html", page(bw.TABLE_SLUG, "The shared table · Legend Dynamics", "Play Legend Dynamics online with the shared table" + (", and host your own table server on Cloudflare." if bw.TABLE_HOSTING else "."),
                                                       blocks(bw.table_page()), fonts=font_links({bw.BRAND_FONTS})))

    write(bw.CONTACT_SLUG.strip("/") + "/index.html", page(bw.CONTACT_SLUG, "Contact · Legend Dynamics", "Comments, questions and stories for the maker of the Legend Dynamics roleplaying games.",
                                                         blocks(bw.contact_page()), fonts=font_links({bw.BRAND_FONTS})))

    write(bw.START_SLUG.strip("/") + "/index.html", page(bw.START_SLUG, "Start here · Legend Dynamics", "New to Legend Dynamics? Choose a setting, create a character, and join or run a game.",
                                                       blocks(bw.start_page()), fonts=font_links({bw.BRAND_FONTS})))

    write(bw.CHANGELOG_SLUG.strip("/") + "/index.html", page(bw.CHANGELOG_SLUG, "Changelog · Legend Dynamics", "Changes to the Legend Dynamics rules and website.",
                                                           blocks(bw.changelog_page()), fonts=font_links({bw.BRAND_FONTS})))

    d = blocks(bw.discord_page())
    rows = "".join(f'<li><a class="ld-button ld-button--ghost" href="{bw.DISCORD_SLUG}/{SLUGS[g].strip("/")}/">{e(bw.pack(g)["terms"]["title"])}</a></li>' for g in GAMES)
    d.append(f"""<div class="ld">
  <div class="ld-eyebrow">For the GM</div>
  <h2 style="margin:.2rem 0 .8rem">Handouts and the bot code</h2>
  <p style="max-width:40rem">Each setting has a one-page handout for your table: its commands, the setup steps above, the <b>bot code</b> to copy (the same for every game) and what to check if it isn't working.</p>
  <ul class="ld-downloads">{rows}</ul>
</div>""")
    for g in GAMES:
        # The handout is written as an artifact page (no document skeleton); give it one, and a way back.
        h = (LD / g / "discord-commands.html").read_text()
        h = h.replace('<div class="wrap">', f'<div class="wrap">\n  <a href="{bw.DISCORD_SLUG}/">← Legend Dynamics · Play on Discord</a>', 1)
        # Its title at the size of every other page's title on the site (.ld-hero h1 in custom.css).
        h = h.replace("</style>", "  h1 { font-size: clamp(1.3rem, 3.5vw, 2.5rem); line-height: 1.1; }\n</style>", 1)
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
    # /join: the community Discord's invite (302, so a new invite takes over at once).
    write("_redirects", "".join(f"{a} {b} 301\n" for a, b in rules) + f"/join {bw.DISCORD_INVITE} 302\n")
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
    bw.main()  # refresh the Squarespace kit from the same sources, so it never drifts from the site
    main()
    if "--zip" in sys.argv:
        make_zip(sys.argv[sys.argv.index("--zip") + 1])
