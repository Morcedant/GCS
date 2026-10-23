#!/usr/bin/env python3
"""Each game's Discord commands handout: <game folder>/discord-commands.html, a page to give players
(players' commands first, then the GM's, then how to set up the bot, with the bot's code to copy),
in the look of that game's creator.

The guides don't mention the bot at all. build-legend.py writes the handout for the Legend Dynamics
packs; run this file to write the handouts for the private fan games (USS Pelion and Grimm), which carry the
fan-games bot (fan-games/discord-bot/worker.js) instead of the public one.
"""
import html, json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fan_sources

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOT = ROOT / "legend-dynamics" / "discord-bot"
FAN_BOT = ROOT / "fan-games" / "discord-bot"
GAMES_DIR = FAN_BOT / "games"
FAN_GAMES = ("pelion", "grimm")

# Per game: the bot's /game choice, example names for the tables, and the old command names it keeps.
EXAMPLES = {
    "western": {"skill": "Shooting", "target": 13, "foe": "Werewolf", "foeTarget": 14, "contest": "Grapple",
                "assist": "Hold the door", "helperSkill": "Athletics", "track": "dark", "trackFull": "The Dark"},
    "spaceopera": {"skill": "Piloting", "target": 14, "foe": "Hegemony legionary", "foeTarget": 14, "contest": "Grapple",
                   "assist": "Crack the station lock", "helperSkill": "Computers", "track": "heat", "trackFull": "Heat"},
    "fantasy": {"skill": "Melee", "target": 14, "foe": "Serpent-priest", "foeTarget": 13, "contest": "Grapple",
                "assist": "Force the tomb door", "helperSkill": "Athletics", "track": "doom", "trackFull": "Doom"},
    "aurora": {"skill": "Powers", "target": 13, "foe": "White Hand soldier", "foeTarget": 13, "contest": "Grapple",
              "assist": "Hold the door", "helperSkill": "Athletics", "track": "collateral", "trackFull": "Collateral"},
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
        (f"`/track show`", f"The shared {g['trackTitle']} tracks ({tracks}) and what each one means right now."),
    ]
    rows_gm = [
        (f"`/game set game:{g['title']}`", f"Choose this server's game. Do it once; `/game show` checks it."),
        (f"`{pts} newsession`", f"Start a session: everyone goes back to two {P} points, and unused points are gone."),
        (f"`{pts} gain player:@name`", f"Award {a(P)} point, e.g. for an accepted complication."),
        (f"`{pts} set player:@name points:3`", "Correct a player's total."),
        (f"`/track mark name:{g['track']}`", f"Mark a box on a track; a partial name works (\"{g['track']}\" finds {g['trackFull']}). "
         f"`/track clear` clears one, and `/track reset` clears them all."),
        ("`/seed`", "Roll an adventure seed: one line from each seed table, and the command to start its ticking clock."),
        (f"`/contest ... defender:me`", "When a player resists you (a grapple, a lie, a chase), they are the defender: ties and double failures go to them."),
    ]
    d = g.get("discovery")
    if d:  # discovery clocks and the cards they mint (lore cards, dossiers, data records)
        c0 = (d.get("costs") or ["Heat"])[0]  # a pack lists [track, why, ...]; a game file just the track's name
        th, ex, tr = d["threat"]["name"], d.get("example", "Werewolf"), c0 if isinstance(c0, str) else c0[0]
        rows_p += [
            ("`/cards load file:`", f"Attach your character file from the creator: the bot reads your {d['cards']} (your {d['collection']}). Load it again after you earn one."),
            ("`/cards show`", f"Your {d['cards']}. Add `player:@name` for someone else's."),
            (f"`/cards subject subject:\"{ex}\"`", f"Every {d['card']} the table holds for a subject: who holds it, who owns it, and what it permits."),
            ("`/discovery show`", f"The {th}, every discovery clock and its phase, and the {d['cards']} that match the subject just identified."),
            ("`/discovery tick name:\"Red Creek\"`", "Advance a discovery clock after a successful investigation roll (`segments:2` for success by 5 or more). It stops at the Identify gate until the GM confirms what the subject is."),
        ]
        rows_gm += [
            ("`/discovery new name:\"Red Creek\" phases:2,2,2`", f"Start a discovery clock: segments for Confront, Identify and Uncover. Add `plain:true` for a plain progress clock in the race (a repair, a task)."),
            (f"`/discovery identify name:\"Red Creek\" subject:\"{ex}\"`", f"Confirm the subject once Identify is full. That opens the gate, and the bot lists the {d['cards']} the table already holds for it."),
            (f"`/discovery fail track:{tr}`", f"A failed investigation roll: tick the track for how they were digging{f', and the {th}' if d['threat'].get('repeat') else ''}. `/discovery push` ticks the track alone."),
            ("`/discovery threat`", f"Tick the {th} (a scene passes); `size:` sets it. " + (f"When it fills, {d['threat']['onFill']}, and it starts again." if d["threat"].get("repeat") else f"When it fills, {d['threat']['onFill']}.")),
            ("`/discovery mint name:\"Red Creek\" owner:@name permits:\"...\" present:@a @b`", f"A full clock mints a {d['card']}: the owner is the primary investigator, and everyone present gets a shared copy. Players add it to their sheets under *Learned in play*."),
        ]
    return rows_p, rows_gm


