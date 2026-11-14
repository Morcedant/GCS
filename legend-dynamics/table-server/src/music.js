// @ts-check
/**
 * Music for the settings, from a Cloudflare R2 bucket (bound as MUSIC in wrangler.toml).
 *
 * Upload tracks in the Cloudflare dashboard (R2 → the bucket → Upload) into one folder per setting, named as the
 * setting's address on the website:
 *
 *   trails-of-blood-and-dust/   fracture-lines/   the-shattered-crown/   aurora/
 *
 * and the fan games, named as on the fan-games site: uss-pelion/   grimm/
 *
 * The music pages list what's there, at once, with no rebuild. A track's title comes from its file name
 * ("01 - the-long-road.mp3" → "The Long Road"; a leading number sets the order). To give titles, moods and the like,
 * put a tracks.json in the folder (optional): { "intro": "…", "tracks": [{ "file", "title", "mood", "use", "credit",
 * "license", "loop" }] }. Listed tracks come first, in its order; any others follow by name.
 *
 *   GET /api/music?folder=F   → { folder, intro, tracks: [{ file, title, mood?, use?, credit?, license?, loop?, bytes, src, download }] }
 *   GET /api/music            → { folders: { F: count } }   how many tracks each setting has
 *   GET /music/F/FILE         the track (Range requests work, so the player can seek); ?download=1 saves it as a file
 */
export const MUSIC_FOLDERS = ["trails-of-blood-and-dust", "fracture-lines", "the-shattered-crown", "aurora", "uss-pelion", "grimm"];
/** The private fan games' folders: served by name, but left out of the public counts. */
export const FAN_FOLDERS = ["uss-pelion", "grimm"];
export const PUBLIC_FOLDERS = MUSIC_FOLDERS.filter((f) => !FAN_FOLDERS.includes(f));
export const AUDIO_TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", flac: "audio/flac", webm: "audio/webm" };

