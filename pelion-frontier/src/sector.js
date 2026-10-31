// The Corvan Sector: a hex map with the Federation's starbase and colonies to the southwest, two Klingon outposts on
// the eastern border, the Romulan Neutral Zone along the top, and between them independent worlds, pre-warp peoples,
// anomalies, ruins and empty systems (one of which hides an Orion pirate base).
import { makeRng, hexagon, key, parse, distance, toPixel } from "./hex.js";
import { NAMES } from "./data.js";

export const RADIUS = 8;
const px = (k) => toPixel(k, 1);
export const inZone = (k) => parse(k).r <= -RADIUS + 1;                 // the top two rows
export const nearZone = (k) => parse(k).r === -RADIUS + 2;

export function makeSector(seed) {
  const R = makeRng(seed);
  const hexes = {};
  for (const k of hexagon(RADIUS)) hexes[k] = { terrain: inZone(k) ? "zone" : "space" };
  // Nebulae: three clouds, away from the zone.
  const open = Object.keys(hexes).filter((k) => !inZone(k));
  for (let n = 0; n < 3; n++) {
    let c = R.pick(open);
    for (let i = 0; i < 5; i++) {
      if (hexes[c] && !inZone(c)) hexes[c].terrain = "nebula";
      const { q, r } = parse(c), d = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]][R.int(6)];
      c = key(q + d[0], r + d[1]);
    }
  }
  const systems = {}, sysAt = {};
  const used = [];
  const free = (k, gap = 2) => hexes[k] && !inZone(k) && !sysAt[k] && used.every((u) => distance(u, k) >= gap);
  let names = [...NAMES];
  const take = () => { const i = R.int(names.length); const n = names[i]; names.splice(i, 1); return n; };
  const place = (k, kind, extra = {}) => {
    const id = "s" + (Object.keys(systems).length + 1);
    systems[id] = { id, at: k, kind, name: extra.name || take(), surveyed: false, harm: 0, ...extra };
    sysAt[k] = id; used.push(k);
    return systems[id];
  };
  const pickWhere = (test, gap = 2) => {
    const c = open.filter((k) => free(k, gap) && test(k));
    return c.length ? R.pick(c) : open.find((k) => free(k, 1));
  };
  const P = (k) => px(k);
  // The starbase, southwest; colonies around it.
  const sb = pickWhere((k) => P(k).x < -6 && P(k).y > 4.5 && distance(k, "0,0") >= 6 && distance(k, "0,0") <= 7);
  place(sb, "starbase", { name: "Starbase 23", surveyed: true });
  for (let i = 0; i < 3; i++) place(pickWhere((k) => distance(k, sb) >= 2 && distance(k, sb) <= 5 && P(k).x < 0), "colony", { surveyed: true });
  // Klingon outposts on the eastern edge.
  for (let i = 0; i < 2; i++) place(pickWhere((k) => P(k).x > 8 && Math.abs(P(k).y) < 9, 4), "klingon", { surveyed: true });
  // Corvan II: the first mission, a few days out from the starbase.
  const cv = pickWhere((k) => distance(k, sb) >= 5 && distance(k, sb) <= 7 && P(k).x < 4 && P(k).y > -6);
  names = names.filter((n) => n !== "Corvan");
  place(cv, "prewarp", { name: "Corvan II", ruinsToo: true });
  // Independent worlds in the middle band, where the Federation and the Empire compete for them.
  for (let i = 0; i < 6; i++) place(pickWhere((k) => P(k).x > -6 && P(k).x < 10 && distance(k, sb) >= 5, 3), "independent", { surveyed: true, accord: i < 2 ? 1 : 0 });
  for (let i = 0; i < 3; i++) place(pickWhere(() => true), "prewarp");
  for (let i = 0; i < 5; i++) place(pickWhere(() => true), "anomaly", { clock: 0, need: 3 + R.int(3) });
  for (let i = 0; i < 3; i++) place(pickWhere(() => true), "ruins", { clock: 0, need: 4 + R.int(2) });
  // The Orion base: far from the starbase, in a nebula if one is free.
  const neb = open.filter((k) => hexes[k].terrain === "nebula" && free(k) && distance(k, sb) >= 7);
  place(neb.length ? R.pick(neb) : pickWhere((k) => distance(k, sb) >= 8), "orionBase", { baseHull: 0, baseShields: 0 });
  for (let i = 0; i < 9; i++) place(pickWhere(() => true), "empty");
  // Starfleet's charts: the core's worlds are known; the rest is "uncharted" until surveyed.
  return { hexes, systems, sysAt, starbase: systems[sysAt[sb]].id, corvan: systems[sysAt[cv]].id };
}
