// The development blog on the Cloudflare site (tools/build-site.py): the posts come from the table server
// (legend-dynamics/table-server/src/blog.js). Three uses, picked by what the page holds:
//   #ld-blog         /blog/: the posts, a tag filter, and one post at /blog/?p=<id>
//   #ld-blog-latest  the home page: the newest three
//   #ld-blog-write   /blog/write/: the author's page, behind the DEV code (posts, and the playtest feedback)
//   #ld-playtest     /playtest/: the playtest feedback form; anyone sends it, only an author reads it
(function () {
  "use strict";
  var SERVER = document.documentElement.dataset.blogServer || "";
  var KEY = "ld-blog-dev"; // the author's code, kept on their own device
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };
  var store = { get: function () { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } },
    set: function (v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} } };
  var day = function (t) { return t ? new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""; };

  // A small Markdown: # ## ### headings, paragraphs, - and 1. lists, > quotes, **bold**, *italic*, `code`, [links](url).
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
        var url = u.replace(/&amp;/g, "&");
        if (!/^(https?:\/\/|\/|#|mailto:)/i.test(url)) return t;
        var out = /^https?:\/\//i.test(url) && url.indexOf(location.origin) !== 0;
        return '<a href="' + esc(url) + '"' + (out ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, "$1<em>$2</em>");
  }
  function markdown(src) {
    var out = [], para = [], list = null;
    var flush = function () {
      if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>"), para = [];
      if (list) out.push("<" + list.tag + ">" + list.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</" + list.tag + ">"), list = null;
    };
    String(src || "").split("\n").forEach(function (line) {
      var m;
      if (!line.trim()) return flush();
      if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { flush(); var n = m[1].length + 1; out.push("<h" + n + ">" + inline(m[2]) + "</h" + n + ">"); return; }
      if ((m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(line))) {
        var tag = /\d/.test(m[1]) ? "ol" : "ul";
        if (para.length || (list && list.tag !== tag)) flush();
        (list = list || { tag: tag, items: [] }).items.push(m[2]); return;
      }
      if ((m = /^>\s?(.*)$/.exec(line))) { flush(); out.push("<blockquote><p>" + inline(m[1]) + "</p></blockquote>"); return; }
      if (list) flush();
      para.push(line.trim());
    });
    flush();
    return out.join("\n");
  }

  function api(path, body) {
    if (!SERVER) return Promise.reject(new Error("The blog isn't connected to the table server."));
    return fetch(SERVER + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        // A server from before the blog answers every /api/blog address with a plain "Not found."
        if (r.status === 404 && j.error === "Not found.") throw new Error("The blog's server hasn't been updated yet, so there's nothing to show. (Paste the new worker.js into the legend-table Worker.)");
        if (!r.ok) throw new Error(j.error || "The blog didn't answer (" + r.status + ").");
        return j; }); },
        function () { throw new Error("Couldn't reach the blog just now. Check your connection and reload the page."); });
  }
  var tagsHtml = function (tags) { return (tags || []).map(function (t) { return '<span class="ld-tag">' + esc(t) + "</span>"; }).join(""); };
  var card = function (p) {
    return '<article class="ld-post-card"><p class="ld-eyebrow">' + esc(day(p.published || p.updated)) + "</p>" +
      '<h2><a href="/blog/?p=' + encodeURIComponent(p.id) + '">' + esc(p.title) + "</a></h2>" +
      (p.summary ? "<p>" + esc(p.summary) + "</p>" : "") + '<div class="ld-post-tags">' + tagsHtml(p.tags) + "</div></article>";
  };

  // ---- /blog/ ----
  function blogPage(root) {
    var q = new URLSearchParams(location.search), id = q.get("p"), tag = q.get("tag") || "";
    if (id) {
      if ($("ld-blog-hero")) $("ld-blog-hero").hidden = true; // the post has its own title
      root.innerHTML = '<p class="ld-note">Loading…</p>';
      return api("/api/blog/" + encodeURIComponent(id)).then(function (j) {
        var p = j.post;
        document.title = p.title + " · Dev blog · Legend Dynamics";
        root.innerHTML = '<article class="ld-post"><p class="ld-eyebrow"><a href="/blog/">← Dev blog</a> · ' + esc(day(p.published)) + "</p>" +
          "<h1>" + esc(p.title) + '</h1><div class="ld-post-tags">' + tagsHtml(p.tags) + '</div><hr class="ld-rule"><div class="ld-rules">' + markdown(p.body) + "</div>" +
          (p.updated && p.published && p.updated - p.published > 864e5 ? '<p class="ld-note">Updated ' + esc(day(p.updated)) + ".</p>" : "") + "</article>";
      }).catch(function (e) { root.innerHTML = '<p>' + esc(e.message) + ' <a href="/blog/">All posts</a></p>'; });
    }
    root.innerHTML = '<p class="ld-note">Loading…</p>';
    return api("/api/blog" + (tag ? "?tag=" + encodeURIComponent(tag) : "")).then(function (j) {
      var filter = '<nav class="ld-blog-tags" aria-label="Topics"><a href="/blog/"' + (tag ? "" : ' aria-current="page"') + ">All</a>" +
        j.tags.map(function (t) { return '<a href="/blog/?tag=' + encodeURIComponent(t) + '"' + (t === tag ? ' aria-current="page"' : "") + ">" + esc(t) + "</a>"; }).join("") + "</nav>";
      root.innerHTML = filter + (j.posts.length ? '<div class="ld-posts">' + j.posts.map(card).join("") + "</div>" : (tag ? '<p>No posts about ' + esc(tag) + ' yet. <a href="/blog/">See all posts</a>.</p>' : "<p>No posts yet. Check back soon.</p>"));
    }).catch(function (e) { root.innerHTML = "<p>" + esc(e.message) + "</p>"; });
  }

  // ---- the home page ----
  function latest(root) {
    api("/api/blog").then(function (j) {
      if (!j.posts.length) return;
      root.innerHTML = '<div class="ld-eyebrow">From the dev blog</div><div class="ld-posts">' + j.posts.slice(0, 3).map(card).join("") +
        '</div><div class="ld-actions" style="margin-top:1.2rem"><a class="ld-button ld-button--ghost" href="/blog/">All posts</a></div>';
      root.hidden = false;
    }).catch(function () {});
  }

  // ---- /blog/write/ ----
  function writePage(root) {
    var code = store.get(), tags = [], posts = [], cur = null;
    var admin = function (action, extra) { var b = { access: code, action: action }; for (var k in extra) b[k] = extra[k]; return api("/api/blog/admin", b); };
    var say = function (msg, bad) { var s = $("ld-w-status"); if (s) { s.textContent = msg; s.className = "ld-note" + (bad ? " ld-bad" : ""); } };

    function login(msg) {
      root.innerHTML = '<form class="ld-form" id="ld-w-login"><label class="ld-wide">Author code <input type="password" id="ld-w-code" autocomplete="current-password" required></label>' +
        '<div class="ld-actions ld-wide"><button class="ld-button" type="submit">Sign in</button></div><p class="ld-wide ld-note" id="ld-w-status">' + esc(msg || "Your DEV code. It stays on this device until you sign out.") + "</p>" +
        '<p class="ld-wide ld-note">Just here to read? <a href="/blog/">See the posts on the Dev blog</a>; no sign-in needed.</p></form>';
      $("ld-w-login").onsubmit = function (ev) {
        ev.preventDefault(); code = $("ld-w-code").value.trim(); say("Checking…");
        admin("list").then(function (j) { store.set(code); tags = j.tags; posts = j.posts; list(); })
          .catch(function (e) { code = ""; say(e.message, true); });
      };
    }
    function list(msg) {
      cur = null;
      root.innerHTML = '<div class="ld-actions"><button class="ld-button" id="ld-w-new">New post</button><button class="ld-button ld-button--ghost" id="ld-w-out">Sign out</button></div>' +
        '<p class="ld-note" id="ld-w-status">' + esc(msg || "") + "</p>" +
        (posts.some(function (p) { return p.draft; }) ? '<p class="ld-note">Drafts are only seen here. Open one and press <b>Publish</b> to put it on the <a href="/blog/">Dev blog</a> for everyone.</p>' : "") +
        '<p class="ld-note"><button type="button" class="ld-button ld-button--ghost" id="ld-w-fb">Playtest feedback</button></p>' +
        (posts.length ? '<ul class="ld-w-list">' + posts.map(function (p) {
          return '<li><button type="button" data-id="' + esc(p.id) + '"><b>' + esc(p.title) + "</b><span>" + (p.draft ? "Draft · " : "") + esc(day(p.published || p.updated)) + "</span></button></li>";
        }).join("") + "</ul>" : "<p>No posts yet. Start with <b>New post</b>.</p>");
      $("ld-w-new").onclick = function () { edit({ title: "", body: "", tags: [], draft: true }); };
      $("ld-w-out").onclick = function () { store.set(""); code = ""; login("Signed out."); };
      $("ld-w-fb").onclick = function () { feedback(); };
      root.querySelectorAll("[data-id]").forEach(function (b) {
        b.onclick = function () { say("Opening…"); admin("get", { id: b.dataset.id }).then(function (j) { edit(j.post); }).catch(function (e) { say(e.message, true); }); };
      });
    }
    // The playtest feedback players sent from /playtest/, newest first: read it, copy it all, or delete one.
    var fbText = function (f) {
      return [day(f.at) + (f.game ? " · " + f.game : "") + (f.role ? " · played " + f.role : ""), f.rating ? "Fun: " + f.rating + " of 5" : "", f.again ? "Play again: " + f.again : "",
        f.confusing ? "Confusing: " + f.confusing : "", f.unused ? "Never used: " + f.unused : "", f.best ? "Best moment: " + f.best : "", f.other ? "Anything else: " + f.other : "",
        f.name || f.contact ? "From: " + [f.name, f.contact].filter(Boolean).join(", ") : ""].filter(Boolean).join("\n");
    };
    function feedback(msg) {
      root.innerHTML = '<p class="ld-note">Loading the feedback…</p>';
      api("/api/feedback/admin", { access: code, action: "list" }).then(function (j) {
        var all = j.feedback || [];
        var avg = all.filter(function (f) { return f.rating; }), again = all.filter(function (f) { return f.again === "Yes"; }).length;
        root.innerHTML = '<div class="ld-actions"><button class="ld-button ld-button--ghost" id="ld-w-back">Back to the posts</button>' + (all.length ? '<button class="ld-button ld-button--ghost" id="ld-w-copy">Copy it all</button>' : "") + "</div>" +
          '<p class="ld-note" id="ld-w-status">' + esc(msg || (all.length ? all.length + " response" + (all.length > 1 ? "s" : "") + (avg.length ? " · fun " + (avg.reduce(function (t, f) { return t + f.rating; }, 0) / avg.length).toFixed(1) + " of 5" : "") + " · " + again + " would play again" : "No feedback yet. Players send it from the Playtest page.")) + "</p>" +
          (all.length ? '<ul class="ld-w-list">' + all.map(function (f) {
            return '<li class="ld-fb"><pre>' + esc(fbText(f)) + '</pre><button type="button" class="ld-button ld-button--ghost" data-fbdel="' + esc(f.id) + '">Delete</button></li>';
          }).join("") + "</ul>" : "");
        $("ld-w-back").onclick = function () { list(); };
        if ($("ld-w-copy")) $("ld-w-copy").onclick = function () {
          var t = all.map(fbText).join("\n\n---\n\n"), done = function (ok) { say(ok ? "Copied." : "Copying is blocked here: select the text and copy it.", !ok); };
          if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); }); else done(false);
        };
        root.querySelectorAll("[data-fbdel]").forEach(function (b) {
          b.onclick = function () {
            if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
            api("/api/feedback/admin", { access: code, action: "delete", id: b.dataset.fbdel }).then(function () { feedback("Deleted."); }).catch(function (e) { say(e.message, true); });
          };
        });
      }).catch(function (e) { root.innerHTML = "<p>" + esc(e.message) + "</p>"; });
    }
    function edit(p) {
      cur = p;
      root.innerHTML = '<div class="ld-form ld-w-edit">' +
        '<label class="ld-wide">Title <input type="text" id="ld-w-title" maxlength="120" value="' + esc(p.title) + '"></label>' +
        '<fieldset class="ld-wide ld-w-tags"><legend>Tags</legend>' + tags.map(function (t) {
          return '<label><input type="checkbox" value="' + esc(t) + '"' + (p.tags.indexOf(t) >= 0 ? " checked" : "") + "> " + esc(t) + "</label>";
        }).join("") + "</fieldset>" +
        '<div class="ld-wide ld-w-tools" role="toolbar" aria-label="Formatting">' +
        '<button type="button" data-md="h">Heading</button><button type="button" data-md="b"><b>B</b></button><button type="button" data-md="i"><i>I</i></button>' +
        '<button type="button" data-md="a">Link</button><button type="button" data-md="l">List</button><button type="button" id="ld-w-prev" aria-pressed="false">Preview</button></div>' +
        '<label class="ld-wide">Text <textarea id="ld-w-body" rows="16" maxlength="40000">' + esc(p.body) + "</textarea></label>" +
        '<div class="ld-wide ld-rules ld-w-preview" id="ld-w-preview" hidden></div>' +
        '<p class="ld-wide ld-note">Write in plain text. <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>[words](https://…)</code> for a link, <code>- </code> for a list. A blank line starts a new paragraph.</p>' +
        '<div class="ld-actions ld-wide"><button class="ld-button" id="ld-w-pub">' + (p.id && !p.draft ? "Update" : "Publish") + '</button>' +
        '<button class="ld-button ld-button--ghost" id="ld-w-draft">' + (p.id && !p.draft ? "Unpublish (draft)" : "Save draft") + "</button>" +
        '<button class="ld-button ld-button--ghost" id="ld-w-back">Back</button>' +
        (p.id ? '<button class="ld-button ld-button--ghost" id="ld-w-del">Delete</button>' : "") +
        (p.id && !p.draft ? '<a class="ld-button ld-button--ghost" href="/blog/?p=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener">View</a>' : "") +
        '</div><p class="ld-wide ld-note" id="ld-w-status"></p></div>';
      var body = $("ld-w-body");
      var wrap = function (a, b, ph) {
        var s = body.selectionStart, e2 = body.selectionEnd, sel = body.value.slice(s, e2) || ph;
        body.setRangeText(a + sel + b, s, e2, "select"); body.focus();
      };
      var lines = function (pre) {
        var s = body.value.lastIndexOf("\n", body.selectionStart - 1) + 1, e2 = body.selectionEnd;
        body.setRangeText(body.value.slice(s, e2).split("\n").map(function (l) { return pre + l.replace(/^(#{1,3}\s+|-\s+)/, ""); }).join("\n"), s, e2, "end"); body.focus();
      };
      root.querySelectorAll("[data-md]").forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.md;
          if (k === "b") wrap("**", "**", "bold");
          else if (k === "i") wrap("*", "*", "italic");
          else if (k === "a") { var u = prompt("Link to (https://…)", "https://"); if (u) wrap("[", "](" + u.trim() + ")", "link text"); }
          else lines(k === "h" ? "## " : "- ");
        };
      });
      $("ld-w-prev").onclick = function () {
        var pv = $("ld-w-preview"), on = pv.hidden;
        pv.innerHTML = markdown(body.value); pv.hidden = !on; body.parentNode.hidden = on;
        this.setAttribute("aria-pressed", String(on)); this.textContent = on ? "Edit" : "Preview";
      };
      var save = function (draft) {
        var post = { id: p.id, title: $("ld-w-title").value, body: body.value, draft: draft,
          tags: [].map.call(root.querySelectorAll(".ld-w-tags input:checked"), function (c) { return c.value; }) };
        if (!post.title.trim() || !post.body.trim()) return say("A post needs a title and some text.", true);
        say(draft ? "Saving…" : "Publishing…");
        admin("save", { post: post }).then(function (j) {
          return admin("list").then(function (l) { posts = l.posts; edit(j.post); say(draft ? "Saved as a draft." : "Published. It's on the blog now."); });
        }).catch(function (e) { say(e.message, true); });
      };
      $("ld-w-pub").onclick = function () { save(false); };
      $("ld-w-draft").onclick = function () { save(true); };
      $("ld-w-back").onclick = function () { list(); };
      if ($("ld-w-del")) $("ld-w-del").onclick = function () {
        if (!confirm("Delete “" + p.title + "”? This can't be undone.")) return;
        admin("delete", { id: p.id }).then(function () { return admin("list"); }).then(function (l) { posts = l.posts; list("Deleted."); }).catch(function (e) { say(e.message, true); });
      };
    }
    window.addEventListener("beforeunload", function (ev) {
      if (cur && $("ld-w-body") && ($("ld-w-body").value !== cur.body || $("ld-w-title").value !== cur.title)) { ev.preventDefault(); ev.returnValue = ""; }
    });
    if (!code) return login();
    root.innerHTML = '<p class="ld-note">Signing in…</p>';
    admin("list").then(function (j) { tags = j.tags; posts = j.posts; list(); }).catch(function (e) { store.set(""); code = ""; login(e.message); });
  }

  // The playtest feedback form (/playtest/): sent to the table server; only an author can read it.
  function playtest(form) {
    var say = function (msg, bad) { var st = $("ld-pt-status"); st.textContent = msg; st.className = "ld-note ld-wide" + (bad ? " ld-bad" : ""); };
    form.onsubmit = function (ev) {
      ev.preventDefault();
      var v = function (n) { var el = form.elements[n]; return el ? el.value : ""; };
      var rating = form.querySelector('input[name="rating"]:checked'), again = form.querySelector('input[name="again"]:checked');
      var f = { game: v("game"), role: v("role"), rating: rating ? +rating.value : null, again: again ? again.value : "", confusing: v("confusing"), unused: v("unused"), best: v("best"), other: v("other"), name: v("name"), contact: v("contact") };
      if (!f.rating && !f.again && !f.confusing.trim() && !f.unused.trim() && !f.best.trim() && !f.other.trim()) { say("Answer at least one question first.", true); return; }
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true; say("Sending…");
      api("/api/feedback", { feedback: f, website: v("website") }).then(function () {
        form.innerHTML = '<p class="ld-wide"><b>Thank you!</b> Your answers are in. They go straight into the next version of the rules.</p>';
      }).catch(function (e) {
        // The server couldn't take it (an old server, or no connection): the answers aren't lost, they can go by email.
        btn.disabled = false;
        var lines = [f.game, f.role && "Played: " + f.role, f.rating && "Fun: " + f.rating + " of 5", f.again && "Play again: " + f.again, f.confusing && "Confusing: " + f.confusing,
          f.unused && "Never used: " + f.unused, f.best && "Best moment: " + f.best, f.other && "Anything else: " + f.other, (f.name || f.contact) && "From: " + [f.name, f.contact].filter(Boolean).join(", ")].filter(Boolean).join("\n");
        say(/too many|an hour|at least one/i.test(e.message) ? e.message : "Your answers couldn't be sent just now. Copy them below and email them to contact@legenddynamicsrpg.com, or try again later.", true);
        if (!/too many|an hour|at least one/i.test(e.message) && !$("ld-pt-copy")) $("ld-pt-status").insertAdjacentHTML("afterend", '<textarea class="ld-wide" id="ld-pt-copy" readonly>' + esc(lines) + "</textarea>");
      });
    };
  }

  if ($("ld-playtest")) playtest($("ld-playtest"));
  if ($("ld-blog")) blogPage($("ld-blog"));
  if ($("ld-blog-latest")) latest($("ld-blog-latest"));
  if ($("ld-blog-write")) writePage($("ld-blog-write"));
})();
