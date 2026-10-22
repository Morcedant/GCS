#!/usr/bin/env python3
"""Check Aurora's setting data (legend-dynamics/packs/aurora/pack.json) against the creation rules:
origins, callings and advantages use real skills, and every ready-made character is a legal build
(attributes, Edges, skills, power slots and Classes). It only reads the file. Run it after editing
the pack, then tools/build-legend.py.

  python3 tools/packs/check_aurora.py

pack.json is the source: it used to be written by a generator script, retired once the data had
been edited by hand since.
"""
import json, pathlib

PACK = pathlib.Path(__file__).resolve().parents[2] / "legend-dynamics" / "packs" / "aurora" / "pack.json"
p = json.loads(PACK.read_text())
skills, roles, origins, advantages = p["skills"], p["roles"], p["origins"], p["advantages"]
powers, power_list, seeds, statuses = p["powers"], p["powers"]["list"], p["seeds"], p["statuses"]
triggers, equipment, example, pregens = p["triggers"], p["equipment"], p["example"], p["pregens"]

# ---- checks: the creation rules ----
SK = {s[0] for s in skills}
O = {o["id"]: o for o in origins}
PW = {p[0]: p for p in power_list}
assert all(len(v[1]) == 16 for v in seeds.values()), "every case-seed table has 16 entries (3d6: 3 to 18)"
for o in origins:
    assert sum(o["adj"].values()) == 0 and all(-2 <= v <= 2 for v in o["adj"].values()), o["id"]
    assert set(o["skills"]) <= SK | {"Will"} and len(o["traits"]) == 3, o["id"]
    assert all(x[3] in SK | {"Will", "Body", "Agility"} for x in o["traits"]), o["id"]
for r in roles:
    assert set(r["skills"]) <= SK, r["name"]
assert all(a[3] in SK | {"Will"} for a in advantages)


def slots(c):
    o = O[c["speciesId"]]
    s = o.get("powerSlots") or powers["tierSlots"][str(o["tier"])]
    base = ["II" if x == "I+" and c["skills"].get("Powers") == "S" else "I" if x == "I+" else x for x in s] + (["I"] if c["edges"].get("xpower") else [])
    boost = c.get("powerBoost", [])
    assert sum(boost) == c["edges"].get("power", 0), (c["name"], "boosts")
    names = ["I", "II", "III", "IV", "V", "VI"]
    out = [names[names.index(x) + (boost[i] if i < len(boost) else 0)] for i, x in enumerate(base)]
    assert out.count("IV") <= 1 and all(names.index(x) <= 3 for x in out) and ("IV" not in out or c.get("gmClass4")), (c["name"], "class IV")
    return out


for c in [example] + pregens:
    o = O[c["speciesId"]]
    base = {a: 10 + o["adj"].get(a, 0) for a in ["Body", "Agility", "Intellect", "Presence", "Will"]}
    pool = 5 + c["edges"].get("attr", 0)
    assert all(base[a] <= c["attrs"][a] <= 13 + max(0, o["adj"].get(a, 0)) for a in base), (c["name"], "range")
    assert sum(c["attrs"][a] - base[a] for a in base) == pool, (c["name"], "spent", sum(c["attrs"][a] - base[a] for a in base), pool)
    assert sum(c["edges"].values()) == 4 - o["tier"], (c["name"], "edges")
    nS = sum(v == "S" for v in c["skills"].values())
    nT = sum(v == "T" for v in c["skills"].values())
    want = (7 if c["path"] == "hand" else 9) + c["edges"].get("skill", 0)
    assert nS == 1 and nT == want, (c["name"], "skills", nS, nT, want)
    assert set(c["skills"]) <= SK and c["dept"] in [r["name"] for r in roles], c["name"]
    sl = slots(c)
    assert len(c["powers"]) == len(sl) and len(set(c["powers"])) == len(sl), (c["name"], "powers", sl)
    assert all(p in PW and (not o.get("powerList") or p in o["powerList"]) for p in c["powers"]), (c["name"], "power list")
    assert c["status"] in {s[0] for s in statuses} and c["comp"]["id"] in triggers, c["name"]
    if c.get("sadv", {}).get("id"):
        assert any(x[0] == c["sadv"]["id"] for x in o["traits"]), c["name"]
    else:
        assert c["adv"]["id"] in {a[0] for a in advantages}, c["name"]
    assert all(k in {e[0] for e in equipment} for k in c["equipment"]), c["name"]
print(f"Aurora checks out: {len(roles)} callings, {len(origins)} origins, {len(power_list)} powers, {1 + len(pregens)} ready-made characters.")
