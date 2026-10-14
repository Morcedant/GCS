# Legend Dynamics website: Squarespace kit

> **Not on Squarespace?** The same site, ready for free hosting on Cloudflare Pages, is built by `tools/build-site.py` into `legend-dynamics/site/`. See [`../CLOUDFLARE-PAGES.md`](../CLOUDFLARE-PAGES.md).

A custom design for a Squarespace 7.1 site:
- **The brand:** ink, parchment and brass, for the whole site.
- **Game themes:** Pact of Bones, Fracture Lines and The Shattered Crown, each switched on for that game's own page.

Open [`preview.html`](preview.html) in a browser to see the home page, the three game pages and the core rules before you start.

| File | Where it goes |
|---|---|
| `custom.css` | **Website → Pages → Website Tools → Custom CSS**. Older menus call it **Design → Custom CSS**. |
| `header-injection.html` | **Settings → Advanced → Code Injection → Header**. It loads the fonts. |
| `page-injection/<game>.html` | Each game page's **⚙ Settings → Advanced → Page Header Code Injection**. It switches that page to its game's theme. |
| `blocks/home.html` | Code Blocks on the home page |
| `blocks/game-<game>.html` | Code Blocks on each game page |
| `blocks/core-rules.html` | One or more Code Blocks on the Core Rules page |
| `blocks/discord.html` | Code Blocks on the Discord page: the bot's commands for every setting, and what differs between them |

Custom CSS works on every Squarespace plan. **Code Injection** (the fonts and the page themes) needs a plan that includes it. Without it, the site still gets the colors and layout, but in Squarespace's own fonts, and the game pages use the brand colors.

## Set it up

1. **Base colors.** In **Site Styles → Colors**, pick any light theme. The CSS overrides its colors, but a light base keeps Squarespace's editor readable.
2. **Fonts.** Paste `header-injection.html` into **Code Injection → Header** and save.
3. **The design.** Paste all of `custom.css` into **Custom CSS** and save.
4. **Pages.** Create six pages and set their URL slugs in each page's settings:

   | Page | URL slug |
   |---|---|
   | Home | `/` |
   | Pact of Bones | `/pact-of-bones` |
   | Fracture Lines | `/fracture-lines` |
   | The Shattered Crown | `/the-shattered-crown` |
   | Core Rules | `/core-rules` |
   | Discord | `/discord` |

   The links inside the blocks expect these slugs.
5. **Content.** On each page, add a **Code Block** for each `<!-- Block … -->` section of its file, paste the HTML, and turn **Display Source** off. Put blocks that sit side by side in the same section, or give each its own section.
6. **Game themes.** On each game page, open **⚙ → Advanced → Page Header Code Injection** and paste that game's `page-injection` file. It's one line, and it turns the page's colors and fonts to that game's look.
7. **Core rules.** Paste `blocks/core-rules.html` into a Code Block. If Squarespace says it's too long, split it at any `<h1>` into two or three blocks.

## The creator links

The **Create a character** buttons open the character creators on claude.ai. Those links are **private** until you share them: open each creator and use **Share** to make it viewable by anyone with the link. To host the creators yourself instead, upload the `index.html` files somewhere else (for example GitHub Pages), then change `CREATORS` in `tools/build-website.py` and rebuild.

## Updating

The blocks are generated from the packs, so the game pages pick up new callings, origins and introductions automatically. After changing a pack:

```
python3 tools/build-legend.py
python3 tools/build-website.py
```

Then paste the changed blocks again. Edit `custom.css` by hand.

## Designing more pages

Use these classes in any Code Block, wrapped in `<div class="ld">…</div>`:

| Class | What it is |
|---|---|
| `ld-eyebrow` | Small label above a heading |
| `ld-hero`, `ld-lede`, `ld-rule` | Page opening: big title, lead paragraph, accent rule |
| `ld-actions`, `ld-button`, `ld-button--ghost` | Buttons |
| `ld-pillars` | Three or four short points with a heading each (a `<ul>`) |
| `ld-games`, `ld-game ld-game--western` / `--spaceopera` / `--fantasy` | Game cards, each in its own game's colors |
| `ld-callout` | A boxed rule or tip; start it with `<b>Label</b>` |
| `ld-odds` | The 3d6 odds strip |
| `ld-steps` | A numbered how-to (an `<ol>`) |
| `ld-facts` | An "at a glance" strip (a `<dl>` of `<div><dt>…</dt><dd>…</dd></div>`) |
| `ld-rules`, `ld-toc` | Long-form rules text and its contents box |

To add a game theme to any other page, paste its `page-injection` line there too.

## If something looks off

Squarespace changes its markup from time to time, so a few selectors may need a nudge.

- **Colors didn't change in a section:** that section's color theme is overriding the brand. Set it to the light theme in step 1, or tell me which part looks wrong.
- **Fonts look like Squarespace's defaults:** the Header code injection is missing, or your plan doesn't include Code Injection.
- **A game page isn't themed:** check that its Page Header Code Injection holds the right line, and that you saved the page settings.
