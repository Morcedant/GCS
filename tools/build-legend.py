#!/usr/bin/env python3
"""Build Legend Dynamics setting packs.

For each pack in legend-dynamics/packs/<id>/ (pack.json + setting.md) this writes:
  legend-dynamics/<id>/index.html        the character creator, with the pack's data, look and guide
  legend-dynamics/<id>/players-guide.md  the full Players' Guide (core rules + setting)
  legend-dynamics/<id>/<Title>_Players_Guide.docx   with --docx
  legend-dynamics/<id>/gm-guide.md (and <Title>_GM_s_Guide.docx)  for a setting with a GM's Guide (pack gmGuide)
It also writes legend-dynamics/Legend_Dynamics_Core_Rules.md, the setting-neutral core rules.

  python3 tools/build-legend.py [--docx] [pack ...]
"""
import argparse, html, importlib.util, json, pathlib, re, subprocess, sys
from stamp import stamp

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import discord_handout
import gm_guides
import fan_sources

ROOT = pathlib.Path(__file__).resolve().parent.parent
LD = ROOT / "legend-dynamics"
ENGINE = LD / "engine"
ATTRS = ["Body", "Agility", "Intellect", "Presence", "Will"]
LEVEL_MOD = {"U": -4, "T": 1, "S": 3}

DEFAULT_TERMS = {
    "title": "Legend Dynamics", "eyebrow": "Legend Dynamics RPG system", "prepareTitle": "Prepare", "titlePlaceholder": "e.g. Captain", "guideTitle": "Legend Dynamics Core Rules",
    "guideSubtitle": "The setting-neutral rules of the Legend Dynamics RPG system", "point": "Legend", "party": "party",
    "role": "Role", "roleLower": "role", "origin": "Origin", "originLower": "origin", "originPlural": "Origins",
    "pathRounded": "Specialist", "pathExpert": "Expert", "pathExpertPlural": "Experts",
    "reasonLabel": "Why you do what you do", "reasonSheet": "Why I do it", "gear": "Gear", "gearLower": "gear",
    "tabPlay": "Play", "readyText": "Ready to play", "stun": "Dazed", "medkit": "medical kit",
    "facility": "A proper infirmary", "mission": "Mission", "missionLower": "mission",
    "missionsChapter": "Running missions", "journal": "Journal", "journalIntro": "Write it together at the end of each session.",
    "journalTitlePlaceholder": "Name it", "journalDateLabel": "Date", "journalExtraLabel": "", "journalExtraPlaceholder": "",
    "weaponsTitle": "Weapon", "ammo": "shots", "ammoOne": "shot", "shot": "Shot", "spent": "used", "sparesLabel": "Spares",
    "reload": "Reload (one action)", "reloadDone": "Reloaded. That took your action.", "restock": "Restock",
    "restockDone": "Restocked: full.", "emptyNote": "Empty: it won't work until reloaded.", "otherWeapon": "Another weapon (nothing spent)",
    "tracksTitle": "Tracks", "tracksIntro": "Tap a box to mark or clear it.", "tracksReset": "Clear every track",
    "exampleName": "example character", "formToggle": "In alternate form", "formName": "form", "formProfile": "Form profile",
    "formCoreSummary": "", "restrictedToggle": "Show restricted options (only if your table agreed)", "restrictedTag": "restricted",
    "restrictedCheck": "only available when your table has agreed", "chaseSkill": "the chase skill", "rangedSkill": "a ranged skill",
    "meleeSkill": "a melee skill", "unarmedSkill": "an unarmed skill",
    "fontsHref": "https://fonts.googleapis.com/css2?family=Oxanium:wght@500;600&family=Exo+2:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap",
}
THEME_DEFAULTS = {"comment": "", "glow": "92, 200, 255", "line": "92, 170, 255", "highlight": "150, 210, 255",
                  "wash1": "40, 110, 200, .22", "wash2": "30, 80, 160, .18", "optionBg": "#0a1628", "barBg": "8, 18, 34, .94",
                  "text2": "#c9d8ec", "goodRgb": "82, 227, 160", "badRgb": "255, 106, 92", "placeholder": "rgba(138, 162, 194, .6)",
                  "badgeStops": '<stop offset="0" stop-color="#fff0b8"/><stop offset=".35" stop-color="#e9bd55"/><stop offset=".7" stop-color="#c38f2a"/><stop offset="1" stop-color="#8f6216"/>',
                  "badgeEdge": "#5a3a10"}


def article(word, cap):
    a = "an" if word[:1].lower() in "aeiou" else "a"
    return (a.capitalize() if cap else a) + " " + word


def terms_of(pack):
    t = {**DEFAULT_TERMS, **pack.get("terms", {})}
    t.setdefault("rolePluralLower", t["roleLower"] + "s")
    t.setdefault("originPluralLower", t["originPlural"].lower())
    t.setdefault("journalLower", t["journal"][0].lower() + t["journal"][1:])
    t["edgePoints"] = str(pack.get("edgePoints", 3))
    for k, v in t.items():
        if re.search(r'["`<>]', str(v)) and k != "fontsHref":
            sys.exit(f"term {k!r} contains a character the template can't hold: {v!r}")
    return t


def fill(text, t):
    text = re.sub(r"\{\{([aA]):(\w+)\}\}", lambda m: article(t[m.group(2)], m.group(1) == "A"), text)
    return re.sub(r"\{\{(\w+)\}\}", lambda m: t[m.group(1)] if m.group(1) in t else m.group(0), text)


def lc(text):
    """Lowercase a leading article so a name can follow a colon mid-sentence."""
    return re.sub(r"^(A|An|The|His|Her|Their) ", lambda m: m.group(1).lower() + " ", text)


def signed(n):
    return f"+{n}" if n > 0 else f"−{abs(n)}"


def adj_text(adj):
    return ", ".join(f"{a} {signed(adj[a])}" for a in ATTRS if adj.get(a)) or "None"


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


# ---- character maths, for the example and the ready-made characters ----
def char_numbers(c, pack):
    o = next((h for h in pack["origins"] if h["id"] == c["speciesId"]), None)
    attrs = c["attrs"]
    skills = {n: c.get("skills", {}).get(n, "U") for n, *_ in pack["skills"]}
    expert = c.get("path") == "hand"
    attr_of = {n: a for n, a, _ in pack["skills"]}
    def target(n):
        l = skills[n]
        return attrs[attr_of[n]] + (5 if (l == "S" and expert) else LEVEL_MOD[l])
    dodge = attrs["Agility"] - 2 + {"U": 0, "T": 1, "S": 2}[skills.get("Athletics", "U")]
    return o, skills, target, dodge, expert


