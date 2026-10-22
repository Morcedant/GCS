# Legend Dynamics RPG system

A roleplaying system for heroic stories in any genre: concrete skills, a 3d6 roll-under core, and a small pool of
Legend points that reward characters for accepting trouble from their flaws. The core rules are setting-neutral;
**setting packs** supply each genre.

| | |
|---|---|
| `Legend_Dynamics_Core_Rules.md` (and `.docx`) | The setting-neutral core rules |
| `western/` | **Trails of Blood & Dust**, a Gothic Western: creator (`index.html`), Players' Guide (`players-guide.md`, `.docx`) |
| `spaceopera/` | **Fracture Lines**, space opera: creator, Players' Guide |
| `fantasy/` | **The Shattered Crown**, sword and sorcery: creator, Players' Guide (with cantrips and a Corruption track) |
| `packs/<id>/` | Each pack's source: `pack.json` (data) and `setting.md` (setting chapters) |
| `engine/` | The creator template (`creator.html`) and the core rules text (`core.md`) shared by every pack |

Everything in `western/`, `spaceopera/` and the core rules files is generated. Edit the sources, then rebuild:

```
python3 tools/build-legend.py --docx            # every pack, plus the core rules
python3 tools/build-legend.py western           # one pack
python3 tools/packs/check_aurora.py             # after editing Aurora: checks its data and ready-made characters
```

(Needs pandoc; python-docx styles the Word files.)

## The core rules in one paragraph

Five attributes start at 10. Skills are Untrained (attribute −4), Trained (+1), Specialty (+3) or Expert (+5); roll 3d6
at or under the target. An origin (species, background, heritage) adjusts attributes by a net zero and has a tier; every
character splits 3 points between that tier and Edges. One advantage (+2 in a narrow situation) and one complication
(earns a Legend point when it causes real trouble). Injuries are three boxes; the weapon decides how many a hit marks.
Clocks, success at a cost, contests and assistance keep the story moving.

## Making a setting pack

Copy `packs/western/` to `packs/<your-id>/`, change the data and the setting text, and build. The creator, guide and Word
file are produced from them; nothing in the engine needs to change.

### `pack.json`

| Key | What it is |
|---|---|
| `id` | Short name; also the browser storage prefix and the output folder |
| `terms` | Words the creator and guide use. Points (`point`: Grit, Resolve), role and origin names (`role`, `origin`, `originPlural`), training paths (`pathRounded`, `pathExpert`), tab and readiness text, `mission` and `journal` names, weapon-tracker words (`ammo`, `reload`, `restock`…), track-panel words, combat skill names for the rules text (`rangedSkill`, `meleeSkill`, `unarmedSkill`, `chaseSkill`), medicine (`medkit`, `facility`), and the Google Fonts link (`fontsHref`). Anything left out uses the defaults in `tools/build-legend.py`. |
| `theme` | `css` (the colour and font variables), a few glow colours, and `particles` (stars drifting `left`, embers rising `up`, or ash falling `down`) |
| `groups` | Role groups: `id`, `name`, accent `color` variable and the seal's `emblem` (an SVG path in a 100×100 box) |
| `roles` | Each role's `name`, `group` and suggested `text` |
| `skills`, `physical` | `[name, attribute, use]` rows, and which skills injuries hinder |
| `origins` | Species, backgrounds or heritages: `id`, `name`, `tier` (0–3), `adj` (must total 0), `desc`, `core` rules, optional `freeSkill`, optional `form` (an alternate form's `attrs` bonuses, `dodge`, `traits`, `drawbacks`), suggested `skills`, optional `restricted` (hidden until the table opts in), and `traits`: `[id, name, effect, roll, gives +2?, companion name, companion text]` |
| `formCore` | Rules shared by every origin with a form |
| `edgePoints` | Points split between tier and Edges (3) |
| `allegiances` | `[id, name, benefit, burden]` |
| `reasons`, `connections` | Top-10 quick picks: `[label, text]` |
| `advantages` | `[id, name, effect, skill, optional detail label]` |
| `complications`, `triggers` | `[id, name, text]`, and three suggested triggers per complication |
| `equipment` | `[id, name, effect]`; an id that matches a weapon links the two |
| `weapons` | The ammunition or power tracker: `skill`, `items` (`id: [name, capacity]`), `modes` (`[id, name, cost, only these weapons or null, roll modifier]`), `equipLinked`, `jamOn18`, `defaultSpares` |
| `tracks` | Shared tracks (a ship, Trouble…): `name`, `boxes`, and `effects` for 0…boxes |
| `seeds` | Six d12 tables: `mission`, `place`, `strange`, `twist`, `clock` (`[name, segments]`), `who` |
| `journal` | `mode` (`calendar` with a `start` date, `stardate` with a `start` number, or `reign` with `months`, an `era` and a `start` of `[year, month index, day]`) and `outcomes` |
| `spells` | Optional. Cantrips a caster picks: `skill`, `plural`, `known` (`[Trained, Specialty, Expert]`), who can cast (`roles`, `advantages`, `originAdvantages`), a `note`, and `list` (`[id, name, effect]`) |
| `personalTrack` | Optional. A track every character keeps on their own sheet (e.g. Corruption): `name`, `boxes`, `effects` for 0…boxes |
| `quickRef` | Extra quick-reference lines for the play sheet |
| `example`, `pregens` | Characters in the creator's save format; the guide's text for them is generated, numbers included |

### `setting.md`

Chapters marked with `<!-- SECTION:name -->`: `intro`, `weapons` (the damage table), `medicine`, `tracks`, `setting`
(the world, factions, special rules and threats, as top-level `#` chapters) and `advantages` (notes after the table).

### Checking a pack

The builder stops on unfilled terms. Open the built `index.html`: the example and every ready-made character should
show **Ready** in the checklist, which means they follow the creation rules exactly.

## Discord dice bot

[`discord-bot/`](discord-bot/README.md) is one free Discord bot for every pack, plus USS Pelion and Grimm: `/roll`, `/contest`, `/assist`,
`/points`, `/clock`, `/track`, `/seed` and `/game`. Each server picks its game with `/game set`. The point name,
shared tracks and seed tables come from the packs: the builder writes them into `discord-bot/src/worker.js`
on every run, so redeploy the bot after changing a pack.

## Website

[`website/`](website/README.md) is a Squarespace kit for a Legend Dynamics site. It has a brand stylesheet with a theme for each game, ready-made Code Block HTML for the home page, each game page and the core rules, and `preview.html` to see it. Rebuild it with `python3 tools/build-website.py`; `tools/build-site.py` (the Cloudflare site) rebuilds it too.
