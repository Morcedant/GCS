#!/usr/bin/env python3
"""Each game's Discord commands handout: <game folder>/discord-commands.html, a page to give players
(players' commands first, then the GM's), in the look of that game's creator.

The guides don't mention the bot at all. build-legend.py writes the handout for the Legend Dynamics
packs; run this file to write the handouts for USS Pelion and Grimm.
"""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "legend-dynamics" / "discord-bot" / "games"

# Per game: the bot's /game choice, example names for the tables, and the old command names it keeps.
EXAMPLES = {
    "western": {"skill": "Shooting", "target": 13, "foe": "Werewolf", "foeTarget": 14, "contest": "Grapple",
                "assist": "Hold the door", "helperSkill": "Athletics", "track": "dark", "trackFull": "The Dark"},
    "spaceopera": {"skill": "Piloting", "target": 14, "foe": "Hegemony legionary", "foeTarget": 14, "contest": "Grapple",
                   "assist": "Crack the station lock", "helperSkill": "Computers", "track": "heat", "trackFull": "Heat"},
    "fantasy": {"skill": "Melee", "target": 14, "foe": "Serpent-priest", "foeTarget": 13, "contest": "Grapple",
                "assist": "Force the tomb door", "helperSkill": "Athletics", "track": "doom", "trackFull": "Doom"},
    "grimm": {"skill": "Tracking", "target": 13, "foe": "Blutbad", "foeTarget": 14, "contest": "Grapple",
              "assist": "Hold the door", "helperSkill": "Athletics", "track": "exposure", "trackFull": "Exposure",
              "old": ("grimm", "grit")},
    "pelion": {"skill": "Sensors", "target": 16, "foe": "Klingon warrior", "foeTarget": 13, "contest": "Grapple",
               "assist": "Repair the overload", "helperSkill": "Engineering", "track": "shields", "trackFull": "Shields",
               "old": ("pelion", "duty")},
}


def game_info(gid, title, point, tracks, seeds, track_title):
    clocks = seeds.get("clock", ["", []])[1]
    clock, size = (clocks[0] if clocks else ["The mob forms", 4])
    return {"id": gid, "title": title, "point": point, "tracks": [t["name"] for t in tracks],
            "trackTitle": track_title, "clock": clock, "clockSize": size, **EXAMPLES[gid]}


def a(word):
    return ("an " if word[:1].lower() in "aeiou" else "a ") + word


def rows(g):
    """(players' rows, GM's rows): each a (command, what it does) pair in Markdown."""
    P, pts = g["point"], "/points"
    tracks = ", ".join(g["tracks"])
    rows_p = [
        (f"`/roll target:{g['target']} modifier:-2 label:{g['skill']}`",
         f"Roll 3d6 under your target. Use the number from your sheet, and add up every modifier yourself: circumstance, injury, assistance. "
         f"The bot shows the result, the margin and your chance. **Spend {a(P)} point to reroll** lets you reroll once, and the second result stands."),
        (f"`/contest target:{g['target']} opponent:{g['foeTarget']} opponent_name:\"{g['foe']}\" label:{g['contest']}`",
         "An opposed roll. The bot rolls both sides and names the winner. Ties and double failures go to the defender, "
         "which is the opponent unless you add `defender:me`."),
        (f"`/assist target:12 helper_target:14 helper:@name label:\"{g['assist']}\"`",
         f"Someone helps you. They roll first ({g['helperSkill']}, say): success gives +1, success by 5 or more +2, "
         "and a natural 18 brings a complication. Then you roll with their bonus."),
        (f"`{pts} show`", f"Your {P} points this session. Add `player:@name` to see someone else's."),
        (f"`{pts} spend`", f"Spend {a(P)} point without rolling, e.g. to reduce an injury by one box or to establish a small preparation."),
        (f"`{pts} gain`", f"Gain {a(P)} point, e.g. when you accept a complication the GM offers. With Extra {P}, use it once at the start of a session."),
        ("`/clock show`", "Every clock the GM is running."),
        (f"`/track show`", f"The shared {g['trackTitle']} tracks ({tracks}) and what each one means right now."),
    ]
    rows_gm = [
        (f"`/game set game:{g['title']}`", f"Choose this server's game. Do it once; `/game show` checks it."),
        (f"`{pts} newsession`", f"Start a session: everyone goes back to two {P} points, and unused points are gone."),
        (f"`{pts} gain player:@name`", f"Award {a(P)} point, e.g. for an accepted complication."),
        (f"`{pts} set player:@name points:3`", "Correct a player's total."),
        (f"`/clock new name:\"{g['clock']}\" segments:{g['clockSize']} kind:danger`",
         "Start a clock of 2, 4, 6 or 8 segments. Danger clocks fill on failures and time; use `kind:progress` for one that fills on successes."),
        (f"`/clock tick name:\"{g['clock']}\"`", "Fill one segment. Add `segments:2` for two, or `segments:-1` to undo. `/clock remove` deletes a clock."),
        (f"`/track mark name:{g['track']}`", f"Mark a box on a track; a partial name works (\"{g['track']}\" finds {g['trackFull']}). "
         f"`/track clear` clears one, and `/track reset` clears them all."),
        ("`/seed`", "Roll an adventure seed: one line from each seed table, and the command to start its ticking clock."),
        (f"`/contest ... defender:me`", "When a player resists you (a grapple, a lie, a chase), they are the defender: ties and double failures go to them."),
    ]
    return rows_p, rows_gm