def char_block(c, pack, t, heading):
    o, skills, target, dodge, expert = char_numbers(c, pack)
    tier = o["tier"] if o else c.get("customTier", 1)
    edge_names = {"attr": "+1 attribute point", "skill": "Extra Trained skill", "adv2": "Second advantage",
                  "grit": f"Extra {t['point']}", "contact": "A friend", "gear": "A fine weapon or tool"}
    edge_names.update({e[0]: e[1] for e in pack.get("extraEdges", [])})
    edges = [edge_names[k] + (f" ×{v}" if v > 1 else "") for k, v in c.get("edges", {}).items() if v]
    top = [n for n in skills if skills[n] == "S"]
    free = o.get("freeSkill") if o else None
    trained = sorted([n for n in skills if skills[n] == "T" and n != free], key=lambda n: (-target(n), n))
    advs = {a[0]: a for a in pack["advantages"]}
    comps = {x[0]: x for x in pack["complications"]}
    sadv = next((x for x in (o["traits"] if o else []) if x[0] == c.get("sadv", {}).get("id")), None)
    lines = [f"## {c['name']}" if heading else "", ""]
    if heading:
        lines += [f"*{c.get('rank') or c['dept']}, {c['dept']}. {o['name'] if o else c.get('species')} (tier {tier}){'; ' + t['pathExpert'] if expert else ''}.* {c.get('role', '').split(': ', 1)[-1]}", ""]
    else:
        lines = [f"{o['name'] if o else ''} (tier {tier}, {pack.get('edgePoints', 3) - tier} Edges){': ' + ', '.join(edges) if edges else ''}. {', '.join(f'{a} {c['attrs'][a]}' for a in ATTRS)}.", ""]
    if heading:
        lines.append(f"- **Attributes:** {', '.join(f'{a} {c['attrs'][a]}' for a in ATTRS)}. **Dodge** {dodge}.")
        form = o.get("form") if o else None
        if form:
            wa = {a: c["attrs"][a] + form["attrs"].get(a, 0) for a in ATTRS if form["attrs"].get(a)}
            wd = dodge + form.get("dodge", 0) + form["attrs"].get("Agility", 0)
            lines[-1] += f" **{t['formToggle']}:** {', '.join(f'{a} {v}' for a, v in wa.items())}, Dodge {wd}."
    lvl = "Expert" if expert else "Specialty"
    sk = f"{', '.join(f'{n} {target(n)} ({lvl})' for n in top)}. Trained: {', '.join(f'{n} {target(n)}' for n in trained)}"
    if free and skills.get(free) == "T":
        sk += f"; {free} {target(free)} (free)"
    lines.append(f"- **Skills:** {sk}." if heading else f"- **{lvl}:** {', '.join(f'{n} {target(n)}' for n in top)}.\n- **Trained:** {', '.join(f'{n} {target(n)}' for n in trained)}.")
    if not heading:
        lines.append(f"- **Dodge:** {dodge}.")
    adv = f"{sadv[1]} ({t['originLower']}; companion: {sadv[5]})" if sadv else advs.get(c.get("adv", {}).get("id"), [None, "—"])[1]
    comp = comps.get(c.get("comp", {}).get("id"), [None, "—"])[1]
    trig = c.get("comp", {}).get("trigger", "")
    extra = []
    if c.get("edges", {}).get("adv2") and c.get("adv2", {}).get("id") in advs:
        extra.append(f"second advantage: {advs[c['adv2']['id']][1]}")
    if c.get("edges", {}).get("contact") and c.get("contact"):
        extra.append(f"a friend: {lc(c['contact'])}")
    if c.get("edges", {}).get("gear") and c.get("gear", {}).get("item"):
        extra.append(f"a fine tool: {lc(c['gear']['item'])} (+2 to {c['gear']['skill']} for {c['gear'].get('use') or 'one narrow use'})")
    if heading and edges:
        lines.append(f"- **Edges:** {', '.join(edges)}{'; ' + '; '.join(extra) if extra else ''}.")
    elif extra:
        lines.append(f"- **Edges:** {'; '.join(extra)}.")
    lines.append(f"- **Advantage:** {adv}. **Complication:** {comp}{'; trigger: ' + trig[0].lower() + trig[1:] if trig else ''}.")
    pw = pack.get("powers")
    if pw and any(c.get("powers", [])):
        names = {x[0]: x[1] for x in pw["list"]}
        lines.append(f"- **{pw['plural']}:** {', '.join(f'{names[x]} {cl}' for x, cl in zip(c['powers'], power_slots(pack, c)) if x)}.")
    if pack.get("statuses") and c.get("status"):
        lines.append(f"- **{pack.get('statusLabel', 'Status')}:** {next(x[1] for x in pack['statuses'] if x[0] == c['status'])}.")
    if heading:
        lines.append(f"- **{t['reasonSheet']}:** {c.get('reason', '')} **Connection:** {c.get('connection', '')}")
    return "\n".join(lines) + "\n"


def power_slots(pack, c):
    """The Classes of a character's power slots, as the creator works them out."""
    o = next((x for x in pack["origins"] if x["id"] == c.get("speciesId")), None)
    slots = (o or {}).get("powerSlots") or pack["powers"]["tierSlots"].get(str((o or {}).get("tier", 0)), [])
    base = ["II" if x == "I+" and c.get("skills", {}).get(pack["powers"]["skill"]) == "S" else "I" if x == "I+" else x for x in slots]
    base += ["I"] if c.get("edges", {}).get("xpower") else []
    names = ["I", "II", "III", "IV", "V", "VI"]
    return [names[names.index(x) + ((c.get("powerBoost") or [])[i] if i < len(c.get("powerBoost") or []) else 0)] for i, x in enumerate(base)]


MAGIC_DEFAULT = {"skill": "your magic skill", "burst": "burst", "bursts": "bursts", "step": "step", "steps": "Trained, Specialty, Expert",
                 "price": "a box of your setting's price track", "charm": "charm", "charms": "charms", "working": "working", "workings": "workings"}


def magic_chapter(m, title=None):
    """The shared Magic chapter: bursts, workings, charms, Boosts and magic advancement. m names a setting's terms."""
    m = {**MAGIC_DEFAULT, **m}
    B, Bs, W, Ws, C, Cs = m["burst"], m["bursts"], m["working"], m["workings"], m["charm"], m["charms"]
    cap = lambda x: x[:1].upper() + x[1:]
    train = m["skill"].replace("your ", "")
    out = ["# Magic", "",
           f"Magic works at two speeds, with a third tool that turns one into the other. Every magical character uses the same three tools; {'this setting' if title else 'each setting'} decides who gets which, what they're called and what they cost.", "",
           table(["Tool", "Speed", "How it works"], [
               [f"**{cap(Bs)}**", "One action", f"A quick spell you know. Roll {m['skill']}; on a success it happens."],
               [f"**{cap(Ws)}**", "Minutes to nights", "Anything else. Describe the effect; the GM sets its weight; fill a progress clock."],
               [f"**{cap(Cs)}**", "One action, no roll", f"A finished {W} stored in an object, released by breaking it."]]), "",
           f"## {cap(Bs)}", "",
           f"Each {B} has a short **base effect**: one target, for one scene, at Close or Short range. Harm marks 2 boxes; a penalty is −2.", "",
           f"**Defense or resistance.** A hostile {B} says in its description how its target avoids it: **a defense** or **a resistance**, never both, and never chosen at the moment of casting.", "",
           f"- **A defense** (\"Dodge applies\"): the {B} is an attack, and the casting roll is the attack roll. If it succeeds, the target may defend as against any attack, using their one defense a round, and **attack quality applies** from the casting margin: succeeded by 3–4, the defense is at −1; by 5–6, −2; by 7 or more, −3.",
           f"- **A resistance** (\"Will resists\", \"Body resists\"): a contest between the casting roll and the target's roll on that attribute, by the usual contest rules (a success beats a failure; if both succeed, the larger margin wins; ties go to the target). Attack quality doesn't apply: the casting margin already counts in the contest. The target's injury penalty applies only when the resistance is physical (Body).",
           f"- **Neither** (a {B} on an object, or on a willing target): it simply works on a success.", "",
           f"**Harm limit.** Magic at personal scale marks **at most 3 boxes** on any one target from one {B}, {W} or {C}, whatever its Boosts. Magical harm follows the *Injury* rules like a weapon's: a hit of 2 or more boxes that brings someone to three boxes leaves them Dying. Boosts beyond the limit go to the other dimensions: range, duration, or more targets.", "",
           f"**Boosts.** Your {m['step']} sets your power ({m['steps']}). Each {m['step']} above the first gives **one Boost**, chosen **as you cast**. Each Boost you spend is **−1 to the roll**, so you can always hold back.", "",
           table(["Boost", "One Boost", "Two Boosts"], [
               ["**Harder**", "+1 box (3 at most), or the penalty becomes −3", "+2 boxes (3 at most), or −4"],
               ["**Wider**", "A handful of targets", "A crowd, or an area"],
               ["**Longer**", "A day", "Until it's lifted"],
               ["**Farther**", "One range band farther", "Two bands farther"]]), "",
           f"**The price.** A failed {B} marks {m['price']}; a natural 18 marks two, or something answers that shouldn't.", "",
           f"## {cap(Ws)}", "",
           "1. **Describe the effect.** The GM sets its weight and says what it can and can't do before you start.",
           f"2. **Fill the clock** with {train} rolls at your pace (usually ten minutes a roll). Success fills one segment, success by 5 or more two. A failure costs time or ticks a danger clock.",
           f"3. **It happens** when the clock is full. A {W} interrupted with energy gathered may go wrong.", "",
           table(["Weight", "Segments", "Scale"], [["Minor", "2", "One person, one night, one small thing"], ["Significant", "4", "A household, a building, a question answered"], ["Major", "6", "A bloodline, a town, a demon bound"]]), "",
           "**Trappings.** The right materials, hour or place remove one segment.", "",
           f"**Too slow for a fight.** A {W} takes a minute a roll at the very fastest. To use one in combat, finish it beforehand and store it in a {C}.", "",
           f"## {cap(Cs)}", "",
           f"Work a {W} in advance and store it in an object; break it (one action, no roll) to release it. " + m.get("charmLimit", f"Carry as many ready {Cs} as your {train} training allows: **Trained 2, Specialty 3, Expert 4**.") + " Preparation is how slow magic wins a fast fight.", "",
           f"**A {C} skips the casting roll, not the target's chance.** Whatever a target could dodge or resist when the magic is cast, they can dodge or resist when it comes from a {C}. With no casting roll, a {C} counts as **a success by 0**: against a defense, the target defends with no attack-quality penalty; against a resistance, the target resists by succeeding on their roll (a tie goes to the target, as in any contest). A {C} never marks more than 3 boxes on one target.", ""]
    if m.get("advance") != []:
        out += ["## Magic advancement", "",
           f"A magical character can spend advancement points (see *Advancement*) on these, with the GM's approval and a reason from the story. {'' if title else 'Each setting says which it uses.'}", "",
           table(["Option", "Effect", "Cost", "Limit"], [row for key, row in [
               ("new", [f"New {B}", f"Learn one {B} beyond your limit", "1", "Up to 2 extra"]),
               ("deeper", [f"Deeper {m['step']}", f"One {B} you know works one {m['step']} deeper: one more Boost", "2", f"Each {B} once"]),
               ("charm", [f"Another {C}", f"Carry one more ready {C}", "1", "Up to 2 extra"]),
               ("heart", ["By heart", f"One kind of {W} takes one fewer segment (minimum 1)", "1", "Each kind once"]),
               ("quicker", ["Quicker hand", f"Reduce the interval between rolls for one specific {W} by one step (an hour to ten minutes, ten minutes to one minute), to a minimum of one minute. Its clock and required rolls remain unchanged. Combat release requires a {C}.", "1", f"Each {W} once"]),
               ("mastery", [m.get("masterName", "Mastery"), f"{cap(m['skill'])} becomes Expert (+5)", "4", "Once, at the end of a long campaign"])]
               if key in m.get("advance", ["new", "deeper", "charm", "heart", "quicker", "mastery"])]), ""]
    if m.get("dials"):
        out += [f"## Magic in {title}", "", table(["", "How it works here"], m["dials"]), ""]
    return "\n".join(out)


