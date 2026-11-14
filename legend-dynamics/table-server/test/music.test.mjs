// Music from the R2 bucket (src/music.js): the list, titles and order, and the tracks themselves (with ranges).
import assert from "node:assert/strict";
import test from "node:test";
import { titleFrom, validKey, buildList, musicFetch } from "../src/music.js";

/** An R2 bucket, in memory: enough of list() and get() (with a range) for the routes. */
const bucket = (files) => ({
  async list({ prefix = "", cursor, limit = 1000 }) {
    const keys = Object.keys(files).filter((k) => k.startsWith(prefix)).sort(), start = cursor ? +cursor : 0, page = keys.slice(start, start + limit);
    return { objects: page.map((k) => ({ key: k, size: files[k].length })), truncated: start + limit < keys.length, cursor: String(start + limit) };
  },
  async get(key, opts = {}) {
    if (!(key in files)) return null;
    const data = new TextEncoder().encode(files[key]);
    const rh = opts.range && opts.range.get ? opts.range.get("Range") : null, m = rh && rh.match(/bytes=(\d+)-(\d*)/);
    const range = m ? { offset: +m[1], length: (m[2] ? +m[2] + 1 : data.length) - +m[1] } : undefined;
    const body = range ? data.slice(range.offset, range.offset + range.length) : data;
    return { size: data.length, range, httpEtag: '"e1"', body, text: async () => files[key], writeHttpMetadata() {} };
  },
});
const h = { "Access-Control-Allow-Origin": "*" };

test("titles come from file names; only audio in the settings' folders is served", () => {
  assert.equal(titleFrom("01 - the-long-road.mp3"), "The Long Road");
  assert.equal(titleFrom("saloon_at_midnight.ogg"), "Saloon at Midnight");
  assert.equal(titleFrom("BOSS theme.mp3"), "BOSS Theme");
  assert.ok(validKey("aurora/main-theme.mp3"));
  assert.ok(validKey("uss-pelion/01 - red alert.mp3") && validKey("grimm/the-woge.ogg"), "the fan games' folders");
  for (const k of ["aurora/notes.txt", "elsewhere/x.mp3", "aurora/sub/x.mp3", "aurora/.hidden.mp3", "../x.mp3", "aurora/"]) assert.ok(!validKey(k), k);
});

test("the list: tracks.json's order and names first, then the rest by name", () => {
  const objs = [{ key: "aurora/b.mp3", size: 10 }, { key: "aurora/02 second.mp3", size: 5 }, { key: "aurora/10 tenth.mp3", size: 5 }, { key: "aurora/tracks.json", size: 3 }, { key: "fracture-lines/x.mp3", size: 1 }];
  const list = buildList(objs, { tracks: [{ file: "b.mp3", title: "Bee", mood: "Battle", loop: true }, { file: "missing.mp3" }] }, "aurora", "https://srv");
  assert.deepEqual(list.map((t) => t.title), ["Bee", "Second", "Tenth"]);
  assert.equal(list[0].mood, "Battle"); assert.equal(list[0].loop, true); assert.equal(list[0].bytes, 10);
  assert.equal(list[1].src, "https://srv/music/aurora/02%20second.mp3"); assert.ok(list[1].download.endsWith("?download=1"));
});

test("the routes: a folder's list, the counts, a track, a range of it, a download", async () => {
  const env = { MUSIC: bucket({ "aurora/01 dawn.mp3": "0123456789", "aurora/tracks.json": JSON.stringify({ intro: "Hero music." }), "fracture-lines/void.ogg": "abc", "aurora/readme.txt": "no" }) };
  const get = (p, headers = {}) => musicFetch(new Request("https://srv" + p, { headers }), env, h);
  let r = await get("/api/music?folder=aurora"); let b = await r.json();
  assert.equal(r.status, 200); assert.equal(b.intro, "Hero music."); assert.deepEqual(b.tracks.map((t) => t.title), ["Dawn"]);
  r = await get("/api/music"); b = await r.json(); assert.deepEqual(b.folders, { "trails-of-blood-and-dust": 0, "fracture-lines": 1, "the-shattered-crown": 0, aurora: 1 }, "the fan games aren't in the public counts");
  r = await get("/music/aurora/01%20dawn.mp3"); assert.equal(r.status, 200); assert.equal(r.headers.get("Content-Type"), "audio/mpeg"); assert.equal(await r.text(), "0123456789");
  r = await get("/music/aurora/01%20dawn.mp3", { Range: "bytes=2-5" }); assert.equal(r.status, 206); assert.equal(r.headers.get("Content-Range"), "bytes 2-5/10"); assert.equal(await r.text(), "2345");
  r = await get("/music/aurora/01%20dawn.mp3?download=1"); assert.match(r.headers.get("Content-Disposition"), /attachment/);
  assert.equal((await get("/music/aurora/readme.txt")).status, 404);
  assert.equal((await get("/api/music?folder=nowhere")).status, 404);
  assert.equal(await musicFetch(new Request("https://srv/api/blog"), env, h), null);
  // No bucket bound yet: an empty list, not an error page.
  b = await (await musicFetch(new Request("https://srv/api/music?folder=aurora"), {}, h)).json(); assert.deepEqual(b.tracks, []);
});
