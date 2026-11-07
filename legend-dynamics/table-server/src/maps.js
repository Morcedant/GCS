// @ts-check
/**
 * Battle maps for the playtest adventures, from the same R2 bucket as the music (bound as MUSIC).
 *
 * Upload pictures in the Cloudflare dashboard into battle-maps/<setting>/ (the settings' folders as for music:
 * trails-of-blood-and-dust, fracture-lines, the-shattered-crown, aurora). Start each file's name with its scene's number
 * ("2 - Mercy Springs at noon.png"): the playtest page puts it with that scene, and shows its hex size. Files without a
 * number are listed after the scenes, as extras.
 *
 * Each picture's link carries its upload time (?v=…), so a picture replaced under the same name gets a new link: browsers
 * and the GM view's characters pick up the new one instead of keeping the old for a day.
 *
 *   GET /api/maps?folder=F   → { folder, maps: [{ file, title, scene, bytes, src, download }] }
 *   GET /api/maps            → { folders: { F: count } }
 *   GET /maps/F/FILE         the picture; ?download=1 saves it as a file
 */
import { MUSIC_FOLDERS, titleFrom } from "./music.js";

export const MAP_PREFIX = "battle-maps";
export const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif" };
/** @param {string} name */
export const imageType = (name) => (name.includes(".") ? /** @type {any} */ (IMAGE_TYPES)[(name.split(".").pop() || "").toLowerCase()] || null : null);
/** battle-maps/<setting>/<picture>, and nothing else. @param {string} key */
export function validMapKey(key) {
  const p = key.split("/");
  return p.length === 3 && p[0] === MAP_PREFIX && MUSIC_FOLDERS.includes(p[1]) && !!p[2] && !p[2].startsWith(".") && !!imageType(p[2]);
}
/** The scene number a file name starts with ("02 - the bridge.png" → 2), or null. @param {string} name */
export const sceneOf = (name) => { const m = name.match(/^(\d{1,2})(?!\d)/); return m ? +m[1] : null; };

/** A folder's maps, by scene number, then the rest by name. @param {{ key: string, size: number, uploaded?: number }[]} objects @param {string} folder @param {string} base */
export function buildMapList(objects, folder, base) {
  const pre = `${MAP_PREFIX}/${folder}/`;
  return objects.filter((o) => validMapKey(o.key) && o.key.startsWith(pre)).map((o) => {
    const file = o.key.slice(pre.length), v = (o.uploaded || o.size || 0).toString(36), src = `${base}/maps/${folder}/${encodeURIComponent(file)}?v=${v}`;
    return { file, title: titleFrom(file), scene: sceneOf(file), bytes: o.size, src, download: src + "&download=1" };
  }).sort((a, b) => (a.scene ?? 999) - (b.scene ?? 999) || a.file.localeCompare(b.file, undefined, { numeric: true }));
}

async function listAll(/** @type {any} */ bucket, /** @type {string} */ prefix) {
  const out = []; let cursor;
  for (let i = 0; i < 20; i++) {
    const r = await bucket.list({ prefix, cursor, limit: 1000 });
    out.push(...r.objects.map((/** @type {any} */ o) => ({ key: o.key, size: o.size, uploaded: o.uploaded ? +new Date(o.uploaded) : 0 })));
    if (!r.truncated) break; cursor = r.cursor;
  }
  return out;
}

/** The map routes: a Response, or null if the path isn't theirs. @param {Request} req @param {any} env @param {Record<string, string>} h */
export async function mapsFetch(req, env, h) {
  const url = new URL(req.url), path = url.pathname;
  if (path !== "/api/maps" && !path.startsWith("/maps/")) return null;
  const json = (/** @type {any} */ b, /** @type {number} */ s, /** @type {Record<string, string>} */ x = {}) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...h, ...x } });
  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "Not found." }, 404);
  const bucket = env.MUSIC;
  if (path === "/api/maps") {
    if (!bucket) return json({ error: "This server has no bucket yet.", maps: [], folders: {} }, 200, { "Cache-Control": "no-store" });
    const folder = url.searchParams.get("folder");
    if (folder) {
      if (!MUSIC_FOLDERS.includes(folder)) return json({ error: "No such setting." }, 404);
      return json({ folder, maps: buildMapList(await listAll(bucket, `${MAP_PREFIX}/${folder}/`), folder, url.origin) }, 200, { "Cache-Control": "public, max-age=60" });
    }
    const all = await listAll(bucket, MAP_PREFIX + "/");
    return json({ folders: Object.fromEntries(MUSIC_FOLDERS.map((f) => [f, all.filter((o) => validMapKey(o.key) && o.key.startsWith(`${MAP_PREFIX}/${f}/`)).length])) }, 200, { "Cache-Control": "public, max-age=60" });
  }
  let rest; try { rest = decodeURIComponent(path.slice("/maps/".length)); } catch { rest = ""; }
  const key = `${MAP_PREFIX}/${rest}`;
  if (!bucket || !validMapKey(key)) return json({ error: "Not found." }, 404);
  const obj = await bucket.get(key, { onlyIf: req.headers });
  if (!obj) return json({ error: "Not found." }, 404);
  const headers = new Headers(h);
  if (obj.writeHttpMetadata) obj.writeHttpMetadata(headers);
  headers.set("Content-Type", imageType(key) || "application/octet-stream");
  // A link with ?v= names one upload, so it can be kept; one without it is checked again after five minutes.
  headers.set("Cache-Control", url.searchParams.get("v") ? "public, max-age=31536000, immutable" : "public, max-age=300");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
  if (url.searchParams.get("download")) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(rest.split("/")[1])}`);
  if (!("body" in obj)) return new Response(null, { status: 304, headers });
  headers.set("Content-Length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { status: 200, headers });
}