def gen(name, pack, t):
    p = pack
    if name == "arms-table":
        return table(["Weapon", "Range", "Boxes on a hit", "What the injury looks like"], [r for a in p["arms"] for r in a["rows"]])
    if name == "threats-table":
        return table(["Threat", "Attack (target)", "Dodge", "Boxes", "Weapon", "Trait"],
                     [[x["label"], x.get("attackJoin", ", ").join(f"{a['skill']} {a['target']}" for a in x["attacks"]), "—" if x["dodge"] is None else x["dodge"],
                       x["boxesText"], x["weaponText"], f"**{x['trait']}.** {x['traitText']}"] for x in p["threats"]])
    if name == "mounts":
        return table(["Mount or vehicle", "Move", "Run or gallop", "Notes"], p["mounts"]) if p.get("mounts") else ""
    if name == "materials-note":
        m = p.get("materials")
        if not m:
            return ""
        names = [x[1].split(" (")[0].lower() for x in m]
        return (f" For each attack, choose what it's made of ({', '.join(names[:-1])} or {names[-1]}), and the panel applies the rules that turn on it: "
                "a shapechanger's Tough in their form (and what gets past it), a weakness that marks one box more, and a creature only the right weapon can hurt.")
    if name == "discovery-panel":
        d = p.get("discovery")
        if not d:
            return ""
        th = d["threat"]
        return "\n".join(["## The Discovery panel", "",
            f"The GM view's **Discovery** panel runs discovery clocks and the {th.get('track') or th['name']} they race" + (f" (it stays idle until you **Start the {th['name']}** after a failed roll or a success at a cost)" if th.get("startsOnFailure") else "") + f". Start a clock with its segments per phase (or a plain progress clock for a repair or a task in the same race), and fill it as the investigation rolls succeed. It stops at the Identify gate until you name the subject; then it shows every {d['card']} the characters in the GM view already hold for it. "
            f"The **Failed roll** and **Push** buttons tick the track for how they were digging" + (f", and a failed roll ticks the {th.get('track') or th['name']} too" if th.get("repeat") or th.get("track") else "") + f". When a clock fills, **Mint** gives the primary investigator the {d['card']} and everyone you tick as present a shared copy. "
            + (f"**Record a finding without a clock** gives a {d['card']} for something established directly (seen or tested, a reliable account, a creature's word with evidence behind it) to whoever you tick, and marks its price: the track or the {th.get('track') or th['name']} that source costs. " if d.get("scoped") else "")
            + f"Save all to file afterwards, so the players' character files carry it. The Discord bot's `/discovery` and `/cards` commands do the same at a table that plays online.", ""])
    if name == "discovery-subjects":
        d = p.get("discovery") or {}
        return table(["Creature", "What the " + d.get("card", "card") + " knows", "What it permits"], [[f"**{x[1]}**", x[2], x[3]] for x in d.get("subjects", [])])
    if name == "discovery":
        # A setting can give its cards a chapter of their own (discovery.chapter): the rules move there, and a pointer stays here.
        d = p.get("discovery") or {}
        if d.get("chapter"):
            return f"Investigations have rules of their own, and earn {d['cards']}: see *{d['chapter']}*."
        return discovery_md(p.get("discovery"), t)
    if name == "card-howto":
        return card_howto_md(p.get("discovery"), t)
    if name == "discovery-chapter":
        return discovery_md(p.get("discovery"), t)
    if name == "magic":
        return magic_chapter(p["magic"], t["title"]) if p.get("magic") else ""
    if name == "powers":
        pw = p["powers"]
        out = []
        for g, gn in pw["groups"]:
            out += [f"## {gn}", "", table(["Power", "Class I", "Class II", "Class III"],
                    [[f"**{x[1]}**" + (f" ({x[5]})" if len(x) > 5 and x[5] else "") + (" *(GM)*" if x[4].get("gm") else "") + (" *(Mythic only)*" if x[4].get("mythicOnly") else ""), *x[3][:3]] for x in pw["list"] if x[2] == g]), ""]
        esc = [x for x in pw["list"] if len(x[3]) > 3]
        if esc:
            out += ["## Escalated Classes", "", "Every power keeps going at Classes IV to VI. Player characters reach Class IV only by pushing (one action, one box of Strain), with the Stronger Power Edge and the GM's approval, or at a campaign milestone; Class V is an end-of-campaign capstone, and Class VI belongs to the GM's characters. Speeds are in multiples of the speed of sound (Mach 1 is about 760 mph).", "",
                    table(["Power", "Class IV", "Class V", "Class VI"], [[f"**{x[1]}**", *x[3][3:6]] for x in esc]), ""]
        return "\n".join(out)
    if name == "gritty":
        g = p.get("gritty")
        if not g:
            return ""
        names = {x["id"]: x["name"].lower() for x in g["table"]}
        downs = "; ".join(f"{x['name'].lower()} becomes {names[x['down']] if x.get('down') else 'nothing lasting'}" for x in g["table"])
        heal = lambda x: "Never: a complication" if x.get("complication") else x["heal"][0].upper() + x["heal"][1:]
        return "\n".join([
            "", "### Optional rule: gritty combat", "",
            "For a harder, bloodier game, the GM can turn on **gritty combat** for the campaign (the creator has a switch on the Condition card and in the GM view). The rest of the rules stay the same.", "",
            "**Grievous hits.** A hit that marks **2 or more boxes** is **grievous** when the attack succeeded by **7 or more**, rolled a **natural 3 or 4**, or left the target **Dying**.", "",
            "- **A character** rolls 3d6 on the table below and suffers the result on top of the boxes.",
            "- **An opponent** is simply taken out: no roll, no boxes to count. Describe how, or let the GM view roll a description.",
            "- **With a telling hit,** the attacker also chooses which limb.", "",
            table(["3d6", "Grievous wound", "Effect", "Heals"], [[f"{x['from']}–{x['to']}", x["name"], x["text"], heal(x)] for x in g["table"]]), "",
            f"- **{t['point']}.** Spend {'an' if t['point'][0].lower() in 'aeiou' else 'a'} {t['point']} point to **downgrade** a grievous wound one step: {downs}.",
            "- **A limb for a life.** Once a fight, a character who would be left Dying or killed can **lose a limb, or the use of one**, instead. They live, Incapacitated but stable, and the limb becomes a complication. It replaces any grievous wound from the same hit.",
            "- **Healing.** Grievous wounds heal on their own clock, whatever the boxes say. A lost limb, a lost eye or a disfigurement never heals.", ""])
    if name == "battlemap":
        out = []
        for rt in p.get("rangeTracks") or ([p["rangeTrack"]] if p.get("rangeTrack") else []):
            if rt.get("vehicleTrack"):
                bands = ", ".join(f"{b[0]} ({b[1]})" for b in rt["bands"])
                out.append(f"**{rt['title']}.** In this setting the range track is for {rt['title'].lower()}s, with the bands {bands}. "
                    f"**Add {rt['us'][0].lower() + rt['us'][1:]}** places a token linked to the crew's {rt['vehicleTrack']} track, so damage marked on the map is marked on the sheet. "
                    f"Enemy ships come from the {rt['threats']} table with their {rt['vehicleTrack']} boxes. {rt.get('note', '')}".rstrip())
            elif rt.get("vehicle"):
                v = rt["vehicle"]
                out.append(f"**{rt['title']}.** Besides the plain range track, the map has a **{rt['title']}** track. **Add {rt['us'][0].lower() + rt['us'][1:]}** places {v['name'][0].lower() + v['name'][1:]} "
                    f"in the first lane with its own {v['label']} boxes; its panel shows what the damage does. The rules are under *{rt['title'].split()[0]} chases*.")
        return "\n".join(["", *[x + "\n" for x in out]]) if out else ""
    if name == "extra-edges":
        return "\n".join(f"| {e[1]} | {e[2]} | {e[3]} |" for e in p.get("extraEdges", []))
    if name == "statuses":
        return table([p.get("statusLabel", "Status"), "Benefit", "Cost"], [[f"**{x[1]}**", x[2], x[3]] for x in p["statuses"]])
    if name == "group-names":
        names = [g["name"] for g in p["groups"]]
        return ", ".join(names[:-1]) + " or " + names[-1]
    if name == "roles":
        g = {x["id"]: x["name"] for x in p["groups"]}
        if any(r.get("ability") for r in p["roles"]):
            return table([t["role"], "Group", "Typical contribution", "Core skills", "Ability"], [[r["name"], g[r["group"]], r["text"].split(": ", 1)[-1], ", ".join(r.get("skills", [])),
                         f"**{r['ability'][0]}.** {r['ability'][1]}" if r.get("ability") else "—"] for r in p["roles"]])
        return table([t["role"], "Group", "Typical contribution", "Core skills"], [[r["name"], g[r["group"]], r["text"].split(": ", 1)[-1], ", ".join(r.get("skills", []))] for r in p["roles"]])
    if name == "origin-tiers":
        e = p.get("edgePoints", 3)
        return table([t["origin"], "Tier", "Edges", "Adjustments"], [[o["name"] + (f" ({t['restrictedTag']})" if o.get("restricted") else ""), o["tier"], e - o["tier"], adj_text(o["adj"])] for o in sorted(p["origins"], key=lambda o: (o["tier"], o["name"]))])
    if name == "reasons":
        return "\n".join(f"{i}. **{a}.** {b}" for i, (a, b) in enumerate(p["reasons"], 1))
    if name == "connections":
        return "\n".join(f"{i}. **{a}.** {b}" for i, (a, b) in enumerate(p["connections"], 1))
    if name == "allegiances":
        return table(["Allegiance", "Benefit", "Burden"], [[a[1], a[2], a[3]] for a in p["allegiances"]]) if p["allegiances"] else "This setting has no allegiances."
    if name == "example":
        return char_block(p["example"], p, t, False)
    if name == "skills":
        return table(["Skill", "Attribute", "Typical use"], p["skills"])
    if name == "gear":
        ctl = lambda e: (e[3].get("control", "") if len(e) > 3 and isinstance(e[3], dict) else "")
        if any(ctl(e) for e in p["equipment"]):  # a setting with controlled gear (Fracture Lines) shows each item's tag
            return table(["Item", "Control", "What it does"], [[e[1], ctl(e) or "Open", e[2]] for e in p["equipment"]])
        return table(["Item", "What it does"], [[e[1], e[2]] for e in p["equipment"]])
    if name == "ammo":
        w = p.get("weapons")
        if not w or not w.get("items"):
            return ""
        out = [f"## {t['weaponsTitle']}", "", table(["Weapon", t["ammo"].capitalize()], [[n, cap] for n, cap in w["items"].values()]), "",
               table([t["shot"], t["ammo"].capitalize(), "Roll"], [[m[1] + (f" ({', '.join(w['items'][x][0] for x in m[3])} only)" if m[3] else ""), m[2], signed(m[4]) if m[4] else "—"] for m in w["modes"]]), "",
               f"- **Every {t['shot'].lower()} spends {t['ammo']}, hit or miss.** A {t['point']} reroll repeats the same {t['shot'].lower()} and costs nothing extra.",
               f"- **Empty means it won't work.** {t['reload']}: refills it from a spare. {t['restock']}: refills it fully between {t['missionLower']}s. Packing a spare is a good use of a {t['point']} point's small preparation."]
        if w.get("jamOn18"):
            out.append("- **Jams.** A natural 18 with this weapon also jams it: clearing it takes an action.")
        if p.get("loads"):  # special loads: ammunition made of a creature's weakness (Trails of Blood & Dust)
            L = p["loads"]; fits = lambda x: " or ".join(w["items"][g][0] for g in x[2]) + " only" if x[2] else "Any gun"
            out += ["", "## Special loads", "",
                    f"A **special load** is ammunition made of something a creature fears: silver, salt, cold iron, a blessing, fire. It's tracked loosely, as **{L['uses']} uses a job** for each load you carry, not counted bullets: a use is one fight or scene of shooting it. They're restocked between jobs. Choose the loads you carry in the creator, beside your gear.", "",
                    table(["Load", "Fits", "What it answers", "Coming by it"], [[x[1], fits(x), x[4], x[5]] for x in L["items"]]), "",
                    "- **No bonus on its own.** A load is ordinary ammunition with one difference: what it's made of. Against a creature whose weakness it is, that weakness works, whoever fires it and whether or not they know why (see *Weaknesses*). Against anything else it's just a bullet.",
                    "- **A hunter's shot.** When you, or someone assisting you, hold a lore card for the creature and you fire the load its weakness calls for, you can make a **hunter's shot**: the called shot or effect the card permits, one that would otherwise be impossible against it (silver at a werewolf's heart). Card and load together: the card alone gives the knowledge, the load alone the material. It's still a roll, with a called shot's usual penalty, and it adds no bonus.",
                    "- **Not proof.** A lore card never confirms its own creature: a hunter's shot needs the creature identified first (the Identify phase), as every card does.",
                    "- **Getting them can cost.** Buying silver is ordinary trade, but if folks learn what it's for (a smith asked to cast bullets, rounds seen in your gun) word gets around (Whispers); taking church silver or buying the makings for fire draws the law (Heat). A character with Tinkering can cast silver, hammer cold iron or mix incendiaries; a preacher, or an Occult working, blesses rounds."]
        return "\n".join(out)
    if name == "tracks":
        return table(["Track", "Boxes", "As boxes fill"], [[x["name"], x["boxes"], "; ".join(f"{i}: {e}" for i, e in enumerate(x["effects"]) if i)] for x in p["tracks"]])
    if name == "seeds":
        s = p["seeds"]; k1 = ["mission", "place", "strange"]; k2 = ["twist", "clock", "who"]
        col = lambda k, i: f"{s[k][1][i][0]} ({s[k][1][i][1]})" if k == "clock" else s[k][1][i]
        n = len(s["mission"][1])  # 16 entries, read by the 3d6 total
        return (table(["3d6"] + [s[k][0] for k in k1], [[i + 3] + [col(k, i) for k in k1] for i in range(n)]) + "\n\n" +
                table(["3d6"] + [s[k][0] + (" (segments)" if k == "clock" else "") for k in k2], [[i + 3] + [col(k, i) for k in k2] for i in range(n)]))
    if name == "pregens":
        return "\n".join(char_block(c, p, t, True) for c in p["pregens"]) if p["pregens"] else "*None yet.*"
    if name == "advantages":
        return table(["Advantage", "Effect"], [[a[1], a[2]] for a in p["advantages"]])
    if name == "complications":
        return table(["Complication", "What it does"], [[c[1], c[2]] for c in p["complications"]])
    if name == "origins":
        e = p.get("edgePoints", 3)
        out = [gen("origin-tiers", p, t), ""]
        if p.get("formCore"):
            out += [f"## {t['formCoreTitle'] if 'formCoreTitle' in t else 'Shared rules'}", "", table(["Rule", "What it means"], p["formCore"]), ""]
        for o in sorted(p["origins"], key=lambda o: (o["tier"], o["name"])):
            out += [f"## {o['name']}", "", f"*Tier {o['tier']} · {e - o['tier']} Edge{'s' if e - o['tier'] != 1 else ''} · {adj_text(o['adj'])}{' · ' + t['restrictedTag'] if o.get('restricted') else ''}*", "", o["desc"], ""]
            if o.get("core"):
                out += [f"**{t['origin']} rules:**", ""] + [f"- {x}" for x in o["core"]] + [""]
            if o.get("freeSkill"):
                out += [f"**Free skill:** {o['freeSkill']} is always at least Trained and doesn't use a Trained pick.", ""]
            f = o.get("form")
            if f:
                bits = [f"{a} {signed(f['attrs'][a])}" for a in ATTRS if f["attrs"].get(a)] + ([f"Dodge {signed(f['dodge'])}"] if f.get("dodge") else []) + f["traits"]
                out += [f"**{t['formProfile']}:** {'; '.join(bits)}." + (f" **Drawbacks:** {'; '.join(f['drawbacks'])}." if f.get("drawbacks") else ""), ""]
            if o.get("skills"):
                out += [f"**Suggested skills:** {', '.join(o['skills'])}.", ""]
            out += [table([o.get("traitLabel", "Advantage"), "Effect", "Companion complication"], [[x[1], x[2], f"**{x[5]}.** {x[6]}"] for x in o["traits"]]), ""]
        return "\n".join(out)
    sys.exit(f"unknown generated section {name}")


