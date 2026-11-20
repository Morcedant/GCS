// New sectors: in a long game the map keeps growing. From SECTORS.first, and every SECTORS.every turns after in an open
// game, rings of new space open beyond the rim, each with a character of its own (SECTORS.kinds): a pirate stronghold,
// a Warden graveyard, a rich frontier, a dead zone. Every power hears SECTORS.warn turns ahead what's coming.
import { makeRng, distance } from "./hex.js";
import { SECTORS, RULES } from "./data.js";
import { log, fleetsAt, spawnFleet, expandGalaxy } from "./game.js";

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
  return { opened: S.opened.map((o) => ({ ...o, name: SECTORS.kinds[o.kind].name, text: SECTORS.kinds[o.kind].text })),
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
    secAnnounce(s, `Long-range scans see past the rim: the corridors are reaching into new space. In ${at - s.turn} turns (turn ${at}), a new sector opens beyond the edge of the map: ${K.name}. ${K.text}`);
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
  secAnnounce(s, `A new sector has opened beyond the rim: ${K.name}, ${made.length} uncharted systems.${guard} ${K.text}`);
}
