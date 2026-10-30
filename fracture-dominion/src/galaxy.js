// Building a galaxy: a hexagon of space with nebulae and rifts, star systems scattered across it, and the corridors
// that link them. The same seed always builds the same galaxy.
import { makeRng, hexagon, distance, neighbors, within, key } from "./hex.js";
import { WORLDS, STAR_NAMES } from "./data.js";

export const SIZES = { small: { radius: 9, systems: 34 }, medium: { radius: 12, systems: 58 }, large: { radius: 15, systems: 88 } };

/** @returns {{ radius, hexes, systems, sysAt, corridors, adj, homes }} */
export function makeGalaxy(seed, sizeName, factionCount) {
  const rng = makeRng("galaxy:" + seed), size = SIZES[sizeName] || SIZES.medium, R = size.radius;
  const all = hexagon(R);
  const hexes = Object.fromEntries(all.map((k) => [k, { terrain: "space" }]));
  // Nebulae: soft clouds (slow, and they hide ships). Rifts: short broken lines nothing can cross.
  const blob = (terrain, count, len) => {
    for (let i = 0; i < count; i++) {
      let k = rng.pick(all);
      for (let j = 0; j < len; j++) {
        if (hexes[k] && distance(k, "0,0") < R) hexes[k].terrain = terrain;
        const n = neighbors(k).filter((x) => hexes[x]);
        k = rng.pick(n);
      }
    }
  };
  blob("nebula", Math.round(R * 0.9), 7);
  blob("rift", Math.round(R * 0.45), 4);

  // Systems: spread out, never on a rift, at least 2 hexes apart.
  const systems = {}, sysAt = {};
  const names = [...STAR_NAMES];
  let tries = 0;
  while (Object.keys(systems).length < size.systems && tries++ < 20000) {
    const k = rng.pick(all);
    if (hexes[k].terrain === "rift" || distance(k, "0,0") > R - 1) continue;
    if (Object.keys(sysAt).some((h) => distance(h, k) < 3)) continue;
    const id = "s" + Object.keys(systems).length;
    const nm = names.length ? names.splice(rng.int(names.length), 1)[0] : "System " + id;
    const roll = rng.next();
    const world = roll < 0.16 ? "terran" : roll < 0.3 ? "ocean" : roll < 0.46 ? "desert" : roll < 0.6 ? "arctic" : roll < 0.8 ? "barren" : "gas";
    systems[id] = { id, name: nm, at: k, world, size: 1 + rng.int(4), rich: [0.6, 1, 1, 1.4][rng.int(4)], exotics: rng.next() < 0.22,
      ruins: rng.next() < 0.12, colony: null };
    hexes[k].terrain = "space";
    sysAt[k] = id;
  }

  // Corridors: each system to its two nearest neighbours within 6 hexes, then joined into one network.
  const ids = Object.keys(systems), corridors = [], adj = Object.fromEntries(ids.map((i) => [i, []]));
  const link = (a, b) => { if (a === b || adj[a].includes(b)) return; adj[a].push(b); adj[b].push(a); corridors.push([a, b]); };
  for (const a of ids) {
    const near = ids.filter((b) => b !== a).map((b) => [b, distance(systems[a].at, systems[b].at)]).sort((x, y) => x[1] - y[1]);
    near.filter(([, d]) => d <= 6).slice(0, 2).forEach(([b]) => link(a, b));
  }
  // Join the islands: repeatedly link the closest pair of systems in different components.
  const comp = () => { const c = {}; let n = 0; for (const s of ids) if (c[s] === undefined) { const st = [s]; c[s] = n; while (st.length) { const x = st.pop(); for (const y of adj[x]) if (c[y] === undefined) { c[y] = n; st.push(y); } } n++; } return [c, n]; };
  for (let [c, n] = comp(); n > 1; [c, n] = comp()) {
    let best = null;
    for (const a of ids) for (const b of ids) if (c[a] === 0 && c[b] !== 0) { const d = distance(systems[a].at, systems[b].at); if (!best || d < best[2]) best = [a, b, d]; }
    link(best[0], best[1]);
  }

  // Homeworlds: as far apart as the map allows, each a large terran world with a habitable neighbour or two.
  const homes = [];
  const candidates = ids.filter((i) => distance(systems[i].at, "0,0") >= R * 0.45);
  homes.push(rng.pick(candidates));
  while (homes.length < factionCount) {
    let best = null;
    for (const c of candidates) { if (homes.includes(c)) continue; const d = Math.min(...homes.map((h) => distance(systems[h].at, systems[c].at))); if (!best || d > best[1]) best = [c, d]; }
    homes.push(best[0]);
  }
  for (const h of homes) {
    Object.assign(systems[h], { world: "terran", size: 4, rich: 1, exotics: false, ruins: false });
    const near = ids.filter((i) => !homes.includes(i) && distance(systems[i].at, systems[h].at) <= 5).sort((a, b) => distance(systems[a].at, systems[h].at) - distance(systems[b].at, systems[h].at));
    if (near[0]) Object.assign(systems[near[0]], { world: rng.pick(["terran", "ocean"]), size: 2 + rng.int(2) });
    if (near[1]) Object.assign(systems[near[1]], { exotics: true });
    for (const k of within(systems[h].at, 1)) if (hexes[k] && hexes[k].terrain === "rift") hexes[k].terrain = "space";
  }
  return { radius: R, hexes, systems, sysAt, corridors, adj, homes };
}
export { key };
