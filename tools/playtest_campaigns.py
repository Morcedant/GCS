"""The four playtest adventures as campaigns, for the GM view's Campaign tab (the playtest kit's "Load into the Campaign
tab" button). tools/build-legend.py puts campaign(gid, pack, setting_md) into the pack's playtest as "campaign".

Most of it comes from the adventure in the GM's Guide (setting.md), so it follows the text: the premise and the truth
behind it, a step of the outline for each numbered scene, and the first session (the run sheet, the clues, the threats
and the rewards). The people, places and factions are written here. Nothing is shared with the players until the GM
shares it in the Campaign tab, and secrets never are.
"""
import re

# The adventure's heading in setting.md, by game.
HEADINGS = {"western": "## The first job:", "spaceopera": "## The first job:", "fantasy": "## The first venture:", "aurora": "## The first case:"}

# [name, who they are, faction, what the players know, what they want, their secret]
PEOPLE = {
    "western": [
        ["Ezra Quill", "Foreman of the Lazarus mine", "", "Wrote the letters that brought the hunters. The sheriff says he died in a cave-in two weeks ago.",
         "Crane in the ground, and his men safe from the ghouls.", "A revenant: Crane had him shot and buried, and he rose at the next midnight. He rises every midnight unless his grave is salted and burned."],
        ["Augustus Crane", "Owner of the Lazarus mine", "Crane's mine", "The richest man in Mercy Springs. The company calls the deaths cave-ins.",
         "The silver, whatever it costs in men.", "Ordered Quill shot. His ledger, in his safe, shows the payments to the sheriff and the order on Quill."],
        ["Sheriff Hiram Vance", "Sheriff of Mercy Springs", "Crane's mine", "Meets the hunters before they've watered their horses, and tells them there's no work here.",
         "The hunters gone, and Crane's money coming.", "In Crane's pocket. He buried Quill himself. A Hired gun who won't draw first."],
        ["Cyrus Pruitt", "Crane's gunman", "Crane's mine", "A gunman who drinks alone at the Silver Dollar.",
         "To call out the hunter who's asked the most questions, at noon.", "An Outlaw, Will 11. Crane wants the hunters gone before they go down the mine."],
        ["The widows", "Miners' widows", "", "They sit together at the back of the Silver Dollar.",
         "Their men's bodies back, and the truth.", "Their men came home with sand in their boots. There's no sand in a silver mine."],
    ],
    "spaceopera": [
        ["Ves Oro-Lan", "Tessan debt-broker", "", "Offers to clear a box of the crew's Debt, and 2,000 credits, for the data core of the Long Patience.",
         "The core, from whoever brings it first.", "Sold the same coordinates to Vantor Reclamation. Keeps checking the departures board."],
        ["The Warden", "The Long Patience's AI", "", "A slow, polite voice that has had no one to talk to for 140 years.",
         "The colonists taken home. It can't fly the ship alone: the drive needs a navigator and an engineer.",
         "Has kept 312 colonists alive in cryo, growing the hull around them. A Rogue AI that never attacks; erasing it kills the colonists."],
        ["Vantor team leader", "Syndicate enforcer", "Vantor Reclamation", "Hired muscle, cutting in to take the core.",
         "The core, and a legal salvage.", "Has orders to vent the cryo decks, so the ship has no living crew and the salvage is legal."],
        ["The assassin", "Corporate assassin", "Vantor Reclamation", "Nobody sees them, if they can help it.",
         "No witnesses.", "Would rather not be seen at all."],
    ],
    "fantasy": [
        ["Ysolde Varr", "Merchant princess of Qasreth", "House Varr", "Pays 200 gold crowns a head for the treasure of the serpent-king tomb under Ain Haddu, half in advance.",
         "The tomb's gold.", "Knows the tomb is guarded by something, and hasn't said so. Afraid of the tomb, not the competition."],
        ["Dask", "Sellsword captain", "House Varr", "Ysolde's captain, coming on the dig.",
         "To follow his orders.", "His orders: take the gold and leave the hirelings inside. He makes his move in the hall of kings."],
        ["Ssethra", "Serpent-priest of the old kings", "", "Something under the oasis that makes the water hiss at night.",
         "To wake fully, when the well runs dry.", "Bound by its true name, which the grave robbers chiseled off. Drinking the oasis dry from below; Haddu's water burns it like fire."],
        ["The herders", "A tribe of Ain Haddu", "", "Won't go near the water after dark. Their dead have been missing from the graves.",
         "Their oasis, and their dead left alone.", "Sick, from the water."],
    ],
    "aurora": [
        ["Lupe Herrera", "Fifteen, from Pilsen", "", "A terrified girl on the Eighteenth Street bridge, made of lightning. Every time someone shouts, it gets worse.",
         "To go home.", "The Foundation dosed her in a \"free health screening\" van and tagged her. Overcharge uses the tag to trigger her surges: she's the bait in his trap for Subject 19."],
        ["Overcharge (Mason Rourke)", "The Foundation's enforcer, Class IV", "The Foundation", "A man's voice on every radio in Pilsen: \"Subject 19. Come and get her.\" He helped hold Subject 19 in the lab.",
         "Subject 19 back in the lab, and Lupe too.", "Lupe's tag is his power source: while it transmits, his force field is IV and he can blow up what's around him. Take it out and his field is III."],
        ["Sergei Grachyov", "Foundation troubleshooter", "The Foundation", "Watches from the train platform when Overcharge falls, nods to Subject 19, and walks away.",
         "To see what Subject 19's friends can do.", "Class V. He's tonight's hook for later, not a fight."],
        ["Daybreak's producers", "Her sponsor's TV crew", "Daybreak's sponsor", "Already rolling before the cordon is up.",
         "The rescue live, and the shot.", "The sponsor will offer Lupe a clinic and a contract."],
        ["The retrieval team", "Four Foundation operatives, Overcharge's", "The Foundation", "Unmarked gear, and a jammer that blinds the Aegis suit's sensors.",
         "Lupe alive, and no witnesses.", "Their file on Subject 19 gives them +2 when it applies: they know Subject 19's habits."],
    ],
}

