#!/usr/bin/env python3
"""Build Legend Dynamics setting packs.

For each pack in legend-dynamics/packs/<id>/ (pack.json + setting.md) this writes:
  legend-dynamics/<id>/index.html        the character creator, with the pack's data, look and guide
  legend-dynamics/<id>/players-guide.md  the full Players' Guide (core rules + setting)
  legend-dynamics/<id>/<Title>_Players_Guide.docx   with --docx
It also writes legend-dynamics/Legend_Dynamics_Core_Rules.md, the setting-neutral core rules.

  python3 tools/build-legend.py [--docx] [pack ...]
"""
import argparse, html, importlib.util, json, pathlib, re, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import discord_handout

ROOT = pathlib.Path(__file__).resolve().parent.parent
LD = ROOT / "legend-dynamics"
ENGINE = LD / "engine"
ATTRS = ["Body", "Agility", "Intellect", "Presence", "Will"]
LEVEL_MOD = {"U": -4, "T": 1, "S": 3}

DEFAULT_TERMS = {
    "title": "Legend Dynamics", "eyebrow": "Legend Dynamics RPG system", "prepareTitle": "Prepare", "titlePlaceholder": "e.g. Captain", "guideTitle": "Legend Dynamics Core Rules",
    "guideSubtitle": "The setting-neutral rules of the Legend Dynamics RPG system", "point": "Legend",
    "role": "Role", "roleLower": "role", "origin": "Origin", "originLower": "origin", "originPlural": "Origins",
    "pathRounded": "Generalist", "pathExpert": "Specialist", "pathExpertPlural": "Specialists",
    "reasonLabel": "Why you do what you do", "reasonSheet": "Why I do it", "gear": "Gear", "gearLower": "gear",
    "tabPlay": "Play", "readyText": "Ready to play", "stun": "Dazed", "medkit": "medical kit",
    "facility": "A proper infirmary", "restText": "full day", "mission": "Mission", "missionLower": "mission",
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
        extra.append(f"a fine tool: {lc(c['gear']['item'])} (+2 {c['gear']['skill']})")
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
           f"Each {B} has a short **base effect**: one target, for one scene, at Close or Short range. Harm marks 2 boxes; a penalty is −2; the target resists with an attribute where it makes sense.", "",
           f"**Boosts.** Your {m['step']} sets your power ({m['steps']}). Each {m['step']} above the first gives **one Boost**, chosen **as you cast**. Each Boost you spend is **−1 to the roll**, so you can always hold back.", "",
           table(["Boost", "One Boost", "Two Boosts"], [
               ["**Harder**", "+1 box, or the penalty becomes −3", "+2 boxes, or −4"],
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
           f"## {cap(Cs)}", "",
           f"Work a {W} in advance and store it in an object; break it (one action, no roll) to release it. " + m.get("charmLimit", f"Carry as many ready {Cs} as your {train} training allows: **Trained 2, Specialty 3, Expert 4**.") + " Preparation is how slow magic wins a fast fight.", ""]
    if m.get("advance") != []:
        out += ["## Magic advancement", "",
           f"After a significant {{{{missionLower}}}}, a magical character can take one of these **instead of a skill step**, with the GM's approval and a reason from the story. {'' if title else 'Each setting says which it uses.'}", "",
           table(["Option", "Effect", "Limit"], [row for key, row in [
               ("new", [f"New {B}", f"Learn one {B} beyond your limit", "Up to 2 extra"]),
               ("deeper", [f"Deeper {m['step']}", f"One {B} you know works one {m['step']} deeper: one more Boost", f"Each {B} once"]),
               ("charm", [f"Another {C}", f"Carry one more ready {C}", "Up to 2 extra"]),
               ("heart", ["By heart", f"One kind of {W} takes one fewer segment (minimum 1)", "Each kind once"]),
               ("quicker", ["Quicker hand", f"One {W} you know goes one pace faster: an hour becomes ten minutes, ten minutes one action", f"Each {W} once"]),
               ("mastery", [m.get("masterName", "Mastery"), f"{cap(m['skill'])} becomes Expert (+5)", "Once, at the end of a long campaign"])]
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
                     [[x["label"], ", ".join(f"{a['skill']} {a['target']}" for a in x["attacks"]), "—" if x["dodge"] is None else x["dodge"],
                       x["boxesText"], x["weaponText"], f"**{x['trait']}.** {x['traitText']}"] for x in p["threats"]])
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
    if name == "extra-edges":
        return "\n".join(f"| {e[1]} | {e[2]} | {e[3]} |" for e in p.get("extraEdges", []))
    if name == "statuses":
        return table([p.get("statusLabel", "Status"), "Benefit", "Cost"], [[f"**{x[1]}**", x[2], x[3]] for x in p["statuses"]])
    if name == "group-names":
        names = [g["name"] for g in p["groups"]]
        return ", ".join(names[:-1]) + " or " + names[-1]
    if name == "roles":
        g = {x["id"]: x["name"] for x in p["groups"]}
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


def pack_sections(md):
    parts = re.split(r"<!--\s*SECTION:(\w+)\s*-->", md)
    return {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}


def guide_md(pack, t, sections):
    core = (ENGINE / "core.md").read_text()
    core = re.sub(r"\{\{PACK:(\w+)\}\}", lambda m: sections.get(m.group(1), ""), core)
    core = re.sub(r"\{\{GEN:([\w-]+)\}\}", lambda m: gen(m.group(1), pack, t), core)
    return re.sub(r"\n{3,}", "\n\n", fill(core, t))


def quickref(pack, t):
    core = [["Resolution", "3d6 at or below adjusted skill. Natural 3–4 always succeeds; 17–18 always fails. Margin = target − roll."],
            ["Opposed", "Success beats failure; both succeed → larger margin wins; ties and double failures favor the defender."],
            ["Combat", "Move a short distance and take one action. Hit → target may Dodge once per round → weapon effect. Partial cover −2."],
            ["Range", "Close 10 yd, Short 50 yd, Medium 150 yd, Long 500 yd, Extreme 1 mile. Within a weapon's effective band: no penalty; one band beyond −2, two −4, farther out of range. Move: Close; run (no action): Short."],
            ["Dying", f"A 2-box weapon that brings you to 3 boxes: Dying; dead at the end of the scene unless stabilized (one action, Medicine, {t['medkit']}). At 3 boxes, another 2-box hit kills."],
            ["Medicine", "Stabilize: one action. Field care clears 1 box (2 on margin 5+). Proper care gives +2, clears 2 (3 on margin 5+)."],
            ["Rest", f"One box per {t['restText']} of rest. Not from 3 boxes: treatment must clear the first."],
            [t["point"], "Reroll (keep second), reduce an injury by one box, or establish a small preparation."]]
    return "".join(f"\n            <dt>{html.escape(a)}</dt><dd>{html.escape(b)}</dd>" for a, b in core + pack.get("quickRef", [])) + "\n          "


HANDOUTS = []  # (game info, folder) for each pack built; the handouts are written after the bot code, which they carry.


def build(pid, docx):
    pdir = LD / "packs" / pid
    pack = json.loads((pdir / "pack.json").read_text())
    t = terms_of(pack)
    sections = pack_sections((pdir / "setting.md").read_text())
    md = guide_md(pack, t, sections)
    out = LD / pid
    out.mkdir(exist_ok=True)
    (out / "players-guide.md").write_text(md)
    guide_html = subprocess.run(["pandoc", "-f", "markdown", "-t", "html", "--id-prefix=g-", "--wrap=none"], input=md, capture_output=True, text=True, check=True).stdout
    theme = {**THEME_DEFAULTS, **pack.get("theme", {})}
    tpl = (ENGINE / "creator.html").read_text()
    tpl = tpl.replace("{{THEMECSS}}", theme["css"])
    tpl = tpl.replace("{{GROUPCSS}}", "\n".join(f'[data-div="{g["id"]}"] {{ --accent: var({g["color"]}); }}' for g in pack["groups"]))
    tpl = tpl.replace("{{QUICKREF}}", quickref(pack, t))
    tpl = tpl.replace("{{OUTCOMES}}", "".join(f"<option>{html.escape(o)}</option>" for o in pack["journal"]["outcomes"]))
    tpl = re.sub(r"\{\{theme\.(\w+)\}\}", lambda m: str(theme[m.group(1)]), tpl)
    tpl = tpl.replace("{{fontsHref}}", t["fontsHref"])
    tpl = fill(tpl, t)
    left = sorted(set(re.findall(r"\{\{[\w.:]+\}\}", tpl)))
    if left:
        sys.exit(f"{pid}: unfilled tokens {left}")
    js = "const PACK = " + json.dumps({**pack, "terms": t, "theme": theme}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";"
    tpl = tpl.replace("/* PACK:START *//* PACK:END */", "/* PACK:START */" + js + "/* PACK:END */")
    tpl = re.sub(r"<!-- GUIDE:START -->.*?<!-- GUIDE:END -->", lambda _: "<!-- GUIDE:START -->\n" + guide_html + "<!-- GUIDE:END -->", tpl, flags=re.S)
    (out / "index.html").write_text(tpl)
    g = discord_handout.game_info(pid, t["title"], t["point"], pack.get("tracks", []), pack.get("seeds", {}), t["tracksTitle"])
    HANDOUTS.append((g, out))
    print(f"built {out.relative_to(ROOT)}/index.html and players-guide.md")
    if docx:
        name = re.sub(r"[^A-Za-z0-9]+", "_", t["guideTitle"]).strip("_") + ".docx"
        subprocess.run(["pandoc", "-f", "markdown", "-o", str(out / name)], input=md, text=True, check=True)
        spec = importlib.util.spec_from_file_location("bg", ROOT / "tools" / "build-guide.py"); bg = importlib.util.module_from_spec(spec); spec.loader.exec_module(bg)
        bg.NAVY, bg.GOLD_FILL = pack.get("docxColors", ["1B2A4A", "E9EEF6"])
        bg.finish_docx(out / name)
        print(f"wrote {(out / name).relative_to(ROOT)}")


def core_rules(docx=False):
    t = terms_of({"terms": {}})
    core = (ENGINE / "core.md").read_text()
    core = core.replace("{{PACK:intro}}", "Legend Dynamics is a roleplaying system for heroic stories in any genre: concrete skills, a 3d6 roll-under core, and a small pool of Legend points that reward characters for their flaws. These core rules are setting-neutral. A **setting pack** supplies the roles, origins, skills, gear, weapons, tracks and dangers of one genre, and renames a few terms to suit it.")
    # Neutral stand-ins for the pack-specific parts of "Making your own".
    core = core.replace("{{GEN:extra-edges}}\n", "")
    core = core.replace("{{GEN:magic}}", magic_chapter({}))
    core = core.replace("{{PACK:customrole}}", '"Smuggler: knows every back door, bribe and hidden hold."')
    core = core.replace("{{GEN:group-names}}", "one of your setting's groups")
    core = core.replace("{{PACK:customorigin}}", "**Hill-folk (tier 1).** Stocky herders from high, cold country. *Adjustments:* Body +1, Presence −1. *Core rule:* at home in the heights: no penalty for thin air or cold. *Origin advantage:* **Sure-Footed**: +2 to Athletics to climb and keep your footing. *Companion:* **Clannish**: you trust your own people first; when it matters, accept the cost of that loyalty.")
    core = re.sub(r"\{\{PACK:(\w+)\}\}", "", core)
    core = re.sub(r"\{\{GEN:([\w-]+)\}\}", lambda m: f"*Your setting pack supplies this ({m.group(1).replace('-', ' ')}).*", core)
    core = fill(core, t).replace("This book combines the **Legend Dynamics core rules**, which every setting shares, with the **Legend Dynamics** setting: its roles, origins, skills, gear, weapons and dangers. In this setting, the core rules' Legend points are called **Legend points**.",
                        "These are the **Legend Dynamics core rules**, which every setting shares. A setting pack adds its roles, origins, skills, gear, weapons and dangers, and may rename terms: Legend points might be Grit in a Western or Resolve in space opera.")
    md = re.sub(r"\n{3,}", "\n\n", core)
    (LD / "Legend_Dynamics_Core_Rules.md").write_text(md)
    print("wrote legend-dynamics/Legend_Dynamics_Core_Rules.md")
    if docx:
        out = LD / "Legend_Dynamics_Core_Rules.docx"
        subprocess.run(["pandoc", "-f", "markdown", "-o", str(out)], input=md, text=True, check=True)
        spec = importlib.util.spec_from_file_location("bg", ROOT / "tools" / "build-guide.py"); bg = importlib.util.module_from_spec(spec); spec.loader.exec_module(bg)
        bg.finish_docx(out)
        print(f"wrote {out.relative_to(ROOT)}")


def bot_packs():
    """Write every pack's bot data (point name, tracks, seed tables), plus discord-bot/games/*.json, into the Discord bot."""
    bot = LD / "discord-bot" / "src" / "worker.js"
    data = {}
    for d in sorted(p for p in (LD / "packs").iterdir() if (p / "pack.json").exists()):
        pack = json.loads((d / "pack.json").read_text())
        t = terms_of(pack)
        data[pack["id"]] = {"id": pack["id"], "title": t["title"], "point": t["point"], "mission": t["mission"],
                            "trackTitle": t["tracksTitle"], "tracks": pack.get("tracks", []), "seeds": pack.get("seeds", {})}
    # Games outside Legend Dynamics (USS Pelion, Grimm): their own data, seed tables read from their creators.
    for f in sorted((LD / "discord-bot" / "games").glob("*.json")):
        game = json.loads(f.read_text())
        page = (ROOT / game.pop("seedsFrom")).read_text() if "seedsFrom" in game else ""
        m = re.search(r"const SEEDS = (\{.*?\});\n", page)
        game.setdefault("seeds", json.loads(m.group(1)) if m else {})
        data[game["id"]] = game
    src = bot.read_text()
    block = "/* PACKS:START */\nexport const PACKS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n/* PACKS:END */"
    new = re.sub(r"/\* PACKS:START \*/.*?/\* PACKS:END \*/", lambda m: block, src, flags=re.S)
    if new != src:
        bot.write_text(new)
    print(f"wrote {len(data)} packs into {bot.relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docx", action="store_true")
    ap.add_argument("packs", nargs="*")
    a = ap.parse_args()
    packs = a.packs or sorted(p.name for p in (LD / "packs").iterdir() if (p / "pack.json").exists())
    for pid in packs:
        build(pid, a.docx)
    core_rules(a.docx)
    bot_packs()
    for g, out in HANDOUTS:
        discord_handout.write_handout(g, out)
        print(f"wrote {(out / 'discord-commands.html').relative_to(ROOT)}")
    discord_handout.main()  # USS Pelion and Grimm carry the same bot code


if __name__ == "__main__":
    main()
