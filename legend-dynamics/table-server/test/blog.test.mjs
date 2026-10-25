// The development blog (src/blog.js): posts are checked, listed newest first, and drafts stay hidden from readers.
import assert from "node:assert/strict";
import test from "node:test";
import { cleanPost, listPosts, summary, postId, validId, blogFetch, TAGS } from "../src/blog.js";

/** A Durable Object's storage, in memory. */
const memory = () => {
  const m = new Map();
  return { get: async (k) => m.get(k), put: async (k, v) => void m.set(k, v), delete: async (k) => m.delete(k),
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))) };
};
const call = async (s, path, body) => (await blogFetch(s, new Request("https://t" + path, body ? { method: "POST", body: JSON.stringify(body) } : {}))).json();

test("a post is checked as it's saved", () => {
  const now = Date.UTC(2026, 9, 25);
  const p = cleanPost({ title: "  New  Edges!\u0007 ", body: "Hello\r\nworld", tags: ["Rules", "Rules", "Nonsense"] }, null, "DEV", now);
  assert.deepEqual([p.id, p.title, p.body, p.tags, p.author, p.published], ["2026-10-25-new-edges", "New Edges!", "Hello\nworld", ["Rules"], "DEV", now]);
  assert.equal(cleanPost({ title: "No body", body: "  " }, null, "DEV", now), null);
  const d = cleanPost({ title: "Later", body: "x", draft: true }, null, "DEV", now);
  assert.equal(d.published, null, "a draft isn't published");
  const e = cleanPost({ title: "Renamed", body: "y" }, p, "Someone", now + 5);
  assert.deepEqual([e.id, e.author, e.created, e.published, e.updated], [p.id, "DEV", now, now, now + 5], "an edit keeps the id, author and dates");
  assert.ok(validId(p.id) && !validId("../x") && !validId("2026-10-25-"));
  assert.equal(postId("!!!", now), "2026-10-25-post");
  assert.ok(TAGS.includes("Aurora"));
});

test("readers see published posts, newest first, without the Markdown", () => {
  const posts = [{ id: "a", title: "A", tags: ["News"], draft: false, published: 1, updated: 1, body: "# Head\nSee [the rules](/rules) **now**." },
    { id: "b", title: "B", tags: ["Rules"], draft: false, published: 2, updated: 2, body: "b" },
    { id: "c", title: "C", tags: ["News"], draft: true, published: null, updated: 3, body: "c" }];
  assert.deepEqual(listPosts(posts).map((p) => p.id), ["b", "a"]);
  assert.deepEqual(listPosts(posts, { drafts: true }).map((p) => p.id), ["c", "b", "a"]);
  assert.deepEqual(listPosts(posts, { tag: "News" }).map((p) => p.id), ["a"]);
  assert.equal(listPosts(posts)[1].summary, "See the rules now.");
  assert.ok(summary("word ".repeat(100)).endsWith("…"));
  assert.equal(summary("- A well-known *trick*\n> quoted, 3 > 2\n1. _first_"), "A well-known trick quoted, 3 > 2 first");
});

test("the blog's requests save, show, hide and delete posts", async () => {
  const s = memory();
  const { post } = await call(s, "/blog/save", { post: { title: "First", body: "One", tags: ["News"] }, author: "DEV" });
  const draft = (await call(s, "/blog/save", { post: { title: "First", body: "Two", draft: true }, author: "DEV" })).post;
  assert.equal(draft.id, post.id + "-2", "same day, same title: a new id");
  assert.deepEqual((await call(s, "/blog/list")).posts.map((p) => p.id), [post.id]);
  assert.equal((await call(s, "/blog/list?drafts=1")).posts.length, 2);
  assert.ok((await call(s, `/blog/get?id=${draft.id}`)).error, "a draft is hidden from readers");
  assert.equal((await call(s, `/blog/get?id=${draft.id}&drafts=1`)).post.body, "Two");
  assert.ok((await call(s, "/blog/save", { post: { id: "2020-01-01-gone", title: "x", body: "y" } })).error, "can't edit a post that isn't there");
  await call(s, "/blog/delete", { id: post.id });
  assert.ok((await call(s, `/blog/get?id=${post.id}`)).error);
});