# [name, what it is, what the players know, what's really there]
PLACES = {
    "western": [
        ["Mercy Springs", "A silver boomtown gone quiet", "Every door barred by sundown; dogs won't go near the mine road.", ""],
        ["The Silver Dollar", "The saloon", "Miners drink in silence; the widows sit at the back. Quill said to ask for him here.", ""],
        ["The graveyard", "Mercy Springs' burying ground", "Where Quill was buried, two weeks ago.", "Quill's grave is dug out from below, the lid scratched inside. Three older graves opened from beneath and emptied."],
        ["The church", "Locked; its preacher fled", "", "A map of the lowest drift marked 'the old graves', and a hymnal page: they come up where the dead are, and they hate the light."],
        ["The Lazarus mine", "Crane's silver mine", "The company calls the deaths cave-ins.", "The lowest drift opens into a burial cave older than the territory. Something older sleeps at the back, under the stones."],
        ["The Crane house", "Augustus Crane's house", "", "Two hired guns, and a safe with Crane's ledger."],
    ],
    "spaceopera": [
        ["The tea house", "A dockside tea house", "Where Ves Oro-Lan meets the crew.", ""],
        ["The lost corridor", "A corridor the guild charts say is gone", "Quill remembers it, and says it's open again.", "Open for a few days only, and drifting closed: when it shuts, it's shut for another hundred years."],
        ["The Long Patience", "A colony ship lost 140 years ago", "Twelve kilometers of hull grown over with something like bark.",
         "Alive: 312 colonists asleep in cryo, a seed vault intact, and the Warden still waiting."],
    ],
    "fantasy": [
        ["Qasreth", "The caravan city", "Ysolde Varr receives hirelings on her barge, under silk awnings.", ""],
        ["The Burning Sands", "Three days of desert", "Short rations, bad wells and sandstorms. Cultists of the Burning God ride here.", ""],
        ["Ain Haddu", "An oasis, drying up", "A few palms, a shrinking pool, the herders, and Haddu's shrine, its flame almost out.", "The pool drains through a crack into the tomb below."],
        ["The serpent-king tomb", "Under the oasis", "An upper door sixty feet up a sheer wall, and a lower one the grave robbers broke open.",
         "The hall of kings with its tomb-dead, the Ssa'kethi library in a dry room, and the drowned chamber where Ssethra sleeps."],
    ],
    "aurora": [
        ["The Eighteenth Street bridge", "A bridge in Pilsen, Chicago", "Where a girl \"made of lightning\" stands, at 9:40 on a Tuesday night.", ""],
        ["Pilsen", "A Chicago neighborhood", "Half of it dark: transformers blown down a six-block line, and a Pink Line train stopped dead.", ""],
        ["The van", "A \"free health screening\" van", "", "Where the Foundation doses its subjects. Subject 19 has seen one before, from inside."],
        ["Under the tracks", "The street beneath the Pink Line, two blocks from the bridge", "Where the signal comes from.", "Overcharge's trap: his van, the transmitter, and the retrieval team waiting in the shadows."],
    ],
}