CLOCK_INTRO = ("A **clock** is a circle cut into 2, 4, 6 or 8 segments: 2 for something quick, 4 for urgent or simple, "
               "6 for substantial, 8 for long or complex. A **danger clock** fills when things go wrong (a failed roll, a success at a cost, "
               "time passing), and when it fills the danger happens. A **progress clock** fills as the characters succeed: one segment for a success, "
               "two for success by 5 or more. A chase is a progress clock for the pursuers racing a danger clock for the quarry's escape.")
CLOCK_NOTE = ("Anyone can start, tick or remove a clock, so players can tick a progress clock after a success; usually the GM runs them. "
              "Ticking or removing a clock needs its full name, though capitals don't matter. A server can run up to 20 clocks at once.")


def clock_rows(g):
    """The /clock commands, with this game's example clock."""
    c, n = g["clock"], g["clockSize"]
    return [
        ("`/clock show`", "Every clock running on this server, with how full each one is."),
        (f"`/clock new name:\"{c}\" segments:{n} kind:danger`",
         "Start a clock. Use `kind:progress` for one that fills on successes."),
        (f"`/clock tick name:\"{c}\"`", "Fill one segment. Add `segments:2` for two (success by 5 on a progress clock), or `segments:-1` to undo a tick."),
        (f"`/clock remove name:\"{c}\"`", "Delete a clock once it has filled or no longer matters."),
        ("`/seed`", "The adventure seed's last line is a ticking clock, with the `/clock new` command to start it."),
    ]


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


def li(items):
    return "".join(f"<li>{x}</li>" for x in items)


def link(url, text=None):
    return f'<a href="{url}" target="_blank" rel="noopener">{text or url}</a>'


