#!/usr/bin/env python3
"""The "Discord commands" chapter for each game's Players' Guide: a players' set and a GM's set.

build-legend.py uses chapter() for the Legend Dynamics packs ({{GEN:discord}} in engine/core.md).
Run this file to refresh the chapter in uss-pelion/players-guide.md and grimm-west/players-guide.md
(between <!-- DISCORD:START --> and <!-- DISCORD:END -->), then rebuild those guides with
tools/build-guide.py --game <folder> --docx.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "legend-dynamics" / "discord-bot" / "games"

# Per game: the bot's /game choice, example names for the tables, and the old command names it keeps.
EXAMPLES = {
    "western": {"skill": "Shooting", "target": 13, "foe": "Werewolf", "foeTarget": 14, "contest": "Grapple",
                "assist": "Hold the door", "helperSkill": "Athletics", "track": "dark", "trackFull": "The Dark"},
    "spaceopera": {"skill": "Piloting", "target": 14, "foe": "Hegemony trooper", "foeTarget": 12, "contest": "Grapple",
                   "assist": "Reroute power", "helperSkill": "Engineering", "track": "shields", "trackFull": "Shields"},
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


def chapter(g):
    """Markdown for the chapter (without its # heading)."""
    P, roll, pts = g["point"], "/roll", "/points"
    old = g.get("old")
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
    table = lambda rows: "| Command | What it does |\n|---|---|\n" + "\n".join(f"| {c} | {t} |" for c, t in rows)
    out = [
        f"The table's Discord bot rolls the dice and keeps the shared {P} points, clocks and {g['trackTitle']} tracks for the server. "
        "Type `/` in a channel to see the commands; Discord shows each option as you fill it in. "
        "The bot doesn't know your sheet, so you give it the target number.",
        "",
        "## For players",
        "",
        table(rows_p),
        "",
    ]
    if old:
        out += [f"The bot's original names still work: `/{old[0]}` is the same as `/roll`, and `/{old[1]}` is the same as `/points`.", ""]
    out += [
        "Only the player who rolled can press the reroll button. Rolls that miss by 1 or 2 remind the GM that success at a cost is on offer.",
        "",
        "## For the GM",
        "",
        "GM commands need the **Manage Server** permission on the Discord server. Everyone can see clocks, tracks and points.",
        "",
        table(rows_gm),
        "",
        "Each server keeps its own points, clocks and tracks. If a command is missing from Discord's list, open the bot's `/register` page once "
        "(see the bot's README), then press Ctrl+R in Discord.",
    ]
    return "\n".join(out)


def legacy_games():
    for gid in ("pelion", "grimm"):
        d = json.loads((GAMES_DIR / f"{gid}.json").read_text())
        page = (ROOT / d["seedsFrom"]).read_text()
        seeds = json.loads(re.search(r"const SEEDS = (\{.*?\});\n", page).group(1))
        yield gid, game_info(gid, d["title"], d["point"], d["tracks"], seeds, d["trackTitle"])


def main():
    folders = {"pelion": "uss-pelion", "grimm": "grimm-west"}
    for gid, g in legacy_games():
        path = ROOT / folders[gid] / "players-guide.md"
        md = path.read_text()
        block = f"<!-- DISCORD:START -->\n# Discord commands\n\n{chapter(g)}\n<!-- DISCORD:END -->"
        if "<!-- DISCORD:START -->" in md:
            md = re.sub(r"<!-- DISCORD:START -->.*?<!-- DISCORD:END -->", lambda m: block, md, flags=re.S)
        else:
            md = md.rstrip() + "\n\n" + block + "\n"
        path.write_text(md)
        print(f"wrote the Discord chapter into {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
