// @ts-check
/**
 * The development blog: posts kept by the table server, so the author writes them from any browser and they appear
 * on the site at once. Anyone can read published posts; only an author may write, edit or delete them.
 *
 * The posts live in one Durable Object of the tables' class, under a name no table code can take ("~blog"); it never
 * has a table, so it never sets the idle alarm that deletes old tables. Each post is "post:<id>" in its storage.
 *
 * Authors: the DEV secret, a bare code or "Name: code" one per line, like GM_CODES but its own codes. Without it
 * nobody can write. The code is the author's login on the site's Write page.
 *
 * Posts are written in a small Markdown (headings, bold, italic, links, lists); the site's pages render it.
 */

export const BLOG_NAME = "~blog";
export const TAGS = ["News", "Rules", "Trails of Blood & Dust", "Fracture Lines", "The Shattered Crown", "Aurora"];
export const LIMITS = { title: 120, body: 40_000, posts: 1000 };

/** Text from the author: no control characters except newlines and tabs. @param {any} v @param {number} max */
const text = (v, max) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, max);
/** A post's id: its date and its title, as words. @param {string} title @param {number} now */
export const postId = (title, now) => `${new Date(now).toISOString().slice(0, 10)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "post"}`;
export const validId = (/** @type {any} */ id) => typeof id === "string" && /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,60}$/.test(id);

/**
 * A post as the author sent it, checked; null when it has no title or body.
 * @param {any} p @param {any} old the stored post when editing, or null @param {string} author @param {number} now
 */
export function cleanPost(p, old, author, now) {
  const title = text(p && p.title, LIMITS.title).replace(/\s+/g, " ").trim(), body = text(p && p.body, LIMITS.body).trim();
  if (!title || !body) return null;
  const tags = [...new Set(Array.isArray(p.tags) ? p.tags : [])].filter((t) => TAGS.includes(t));
  const draft = !!p.draft;
  return { id: old ? old.id : postId(title, now), title, body, tags, draft, author: old ? old.author : author,
    created: old ? old.created : now, updated: now, published: draft ? null : old && old.published ? old.published : now };
}