NEUTRAL_DISCOVERY = {
    "card": "Legend card", "cards": "Legend cards", "collection": "collection", "subject": "a creature, a rival's power, a strange device", "uncover": "how it is beaten or used",
    "phases": [["Confront the unknown", "Effects without a cause. You may suspect, but nothing is confirmed."],
               ["Identify", "Name the subject. This is the gate: until its identity is confirmed, what you know about a kind of subject doesn't yet apply to this one, and your theories stay suspicions. You can still form hypotheses, test them and take ordinary precautions, and whatever is actually true of it works."],
               ["Uncover", "Learn how it is beaten or used. Filling this phase fills the clock and earns a Legend card for what you established."]],
    "threat": {"name": "threat clock", "text": "The setting names the threat clock and what happens when it fills: a creature claiming another victim, a villain escalating, a reactor going critical."},
    "scoped": True,
    "routes": [["investigation", "A discovery clock", "filled to the end of Uncover", []],
               ["experience", "Seen or tested firsthand", "direct experience, or a sensible experiment", ["threat", "a track"]],
               ["account", "A reliable account", "a witness, a record or a book the GM judges reliable. A source's reputation alone doesn't make it right, but a reliable account can establish a fact without anyone repeating a dangerous test", ["a track"]],
               ["creature", "Its own word, backed up", "what the subject itself, or someone close to it, tells you, supported by evidence", ["a track"]]],
    "cardExample": {"subject": "The thing in the mine", "finding": "Bright light drove it back down the shaft", "limits": "Seen once; not whether light harms it, or how long it stays away",
                "evidence": "What the characters saw at the mine head", "route": "experience", "cost": "the threat clock +1 (the night spent watching)"},
}