def setup(g):
    """How to make the bot: the README's steps, for this game, as HTML."""
    gid, title = g["id"], html.escape(g["title"])
    W = "<code>https://legend-dice.YOUR-NAME.workers.dev</code>"
    upgrade = ""
    if g.get("old"):
        name, pts = g["old"]
        upgrade = f"""
    <h3>Already running the {title} bot?</h3>
    <p>You don't need a new bot. Open your existing Worker (<code>{name}-dice</code>), choose <strong>Edit code</strong>,
    paste in the new bot code and <strong>Deploy</strong>. Then add <code>DISCORD_BOT_TOKEN</code> back for a moment, open <code>/register</code> once,
    and delete the token again. Your <code>{pts.upper()}</code> storage and clocks carry over, your servers stay on {title},
    and <code>/{name}</code> and <code>/{pts}</code> keep working alongside the new names.</p>"""
    steps = [
        ("Create the Discord application", [
            f"Go to {link('https://discord.com/developers/applications')} and choose <strong>New Application</strong>. Name it, e.g. <em>{title} Dice</em>.",
            "On <strong>General Information</strong>, copy the <strong>Application ID</strong> and the <strong>Public Key</strong>.",
            "On <strong>Bot</strong>, choose <strong>Reset Token</strong> and copy the token. Keep it private; you only need it once, to register the commands.",
        ]),
        ("Create the Worker", [
            f"Sign up at {link('https://dash.cloudflare.com')}. It's free, and Workers need no card.",
            "Open <strong>Workers &amp; Pages → Create</strong>. Choose <strong>Start with Hello World!</strong>, name it <code>legend-dice</code>, and <strong>Deploy</strong> the starter. Skip the GitHub and static-file options.",
            "Choose <strong>Edit code</strong> (top right). Replace everything in the open file with the <strong>bot code</strong> below, then <strong>Deploy</strong>.",
            "In the Worker's <strong>Settings → Variables and Secrets</strong>, add:"
            "<ul class=\"vars\">"
            "<li><code>DISCORD_PUBLIC_KEY</code> = the Public Key</li>"
            "<li><code>DISCORD_APPLICATION_ID</code> = the Application ID</li>"
            "<li><code>DISCORD_BOT_TOKEN</code> = the bot token (type <strong>Secret</strong>)</li>"
            f"<li><code>DEFAULT_GAME</code> = <code>{gid}</code>, so new servers start on {title}</li></ul>",
            f"Note the Worker's address, like {W}.",
        ]),
        ("Connect storage", [
            "Points, clocks, tracks and <code>/game set</code> need it. In Cloudflare, open <strong>Storage &amp; databases → Workers KV → Create</strong> and name it <code>legend-store</code>.",
            "Open the <code>legend-dice</code> Worker, then <strong>Settings → Bindings → Add → KV namespace</strong>. Set <strong>Variable name</strong> to <code>STORE</code>, pick <code>legend-store</code> and save.",
            "The free plan allows 1,000 storage changes a day, which is plenty for a table.",
        ]),
        ("Connect Discord", [
            "On the Discord app's <strong>General Information</strong> page, paste the Worker address into <strong>Interactions Endpoint URL</strong> and save. If it saves, the connection works.",
            f"Open {W.replace('</code>', '/register</code>')} in your browser. It should say “Registered /roll, /contest, /assist, /points, /clock, /track, /discovery, /cards, /seed and /game.” Then delete <code>DISCORD_BOT_TOKEN</code> from the Worker settings.",
            "On the app's <strong>Installation</strong> page, make sure <strong>Guild Install</strong> includes the <code>applications.commands</code> scope. Open the install link and pick your server. The bot needs no other permissions.",
            f"In Discord, run <code>/game set game:{title}</code>. New commands can take a minute to appear.",
        ]),
    ]
    trouble = [
        ("Opening the Worker address shows “Hello World!”", "The bot code wasn't deployed. Paste it again in <strong>Edit code</strong> and <strong>Deploy</strong>."),
        ("An error page (e.g. 1101)", "Only part of the code was pasted. Copy it again and paste the whole thing."),
        ("“Legend Dynamics dice bot is running.” with <code>!!</code> lines", "A setting is missing or mistyped; the line says which."),
        ("“Interactions endpoint URL could not be verified”", "The Public Key in Cloudflare doesn't match the app, or the URL is wrong. Use the exact <code>https://…workers.dev</code> address with nothing after it."),
        ("<code>/register</code> says “Discord refused the command (401)”", "The bot token is wrong or was reset. Reset it on the <strong>Bot</strong> page and update <code>DISCORD_BOT_TOKEN</code>."),
        ("The commands don't appear in Discord", "The app isn't installed on that server, or Discord hasn't refreshed. Press Ctrl+R (Cmd+R on a Mac)."),
        ("“The application did not respond”", "The Interactions Endpoint URL points somewhere else, or the Worker code is out of date."),
        ("“…need the bot's storage”", "Bind the KV namespace as <code>STORE</code> (step 3)."),
        ("“Only the GM can change the game”", "<code>/game set</code> needs the <strong>Manage Server</strong> permission."),
    ]
    code = html.escape((FAN_BOT / "worker.js" if g["id"] in FAN_GAMES else BOT / "src" / "worker.js").read_text(), quote=False)
    kb = len(code.encode()) // 1024
    return f"""
  <section class="gm" id="setup">
    <h2>Setting up the bot</h2>
    <p class="note">For the GM, once per group: about 15 minutes, no installs, free. The bot runs on Cloudflare Workers, so there's no server to keep running.
    One bot serves every game; each Discord server picks its own with <code>/game set</code>.</p>
    {upgrade}
    <ol class="setup">
      {"".join(f'<li><h3>{h}</h3><ol class="sub">{li(items)}</ol></li>' for h, items in steps)}
    </ol>
    <div class="code-box">
      <div class="cmd-line"><strong class="code-label">Bot code <span class="muted">(worker.js, {kb} KB)</span></strong>
        <button type="button" class="copy" id="copy-code" data-target="bot-code">Copy bot code</button></div>
      <textarea id="bot-code" readonly spellcheck="false" aria-label="Bot code">{code}</textarea>
    </div>
    <details>
      <summary>If it isn't working</summary>
      <p class="note">Open the Worker's address in a browser first; what it shows tells you which side to look at.</p>
      <dl class="trouble">{"".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in trouble)}</dl>
    </details>
  </section>"""


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
h3 {{ font: 600 1.05rem/1.25 var(--display); margin: 0 0 6px; color: var(--fg); }}
a {{ color: var(--chrome); }}
a:focus-visible, summary:focus-visible {{ outline: 2px solid var(--fg); outline-offset: 2px; }}
.setup {{ margin: 0; padding-left: 1.4em; display: grid; gap: 18px; }}
.setup > li::marker {{ font: 600 1.05rem var(--display); color: var(--gold); }}
.sub {{ margin: 0; padding-left: 1.2em; display: grid; gap: 6px; list-style: lower-alpha; }}
.vars {{ margin: 6px 0 0; padding-left: 1.1em; display: grid; gap: 2px; }}
.sub li, .vars li {{ overflow-wrap: anywhere; }}
.code-box {{ background: var(--glass); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; display: grid; gap: 10px; min-width: 0; }}
.code-label {{ flex: 1; font: 600 1rem/1.3 var(--display); }}
.muted {{ color: var(--muted); font-weight: 400; }}
textarea {{ width: 100%; height: 11rem; resize: vertical; background: var(--space); color: var(--muted); border: 1px solid var(--line);
  border-radius: 6px; padding: 10px; font: .78rem/1.4 var(--code); white-space: pre; }}