THEME_KEYS = ("space", "glass", "fg", "muted", "line", "chrome", "gold", "red", "on-accent", "display", "title", "body")


def theme_of(creator):
    """The creator page's fonts link and colour/type tokens, so the handout looks like its game."""
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', creator).group(1)
    root = re.search(r":root\s*\{(.*?)\}", creator, re.S).group(1)
    tok = dict(re.findall(r"--([\w-]+):\s*([^;]+);", root))
    tok.setdefault("title", tok["display"])
    return fonts, {k: tok[k] for k in THEME_KEYS}


def inline(md):
    """`code` and **bold** from the command tables, as HTML."""
    out = html.escape(md, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)


def card(cmd, text):
    c = cmd.strip("`")
    return (f'<li class="cmd"><div class="cmd-line"><code class="cmd-code">{html.escape(c)}</code>'
            f'<button type="button" class="copy" data-cmd="{html.escape(c)}" aria-label="Copy {html.escape(c.split()[0] + " " + (c.split()[1] if len(c.split()) > 1 else ""))}">Copy</button></div>'
            f"<p>{inline(text)}</p></li>")


def handout(g, creator):
    fonts, tok = theme_of(creator)
    P, old = g["point"], g.get("old")
    rows_p, rows_gm = rows(g)
    title = html.escape(g["title"])
    alias = (f'<p class="note">The bot\'s original names still work: <code>/{old[0]}</code> is the same as <code>/roll</code>, '
             f'and <code>/{old[1]}</code> is the same as <code>/points</code>.</p>') if old else ""
    tokens = "\n".join(f"  --{k}: {v};" for k, v in tok.items())
    return f"""<title>{title} Discord Commands</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{html.escape(fonts)}">
<style>
/* Layout: one reading column, like a card handed across the table. Commands sit in monospace wells
   with a copy button; players' commands first, the GM's after a rule. Dark only, in the creator's colours. */
:root {{
{tokens}
  --code: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  color-scheme: dark;
}}
* {{ box-sizing: border-box; }}
body {{ background: var(--space); color: var(--fg); font: 1.05rem/1.55 var(--body); }}
.wrap {{ max-width: 46rem; margin: 0 auto; padding: 40px 16px 64px; display: grid; gap: 28px; }}
header {{ display: grid; gap: 6px; border-bottom: 1px solid var(--line); padding-bottom: 20px; }}
.eyebrow {{ font: 600 .8rem/1.2 var(--display); letter-spacing: .14em; text-transform: uppercase; color: var(--chrome); }}
h1 {{ font: 400 clamp(2rem, 7vw, 3rem)/1.05 var(--title); margin: 0; text-wrap: balance; }}
h2 {{ font: 600 1.35rem/1.2 var(--display); margin: 0; color: var(--gold); letter-spacing: .03em; }}
.lede {{ margin: 6px 0 0; color: var(--muted); max-width: 62ch; }}
section {{ display: grid; gap: 14px; }}
.steps {{ margin: 0; padding-left: 1.3em; display: grid; gap: 4px; }}
.cmds {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }}
.cmd {{ background: var(--glass); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; display: grid; gap: 8px; min-width: 0; }}
.cmd p {{ margin: 0; }}
.cmd-line {{ display: flex; gap: 10px; align-items: flex-start; min-width: 0; }}
.cmd-code {{ flex: 1; min-width: 0; overflow-wrap: anywhere; font: .92rem/1.45 var(--code); color: var(--chrome); }}
code {{ font-family: var(--code); font-size: .9em; color: var(--chrome); }}
.copy {{ flex: none; font: 600 .78rem/1 var(--display); letter-spacing: .08em; text-transform: uppercase; color: var(--on-accent);
  background: var(--gold); border: 0; border-radius: 4px; padding: 7px 10px; cursor: pointer; }}
.copy:focus-visible {{ outline: 2px solid var(--fg); outline-offset: 2px; }}
.copy.done {{ background: var(--chrome); }}
.note {{ margin: 0; color: var(--muted); }}
.gm {{ border-top: 1px solid var(--line); padding-top: 24px; }}
footer {{ color: var(--muted); font-size: .9rem; }}
</style>
<div class="wrap">
  <header>
    <span class="eyebrow">{title}</span>
    <h1>Discord commands</h1>
    <p class="lede">The table's Discord bot rolls the dice and keeps the shared {html.escape(P)} points, clocks and {html.escape(g['trackTitle'])} tracks.
    The bot doesn't know your sheet, so you give it the target number.</p>
  </header>

  <section>
    <h2>Getting started</h2>
    <ol class="steps">
      <li>Type <code>/</code> in the game channel to see every command.</li>
      <li>Pick one; Discord shows each option as you fill it in.</li>
      <li>Read your target number off your sheet and add up every modifier yourself.</li>
    </ol>
  </section>

  <section>
    <h2>For players</h2>
    <ul class="cmds">
      {"".join(card(c, t) for c, t in rows_p)}
    </ul>
    {alias}
    <p class="note">Only the player who rolled can press the reroll button. Rolls that miss by 1 or 2 remind the GM that success at a cost is on offer.</p>
  </section>

  <section class="gm">
    <h2>For the GM</h2>
    <p class="note">GM commands need the <strong>Manage Server</strong> permission on the Discord server. Everyone can see clocks, tracks and points.</p>
    <ul class="cmds">
      {"".join(card(c, t) for c, t in rows_gm)}
    </ul>
    <p class="note">Each server keeps its own points, clocks and tracks. If a command is missing from Discord's list, open the bot's <code>/register</code> page once, then press Ctrl+R in Discord.</p>
  </section>

  <footer>{title}. Commands work the same in every game the bot runs; the examples use this game's names.</footer>
</div>
<script>
document.addEventListener("click", (e) => {{
  const b = e.target.closest(".copy");
  if (!b) return;
  const done = (ok) => {{ b.textContent = ok ? "Copied" : "Select it"; b.classList.toggle("done", ok); setTimeout(() => {{ b.textContent = "Copy"; b.classList.remove("done"); }}, 1600); }};
  const pick = () => {{ const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }};
  try {{ navigator.clipboard.writeText(b.dataset.cmd).then(() => done(true), () => {{ pick(); done(false); }}); }}
  catch (_) {{ pick(); done(false); }}
}});
</script>
"""


def write_handout(g, folder):
    folder = pathlib.Path(folder)
    (folder / "discord-commands.html").write_text(handout(g, (folder / "index.html").read_text()))


def legacy_games():
    for gid in ("pelion", "grimm"):
        d = json.loads((GAMES_DIR / f"{gid}.json").read_text())
        page = (ROOT / d["seedsFrom"]).read_text()
        seeds = json.loads(re.search(r"const SEEDS = (\{.*?\});\n", page).group(1))
        yield gid, game_info(gid, d["title"], d["point"], d["tracks"], seeds, d["trackTitle"])


def main():
    folders = {"pelion": "uss-pelion", "grimm": "grimm-west"}
    for gid, g in legacy_games():
        folder = ROOT / folders[gid]
        write_handout(g, folder)
        print(f"wrote {(folder / 'discord-commands.html').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
