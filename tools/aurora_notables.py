"""Aurora's notable Operants as character sheets: every super the GM's Guide names with a stat block (its *Notable
Operants* chapter), ready to pick in the creator's ready-made characters and to add to the GM view as an NPC.

tools/build-legend.py puts notables(pack, setting_md) into the Aurora pack as "notables". Each sheet is worked out from
its stat block: the skills at their targets (the attribute raised as far as it needs), Dodge from Agility and
Athletics, every power at its Class, the boxes and Defense, the special rule as a note, and the bio as who they are.
What a stat block doesn't say (the origin, the role, the legal status, who they answer to, whose side they're on) is
chosen here, from the bio.
"""
import re

R = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}
LEVELS = {"T": 1, "S": 3}  # Trained +1, Specialty +3 (the creator's levels)
DODGE = {"U": 0, "T": 1, "S": 2}

# threat id → origin, role, status, allegiance, and whether the GM's view counts them an enemy
META = {
    "op-marvel": ("ambrosia", "Doctor", "registered", "legion", False),
    "op-celerity": ("aurora", "Public Hero", "registered", "legion", False),
    "op-greenman": ("touched", "Guardian", "nonreg", "", False),
    "op-lance": ("bonded", "Vigilante", "reserve", "", False),
    "op-steelhawk": ("touched", "Avenger", "nonreg", "", True),
    "op-chatroux": ("otherworlder", "International Operative", "agent", "as", False),
    "op-vanguard": ("aurora", "Mercenary", "nonreg", "", True),
    "op-abd": ("aurora", "Mercenary", "nonreg", "", True),
    "op-centurion": ("mythic", "Guardian", "registered", "", False),
    "op-shadowknight": ("bonded", "Crusader", "reserve", "knights", False),
    "op-marrow": ("adept", "Con Artist", "nonreg", "", True),
    "op-icereaper": ("bonded", "Enforcer", "nonreg", "morcain", True),
    "op-helios": ("ambrosia", "Officer", "agent", "dire", True),
    "op-zephyr": ("aurora", "Activist", "nonreg", "", True),
    "op-dark": ("otherworlder", "Fugitive", "nonreg", "", True),
    "op-dubinsky": ("mythic", "Enforcer", "nonreg", "", True),
    "op-tesla": ("ambrosia", "Scientist", "civilian", "", False),
    "op-atomic": ("bonded", "Scientist", "registered", "", False),
    "op-grachyov": ("aurora", "Enforcer", "nonreg", "", True),
    "op-uathach": ("bonded", "Avenger", "nonreg", "", False),
    "op-magus": ("adept", "Occultist", "civilian", "", False),
    "op-autuarch": ("aurora", "Activist", "nonreg", "", True),
    "op-unler": ("adept", "Occultist", "civilian", "knights", False),
    "op-zarloff": ("otherworlder", "Occultist", "nonreg", "", True),
    "op-phoenix": ("mythic", "Guardian", "nonreg", "", False),
    "op-swift": ("aurora", "Public Hero", "civilian", "", False),
    "op-warlord": ("aurora", "Vigilante", "reserve", "", False),
    "op-armageddon": ("aurora", "Thief", "convict", "", True),
    "op-vanroy": ("aurora", "ExLAW Agent", "registered", "", False),
    "op-mars": ("adept", "Occultist", "civilian", "", False),
}


def _blocks(md):
    sec = md[md.index("# Notable Operants"):md.index("## The first case:")]
    return re.findall(r"^\*\*(.+?)\*\*(.*?)\n\n\*Class ([IV]+)\.\* (.*?)$", sec, re.M | re.S)


def _field(stats, name):
    m = re.search(r"\*\*" + name + r"\*\* (.*?)(?= \*\*[A-Z][^*]*\*\*|$)", stats)
    return m.group(1).strip().rstrip(".") if m else ""


def _skills(text, known):
    out = []
    for m in re.finditer(r"([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?) (\d{1,2})\b", text):
        if m.group(1) in known: out.append((m.group(1), int(m.group(2))))
    return out