const SMALL = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
/** "01 - the-long-road.mp3" → "The Long Road" @param {string} name */
export function titleFrom(name) {
  const stem = name.replace(/\.[^.]+$/, "").replace(/^\d+[\s._-]+/, "");
  const words = stem.replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean);
  return words.map((w, k) => (w === w.toUpperCase() && /[A-Z]/.test(w) ? w : k && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ") || name;
}
/** The audio type of a file name, or null if the site doesn't play it. @param {string} name */
export const audioType = (name) => { const ext = (name.split(".").pop() || "").toLowerCase(); return name.includes(".") ? /** @type {any} */ (AUDIO_TYPES)[ext] || null : null; };
/** Is this a track the server will hand out: one of the folders, one file deep, audio? @param {string} key */
export function validKey(key) {
  const parts = key.split("/");
  return parts.length === 2 && MUSIC_FOLDERS.includes(parts[0]) && !!parts[1] && !parts[1].startsWith(".") && !!audioType(parts[1]);
}

/**
 * A folder's tracks, from the bucket's listing and its tracks.json (if any): listed tracks first, in its order, then the
 * rest by file name. @param {{ key: string, size: number }[]} objects @param {any} manifest @param {string} folder @param {string} base
 */
export function buildList(objects, manifest, folder, base) {
  const files = new Map(objects.filter((o) => validKey(o.key) && o.key.startsWith(folder + "/")).map((o) => [o.key.slice(folder.length + 1), o]));
  const listed = Array.isArray(manifest && manifest.tracks) ? manifest.tracks.filter((/** @type {any} */ t) => t && typeof t.file === "string" && files.has(t.file)) : [];
  const seen = new Set(listed.map((/** @type {any} */ t) => t.file));
  const rest = [...files.keys()].filter((f) => !seen.has(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((file) => ({ file }));
  const str = (/** @type {any} */ v) => (typeof v === "string" ? v.slice(0, 300) : undefined);
  return [...listed, ...rest].map((/** @type {any} */ t) => {
    const src = `${base}/music/${folder}/${encodeURIComponent(t.file)}`;
    const out = { file: t.file, title: str(t.title) || titleFrom(t.file), bytes: /** @type {any} */ (files.get(t.file)).size, src, download: src + "?download=1" };
    for (const k of ["mood", "use", "credit", "license"]) { const v = str(t[k]); if (v) /** @type {any} */ (out)[k] = v; }
    if (t.loop === true) /** @type {any} */ (out).loop = true;
    return out;
  });
}

/** Every object under a prefix (R2 lists a thousand at a time). @param {any} bucket @param {string} prefix */
async function listAll(bucket, prefix) {
  const out = []; let cursor;
  for (let i = 0; i < 20; i++) {
    const r = await bucket.list({ prefix, cursor, limit: 1000 });
    out.push(...r.objects.map((/** @type {any} */ o) => ({ key: o.key, size: o.size })));
    if (!r.truncated) break; cursor = r.cursor;
  }
  return out;
}
async function manifestOf(/** @type {any} */ bucket, /** @type {string} */ folder) {
  const m = await bucket.get(`${folder}/tracks.json`);
  if (!m) return null;
  try { return JSON.parse(await m.text()); } catch { return null; }
}

/**
 * The music routes. Returns a Response, or null if the path isn't music's.
 * @param {Request} req @param {any} env @param {Record<string, string>} h  CORS headers
 */
export async function musicFetch(req, env, h) {
  const url = new URL(req.url), path = url.pathname;
  if (path !== "/api/music" && !path.startsWith("/music/")) return null;
  const json = (/** @type {any} */ b, /** @type {number} */ s, /** @type {Record<string, string>} */ x = {}) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...h, ...x } });
  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "Not found." }, 404);
  const bucket = env.MUSIC;
  if (path === "/api/music") {
    if (!bucket) return json({ error: "This server has no music bucket yet (see the README).", tracks: [], folders: {} }, 200, { "Cache-Control": "no-store" });
    const folder = url.searchParams.get("folder");
    if (folder) {
      if (!MUSIC_FOLDERS.includes(folder)) return json({ error: "No such setting." }, 404);
      const [objects, manifest] = await Promise.all([listAll(bucket, folder + "/"), manifestOf(bucket, folder)]);
      return json({ folder, intro: typeof manifest?.intro === "string" ? manifest.intro.slice(0, 600) : "", tracks: buildList(objects, manifest, folder, url.origin) }, 200, { "Cache-Control": "public, max-age=60" });
    }
    const all = await listAll(bucket, "");
    const folders = Object.fromEntries(PUBLIC_FOLDERS.map((f) => [f, all.filter((o) => validKey(o.key) && o.key.startsWith(f + "/")).length]));
    return json({ folders }, 200, { "Cache-Control": "public, max-age=60" });
  }
  // A track.
  let key; try { key = decodeURIComponent(path.slice("/music/".length)); } catch { key = ""; }
  if (!bucket || !validKey(key)) return json({ error: "Not found." }, 404);
  const obj = await bucket.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return json({ error: "Not found." }, 404);
  const headers = new Headers(h);
  if (obj.writeHttpMetadata) obj.writeHttpMetadata(headers);
  headers.set("Content-Type", audioType(key) || "application/octet-stream");   // what the file is, whatever the upload said
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=86400");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
  if (url.searchParams.get("download")) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(key.split("/")[1])}`);
  if (!("body" in obj)) return new Response(null, { status: 304, headers });   // the browser's copy is current
  const r = obj.range, ranged = !!(r && req.headers.get("Range"));
  let status = 200;
  if (ranged) {
    const off = "suffix" in r ? obj.size - r.suffix : r.offset || 0, len = "suffix" in r ? r.suffix : r.length ?? obj.size - off;
    headers.set("Content-Range", `bytes ${off}-${off + len - 1}/${obj.size}`); headers.set("Content-Length", String(len)); status = 206;
  } else headers.set("Content-Length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { status, headers });
}