# [name, what the players know, what they want, how they work, their secret]
FACTIONS = {
    "western": [
        ["The ghouls", "Something takes a miner a night.", "To feed.", "They drag the dead below. They flee daylight and fire.",
         "They came up out of a burial cave the mine broke into. Three of them, and one more each time the Harvest clock fills."],
        ["Crane's mine", "The Lazarus mine company, and the men it pays.", "The silver coming up, and no questions.", "The sheriff, a gunman, and two hired guns.", "Murdered its own foreman."],
    ],
    "spaceopera": [
        ["Vantor Reclamation", "A salvage corporation.", "The Long Patience's core, stripped, and the rest left.", "A corporate frigate, an enforcer, combat drones and an assassin.",
         "Bought the same coordinates from Ves. Under the Human-Tessan Accord, a ship with living crew aboard isn't salvage, so it means to vent the cryo decks."],
    ],
    "fantasy": [
        ["House Varr", "Ysolde Varr's merchant house.", "The tomb's gold.", "Coin, debts, and hired swords.", "Knows the tomb is guarded, and plans to leave the hirelings inside."],
        ["Cultists of the Burning God", "Zealots of the sands.", "Sorcerers burned, and the tomb with them.", "A band on the road: they try to take Ithrann and Nyx on the second night.", "One of them is blessed."],
    ],
    "aurora": [
        ["The Foundation", "Nobody admits it exists.", "Subject 19 back.", "Retrieval teams, Operants of its own like Overcharge, files on heroes, and Grachyov.",
         "It's dosing kids in Chicago. Lupe is bait: its file says Subject 19 always comes for the young ones."],
        ["ExLAW Chicago", "The law on Operants.", "The subject brought in before anyone gets hurt.", "Agents, cordons and registration.", "Custody means a legal status and a Raster file."],
    ],
}


# What else the GM's table needs for the adventure, set up by the same button (the pregenerated characters always are):
# clocks [[name, segments]], the discovery clock {name, phases}, the threat clock's size (where it's a clock), and the
# villains' files on the heroes [{on, holder, knows}]. From the adventure's text and the kit's prep list.
SETUP = {
    "western": {"clocks": [["The ride to Mercy Springs (trail)", 4]], "discovery": {"name": "What's killing the miners", "phases": [2, 2, 2]}, "threat": 4},
    "spaceopera": {"discovery": {"name": "A living hull: the Long Patience", "phases": [2, 2, 2]}, "threat": 6},
    "fantasy": {"discovery": {"name": "The thing under Ain Haddu", "phases": [2, 2, 2]}},
    "aurora": {"discovery": {"name": "Lupe Herrera's power", "phases": [2, 2, 2]}, "threat": 4,
               "files": [{"on": "Subject 19", "holder": "The Foundation", "knows": "Always comes for the young ones"}]},
}


# The battle maps each step of the outline happens on (the playtest kit's scene numbers, tools/battlemap_scenes.py):
# opening the step in the Campaign tab sets its map up, with its people and enemies.
MAPS = {
    "western": [[1], [2], [3, 4], [3], [2], [5], [6]],
    "spaceopera": [[1], [], [2], [3, 6], [5], [4], [5]],
    "fantasy": [[1], [2], [3], [4, 5], [6], [7], [7]],
    "aurora": [[1], [2], [2], [3], [3], []],
}


def setup(gid):
    return SETUP.get(gid)