def scoped_card_md(d, t, card, cards):
    """A setting whose cards are scoped (pack discovery.scoped): a card records only what the characters established,
    a real weakness works without one, knowledge can be earned without a clock (discovery.routes), and every source
    has a price (each route's costs: "threat" or a track)."""
    job = t["missionLower"]
    threat = d["threat"].get("track") or d["threat"]["name"]
    price = lambda r: " or ".join(f"{threat if c == 'threat' else c} +1" for c in (r[3] if len(r) > 3 else [])) or "What the clock cost along the way"
    out = [f"### The {card}", "",
           f"A {card} is a permanent record of one specific thing the characters have established. It holds only what they found out, never the whole truth: later discoveries add to it with more {cards}. It grants **no bonus** to any roll.", "",
           f"- **Weaknesses work anyway.** " + d.get("anyway", f"A real weakness works whoever uses it, {card} or no {card}. An unfamiliar procedure still needs its method, the knowledge, the skill and the means."),
           f"- **What a {card} is for.** It's what the character knows for certain and can rely on, plan around and teach. A correct deduction, a sensible experiment or an ordinary precaution needs no {card}.",
           f"- **The identification gate.** Before a subject is confirmed, you can form hypotheses, test them and take precautions, but what you know about a kind of subject isn't applied to this one until the Identify phase confirms it. Holding a {card} never proves that this is that.",
           f"- **Shared copies.** Everyone who establishes a finding, or is there when a {card} is earned, gets a shared copy; one character is recorded as its owner. A character who wasn't there can be taught it later, from a reliable account.",
           f"- **What it records.** The subject, the precise finding, its limits (what it doesn't show), the evidence or source, how it was learned, what it cost, the date, its owner and who received it. It's kept on the character sheet, under *Learned in play*.", "",
           f"### Earning a {card}", "",
           f"A discovery clock is one way to earn a {card}. The others need no clock: when a fact is established directly or taught reliably, the GM records the {card} at once. **Information is never free:** each source has its price, marked when the {card} is recorded.", ""]
    out += [table(["How it was learned", "What counts", "What it costs"], [[f"**{r[1]}**", r[2][0].upper() + r[2][1:] + ".", price(r)] for r in d.get("routes", [])]), ""]
    out += [f"- **A basis for a proposal.** An investigation proposal needs a reasonable basis: " + d.get("basis", "what the characters have heard, evidence, testimony, their own experience, or a suspicion they can explain") + f". Naming the right answer with nothing behind it doesn't earn a {card}. The GM asks what supports an approach, and never rejects it just because it matches the hidden truth.",
            f"- **Ideas are free; information isn't.** Proposing a theory costs nothing. Learning something does: a discovery clock's scenes and failed rolls, or the price of a direct source (above).",
            f"- **Enough clues.** The GM provides enough clues, and more than one route to each answer: a {job} shouldn't stall on a single missed roll.", ""]
    if d.get("startCards"):
        sc = d["startCards"]
        out += [f"### {sc['label']}", "",
                f"A character who takes the **{sc['label']}** advantage starts play with {['no', 'one', 'two', 'three', 'four', 'five'][sc['n']] if sc['n'] <= 5 else sc['n']} {cards} they write themselves, with the GM's agreement. Each must hold a **secret**: something that {sc['secret']}. Each comes from the character's {t['roleLower']} or {t['originLower']}: what their work or their people taught them. The creator asks for the subject, the secret, which it comes from, and why it isn't common knowledge.", ""]
    return out


def card_howto_md(d, t, neutral=False):
    """For the GM: when a card is earned, and how to write and record one (scoped cards)."""
    if not d or not d.get("scoped"):
        return ""
    card, cards = d["card"], d["cards"]
    Card = card[0].upper() + card[1:]
    threat = d["threat"].get("track") or d["threat"]["name"]
    ex = d.get("cardExample") or {}
    route = {r[0]: r[1] for r in d.get("routes", [])}.get(ex.get("route"), "")
    out = [f"## Making {cards}", "",
           f"For the GM: when a {card} is earned, and how to write one. A {card} is a record of what the characters established, so writing it well matters more than how often you hand one out.", "",
           f"1. **Decide that something is established.** A {card} is earned when a discovery clock fills, or when the characters see or test something themselves, hear it from a source you judge reliable, or are told it by the subject itself with evidence to back it up. A guess, however right, isn't established, and neither is a rumor. Ask what supports their idea; when the answer is good, let them act on it, and give the {card} once they've confirmed it.",
           f"2. **Write the finding narrowly.** One fact, in the words the characters would use, and no more than they found out: \"bright light drove it back\", not \"it fears light\". Two separate facts make two {cards}. Never write the subject's whole truth onto a {card}; later discoveries add more {cards}.",
           f"3. **Write its limits.** What the finding doesn't show: how often it was seen, under what conditions, and what is still unknown. The limits are what keep the next investigation interesting.",
           f"4. **Note the evidence or source.** What they saw, tested, read or were told, and by whom. A source's reputation doesn't make it right: if it was only probably true, the limits say so.",
           f"5. **Charge the price.** A {card} from a discovery clock costs nothing more: the scenes, failed rolls and pushes were its price. Any other source has its price (see *Earning a {card}*): choose the one that fits how they learned it, and mark it.",
           f"6. **Choose the owner and the recipients.** Whoever did the finding owns the {card}. Everyone who was there, or heard it from a reliable source, gets a shared copy.",
           f"7. **Record it.** " + ("Write it on each recipient's sheet, under *Learned in play*." if neutral else f"In the GM view's **Discovery** panel: **Mint** a full clock's {card}, or use **Record a finding without a clock**, which marks the price for you. Then save everyone's characters to file, so the players' sheets carry it. A player can also write a {card} on their own sheet, when you agree it's been earned."), ""]
    if ex:
        out += [f"*Example:* **{ex['subject']}.** Established: *{ex['finding']}*. Limits: *{ex['limits']}*. Source: {ex['evidence']} ({route.lower() or 'firsthand'}). Cost: {ex['cost']}.", ""]
    out += [f"- **When a later finding disagrees.** Write a new {card} that says what they now know; the old one stays on the sheet as what they believed then, and the new one's limits can say so.",
            f"- **A {card} is never proof of identity.** Holding a {card} about one subject doesn't prove that the thing in front of them is that subject: the Identify phase does.",
            f"- **Weaknesses work anyway.** Don't hold back a real weakness because no one holds the {card}: if they try it, it works."]
    if d.get("startCards"):
        sc = d["startCards"]
        out += [f"- **{sc['label']}.** Agree each starting {card} with its player before play: it must come from the character's {t['roleLower']} or {t['originLower']}, be narrow, and be a real secret: something that {sc['secret']}. Make sure it fits what you know to be true, adjust it if it doesn't, and keep a note of it."]
    out += [""]
    return "\n".join(out)


