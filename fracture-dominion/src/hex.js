// Hex grid helpers (axial coordinates, pointy-top) and a seeded random generator.
// Every hex is "q,r"; the map is a hexagon of a given radius around 0,0.

/** A seeded generator (mulberry32): the same seed always builds the same galaxy and rolls the same dice. */
export function makeRng(seed) {
  let a = (typeof seed === "number" ? seed : hashString(String(seed))) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (list) => list[Math.floor(next() * list.length)],
    d6: () => 1 + Math.floor(next() * 6),
    state: () => a,
    setState: (s) => { a = s >>> 0; },
  };
}
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const key = (q, r) => q + "," + r;
export const parse = (k) => { const [q, r] = k.split(",").map(Number); return { q, r }; };
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const neighbors = (k) => { const { q, r } = parse(k); return DIRS.map(([dq, dr]) => key(q + dq, r + dr)); };
// Distances are asked for constantly: each hex key's coordinates are read once and kept.
const HEX_QR = new Map();
const qrOf = (k) => { let v = HEX_QR.get(k); if (!v) { const i = k.indexOf(","); v = [+k.slice(0, i), +k.slice(i + 1)]; if (HEX_QR.size < 200000) HEX_QR.set(k, v); } return v; };
export const distance = (a, b) => {
  const A = qrOf(a), B = qrOf(b);
  return (Math.abs(A[0] - B[0]) + Math.abs(A[0] + A[1] - B[0] - B[1]) + Math.abs(A[1] - B[1])) / 2;
};
/** All hexes of a hexagonal map of this radius. */
export function hexagon(radius) {
  const out = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) out.push(key(q, r));
  return out;
}
export const inMap = (k, radius) => distance(k, "0,0") <= radius;
/** Pixel center of a hex of this size (pointy-top). */
export function toPixel(k, size) {
  const { q, r } = parse(k);
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r };
}
/** The hex under a pixel. */
export function fromPixel(x, y, size) {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / size, r = ((2 / 3) * y) / size;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry - (-q - r));
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dz > dy) rz = -rx - ry;
  return key(rx, rz);
}
/** Hexes within n steps of k. */
export function within(k, n) {
  const { q, r } = parse(k), out = [];
  for (let dq = -n; dq <= n; dq++)
    for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) out.push(key(q + dq, r + dr));
  return out;
}
/** The hexes on a straight line from a to b, both ends included. */
export function hexLine(a, b) {
  const A = parse(a), B = parse(b), n = distance(a, b), out = [];
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0, q = A.q + (B.q - A.q) * t + 1e-6, r = A.r + (B.r - A.r) * t + 1e-6, sv = -q - r;
    let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(sv);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - sv);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    out.push(key(rq, rr));
  }
  return out;
}
