// New sectors: in a long game the map keeps growing. From SECTORS.first, and every SECTORS.every turns after in an open
// game, rings of new space open beyond the rim, each with a character of its own (SECTORS.kinds): a pirate stronghold,
// a Warden graveyard, a rich frontier, a dead zone. Every power hears SECTORS.warn turns ahead what's coming.
import { makeRng, distance } from "./hex.js";
import { SECTORS, RULES, COLLAPSE } from "./data.js";
import { log, fleetsAt, fleetsOf, spawnFleet, expandGalaxy, setDestination, faction, isWild } from "./game.js";

const SEC_PIRATES = "pirates", SEC_BEASTS = "beasts";
const secAnnounce = (s, text) => { log(s, null, text, "explore"); s.log[s.log.length - 1].sector = true; };

/** The kinds this game can still get: each once, the pirate and creature kinds only when the game has them. */
function secKindsLeft(s) {
  const had = new Set(((s.sectors && s.sectors.opened) || []).map((o) => o.kind));
  return Object.keys(SECTORS.kinds).filter((k) => !had.has(k) && !(SECTORS.kinds[k].wilds && (s.wildsOff || !s.wilds)));
}
/** When the next sector opens (null: none to come in this game). */
function secNextAt(s) {
  const S = s.sectors, n = S.opened.length;
  if (n >= SECTORS.max) return null;
  const at = Math.max(SECTORS.first + n * SECTORS.every, S.last ? S.last + SECTORS.every : 0, s.turn + SECTORS.warn);
  if (s.mode !== "open" && at > RULES.maxTurns - SECTORS.endGap) return null;
  return at;
}

/** Where things stand, for the panels: what's opened, and what's coming (with its turn) once it's been announced. */
export function sectorsState(s) {
  if (s.sectorsOff || !s.sectors) return null;
  const S = s.sectors;
  return { opened: S.opened.map((o) => ({ ...o, name: SECTORS.kinds[o.kind].name, text: SECTORS.kinds[o.kind].text, sealed: !!SECTORS.kinds[o.kind].sealed && !(S.unsealed && S.unsealed[o.kind]), unsealed: S.unsealed && S.unsealed[o.kind] })),
    coming: S.coming ? { kind: S.coming, at: S.at, name: SECTORS.kinds[S.coming].name, text: SECTORS.kinds[S.coming].text } : null,
    next: S.coming ? S.at : secNextAt(s) };
}

/** Once a turn, after the turn resolves. */
export function sectorsTurn(s) {
  if (s.sectorsOff || s.winner) return;
  if (!s.sectors) s.sectors = { opened: [], coming: null, at: null, last: null };
  const S = s.sectors;
  if (!S.coming) {
    const at = secNextAt(s); if (at === null || s.turn < at - SECTORS.warn) return;
    const left = secKindsLeft(s); if (!left.length) return;
    const R = makeRng("sector:" + s.seed + ":" + S.opened.length); R.next(); R.next();   // its first draws lean one way on short seeds
    S.coming = left[R.int(left.length)]; S.at = at;
    const K = SECTORS.kinds[S.coming];
    secAnnounce(s, `Long-range scans see past the rim: the corridors are reaching into new space. In ${at - s.turn} turns (turn ${at}), a new sector opens beyond the edge of the map: ${K.name}. ${K.text}${K.sealed ? " It will be sealed: getting in takes Rift drives, or a Rift beacon." : ""}`);
    return;
  }
  if (s.turn < S.at) return;
  const kind = S.coming, K = SECTORS.kinds[kind];
  const made = expandGalaxy(s, null, { ...K, kind, rings: SECTORS.rings });
  S.opened.push({ kind, turn: s.turn, systems: made.length }); S.coming = null; S.at = null; S.last = s.turn;
  const R = makeRng("sector-wilds:" + s.seed + ":" + kind);
  const empty = made.filter((x) => !fleetsAt(s, x.at).length);
  const take = (pool, n, apart) => { const out = []; while (out.length < n && pool.length) { const x = pool.splice(R.int(pool.length), 1)[0]; if (out.every((o) => distance(o.at, x.at) >= apart)) out.push(x); } return out; };
  let guard = "";
  if (K.havens && s.wilds && !s.wildsOff) {
    for (const x of take([...empty], K.havens, 5)) { const f = spawnFleet(s, SEC_PIRATES, x.at, ["haven"]); f.home = x.at; f.born = s.turn; f.sector = kind; }
    guard = " Pirate havens hold it already.";
  }
  if (K.husks && s.wilds && !s.wildsOff) {
    const n = K.husks[s.size] || 3, ruins = empty.filter((x) => x.ruins || x.anomaly), rest = empty.filter((x) => !(x.ruins || x.anomaly));
    const at = take(ruins, n, 3); if (at.length < n) at.push(...take(rest, n - at.length, 3));
    for (const x of at) { const f = spawnFleet(s, SEC_BEASTS, x.at, ["husk"]); f.home = x.at; f.sector = kind; }
    guard = ` ${at.length} Warden husks still guard its ruins.`;
  }
  secAnnounce(s, `A new sector has opened beyond the rim: ${K.name}, ${made.length} uncharted systems.${guard} ${K.text}${K.sealed ? ` It is sealed: no ship can cross into it without Rift drives (a Physics technology), until someone lights a Rift beacon on a world within ${SECTORS.beacon.range} hexes of it (${SECTORS.beacon.credits} credits and ${SECTORS.beacon.exotics} exotics), which opens it to everyone.` : ""}`);
}