def discovery_md(d, t, neutral=False):
    """Discovery clocks and the cards they mint (a setting's pack discovery block): the shared rules, then the setting's
    names, threat clock, investigation costs and methods."""
    if not d:
        return ""
    card, cards, coll = d["card"], d["cards"], d["collection"]
    Card, Cards = card[0].upper() + card[1:], cards[0].upper() + cards[1:]
    th = d["threat"]
    out = [f"## Discovery clocks and {cards}", "",
           f"When a {t['missionLower']} turns on an unknown subject ({d['subject']}), the GM sets up a **discovery clock**. It fills in three phases, and filling it mints a **{card}**: what the characters learned, kept for good. A character's {cards} are their **{coll}**.", ""]
    out += [table(["Phase", "What it means"], [[f"{i + 1}. {n}", x] for i, (n, x) in enumerate(d["phases"])]), ""]
    out += ["- **Sizing.** The GM decides how many segments each phase needs (usually 1–2 to Confront, 2–3 to Identify, 2–3 to Uncover) and which methods can advance it, and shows the clock to the players.",
            "- **Advancing.** Each roll that advances the clock uses a concrete **method** tied to a skill (below): one segment for a success, two for success by 5 or more. The clock stops at the end of Identify until the subject is confirmed: segments never spill past the gate.",
            f"- **The primary investigator.** One character leads and owns the {card}. Others **assist** under the usual assistance rules, rolling a relevant skill. A character who holds a relevant {card} can assist with a method they couldn't otherwise bring (the {card} is why they're qualified); it adds nothing beyond the normal assistance.",
            f"- **Pushing.** A player can push to dig faster or harder: a success advances one extra segment, but a track ticks (below) whatever the roll.", ""]
    if d.get("scoped"):
        out += scoped_card_md(d, t, card, cards)
    else:
      out += [f"### The {card}", "",
            f"A {card} grants **no bonus** to any roll. It is an earned permission: knowledge that makes possible an action otherwise forbidden or unavailable against that subject. Without it, the GM can rule that the action isn't possible: you can't aim for a heart you don't know is the weakness, or speak a name you never learned. A {card} can authorize a called shot or a telling-hit effect that would otherwise be unavailable.", "",
            f"- A {card} never helps confirm its own subject: holding one doesn't prove this is that. It applies once the Identify phase has confirmed it.",
            f"- **Shared copies.** Every character present when the {card} is minted (the climactic confrontation or the breakthrough) gets a shared copy; the primary investigator is recorded as its owner. An absent character doesn't, though a holder can teach it to them later with the GM's agreement.",
            f"- **What it records.** The subject (its tag), what was learned, what it permits, the {t['missionLower']} where it was earned, its owner, and who was there. It's kept on the character sheet, under *Learned in play*.", ""]
    if d.get("kinds"):
        out += [f"**Two kinds of {cards}.** " + " ".join(f"**{k[0].capitalize()}:** {k[1]}." for k in d["kinds"]), ""]
    out += [(f"### Racing the {th['track']}" if th.get("track") else f"### The {th['name']}") if not neutral else "### The threat clock", "",
            ("A discovery clock always races a threat: here, the " + th["track"] + " track. " if th.get("track") else "" if th.get("startsOnFailure") else "A discovery clock always races a threat clock. ") + th["text"], ""]
    if d.get("costs"):
        out += ["### What investigating costs", "",
                "When an investigation roll fails, or a player pushes, one of the shared tracks ticks up by one, chosen by how the party is digging. A failed roll can still turn up a lead when the story allows it, but the track still ticks.", "",
                table(["Track", "Ticks for", "For example"], [[f"**{a}**", b, c] for a, b, c in d["costs"]]), ""]
    else:
        out += ["### What investigating costs", "",
                "When an investigation roll fails, or a player pushes, one of the setting's shared tracks ticks up by one, chosen by how the party is digging. A failed roll can still turn up a lead when the story allows it, but the track still ticks.", ""]
    if d.get("methods"):
        out += ["### Methods", "",
                f"Which methods suit a character depends on their {t['roleLower']}, {t['originLower']} and skills. The GM says which methods can advance each phase.", "",
                table(["Method", "Skills", "Suits", "Phases", "For example"], d["methods"]), ""]
        groups = d.get("groups", {})
        if groups:
            gn = {g["id"]: g["name"] for g in t.get("_groups", [])}
            out += ["- " + "; ".join(f"**{gn.get(k, k)}:** {v}" for k, v in groups.items()) + "."]
        if d.get("origins"):
            out += ["- " + d["origins"]]
        if d.get("start"):
            out += ["- " + d["start"]]
        out += [""]
    if neutral:
        names = []
        order = ["western", "spaceopera", "fantasy", "aurora"]
        for f in sorted((LD / "packs").glob("*/pack.json"), key=lambda f: order.index(f.parent.name) if f.parent.name in order else 99):
            pk = json.loads(f.read_text()); dd = pk.get("discovery")
            if dd:
                names.append((pk["terms"]["title"], dd["cards"], dd["collection"]))
        out += [f"*Each setting names its {cards}, their collection, the threat clock, the tracks investigating pushes, each source's price and the methods. "
                + "; ".join(f"{t2}: {c} in {'an' if col[0] in 'aeiou' else 'a'} {col}" for t2, c, col in names) + ".*", ""]
    return "\n".join(out)


def pack_sections(md):
    parts = re.split(r"<!--\s*SECTION:(\w+)\s*-->", md)
    return {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}


def table_server():
    """The shared table server's address (legend-dynamics/table-server/server-url.txt, once it's deployed), or "": players then type it in."""
    f = LD / "table-server" / "server-url.txt"
    url = f.read_text().strip() if f.exists() else ""
    return url if re.fullmatch(r"https://[\w.-]+(:\d+)?", url) else ""


def inline_module(path, name):
    """An ES module from engine/rules or engine/lab as a plain script constant: `const name = (() => { ...; return {exports} })();`.
    The pages stay single files; the same module files are imported directly by the tests."""
    src = path.read_text().replace("// @ts-check\n", "")
    names = re.findall(r"^export (?:async )?(?:function|const|let) (\w+)", src, flags=re.M)
    imports = re.findall(r"^import .*$", src, flags=re.M)
    for line in imports:
        src = src.replace(line + "\n", "")
    src = re.sub(r"^export (async )?(function|const|let) ", r"\1\2 ", src, flags=re.M)
    if re.search(r"^\s*export\b", src, flags=re.M):
        sys.exit(f"{path}: only `export function/const/let` declarations can be inlined")
    return f"const {name} = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();"


def rules_js():
    return inline_module(ENGINE / "rules" / "core.js", "LD")


def guide_md(pack, t, sections):
    core = (ENGINE / "core.md").read_text()
    core = re.sub(r"\{\{PACK:(\w+)\}\}", lambda m: sections.get(m.group(1), ""), core)
    core = re.sub(r"\{\{GEN:([\w-]+)\}\}", lambda m: gen(m.group(1), pack, t), core)
    return re.sub(r"\n{3,}", "\n\n", fill(core, t))


def heading_block(md, heading):
    """The block of the guide under a heading line (\"## Weaknesses\"), up to the next heading of the same or a higher level."""
    level = len(heading) - len(heading.lstrip("#"))
    m = re.search(r"^" + re.escape(heading) + r"[ \t]*$", md, flags=re.M)
    if not m:
        sys.exit(f"GM's Guide: no heading {heading!r} in the guide")
    end = re.compile(r"^#{1,%d} " % level, flags=re.M).search(md, m.end())
    return m.start(), end.start() if end else len(md)


def split_gm(md, cfg):
    """A setting with a GM's Guide (pack gmGuide): the sections for running the game move out of the Players' Guide
    into a companion book (open to everyone, organized by who uses it), in the order its chapters list them. A section can leave a short note behind (leave), and
    the moved text's pointers back into the Players' Guide are reworded (replace)."""
    gm = []
    for ch in cfg["chapters"]:
        if ch.get("title"):
            gm += [f"# {ch['title']}", ""] + ([ch["intro"], ""] if ch.get("intro") else [])
        for h in ch["take"]:
            a, b = heading_block(md, h)
            gm += [md[a:b].strip(), ""]
            md = md[:a] + (cfg.get("leave", {}).get(h, "").strip() + "\n\n" if cfg.get("leave", {}).get(h) else "") + md[b:]
    if cfg.get("playersNote"):
        md = re.sub(r"(## How this book is organized\n\n[^\n]+)", lambda m: m.group(1) + " " + cfg["playersNote"], md, count=1)
    body = "\n".join(gm).strip() + "\n"
    for old, new in cfg.get("replace", []):
        if old not in body:
            sys.exit(f"GM's Guide: {old!r} is not in the moved sections")
        body = body.replace(old, new)
    head = f'---\ntitle: "{cfg["title"]}"\nsubtitle: "{cfg.get("subtitle", "")}"\nauthor: "Don Smallwood"\n---\n\n{cfg["intro"]}\n\n'
    return re.sub(r"\n{3,}", "\n\n", md), re.sub(r"\n{3,}", "\n\n", head + body)


CORE_COMBAT = json.loads((ENGINE / "combat.json").read_text())


def with_core_combat(pack):
    """The core attack and defense rules every setting publishes, with the pack's own additions and overrides,
    and the core's improvised shield beside the pack's protective gear."""
    rules = {k: dict(v) for k, v in CORE_COMBAT["rules"].items()}
    for k, v in pack.get("combatRules", {}).items():
        rules[k] = {**rules.get(k, {}), **v}
    have = {g["id"] for g in pack.get("protection", [])}
    return {**pack, "combatRules": rules, "coreCombat": sorted(CORE_COMBAT["rules"]),
            "protection": pack.get("protection", []) + [g for g in CORE_COMBAT["protection"] if g["id"] not in have]}