/** The list readers see: newest first, a summary instead of the body. @param {any[]} posts @param {{ drafts?: boolean, tag?: string }} [o] */
export function listPosts(posts, o = {}) {
  return posts.filter((p) => (o.drafts || !p.draft) && (!o.tag || p.tags.includes(o.tag)))
    .sort((a, b) => (b.published || b.updated) - (a.published || a.updated))
    .map((p) => ({ id: p.id, title: p.title, tags: p.tags, draft: p.draft, published: p.published, updated: p.updated, summary: summary(p.body) }));
}
/** The first words of a post, without its Markdown. @param {string} body */
export const summary = (body) => {
  const plain = body.split("\n").filter((l) => !/^#{1,3}\s/.test(l)).map((l) => l.replace(/^\s*(?:[-*]|\d+\.|>)\s+/, "")).join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__|[*`]|(^|\W)_|_(?=\W|$)/g, "$1").replace(/\s+/g, " ").trim();
  return plain.length > 220 ? plain.slice(0, 217).replace(/\s+\S*$/, "") + "…" : plain;
};

// ---- Playtest feedback: anyone sends it from the site's Playtest page; only an author reads it ----
// Kept in the same object as "fb:<id>". Each answer is short text; a sender (by a hash of their address, never the
// address) can send a few an hour, and the store keeps the newest FEEDBACK.max.
export const FEEDBACK = { max: 2000, text: 2000, short: 120, perHour: 6 };
export const FEEDBACK_GAMES = ["Trails of Blood & Dust", "Fracture Lines", "The Shattered Crown", "Aurora", "USS Pelion", "Grimm", "Something else"]; // the last two from the private fan-games site
export const FEEDBACK_AGAIN = ["Yes", "Maybe", "No"];
/**
 * Feedback as a player sent it, checked; null when it says nothing.
 * @param {any} f @param {number} now @param {string} rand a few random characters for the id
 */
export function cleanFeedback(f, now, rand) {
  const b = f && typeof f === "object" ? f : {}, line = (/** @type {any} */ v) => text(v, FEEDBACK.short).replace(/\s+/g, " ").trim();
  const long = (/** @type {any} */ v) => text(v, FEEDBACK.text).trim();
  const out = { id: `${new Date(now).toISOString().slice(0, 10)}-${String(rand).replace(/[^a-z0-9]/g, "").slice(0, 8) || "x"}`, at: now,
    game: FEEDBACK_GAMES.includes(b.game) ? b.game : "", role: line(b.role), rating: Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null,
    again: FEEDBACK_AGAIN.includes(b.again) ? b.again : "", confusing: long(b.confusing), unused: long(b.unused), best: long(b.best), other: long(b.other),
    name: line(b.name), contact: line(b.contact) };
  return out.rating || out.again || out.confusing || out.unused || out.best || out.other ? out : null;
}
export const validFeedbackId = (/** @type {any} */ id) => typeof id === "string" && /^\d{4}-\d{2}-\d{2}-[a-z0-9]{1,8}$/.test(id);

/**
 * The blog's own requests, inside its Durable Object. The worker checks the author before passing a write on.
 *   GET  /blog/list?tag=&drafts=1   GET /blog/get?id=   POST /blog/save { post, author }   POST /blog/delete { id }
 * @param {any} storage the Durable Object's storage @param {Request} req
 */
export async function blogFetch(storage, req) {
  const url = new URL(req.url), path = url.pathname;
  const all = async () => [...(await storage.list({ prefix: "post:" })).values()];
  if (path === "/blog/list") return Response.json({ posts: listPosts(await all(), { tag: url.searchParams.get("tag") || "", drafts: url.searchParams.get("drafts") === "1" }), tags: TAGS });
  if (path === "/blog/get") {
    const id = url.searchParams.get("id"), p = validId(id) ? await storage.get("post:" + id) : null;
    if (!p || (p.draft && url.searchParams.get("drafts") !== "1")) return Response.json({ error: "There's no post here." }, { status: 404 });
    return Response.json({ post: p });
  }
  if (path === "/blog/save" && req.method === "POST") {
    const b = /** @type {any} */ (await req.json()), now = Date.now();
    const old = b.post && validId(b.post.id) ? await storage.get("post:" + b.post.id) : null;
    if (b.post && b.post.id && !old) return Response.json({ error: "That post no longer exists." }, { status: 404 });
    const p = cleanPost(b.post, old, String(b.author || ""), now);
    if (!p) return Response.json({ error: "A post needs a title and some text." }, { status: 400 });
    if (!old) {
      if ((await storage.list({ prefix: "post:" })).size >= LIMITS.posts) return Response.json({ error: "The blog is full." }, { status: 409 });
      for (let i = 2; await storage.get("post:" + p.id); i++) p.id = p.id.replace(/-\d+$/, "") + "-" + i; // two posts, same day and title
    }
    await storage.put("post:" + p.id, p);
    return Response.json({ post: p });
  }
  if (path === "/blog/delete" && req.method === "POST") {
    const b = /** @type {any} */ (await req.json());
    if (!validId(b.id)) return Response.json({ error: "There's no post here." }, { status: 404 });
    await storage.delete("post:" + b.id);
    return Response.json({ ok: true });
  }
  // Feedback: POST /feedback/add { feedback, sender } (sender: a hash, for the hourly limit), GET /feedback/list,
  // POST /feedback/delete { id }. The worker checks the author before list and delete.
  if (path === "/feedback/add" && req.method === "POST") {
    const b = /** @type {any} */ (await req.json()), now = Date.now();
    const f = cleanFeedback(b.feedback, now, Math.random().toString(36).slice(2, 10));
    if (!f) return Response.json({ error: "Answer at least one question before you send it." }, { status: 400 });
    const rk = "fbrate:" + String(b.sender || "").slice(0, 64), rate = /** @type {any} */ (await storage.get(rk)) || { since: now, n: 0 };
    if (now - rate.since > 3_600_000) { rate.since = now; rate.n = 0; }
    if (rate.n >= FEEDBACK.perHour) return Response.json({ error: "That's a lot of feedback at once: try again in an hour." }, { status: 429 });
    rate.n++; await storage.put(rk, rate);
    const have = [...(await storage.list({ prefix: "fb:" })).keys()].sort();
    if (have.length >= FEEDBACK.max) await storage.delete(have.slice(0, have.length - FEEDBACK.max + 1)); // the oldest go first
    await storage.put("fb:" + f.at + ":" + f.id, f);
    return Response.json({ ok: true });
  }
  if (path === "/feedback/list") {
    const list = [...(await storage.list({ prefix: "fb:" })).values()].sort((x, y) => y.at - x.at);
    return Response.json({ feedback: list });
  }
  if (path === "/feedback/delete" && req.method === "POST") {
    const b = /** @type {any} */ (await req.json());
    if (!validFeedbackId(b.id)) return Response.json({ error: "There's no feedback here." }, { status: 404 });
    for (const [k, v] of await storage.list({ prefix: "fb:" })) if (/** @type {any} */ (v).id === b.id) await storage.delete(k);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Not found." }, { status: 404 });
}