def _powers(text, plist, cls):
    """'Strength IV, Toughness IV, Flight IV; Transformation (the form)' → [{id, cl}], by the setting's power names."""
    names = sorted(((x[1].split(" / ")[0].lower(), x[0]) for x in plist), key=lambda t: -len(t[0]))
    out = []
    for part in re.split(r"[,;] ?", text):
        low = part.lower().strip()
        pid = next((i for n, i in names if low.startswith(n)), None)
        if not pid or any(x["id"] == pid for x in out): continue
        m = re.search(r"\b(VI|IV|V|III|II|I)\b", part)
        out.append({"id": pid, "cl": m.group(1) if m else cls})
    return out


def notables(pack, md):
    if "# Notable Operants" not in md: return []
    skills = {s[0]: s[1] for s in pack["skills"]}
    threats = {t["name"].split(" (")[0].lower(): t for t in pack["threats"] if t["id"].startswith("op-")}
    origins = {o["id"]: o["name"] for o in pack["origins"]}
    out = []
    for head, bio, cls, stats in _blocks(md):
        name = re.sub(r",? (?:about |as he was in |as she was in )?[\d,]+\.?$|,? age unknown\.?$|\.$", "", head.strip()).strip()
        t = threats.get(name.split(" (")[0].lower())
        if not t or t["id"] not in META: continue
        origin, role, status, allegiance, foe = META[t["id"]]
        attrs = {a: 10 for a in ("Body", "Agility", "Intellect", "Presence", "Will")}
        lv, fixed = {}, set()
        for sk, target in sorted(_skills(_field(stats, "Attacks") + "; " + _field(stats, "Skills"), skills), key=lambda x: -x[1]):
            if sk in lv: continue
            at = skills[sk]
            if at in fixed:   # set by a better skill: the level that comes closest to the target, never above it by more than 1
                level = min(LEVELS, key=lambda k: (abs(attrs[at] + LEVELS[k] - target), attrs[at] + LEVELS[k] > target))
            else:
                level = "S" if target - attrs[at] >= 3 else "T"
                if target - LEVELS[level] > attrs[at]: attrs[at] = min(20, target - LEVELS[level])
                fixed.add(at)
            lv[sk] = level
        dodge = re.match(r"\d+", _field(stats, "Dodge") or "")
        if dodge: attrs["Agility"] = max(attrs["Agility"], min(20, int(dodge.group(0)) + 2 - DODGE[lv.get("Athletics", "U")]))
        # Each skill lands on its stat block's number: what attributes and levels can't reach, a correction makes up.
        adj = {}
        for sk, target in _skills(_field(stats, "Attacks") + "; " + _field(stats, "Skills"), skills):
            got = attrs[skills[sk]] + LEVELS[lv[sk]]
            if got != target and sk not in adj: adj[sk] = target - got
        rule = re.search(r"\*\*([^*]+)\.\*\* ([^*]+?)$", stats.strip())
        first = re.split(r"(?<=\.) ", bio.strip())
        out.append({
            "name": name, "rank": f"Class {cls} · {role}", "dept": role, "path": "rounded", "species": origins.get(origin, ""), "speciesId": origin,
            "role": " ".join(first[:2])[:400], "reason": "", "connection": "", "contact": "", "status": status, "allegiance": allegiance,
            "attrs": attrs, "skills": lv, "skillAdj": adj, "powers": [], "powersLearned": _powers(_field(stats, "Powers"), pack["powers"]["list"], cls),
            "sadv": {"id": ""}, "adv": {"id": ""}, "comp": {"id": ""}, "edges": {}, "equipment": {}, "notable": True, "threat": t["id"],
            "npcBoxes": t.get("boxes", 3), "npcTraits": t.get("traits", []), "npcWeapons": t.get("weapons", []), "foe": foe,
            "npcNote": (f"{rule.group(1)}: {rule.group(2).strip()}" if rule else "")[:1000],
        })
    return out


if __name__ == "__main__":
    import json, pathlib
    root = pathlib.Path(__file__).resolve().parent.parent / "legend-dynamics" / "packs" / "aurora"
    ns = notables(json.loads((root / "pack.json").read_text()), (root / "setting.md").read_text())
    print(len(ns), "notable Operants")
    for c in ns:
        print(f"  {c['name']:38} {c['rank']:32} {c['species']:22} attrs {c['attrs']}")
        print(f"      skills {c['skills']}  powers {[p['id'] + ' ' + p['cl'] for p in c['powersLearned']]}  boxes {c['npcBoxes']}{'  enemy' if c['foe'] else ''}")
