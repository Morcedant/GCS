# GCS
GCS Templates: character creators, players' guides and Discord dice bots for 3d6 roll-under games.

| Game | Folder | Setting |
|---|---|---|
| USS Pelion | `uss-pelion/`, `discord-bot/` | Star Trek, campaign year 2268 |
| Grimm | `grimm-west/` | Gothic horror in the Grimm-verse, the late 1800s |

Both games share the same rules engine. To start another variant, copy one game's folder and change its data
(see *Grimm* below for what changed), then build its guide with `python3 tools/build-guide.py --game <folder> --docx`.

## Grimm Character Creator

`grimm-west/index.html` is the same creator re-flavored for a gothic Grimm game set in the late 1800s,
with a dark, old-book look. Open it in any browser.

- **Calling** (Law, Learned or Frontier groups) replaces department; **Well-rounded** (Specialty +3, nine Trained) or
  **Old hand** (Expert +5, seven Trained) replaces officer and General Services.
- **Heritage** replaces species: Human, Grimm, Incantare (magic users, who choose a Lens) and ten Wesen kinds,
  each with net-zero adjustments and heritage advantages paired with companion complications.
- 19 frontier skills (including Wesen Lore, Occult, Apothecary, Riding, Shooting, Melee), **Grit** points instead of
  Duty points, a **woge** toggle for Wesen, **guns and rounds** (derringer, revolver, shotgun, rifle; fan the hammer,
  both barrels, covering fire, reloads, jams on a natural 18) instead of phaser power, and **Trouble** tracks
  (Suspicion, Exposure, Attention) instead of the ship.
- The GM view rolls **case seeds** and keeps a **case journal** (with a "for the books" entry); six ready-made riders.
- **Heritages come from your GURPS templates** (see `grimm-west/gurps-conversion.md`), in power tiers balanced by **Edges**,
  with woge profiles that apply while woged, an optional **Allegiance**, Incantare Lenses as ritual styles, and horror-only
  heritages behind a switch. Edit `grimm-west/data/heritages.json`, then run `python3 tools/gen-heritages.py` and
  `python3 tools/build-guide.py --game grimm-west --docx`.
- The guide is `grimm-west/players-guide.md` and `grimm-west/Grimm_Players_Guide.docx`; the Discord bot
  (`/grimm`, `/grit`, `/clock`, `/contest`, `/assist`) is in `grimm-west/discord-bot/`.

## USS Pelion Officer Creator

`uss-pelion/index.html` is a self-contained character creator and play sheet for the
*USS Pelion* Players' Guide (3d6 roll-under, campaign year 2268). Open it in any browser; no build step.

- **Look**: a Strange New Worlds-style bridge console with a delta insignia and accent color that follow the department.
- **Create**: the guide's five steps: department (including General Services for enlisted Crewman and Yeoman ranks, who take one Expert skill at +5 and seven Trained), species with net-zero attribute adjustments (Human, Vulcan, Andorian, Tellarite, Aenar, Illyrian, Lanthanite, Caitian, Aurelian, Orion, Denobulan, Trill, Saurian, or custom), attributes (10 + species adjustment, +5 points, max 13 + species bonus),
  one Specialty (+3) and nine Trained (+1) skills with Untrained at −4, advantage, complication,
  equipment and crew connection. A readiness checklist flags anything that breaks the creation rules.
- **Portrait or token**: upload, drop or paste an image; it is resized in the browser, shown as a round token or portrait in the header and on the sheet, and saved with the character.
- **Species advantages**: each species offers two or three advantages (a narrow +2 or a GM-limited ability), each paired with a companion complication. A species advantage replaces the regular advantage; the regular complication still applies. Custom pairs are supported.
- **Duty station**: final skill targets with 3d6 odds, Dodge, injury track, Duty points, and a roller that
  applies circumstance modifiers, assistance, advantage, injury and stun penalties, natural 3–4 / 17–18,
  margins, and Duty point rerolls.
- **Save to file** writes the character to a `.json` file in Downloads; **Open file** loads it on any computer or phone. Quick saves also stay in the browser, but only on that device.

### Saving a sheet as PDF

Open `uss-pelion/index.html` directly in a browser (not the hosted artifact, which blocks printing),
build or load your officer, then press **Save as PDF** in the header (or Ctrl/Cmd+P) and choose
"Save as PDF" as the destination. The printout is a light, ink-friendly version of the character sheet
with blank injury and Duty point tracks and the quick reference.

## Players' Guide

`uss-pelion/players-guide.md` is the revised Players' Guide: the original rules plus General Services,
species attribute adjustments, and species advantages with companion complications. It appears in the
creator's **Players' Guide** tab and as `uss-pelion/USS_Pelion_Players_Guide.docx`.

After editing the Markdown, rebuild both with `python3 tools/build-guide.py --docx` (add `--game grimm-west` for the Grimm guide)
(needs pandoc; python-docx adds table borders to the Word file).

## Discord dice bot

`discord-bot/` is a free `/pelion` slash command for Discord that rolls 3d6 under a target with the
guide's rules and offers a Duty point reroll. It runs on Cloudflare Workers; setup steps are in
[`discord-bot/README.md`](discord-bot/README.md).

### Play aids

The Duty station tab also has **Clocks** (danger and progress clocks you tap to fill) and **USS Pelion status**
(Shields, Hull and six systems with damage boxes). Both are kept in the browser for the table, not in a character
file. The guide covers success at a cost, clocks, the ship's tracks, and a Threats chapter of ready opponents.

### GM view

The **GM view** tab shows the whole crew: open every player's character file at once (or a saved crew file), add
officers saved in the browser or the ready-made crew, and track each one's injuries and Duty points from a card that
also shows attributes, Dodge, skills, advantage and complication. A turn-order list sorts the crew by Agility.
**Save crew to file** keeps the GM's copies.

### Mission seeds, captain's log and advancement

The GM view also rolls **mission seeds** (mission, place, something strange, twist, ticking clock, key character;
re-roll any part, start the clock) and keeps a **captain's log**. Logging a mission can apply each crew member's
advancement to the GM's copy; **Save officer file** on a crew card hands the update back. Players can also record an
approved advancement under Step 3, which raises their skill limits so the character still passes the checklist.
The same tables and log questions are in the guide's *Running missions* chapter.