details {{ display: grid; gap: 10px; }}
summary {{ cursor: pointer; font: 600 1.05rem/1.3 var(--display); color: var(--gold); }}
.trouble {{ margin: 10px 0 0; display: grid; gap: 4px 0; }}
.trouble dt {{ font-weight: 600; margin-top: 8px; }}
.trouble dd {{ margin: 0; color: var(--muted); }}
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

  <section>
    <h2>Clocks</h2>
    <p class="note">{inline(CLOCK_INTRO)}</p>
    <ul class="cmds">
      {"".join(card(c, t) for c, t in clock_rows(g))}
    </ul>
    <p class="note">{inline(CLOCK_NOTE)}</p>
  </section>

  <section class="gm">
    <h2>For the GM</h2>
    <p class="note">GM commands need the <strong>Manage Server</strong> permission on the Discord server. Everyone can see clocks, tracks and points.
    No bot yet? See <a href="#setup">Setting up the bot</a>.</p>
    <ul class="cmds">
      {"".join(card(c, t) for c, t in rows_gm)}
    </ul>
    <p class="note">Each server keeps its own points, clocks and tracks. If a command is missing from Discord's list, open the bot's <code>/register</code> page once, then press Ctrl+R in Discord.</p>
  </section>
{setup(g)}

  <footer>{title}. Commands work the same in every game the bot runs; the examples use this game's names.</footer>
</div>
<script>
document.addEventListener("click", (e) => {{
  const b = e.target.closest(".copy");
  if (!b) return;
  const box = b.dataset.target && document.getElementById(b.dataset.target);
  const label = b.textContent, text = box ? box.value : b.dataset.cmd;
  const done = (ok) => {{ b.textContent = ok ? "Copied" : "Selected: copy it"; b.classList.toggle("done", ok); setTimeout(() => {{ b.textContent = label; b.classList.remove("done"); }}, 2000); }};
  const pick = () => {{
    if (box) {{ box.focus(); box.select(); return; }}
    const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }};
  try {{ navigator.clipboard.writeText(text).then(() => done(true), () => {{ pick(); done(false); }}); }}
  catch (_) {{ pick(); done(false); }}
}});
</script>
"""


def write_handout(g, folder, creator=None):
    folder = pathlib.Path(folder)
    (folder / "discord-commands.html").write_text(handout(g, creator or (folder / "index.html").read_text()))


def legacy_games():
    """The fan games: (id, game info, its creator page)."""
    for gid in FAN_GAMES:
        d = json.loads((GAMES_DIR / f"{gid}.json").read_text())
        page = fan_sources.read_text(d["seedsFrom"])
        seeds = json.loads(re.search(r"const SEEDS = (\{.*?\});\n", page).group(1))
        yield gid, game_info(gid, d["title"], d["point"], d["tracks"], seeds, d["trackTitle"]), page


def main():
    folders = {"pelion": "uss-pelion", "grimm": "grimm-west"}
    for gid, g, page in legacy_games():
        folder = ROOT / folders[gid]
        write_handout(g, folder, page)
        print(f"wrote {(folder / 'discord-commands.html').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
