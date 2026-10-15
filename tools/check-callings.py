#!/usr/bin/env python3
"""Check Grimm's callings (grimm-west/index.html) against the calling recipe, as Trails of Blood & Dust's
build does: four core skills each, in the order fight (or, for a calling that isn't a fighter, a second
signature), trail, people, signature; an ability for every calling; every skill core for at least one
calling and no more than its cap. It only reads the file.

  python3 tools/check-callings.py
"""
import json, pathlib, re, sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / "grimm-west" / "index.html"
s = PAGE.read_text()
grab = lambda name: json.loads(re.search(rf"const {name} = (\{{.*?\}});\n", s).group(1))
roles, ability, rec = grab("ROLE_SKILLS"), grab("ROLE_ABILITY"), grab("CALLING_RECIPE")
skills = re.findall(r'^    \["([^"]+)", "(?:Presence|Intellect|Agility|Body|Will)"', s[s.index("const SKILLS = ["):s.index("const PHYSICAL")], re.M)
use = {n: 0 for n in skills}
problems = []
for name, sk in roles.items():
    if len(sk) != 4 or len(set(sk)) != 4 or not set(sk) <= set(skills):
        problems.append(f"{name}: needs four different skills from the list, has {sk}")
        continue
    if name in rec["nonFighters"]:
        if sk[0] in rec["fight"]:
            problems.append(f"{name} isn't a fighter, but its first skill is {sk[0]}")
    elif sk[0] not in rec["fight"]:
        problems.append(f"{name}: first skill {sk[0]} isn't a fighting skill")
    for slot, i in (("trail", 1), ("people", 2)):
        if sk[i] not in rec[slot]:
            problems.append(f"{name}: {sk[i]} isn't a {slot} skill")
    if name not in ability:
        problems.append(f"{name} has no ability")
    for x in sk:
        use[x] += 1
for n, k in use.items():
    cap = rec["max"].get(n, rec["maxOther"])
    if not 1 <= k <= cap:
        problems.append(f"{n} is core for {k} callings (allowed 1 to {cap})")
if problems:
    sys.exit("Calling recipe problems:\n  " + "\n  ".join(problems))
print(f"Callings check out: {len(roles)} callings, {len(skills)} skills, each core for 1 to its cap.")