def quickref(pack, t):
    core = [["Resolution", "3d6 at or below adjusted skill. Natural 3–4 always succeeds; 17–18 always fails. Margin = target − roll."],
            ["Opposed", "Success beats failure; both succeed → larger margin wins; ties and double failures favor the defender."],
            ["Combat", "Move up to your Move and take one action. Hit → target may defend once per round: Dodge, Parry or Block → weapon effect. Partial cover −2."],
            ["Defending", "One defense a round; Additional Defense: a second, at −2, never twice against one attack. Dodge: Agility −2 + Athletics. Parry a weapon in hand or fists: " + t["meleeSkill"] + " or " + t["unarmedSkill"] + " −3. Block a weapon in hand, fists or a missile with a shield or anything that stands in for one: " + t["meleeSkill"] + " −2 + the shield's bonus (never a gunshot or blast); an improvised one breaks on a 2+ box hit. Attack succeeded by 3–4: defense −1; 5–6: −2; 7+: −3. Aim (one action): +1 to your next attack on that target."],
            ["Telling hit", "Hit by 5+ or a natural 3–4, not defended: the attacker picks one effect the weapon can deliver (disarm; knock down, in hand or a 2+ box shot: standing uses their move; pin, in hand or a grapple only: their next action frees them; rattle −2; break gear, not bare-handed: out of use until an action fixes it; open them up +2; precise). Called shot: −2 (small target −4), and any hit gets the effect. No extra boxes, never an outright kill. Shrug it off: Hard to put down (once a fight) or a point."],
            ["Range", "Close 10 yd, Short 25 yd, Medium 100 yd, Long 300 yd, Extreme 1,000 yd. Within a weapon's effective band: no penalty; one band beyond −2, two −4, farther out of range."],
            ["Move", f"5 yd, +1 per 2 points of Agility + Body above 20, +1 Trained Athletics or +2 Specialty/Expert, ± {t.get('originLower', 'origin')} speed. Run (no action): twice that. Threats: 8 yd. Wounded −2 yd; seriously wounded half, no running. Hard going (climbing, swimming, snow, rubble): half. Stepping away from a fight is free."],
            ["Reach", "1 yd: fists, knives, clubs, claws. 2 yd: swords, axes, maces. 3 yd: spears, polearms."],
            ["Dying", f"A 2-box weapon that brings you to 3 boxes: Dying; dead at the end of the scene unless stabilized (one action, Medicine, {t['medkit']}). At 3 boxes, another 2-box hit kills."],
            ["Medicine", "Stabilize: one action. Field care clears 1 box (2 on margin 5+). Proper care gives +2, clears 2 (3 on margin 5+). One field and one proper-care attempt per set of injuries (one fight or incident); more need better care, a new treatment or recovery time."],
            ["Rest", "Clearing one box: a full day at 1 box, at least three days at 2, a week at 3 (and only once someone has stabilized or treated you)."],
            [t["point"], "Reroll (keep second), reduce an injury by one box, shrug off a telling hit, or establish a small preparation."]]
    return "".join(f"\n            <dt>{html.escape(a)}</dt><dd>{html.escape(b)}</dd>" for a, b in core + pack.get("quickRef", [])) + "\n          "


HANDOUTS = []  # (game info, folder) for each pack built; the handouts are written after the bot code, which they carry.


def check_calling_recipe(pack):
    """A setting with a calling recipe: every calling has four core skills, one fighting (or, for a calling that
    isn't a fighter, a second signature), one trail and one people skill plus a signature skill, and every skill is core for at least one calling and no more than the cap."""
    rec = pack.get("callingRecipe")
    if not rec:
        return
    names = [s[0] for s in pack["skills"]]
    use = {n: 0 for n in names}
    for r in pack["roles"]:
        sk = r.get("skills", [])
        assert len(sk) == 4 and len(set(sk)) == 4 and set(sk) <= set(names), (r["name"], sk)
        # A calling that isn't a fighter (rec["nonFighters"]) takes a second signature skill in the fighting slot.
        for g in ("fight", "trail", "people"):
            if g == "fight" and r["name"] in rec.get("nonFighters", []):
                assert sk[0] not in rec["fight"], (r["name"], "is not a fighter", sk)
                continue
            assert sk[["fight", "trail", "people"].index(g)] in rec[g], (r["name"], g, sk)
        assert r.get("ability") and len(r["ability"]) == 2, (r["name"], "needs an ability")
        for s in sk:
            use[s] += 1
    for n, k in use.items():
        assert 1 <= k <= rec.get("max", {}).get(n, rec.get("maxOther", 4)), (n, "is core for", k, "callings")