def plain(md):
    """Markdown to plain text: bold and italics dropped, list bullets kept."""
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", md)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", t)
    return t.strip()


def html_text(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h)).replace("&amp;", "&").strip()


def section(md, gid):
    """The adventure's paragraphs (blank-line separated), from its heading to the next heading."""
    start = md.index(HEADINGS[gid])
    end = re.search(r"^#{1,2} ", md[start + 3:], re.M)
    body = md[start:start + 3 + end.start()] if end else md[start:]
    lines = body.split("\n")
    return lines[0][3:].split(":", 1)[1].strip(), [p.strip() for p in "\n".join(lines[1:]).split("\n\n") if p.strip()]


def campaign(gid, pack, md):
    if gid not in HEADINGS or HEADINGS[gid] not in md:
        return None
    title, paras = section(md, gid)
    kit = pack["playtest"]
    intro, hook, truth, scenes, rewards, threats = paras[0], "", "", [], "", ""
    for p in paras[1:]:
        lead = re.match(r"\*\*(.+?)\*\*", p)
        head = lead.group(1) if lead else ""
        if head.startswith("The hook"): hook = p
        elif head.startswith("What's really"): truth = p
        elif head.startswith("Rewards"): rewards = p
        elif head.startswith("Threats"): threats = p
        elif re.match(r"\d+\.", head): scenes.append([head.rstrip("."), p[lead.end():].strip()])
        elif scenes: scenes[-1][1] += "\n\n" + p      # a scene's clue list, or what follows it
        elif hook: hook += "\n\n" + p
    clues = "\n".join(plain(l) for s in scenes for l in s[1].split("\n") if l.startswith("- "))
    maps = MAPS.get(gid, [])
    arc = [{"title": re.sub(r"^\d+\.\s*", "", h)[:80], "summary": plain(b)[:2000], "status": "planned", "maps": maps[k] if k < len(maps) else []}
           for k, (h, b) in enumerate(scenes)]
    run = "\n".join(f"{t}  {h}: {html_text(b)}" + (f" (Cut: {c[0]})" if c else "") for t, h, b, *c in kit["run"])
    session = {"title": f"Session 1: {title}", "status": "planned", "scenes": run[:3000],
               "threats": plain(re.sub(r"^\*\*Threats\.\*\*\s*", "", threats))[:1500], "clues": clues[:1500],
               "rewards": plain(re.sub(r"^\*\*Rewards\.\*\*\s*", "", rewards))[:800]}
    people = [{"name": n, "role": r, "faction": f, "desc": d, "goal": g, "secret": s} for n, r, f, d, g, s in PEOPLE[gid]]
    cast = "; ".join(f"{n} ({t})" for n, t in kit["cast"])
    return {
        "format": pack["id"] + "-campaign", "version": 1, "name": title,
        "premise": plain(intro + "\n\n" + hook)[:3000],
        "themes": "", "tone": "", "sharePremise": False,
        "notes": (plain(truth) + f"\n\nThe player characters: {cast}.\n\n{kit.get('castNote', '')}\n\nLoaded from the playtest kit in the GM view.")[:4000],
        "arc": arc, "people": people,
        "places": [{"name": n, "kind": k, "desc": d, "secret": s} for n, k, d, s in PLACES[gid]],
        "factions": [{"name": n, "desc": d, "goal": g, "methods": m, "secret": s} for n, d, g, m, s in FACTIONS[gid]],
        "sessions": [session],
    }


if __name__ == "__main__":
    import json, pathlib, sys
    root = pathlib.Path(__file__).resolve().parent.parent / "legend-dynamics" / "packs"
    for g in sys.argv[1:] or HEADINGS:
        c = campaign(g, json.loads((root / g / "pack.json").read_text()), (root / g / "setting.md").read_text())
        print(f"== {g}: {c['name']}: {len(c['arc'])} steps, {len(c['people'])} people, {len(c['places'])} places, {len(c['factions'])} factions")
        for k in ("premise", "notes"): print(f"  {k}: {len(c[k])} chars")
        for k, v in c["sessions"][0].items(): print(f"  session {k}: {len(v)} chars")
        for a in c["arc"]: print(f"  step: {a['title']} ({len(a['summary'])})")
