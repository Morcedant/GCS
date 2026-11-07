// The playtest adventures' battle maps, from the bucket's battle-maps/ folder (src/maps.js).
import assert from "node:assert/strict";
import test from "node:test";
import { validMapKey, sceneOf, buildMapList, mapsFetch } from "../src/maps.js";

const bucket = (files) => ({
  async list({ prefix = "" }) { return { objects: Object.keys(files).filter((k) => k.startsWith(prefix)).sort().map((k) => ({ key: k, size: files[k].length })), truncated: false }; },
  async get(key) { return key in files ? { size: files[key].length, body: new TextEncoder().encode(files[key]), httpEtag: '"m"', writeHttpMetadata() {} } : null; },
});
const h = { "Access-Control-Allow-Origin": "*" };

test("map keys and scene numbers", () => {
  assert.ok(validMapKey("battle-maps/aurora/1 - the bridge.png"));
  for (const k of ["battle-maps/aurora/notes.txt", "aurora/1.png", "battle-maps/elsewhere/1.png", "battle-maps/aurora/x/1.png"]) assert.ok(!validMapKey(k), k);
  assert.equal(sceneOf("02 - Mercy Springs.png"), 2); assert.equal(sceneOf("7.webp"), 7); assert.equal(sceneOf("extra cave.png"), null); assert.equal(sceneOf("2026 map.png"), null);
});

test("the list is by scene, extras last; pictures and downloads are served", async () => {
  const env = { MUSIC: bucket({ "battle-maps/aurora/3 - under the tracks.jpg": "jpg", "battle-maps/aurora/1 - the bridge.png": "png1", "battle-maps/aurora/alley sketch.webp": "w", "aurora/song.mp3": "x" }) };
  const get = (p) => mapsFetch(new Request("https://srv" + p), env, h);
  const b = await (await get("/api/maps?folder=aurora")).json();
  assert.deepEqual(b.maps.map((m) => [m.scene, m.title]), [[1, "The Bridge"], [3, "Under the Tracks"], [null, "Alley Sketch"]]);
  assert.deepEqual((await (await get("/api/maps")).json()).folders.aurora, 3);
  let r = await get("/maps/aurora/1%20-%20the%20bridge.png"); assert.equal(r.status, 200); assert.equal(r.headers.get("Content-Type"), "image/png"); assert.equal(await r.text(), "png1");
  r = await get("/maps/aurora/1%20-%20the%20bridge.png?download=1"); assert.match(r.headers.get("Content-Disposition"), /attachment/);
  assert.equal((await get("/maps/aurora/../song.mp3")).status, 404);
  assert.equal(await mapsFetch(new Request("https://srv/api/music"), env, h), null);
});

test("a replaced picture gets a new link, and a versioned link can be kept", async () => {
  const at = (t) => buildMapList([{ key: "battle-maps/aurora/Token - Bulldog.png", size: 9, uploaded: t }], "aurora", "https://srv")[0];
  assert.notEqual(at(1000).src, at(2000).src);
  assert.match(at(1000).download, /\?v=[a-z0-9]+&download=1$/);
  const env = { MUSIC: bucket({ "battle-maps/aurora/Token - Bulldog.png": "png" }) };
  const get = (p) => mapsFetch(new Request("https://srv" + p), env, h);
  assert.match((await get("/maps/aurora/Token%20-%20Bulldog.png?v=abc")).headers.get("Cache-Control"), /immutable/);
  assert.equal((await get("/maps/aurora/Token%20-%20Bulldog.png")).headers.get("Cache-Control"), "public, max-age=300");
  const r = await get("/maps/aurora/Token%20-%20Bulldog.png?v=abc&download=1"); assert.match(r.headers.get("Content-Disposition"), /attachment/);
});