def build(pid, docx):
    pdir = LD / "packs" / pid
    pack = json.loads((pdir / "pack.json").read_text())
    check_calling_recipe(pack)
    t = terms_of(pack)
    sections = pack_sections((pdir / "setting.md").read_text())
    t["_groups"] = pack["groups"]
    md = guide_md(pack, t, sections)
    del t["_groups"]
    gm_md = None
    if pack.get("gmGuide"):
        md, gm_md = split_gm(md, pack["gmGuide"])
    out = LD / pid
    out.mkdir(exist_ok=True)
    (out / "players-guide.md").write_text(md)
    to_html = lambda m, prefix: subprocess.run(["pandoc", "-f", "markdown", "-t", "html", f"--id-prefix={prefix}", "--wrap=none"], input=m, capture_output=True, text=True, check=True).stdout
    guide_html = to_html(md, "g-")
    if gm_md:
        # Both books in the Guide tab, one shown at a time (a Players / GM switch in the page).
        (out / "gm-guide.md").write_text(gm_md)
        # The GM's Guide itself isn't in the page: the table server gives it to registered GMs (tools/gm_guides.py).
        g = pack["gmGuide"]
        gm_guides.write_game(out, g["title"], g.get("subtitle", ""), to_html(gm_md, "gm-"))
        guide_html = (f'<div class="guide-book" id="guide-players" data-title="{html.escape(t["guideTitle"])}" data-subtitle="{html.escape(t["guideSubtitle"])}">\n' + guide_html + "</div>\n"
                      + gm_guides.locked_book(g["title"], g.get("subtitle", "")))
    theme = {**THEME_DEFAULTS, **pack.get("theme", {})}
    tpl = (ENGINE / "creator.html").read_text()
    tpl = tpl.replace("{{THEMECSS}}", theme["css"])
    tpl = tpl.replace("{{GROUPCSS}}", "\n".join(f'[data-div="{g["id"]}"] {{ --accent: var({g["color"]}); }}' for g in pack["groups"]))
    tpl = tpl.replace("{{QUICKREF}}", quickref(pack, t))
    tpl = tpl.replace("/* BATTLEMAP */", (ENGINE / "battlemap.js").read_text().replace("</", "<\\/"))
    tpl = tpl.replace("/* TABLECLIENT */", (ENGINE / "table-client.js").read_text().replace("</", "<\\/"))
    tpl = tpl.replace("/* GMLOCK */", (ENGINE / "gm-lock.js").read_text().replace("</", "<\\/"))
    tpl = tpl.replace("{{TABLE_SERVER}}", table_server())
    tpl = tpl.replace("{{OUTCOMES}}", "".join(f"<option>{html.escape(o)}</option>" for o in pack["journal"]["outcomes"]))
    tpl = re.sub(r"\{\{theme\.(\w+)\}\}", lambda m: str(theme[m.group(1)]), tpl)
    tpl = tpl.replace("{{fontsHref}}", t["fontsHref"])
    tpl = fill(tpl, t)
    left = sorted(set(re.findall(r"\{\{[\w.:]+\}\}", tpl)))
    if left:
        sys.exit(f"{pid}: unfilled tokens {left}")
    js = "const PACK = " + json.dumps({**with_core_combat(pack), "terms": t, "theme": theme}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";"
    tpl = tpl.replace("/* PACK:START *//* PACK:END */", "/* PACK:START */" + js + "/* PACK:END */")
    tpl = tpl.replace("/* RULES:CORE */", rules_js())
    # The Encounter panel in the GM view: in every setting, running the published rules. A setting with a test
    # configuration (packs/<id>/lab.json, on the rules-lab branch) also gets the Rules Lab's experiments.
    mods = [inline_module(ENGINE / "rules" / "experiments.js", "LDX")] + [inline_module(f, "LAB_" + f.stem.upper()) for f in sorted((ENGINE / "lab").glob("*.js"))]
    lab = pdir / "lab.json"
    lab_data = json.loads(lab.read_text()) if lab.exists() else None
    if lab_data is not None and "grievous" not in lab_data and pack.get("gritty"):
        lab_data["grievous"] = pack["gritty"]  # the setting's own grievous wound table (its gritty combat option)
    tpl = tpl.replace("/* RULES:LAB */", "const LAB_DATA = " + json.dumps(lab_data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";\n  " + "\n  ".join(mods))
    tpl = tpl.replace("<!-- RULES:LAB-PANEL -->", (ENGINE / "lab" / "panel.html").read_text())
    tpl = re.sub(r"<!-- GUIDE:START -->.*?<!-- GUIDE:END -->", lambda _: "<!-- GUIDE:START -->\n" + guide_html + "<!-- GUIDE:END -->", tpl, flags=re.S)
    tpl = stamp(tpl, out / "index.html")  # the version footer: a fingerprint of the page, and the day it last changed
    (out / "index.html").write_text(tpl)
    g = discord_handout.game_info(pid, t["title"], t["point"], pack.get("tracks", []), pack.get("seeds", {}), t["tracksTitle"])
    if pack.get("discovery"):
        d = pack["discovery"]
        g["discovery"] = {**d, "example": (d.get("subjects") or [[None, {"aurora": "Lord Marrow", "spaceopera": "Vael"}.get(pid, "Werewolf")]])[0][1]}
    HANDOUTS.append((g, out))
    print(f"built {out.relative_to(ROOT)}/index.html and players-guide.md")
    if docx:
        name = re.sub(r"[^A-Za-z0-9]+", "_", t["guideTitle"]).strip("_") + ".docx"
        subprocess.run(["pandoc", "-f", "markdown", "-o", str(out / name)], input=md, text=True, check=True)
        spec = importlib.util.spec_from_file_location("bg", ROOT / "tools" / "build-guide.py"); bg = importlib.util.module_from_spec(spec); spec.loader.exec_module(bg)
        bg.NAVY, bg.GOLD_FILL = pack.get("docxColors", ["1B2A4A", "E9EEF6"])
        bg.finish_docx(out / name)
        print(f"wrote {(out / name).relative_to(ROOT)}")
        if gm_md:
            name = re.sub(r"[^A-Za-z0-9]+", "_", pack["gmGuide"]["title"].replace("'s ", " ")).strip("_") + ".docx"
            subprocess.run(["pandoc", "-f", "markdown", "-o", str(out / name)], input=gm_md, text=True, check=True)
            bg.finish_docx(out / name)
            print(f"wrote {(out / name).relative_to(ROOT)}")


def core_rules(docx=False):
    t = terms_of({"terms": {}})
    core = (ENGINE / "core.md").read_text()
    core = core.replace("{{PACK:intro}}", "Legend Dynamics is a roleplaying system for heroic stories in any genre: concrete skills, a 3d6 roll-under core, and a small pool of Legend points that reward characters for their flaws. These core rules are setting-neutral. A **setting pack** supplies the roles, origins, skills, gear, weapons, tracks and dangers of one genre, and renames a few terms to suit it.")
    # Neutral stand-ins for the pack-specific parts of "Making your own".
    core = core.replace("{{GEN:extra-edges}}\n", "\nEach setting also offers special Edges of its own, such as powers in Aurora; its Players' Guide lists them.\n").replace("{{GEN:gritty}}", "").replace("{{GEN:battlemap}}", "")
    core = core.replace("{{GEN:magic}}", magic_chapter({}))
    core = core.replace("{{GEN:discovery}}", discovery_md(NEUTRAL_DISCOVERY, t, neutral=True)).replace("{{GEN:card-howto}}", card_howto_md(NEUTRAL_DISCOVERY, t, neutral=True)).replace("{{GEN:discovery-panel}}\n", "").replace("{{GEN:materials-note}}", "")
    core = core.replace("{{PACK:customrole}}", '"Smuggler: knows every back door, bribe and hidden hold."')
    core = core.replace("{{GEN:group-names}}", "one of your setting's groups")
    core = core.replace("{{PACK:customorigin}}", "**Hill-folk (tier 1).** Stocky herders from high, cold country. *Adjustments:* Body +1, Presence −1. *Core rule:* at home in the heights: no penalty for thin air or cold. *Origin advantage:* **Sure-Footed**: +2 to Athletics to climb and keep your footing. *Companion:* **Clannish**: you trust your own people first; when it matters, accept the cost of that loyalty.")
    core = re.sub(r"\{\{PACK:(\w+)\}\}", "", core)
    core = re.sub(r"\{\{GEN:([\w-]+)\}\}", lambda m: f"*Your setting pack supplies this ({m.group(1).replace('-', ' ')}).*", core)
    core = fill(core, t).replace("This book combines the **Legend Dynamics core rules**, which every setting shares, with the **Legend Dynamics** setting: its roles, origins, skills, gear, weapons and dangers. In this setting, the core rules' Legend points are called **Legend points**.",
                        "These are the **Legend Dynamics core rules**, which every setting shares. A setting pack adds its roles, origins, skills, gear, weapons and dangers, and may rename terms: Legend points might be Grit in a Western or Resolve in space opera.")
    core = core.replace("Expert (Expert) =", "Expert =")
    md = re.sub(r"\n{3,}", "\n\n", core)
    (LD / "Legend_Dynamics_Core_Rules.md").write_text(md)
    print("wrote legend-dynamics/Legend_Dynamics_Core_Rules.md")
    if docx:
        out = LD / "Legend_Dynamics_Core_Rules.docx"
        subprocess.run(["pandoc", "-f", "markdown", "-o", str(out)], input=md, text=True, check=True)
        spec = importlib.util.spec_from_file_location("bg", ROOT / "tools" / "build-guide.py"); bg = importlib.util.module_from_spec(spec); spec.loader.exec_module(bg)
        bg.finish_docx(out)
        print(f"wrote {out.relative_to(ROOT)}")


# The fan games (USS Pelion, Grimm) are private: they're in the fan-games bot only, never the public one.
FAN = ROOT / "fan-games"
FAN_LEGACY = {"aliases": [["pelion", "roll"], ["duty", "points", "Duty"], ["grimm", "roll"], ["grit", "points", "Grit"]],
              "bindings": {"DUTY": "pelion", "GRIT": "grimm"}}  # the old Pelion and Grimm bots' command names and storage


def bot_packs():
    """Write every pack's bot data (point name, tracks, seed tables) into the public Discord bot, and the same plus the
    fan games (fan-games/discord-bot/games/*.json) into the private fan-games bot (fan-games/discord-bot/worker.js)."""
    bot = LD / "discord-bot" / "src" / "worker.js"
    data = {}
    for d in sorted(p for p in (LD / "packs").iterdir() if (p / "pack.json").exists()):
        pack = json.loads((d / "pack.json").read_text())
        t = terms_of(pack)
        data[pack["id"]] = {"id": pack["id"], "title": t["title"], "point": t["point"], "mission": t["mission"],
                            "trackTitle": t["tracksTitle"], "tracks": pack.get("tracks", []), "seeds": pack.get("seeds", {})}
        if pack.get("discovery"):  # discovery clocks and cards: names, the threat clock, which tracks investigating pushes
            d = pack["discovery"]
            data[pack["id"]]["discovery"] = {"card": d["card"], "cards": d["cards"], "collection": d["collection"], "phases": [p[0] for p in d["phases"]],
                                             "threat": {k: d["threat"].get(k) for k in ("name", "repeat", "onFill", "count", "track") if d["threat"].get(k) is not None}, "costs": [c[0] for c in d.get("costs", [])],
                                             **({"kinds": [k[0] for k in d["kinds"]]} if d.get("kinds") else {})}
    fan = dict(data)
    # The fan games: their own data, seed tables read from their creators.
    for f in sorted((FAN / "discord-bot" / "games").glob("*.json")):
        game = json.loads(f.read_text())
        page = fan_sources.read_text(game.pop("seedsFrom")) if "seedsFrom" in game else ""
        m = re.search(r"const SEEDS = (\{.*?\});\n", page)
        game.setdefault("seeds", json.loads(m.group(1)) if m else {})
        fan[game["id"]] = game
    src = bot.read_text()

    def fill_bot(packs, legacy):
        out = re.sub(r"/\* PACKS:START \*/.*?/\* PACKS:END \*/", lambda _: "/* PACKS:START */\nexport const PACKS = " + json.dumps(packs, ensure_ascii=False, indent=1) + ";\n/* PACKS:END */", src, flags=re.S)
        return re.sub(r"/\* LEGACY:START \*/.*?/\* LEGACY:END \*/", lambda _: "/* LEGACY:START */\nexport const LEGACY = " + json.dumps(legacy, separators=(", ", ": ")) + ";\n/* LEGACY:END */", out, flags=re.S)
    public = fill_bot(data, {"aliases": [], "bindings": {}})
    if public != src:
        bot.write_text(public)
    print(f"wrote {len(data)} packs into {bot.relative_to(ROOT)}")
    (FAN / "discord-bot" / "worker.js").write_text(fill_bot(fan, FAN_LEGACY))
    print(f"wrote {len(fan)} packs into fan-games/discord-bot/worker.js")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docx", action="store_true")
    ap.add_argument("packs", nargs="*")
    a = ap.parse_args()
    packs = a.packs or sorted(p.name for p in (LD / "packs").iterdir() if (p / "pack.json").exists())
    for pid in packs:
        build(pid, a.docx)
    core_rules(a.docx)
    gm_guides.bundle()
    bot_packs()
    for g, out in HANDOUTS:
        discord_handout.write_handout(g, out)
        print(f"wrote {(out / 'discord-commands.html').relative_to(ROOT)}")
    discord_handout.main()  # USS Pelion and Grimm carry the same bot code


if __name__ == "__main__":
    main()