// ---- corridor collapses ----
const corrName = (s, a, b) => `${s.systems[a].name} and ${s.systems[b].name}`;
/** A corridor that can fail: both ends ordinary systems with another corridor each, and the network still whole without it. */
function canCollapse(s, a, b) {
  const A = s.systems[a], B = s.systems[b];
  if (!A || !B || A.deep || B.deep || s.adj[a].length < 2 || s.adj[b].length < 2) return false;
  // Is b still reachable from a without this corridor (by corridors alone)?
  const seen = new Set([a]), st = [a];
  while (st.length) { const x = st.pop(); for (const y of s.adj[x]) { if ((x === a && y === b) || (x === b && y === a) || seen.has(y)) continue; if (y === b) return true; seen.add(y); st.push(y); } }
  return false;
}
/** Where things stand, for the map and panels: the corridor failing (and when), and the breaks not yet charted around. */
export function collapseState(s) {
  const C = s.collapse; if (!C) return null;
  return { coming: C.coming ? { a: C.coming[0], b: C.coming[1], at: C.at } : null, breaks: C.breaks.filter((x) => !x.surveyed) };
}
/** Once a turn, after the turn resolves: warn, collapse, and let scouts chart new routes. */
export function corridorsTurn(s) {
  if (s.collapsesOff || s.winner) return;
  if (!s.collapse) s.collapse = { next: COLLAPSE.first, coming: null, at: null, breaks: [] };
  const C = s.collapse, R = makeRng("collapse:" + s.seed + ":" + s.turn); R.next(); R.next();
  surveys(s);
  if (C.coming) {
    const [a, b] = C.coming;
    if (!s.adj[a] || !s.adj[a].includes(b)) { C.coming = null; C.at = null; }   // gone already (a relic, a razed world)
    else if (s.turn >= C.at) {
      if (!canCollapse(s, a, b)) { C.coming = null; C.at = null; secAnnounce(s, `The corridor between ${corrName(s, a, b)} steadied: it holds, for now.`); return; }
      s.adj[a] = s.adj[a].filter((x) => x !== b); s.adj[b] = s.adj[b].filter((x) => x !== a);
      s.corridors = s.corridors.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
      C.breaks.push({ a, b, turn: s.turn, surveyed: null }); C.coming = null; C.at = null;
      // Fleets on their way re-plot without it.
      for (const f of Object.values(s.fleets)) if (f.dest && f.path.length) { const d = f.dest; if (!setDestination(s, f.id, d).ok) { f.path = []; f.dest = null; } }
      secAnnounce(s, `The corridor between ${corrName(s, a, b)} has collapsed. Ships go the long way until someone charts a new route: a scout that ends its turn within ${COLLAPSE.surveyRange} hexes of either system, not moving, surveys a new corridor (worth ${COLLAPSE.research} research).`);
    }
    return;
  }
  if (s.turn < C.next) return;
  C.next = s.turn + COLLAPSE.every[0] + R.int(COLLAPSE.every[1] - COLLAPSE.every[0] + 1);
  const pool = s.corridors.filter(([a, b]) => canCollapse(s, a, b));
  if (!pool.length) return;
  const [a, b] = pool[R.int(pool.length)];
  C.coming = [a, b]; C.at = s.turn + COLLAPSE.warn;
  secAnnounce(s, `The corridor between ${corrName(s, a, b)} is failing: it collapses in ${COLLAPSE.warn} turns (turn ${C.at}). Fleets that use it should finish crossing, or find another way.`);
}
/** Scouts at rest near a break chart a new corridor from the nearer end, toward the other. */
function surveys(s) {
  for (const br of s.collapse.breaks) {
    if (br.surveyed) continue;
    const A = s.systems[br.a], B = s.systems[br.b]; if (!A || !B) { br.surveyed = { turn: s.turn }; continue; }
    const scout = Object.values(s.fleets).find((f) => !isWild(f.owner) && f.owner !== "traders" && !f.path.length && f.ships.some((x) => x.type === "scout")
      && (distance(f.at, A.at) <= COLLAPSE.surveyRange || distance(f.at, B.at) <= COLLAPSE.surveyRange));
    if (!scout) continue;
    const [from, other] = distance(scout.at, A.at) <= distance(scout.at, B.at) ? [A, B] : [B, A];
    const to = Object.values(s.systems).filter((y) => y !== from && y !== other && !y.deep && !s.hexes[y.at].sealed && !s.adj[from.id].includes(y.id) && distance(y.at, from.at) <= COLLAPSE.linkRange
      && !(y.sector && SECTORS.kinds[y.sector] && SECTORS.kinds[y.sector].corridors === false))
      .sort((p, q) => distance(p.at, other.at) - distance(q.at, other.at) || distance(p.at, from.at) - distance(q.at, from.at))[0];
    if (!to) { br.surveyed = { turn: s.turn, none: true }; continue; }
    s.adj[from.id].push(to.id); s.adj[to.id].push(from.id); s.corridors.push([from.id, to.id]);
    const F = faction(s, scout.owner); F.research.progress += COLLAPSE.research; F.stats.surveys = (F.stats.surveys || 0) + 1;
    br.surveyed = { turn: s.turn, by: scout.owner, from: from.id, to: to.id };
    secAnnounce(s, `${F.name}${/s$/.test(F.name) ? "'" : "'s"} scout charted a new corridor around the collapse: ${from.name} to ${to.name}.`);
    log(s, scout.owner, `Your scout charted a new corridor, ${from.name} to ${to.name}: +${COLLAPSE.research} research.`, "research");
  }
}
