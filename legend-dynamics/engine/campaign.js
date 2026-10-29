// The campaign builder: the GM's campaign in the GM view's Campaign tab. Plain script, inlined by tools/build-legend.py
// (/* CAMPAIGN */); no modules, no page globals.
//
// A campaign holds its premise and outline (the arc of adventures), its people, places and factions, and its sessions
// (the plan before, the log after). Generators roll each of them from the setting's own tables (its adventure seeds,
// roles, allegiances, threats and names, PACK.seeds and PACK.campaign) and a few setting-neutral ones; a rolled entry
// opens in its form, to change before it's kept.
// A step of the outline can have a trigger: it stays locked until the group holds the cards it names (by subject) and
// as many cards as it asks for; then it unlocks, for good, and the GM is told what happens. The cards are the
// characters' in the GM view (their lore cards, data records, tales or dossiers).
// Everything is the GM's alone until they share it: an entry marked "share" (its public part only, never its secret
// or notes) reaches the players through the shared table, on their play tab.
// Kept in this browser (<game>.campaign.v1), with Save to file / Open file to back it up or move it.
//
// mountCampaign(api) with api: { PACK, gmRoot (the GM view's Campaign card), noteRoot (a card on the play tab for what
//   the GM shares), esc, toast, saveText(text, name, say), onShare() (the shared part changed: send it),
//   cards() (the cards the group holds: [{ tag, name }]; leave it out in a game without cards, and the outline has no
//   triggers), words ({ card, cards }: the setting's word for a card) }
// returns { snapshot() (what the shared table sends players, or null), receive(shared), check() (look at the cards again) }.
// Function declarations only.

function cpLimits() { return { arc: 40, people: 150, places: 100, factions: 40, sessions: 200 }; }
function cpKinds() { return ["arc", "people", "places", "factions", "sessions"]; }
function cpKey(PACK) { return PACK.id + ".campaign.v1"; }
function cpSharedKey(PACK) { return PACK.id + ".campaign.shared.v1"; }
/** Text from the GM: newlines kept, other control characters dropped. */
function cpText(v, max) { return String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max); }
function cpLine(v, max) { return cpText(v, max).replace(/\s+/g, " "); }
function cpNewId(kind) { return kind.slice(0, 2) + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
function cpStatuses() { return { arc: [["planned", "Planned"], ["running", "Running"], ["done", "Done"]], sessions: [["planned", "Planned"], ["played", "Played"]] }; }
/** Each kind's fields: [name, label, max length, long text?, public?] (a secret or notes field is never shared). */
function cpFields() {
  return {
    arc: [["title", "Title", 80, false, true], ["summary", "What happens", 2000, true, true], ["notes", "GM notes", 2000, true, false],
      ["unlockCards", "Unlocks with cards about (comma between subjects)", 300, false, false], ["unlockText", "When it unlocks: what happens", 600, true, false]],
    people: [["name", "Name", 60, false, true], ["role", "Who they are", 80, false, true], ["faction", "Faction", 60, false, true], ["desc", "What the players know", 1000, true, true],
      ["goal", "What they want", 300, false, false], ["secret", "Their secret", 600, true, false], ["notes", "GM notes", 2000, true, false]],
    places: [["name", "Name", 60, false, true], ["kind", "What it is", 80, false, true], ["desc", "What the players know", 1000, true, true],
      ["secret", "What's really there", 600, true, false], ["notes", "GM notes", 2000, true, false]],
    factions: [["name", "Name", 60, false, true], ["desc", "What the players know", 1000, true, true], ["goal", "What they want", 300, false, false],
      ["methods", "How they work", 300, false, false], ["resources", "What they have", 300, false, false], ["secret", "Their secret", 600, true, false], ["notes", "GM notes", 2000, true, false]],
    sessions: [["title", "Title", 80, false, true], ["date", "Date", 40, false, true], ["scenes", "Scenes", 3000, true, false], ["threats", "Threats and clocks", 1500, true, false],
      ["clues", "Clues and secrets to find", 1500, true, false], ["rewards", "Rewards", 800, true, false], ["log", "What happened (GM's log)", 4000, true, false],
      ["recap", "Recap for the players", 2000, true, true]],
  };
}

/** A campaign as it may be kept: every field checked and cut to size; anything else dropped. */
function cpClean(raw) {
  const r = raw && typeof raw === "object" ? raw : {}, F = cpFields(), S = cpStatuses();
  const out = { name: cpLine(r.name, 80), premise: cpText(r.premise, 3000), themes: cpLine(r.themes, 300), tone: cpLine(r.tone, 300),
    sharePremise: !!r.sharePremise, notes: cpText(r.notes, 4000) };
  for (const kind of cpKinds()) {
    const seen = new Set();
    out[kind] = (Array.isArray(r[kind]) ? r[kind] : []).slice(0, cpLimits()[kind]).map((x) => {
      if (!x || typeof x !== "object") return null;
      const e = { id: typeof x.id === "string" && /^[a-z]{2}-[a-z0-9]{1,24}$/.test(x.id) && !seen.has(x.id) ? x.id : cpNewId(kind), shared: !!x.shared };
      seen.add(e.id);
      for (const [f, , max, long] of F[kind]) e[f] = long ? cpText(x[f], max) : cpLine(x[f], max);
      if (S[kind]) e.status = S[kind].some((s) => s[0] === x.status) ? x.status : S[kind][0][0];
      if (kind === "arc") { // the trigger: how many cards, and whether it has fired
        const n = parseInt(x.unlockCount, 10); e.unlockCount = Number.isFinite(n) ? Math.max(0, Math.min(30, n)) : 0;
        e.unlockHint = !!x.unlockHint; e.unlocked = !!x.unlocked && cpHasTrigger(e);
      }
      return e[F[kind][0][0]] ? e : null; // an entry needs its name or title
    }).filter(Boolean);
  }
  return out;
}
/** A step with a trigger: subjects to find, or a number of cards. */
function cpHasTrigger(x) { return !!(x.unlockCount || cpSubjects(x.unlockCards).length); }
function cpSubjects(text) { return [...new Set(String(text || "").split(/[,;\n]/).map((t) => t.trim()).filter(Boolean))]; }
function cpNorm(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
/** Where a step's trigger stands, against the cards the group holds ([{ tag, name }]): the subjects still missing,
 * the cards still needed, and whether it's met. A subject matches a card's name or its tag, ignoring case. */
function cpTrigger(x, cards) {
  const held = new Map();
  for (const k of cards || []) { const key = cpNorm(k.tag || k.name); if (key && !held.has(key)) held.set(key, cpNorm(k.name)); }
  const has = (sub) => { const n = cpNorm(sub); return [...held].some(([tag, name]) => tag === n || name === n || tag.replace(/ /g, "") === n.replace(/ /g, "")); };
  const missing = cpSubjects(x.unlockCards).filter((sub) => !has(sub));
  const short = Math.max(0, (x.unlockCount || 0) - held.size);
  return { missing, short, held: held.size, met: cpHasTrigger(x) && !missing.length && !short };
}
function cpCount(c) { return cpKinds().reduce((n, k) => n + c[k].length, 0) + (c.name || c.premise ? 1 : 0); }
function cpLoad(PACK) { try { return cpClean(JSON.parse(localStorage.getItem(cpKey(PACK)) || "null")); } catch { return cpClean(null); } }
function cpSave(PACK, c) { try { localStorage.setItem(cpKey(PACK), JSON.stringify(c)); return true; } catch { return false; } }

/** What the players see: shared entries' public fields, newest sessions first, cut to fit the shared table. */
function cpPublic(c, max = 20000) {
  const F = cpFields(), pick = (kind, x) => Object.fromEntries(F[kind].filter((f) => f[4]).map((f) => [f[0], x[f[0]]]).filter(([, v]) => v));
  const out = { name: c.name, ...(c.sharePremise && c.premise ? { premise: c.premise } : {}) };
  for (const kind of cpKinds()) out[kind] = c[kind].filter((x) => x.shared).map((x) => pick(kind, x));
  // A locked step: the players see that it's locked, and what opens it if the GM says so (never its unlock text).
  out.arc = c.arc.filter((x) => x.shared).map((x, i) => !cpHasTrigger(x) || x.unlocked ? out.arc[i]
    : { title: x.title, locked: true, ...(x.unlockHint ? { needs: [...cpSubjects(x.unlockCards).map((t) => "a card about " + t), ...(x.unlockCount ? [x.unlockCount + " cards in all"] : [])].join("; ") } : {}) });
  out.sessions = out.sessions.reverse(); // the latest recap first
  while (JSON.stringify(out).length > max) { // too much to send: the oldest recaps go first, then the longest entries
    const k = out.sessions.length ? "sessions" : cpKinds().filter((x) => out[x].length).sort((a, b) => JSON.stringify(out[b]).length - JSON.stringify(out[a]).length)[0];
    if (!k) break; out[k].pop();
  }
  const any = out.premise || cpKinds().some((k) => out[k].length);
  return any ? out : null;
}
/** The GM's shared campaign, as a player's page receives it: checked again before it's shown. */
function cpCleanPublic(raw) {
  if (!raw || typeof raw !== "object") return null;
  const F = cpFields(), out = { name: cpLine(raw.name, 80), premise: cpText(raw.premise, 3000) };
  for (const kind of cpKinds()) out[kind] = (Array.isArray(raw[kind]) ? raw[kind] : []).slice(0, cpLimits()[kind]).map((x) => {
    if (!x || typeof x !== "object") return null;
    const e = {}; for (const [f, , max, long, pub] of F[kind]) if (pub && x[f]) e[f] = long ? cpText(x[f], max) : cpLine(x[f], max);
    if (kind === "arc" && x.locked) { e.locked = true; delete e.summary; if (x.needs) e.needs = cpLine(x.needs, 400); }
    return e[F[kind][0][0]] ? e : null;
  }).filter(Boolean);
  return out.premise || cpKinds().some((k) => out[k].length) ? out : null;
}

// ---- generators: the setting's own tables, and a few that suit any setting ----
function cpTables() {
  return {
    manner: ["Warm and talkative", "Guarded", "Nervous, eyes always moving", "Blunt to the point of rude", "Charming, and knows it", "Bone-weary", "Proud", "Endlessly curious",
      "Devout", "Dry and sardonic", "Quiet and watchful", "Loud and generous", "Polite to a fault", "Impatient", "Grieving", "Cheerful in a hard way"],
    want: ["to pay off a debt that's come due", "revenge on whoever ruined them", "to protect someone they love", "to be left alone", "power over the people around them",
      "the truth about what happened", "a way out", "the respect they never got", "to keep a secret buried", "to win back what they lost", "money, and quickly",
      "to prove themselves", "to find someone who vanished", "to undo a mistake", "to serve their cause", "safety for their people"],
    secret: ["They owe the wrong people.", "They aren't who they claim to be.", "They saw what really happened and said nothing.", "They're working for a rival.",
      "They're ill and hiding it.", "They did the thing they blame on others.", "They love someone they shouldn't.", "They know where something valuable is hidden.",
      "The strange has touched them.", "Someone is blackmailing them.", "They betrayed a friend.", "They mean to leave without a word.", "They keep something dangerous.",
      "They have a family nobody knows about.", "They're the informant.", "They remember it differently from everyone else."],
    feature: ["Something here is newer than it should be.", "The people here are afraid of something.", "There's a way in that few know.", "It's been empty too long.",
      "Everyone uses it as a landmark.", "Someone is watching the way in.", "There are signs of a fight nobody talks about.", "A debt is owed here.", "It's busier at night.",
      "The law doesn't reach here.", "There's a shrine or a memorial.", "It's the only supply for a long way.", "Old maps show it differently.",
      "Someone lives here who shouldn't.", "It's for sale, cheap.", "There's a sound nobody can explain."],
    aim: ["control of the trade through the region", "to destroy a rival", "to keep the old ways", "to bring in the new", "to hide what they did", "to recruit the heroes",
      "to find a lost thing", "to hold their territory", "to win the public's favor", "to profit from the trouble", "to bring down the authorities", "to use the strange for themselves",
      "to stop the strange at any cost", "revenge for an old wrong", "to put their own in charge", "to survive what's coming"],
    method: ["bribes and favors", "threats and violence", "the law and its paperwork", "rumor and the press", "faith and fear", "secrets and blackmail", "charity, with strings",
      "hired muscle", "spies everywhere", "alliances of convenience", "patience: they wait", "money, lots of it"],
    asset: ["money", "numbers", "influence with the powerful", "information", "a stronghold", "a weapon or artifact", "the law on their side", "the public's love",
      "a famous leader", "old knowledge", "the only road in", "a monopoly"],
    reward: ["Pay, as agreed.", "A favor from someone powerful.", "A lead on something bigger.", "Fine gear or a weapon.", "A new contact.", "A safe place to rest.",
      "A clue toward the campaign's arc.", "The gratitude of the locals."],
  };
}
function cpPick(list, rnd) { return list.length ? list[Math.floor(rnd() * list.length)] : ""; }
function cpCap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
/** The first letter in lower case, for a phrase in the middle of a sentence: names (Vulcan, Klingon) keep their capitals. */
function cpLow(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
function cpName(PACK, rnd) {
  const n = (PACK.campaign && PACK.campaign.names) || {};
  return [cpPick(n.first || [], rnd), cpPick(n.last || [], rnd)].filter(Boolean).join(" ");
}
function cpSeed(PACK, k, rnd) {
  const s = PACK.seeds && PACK.seeds[k]; if (!s) return "";
  const v = cpPick(s[1], rnd);
  return Array.isArray(v) ? `${v[0]} (${/^8|^11|^18/.test(String(v[1])) ? "an" : "a"} ${v[1]}-segment clock)` : v;
}
/** A rolled entry of a kind, every field filled in, ready to change in its form. @param {() => number} rnd */
function cpRoll(PACK, kind, c, rnd = Math.random) {
  // The setting's own tables (PACK.campaign.tables) take the place of the general ones they name.
  const T = { ...cpTables(), ...((PACK.campaign && PACK.campaign.tables) || {}) }, al = (PACK.allegiances || []).filter((a) => a[0]);
  const factionNames = [...(c ? c.factions.map((f) => f.name) : []), ...al.map((a) => a[1])];
  const threats = (PACK.threats || []).filter((t) => !t.minor).map((t) => t.name);
  if (kind === "people") {
    // Who they are: one of the setting's key characters (or, now and then, one of its roles); how they come across.
    const job = cpPick((PACK.roles || []).map((r) => cpLow(r.name)), rnd);
    const role = rnd() < 0.75 || !job ? cpSeed(PACK, "who", rnd) : `${/^[aeiou]/.test(job) ? "An" : "A"} ${job}`;
    return { name: cpName(PACK, rnd), role, faction: rnd() < 0.6 ? cpPick(factionNames, rnd) : "", desc: `${cpPick(T.manner, rnd)}.`,
      goal: cpCap(cpPick(T.want, rnd)), secret: cpPick(T.secret, rnd) };
  }
  // A town (PACK.campaign.towns: name parts, what it lives on, who runs it, what's wrong), half the time in a setting with them.
  const TW = PACK.campaign && PACK.campaign.towns;
  if (kind === "places" && TW && rnd() < 0.5) return { name: `${cpPick(TW.first, rnd)}${cpPick(TW.second, rnd)}`, kind: cpPick(TW.kind, rnd),
    desc: `It lives on ${cpLow(cpPick(TW.livesOn, rnd))}. ${cpPick(TW.runs, rnd)} runs it. ${cpPick(T.feature, rnd)}`, secret: cpPick(TW.wrong, rnd) };
  if (kind === "places") return { name: cpSeed(PACK, "place", rnd), kind: "", desc: cpPick(T.feature, rnd), secret: `${cpSeed(PACK, "strange", rnd)}.` };
  if (kind === "factions") {
    const a = rnd() < 0.5 && al.length ? cpPick(al, rnd) : null;
    return { name: a ? a[1] : "", desc: a ? a[2] : "", goal: cpCap(cpPick(T.aim, rnd)), methods: cpCap(cpPick(T.method, rnd)), resources: cpCap(cpPick(T.asset, rnd)), secret: cpPick(T.secret, rnd) };
  }
  if (kind === "arc") return { title: cpSeed(PACK, "mission", rnd), summary: `${cpSeed(PACK, "strange", rnd)}. Twist: ${cpSeed(PACK, "twist", rnd)}.`, notes: `Clock: ${cpSeed(PACK, "clock", rnd)}.` };
  if (kind === "sessions") {
    const who = cpSeed(PACK, "who", rnd), place = cpSeed(PACK, "place", rnd);
    return { title: cpSeed(PACK, "mission", rnd), date: "",
      scenes: `1. The hook: ${cpLow(who)} brings the trouble.\n2. ${place}: ${cpLow(cpPick(T.feature, rnd))}\n3. ${cpSeed(PACK, "strange", rnd)}.\n4. The twist: ${cpSeed(PACK, "twist", rnd)}.`,
      threats: [...new Set([cpPick(threats, rnd), cpPick(threats, rnd)].filter(Boolean))].join(", ") + (threats.length ? "\n" : "") + `Clock: ${cpSeed(PACK, "clock", rnd)}.`,
      clues: `${cpPick(T.secret, rnd)} (${cpLow(who)})\n${cpPick(T.feature, rnd)} (${cpLow(place)})`, rewards: cpPick(T.reward, rnd), log: "", recap: "" };
  }
  return {};
}
/** A premise for the whole campaign, rolled from the seeds. */
function cpRollPremise(PACK, rnd = Math.random) {
  const clock = cpPick((PACK.seeds && PACK.seeds.clock && PACK.seeds.clock[1]) || [], rnd), lc = (t) => t.replace(/^./, (x) => x.toLowerCase());
  return `${cpSeed(PACK, "strange", rnd)}. ${cpSeed(PACK, "who", rnd)} sets it in motion${clock ? `, and the clock is ticking: ${lc(clock[0])}` : ""}. ` +
    `Underneath it all: ${lc(cpSeed(PACK, "twist", rnd))}.`;
}

function mountCampaign(api) {
  const { PACK, esc } = api, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const F = cpFields(), S = cpStatuses(), W = api.words || { card: "card", cards: "cards" };
  const TRIGGERS = typeof api.cards === "function"; // a game with cards: steps of the outline can wait for them
  const groupCards = () => { try { return api.cards ? api.cards() || [] : []; } catch { return []; } };
  const subjects = ((PACK.discovery && PACK.discovery.subjects) || []).map((x) => x[1]).filter(Boolean);
  let c = cpLoad(PACK), editing = null, draft = null, received = null; // editing: [kind, id or "new"]; draft: a rolled entry being changed
  try { received = cpCleanPublic(JSON.parse(localStorage.getItem(cpSharedKey(PACK)) || "null")); } catch {}
  const TITLES = { arc: ["Outline", "adventure", "an adventure"], people: ["People", "person", "a person"], places: ["Places", "place", "a place"],
    factions: ["Factions", "faction", "a faction"], sessions: ["Sessions", "session", "a session"] };
  const store = (shareChanged) => { if (!cpSave(PACK, c)) say("This browser won't keep the campaign: save it to a file.", true); render(); if (shareChanged && api.onShare) api.onShare(); };
  const field = (kind, x, [f, label, max, long]) => long
    ? `<div class="field wide"><label>${esc(label)}</label><textarea name="${f}" rows="${max > 1500 ? 5 : 3}" maxlength="${max}">${esc(x[f] || "")}</textarea></div>`
    : `<div class="field"><label>${esc(label)}</label><input type="text" name="${f}" maxlength="${max}" value="${esc(x[f] || "")}"${f === "faction" ? ` list="cp-factions"` : ""}></div>`;
  const opts = (list, sel) => list.map(([v, n]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(n)}</option>`).join("");
  function form(kind) {
    const x = draft || (editing[1] === "new" ? {} : c[kind].find((y) => y.id === editing[1]) || {});
    const trig = (f) => /^unlock/.test(f[0]);
    return `<form data-cpform="${kind}" class="fields cp-form">${F[kind].filter((f) => !trig(f)).map((f) => field(kind, x, f)).join("")}
      ${kind === "arc" && TRIGGERS ? `<fieldset class="field wide cp-trigger"><legend class="label">Trigger: unlock this step with ${esc(W.cards)}</legend>
        <p class="small muted">The step stays locked until the group holds ${esc(W.cards)} about every subject listed, and at least the number asked for. Then it unlocks for good and tells you what happens. Leave both empty for no trigger.</p>
        <div class="fields">
        <div class="field wide"><label>${esc(W.cards[0].toUpperCase() + W.cards.slice(1))} about (a comma between subjects)</label><input type="text" name="unlockCards" maxlength="300" value="${esc(x.unlockCards || "")}" list="cp-subjects" placeholder="${esc(subjects.slice(0, 2).join(", ") || "e.g. the cult, the drowned god")}"></div>
        <div class="field"><label>And at least this many ${esc(W.cards)} in all</label><input type="text" inputmode="numeric" name="unlockCount" maxlength="2" value="${x.unlockCount || ""}" placeholder="any number"></div>
        <div class="field"><label><input type="checkbox" name="unlockHint"${x.unlockHint ? " checked" : ""}> Tell the players which ${esc(W.cards)} open it</label></div>
        ${field(kind, x, F.arc.find((f) => f[0] === "unlockText"))}</div>
        <datalist id="cp-subjects">${subjects.map((n) => `<option value="${esc(n)}">`).join("")}</datalist></fieldset>` : ""}
      ${S[kind] ? `<div class="field"><label>Status</label><select name="status">${opts(S[kind], x.status || S[kind][0][0])}</select></div>` : ""}
      <div class="field"><label><input type="checkbox" name="shared"${x.shared ? " checked" : ""}> Share with the players${kind === "sessions" ? " (its title, date and recap)" : " (not the secret or notes)"}</label></div>
      <div class="btn-row field wide"><button class="btn primary" type="submit">Save</button><button type="button" class="btn" data-cproll="${kind}">Roll again</button>
        <button type="button" class="linkish" data-cpcancel>Cancel</button></div></form>`;
  }
  const line = (kind, x) => kind === "people" ? [x.role, x.faction].filter(Boolean).join(", ") : kind === "places" ? x.kind || x.desc.slice(0, 80)
    : kind === "factions" ? x.goal : kind === "arc" ? `${lockLine(x)}${(S.arc.find((s) => s[0] === x.status) || [])[1]}: ${x.summary.slice(0, 90)}` : [x.date, (S.sessions.find((s) => s[0] === x.status) || [])[1]].filter(Boolean).join(", ");
  const lockLine = (x) => {
    if (!cpHasTrigger(x)) return "";
    if (x.unlocked) return "Unlocked. ";
    const t = cpTrigger(x, groupCards());
    return `Locked: ${[...t.missing.map((m) => `needs ${m}`), ...(t.short ? [`${t.short} more ${t.short === 1 ? W.card : W.cards}`] : [])].join(", ")}. `;
  };
  const item = (kind, x) => `<li><b>${kind === "arc" && cpHasTrigger(x) ? (x.unlocked ? "🔓 " : "🔒 ") : ""}${esc(x[F[kind][0][0]])}</b>${x.shared ? ` <span class="pill" title="The players see it">shared</span>` : ""} <span class="muted small">${esc(line(kind, x))}</span>
    <span class="btn-row" style="display:inline-flex;margin:0 0 0 6px"><button type="button" class="linkish" data-cpedit="${kind}" data-id="${esc(x.id)}">Open</button>
    <button type="button" class="linkish" data-cpshare="${kind}" data-id="${esc(x.id)}">${x.shared ? "Unshare" : "Share"}</button>
    ${kind === "arc" && x.unlocked ? `<button type="button" class="linkish" data-cprelock="${esc(x.id)}">Lock again</button>` : ""}
    ${kind === "arc" || kind === "sessions" ? `<button type="button" class="linkish" data-cpup="${kind}" data-id="${esc(x.id)}" aria-label="Move up">↑</button>` : ""}
    <button type="button" class="linkish" data-cpdel="${kind}" data-id="${esc(x.id)}">Delete</button></span></li>`;
  const section = (kind) => {
    const [title, one, an] = TITLES[kind], list = c[kind], open = editing && editing[0] === kind;
    return `<details class="cp-sec" data-cpsec="${kind}"${open ? " open" : ""}><summary class="label">${title} (${list.length})</summary>
      ${open ? form(kind) : `<div class="btn-row"><button type="button" class="btn" data-cpnew="${kind}"${list.length >= cpLimits()[kind] ? " disabled" : ""}>Add ${an}</button>
        <button type="button" class="btn" data-cproll="${kind}"${list.length >= cpLimits()[kind] ? " disabled" : ""}>Roll ${an}</button></div>`}
      <ul class="small adv-list">${list.map((x) => item(kind, x)).join("") || `<li class="muted">None yet.</li>`}</ul></details>`;
  };
  const sharedCount = () => cpKinds().reduce((n, k) => n + c[k].filter((x) => x.shared).length, 0) + (c.sharePremise && c.premise ? 1 : 0);
  function render() {
    if (api.gmRoot) {
      api.gmRoot.innerHTML = `<h3>Campaign${c.name ? `: ${esc(c.name)}` : ""}</h3>
        <p class="small muted">Your campaign's premise, outline, people, places, factions and sessions, kept in this browser. <b>Roll</b> fills an entry from ${esc(PACK.terms.title)}'s own tables; change anything before you save it. Everything is yours alone until you <b>share</b> it: the players then see its public part (never its secret or your notes) on their play tab, through the shared table.</p>
        <p class="small">${sharedCount() ? `<b>Shared with the players:</b> ${sharedCount()} entr${sharedCount() === 1 ? "y" : "ies"}.` : "Nothing shared yet."}</p>
        <div class="btn-row"><button type="button" class="btn" data-cpexport${cpCount(c) ? "" : " disabled"}>Save to file</button>
          <label class="btn" tabindex="0">Open file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" data-cpimport></label>
          ${cpCount(c) ? `<button type="button" class="linkish" data-cpclear>Start a new campaign</button>` : ""}</div>
        <datalist id="cp-factions">${[...c.factions.map((f) => f.name), ...(PACK.allegiances || []).filter((a) => a[0]).map((a) => a[1])].map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        <details class="cp-sec" data-cpsec="overview"${!cpCount(c) || (editing && editing[0] === "overview") ? " open" : ""}><summary class="label">Premise and themes</summary>
          <form data-cpform="overview" class="fields cp-form">
            <div class="field"><label>Campaign name</label><input type="text" name="name" maxlength="80" value="${esc(c.name)}" placeholder="e.g. The Long Dark of Copper Creek"></div>
            <div class="field"><label>Tone</label><input type="text" name="tone" maxlength="300" value="${esc(c.tone)}" placeholder="e.g. grim, with moments of warmth"></div>
            <div class="field wide"><label>Premise: the pitch for the players</label><textarea name="premise" rows="4" maxlength="3000">${esc(c.premise)}</textarea></div>
            <div class="field wide"><label>Themes</label><input type="text" name="themes" maxlength="300" value="${esc(c.themes)}" placeholder="e.g. debt, faith, what we owe the dead"></div>
            <div class="field wide"><label>GM notes: the big secrets, where it's going</label><textarea name="notes" rows="4" maxlength="4000">${esc(c.notes)}</textarea></div>
            <div class="field"><label><input type="checkbox" name="sharePremise"${c.sharePremise ? " checked" : ""}> Share the name and premise with the players</label></div>
            <div class="btn-row field wide"><button class="btn primary" type="submit">Save</button><button type="button" class="btn" data-cprollpremise>Roll a premise</button></div></form></details>
        ${cpKinds().map(section).join("")}`;
    }
    if (api.noteRoot) {
      const p = received;
      api.noteRoot.hidden = !p;
      const list = (kind, title, body) => p[kind].length ? `<details><summary class="label">${title} (${p[kind].length})</summary><ul class="small adv-list">${p[kind].map(body).join("")}</ul></details>` : "";
      const para = (t) => esc(t).replace(/\n/g, "<br>");
      api.noteRoot.innerHTML = p ? `<h3>${p.name ? esc(p.name) : "The campaign"}</h3>${p.premise ? `<p class="small">${para(p.premise)}</p>` : ""}
        ${list("sessions", "Session recaps", (x) => `<li><b>${esc(x.title)}</b>${x.date ? ` <span class="muted">${esc(x.date)}</span>` : ""}${x.recap ? `<br>${para(x.recap)}` : ""}</li>`)}
        ${list("arc", "The story so far", (x) => x.locked ? `<li><b>🔒 ${esc(x.title)}</b> <span class="muted">Locked${x.needs ? `: it opens with ${esc(x.needs)}` : ""}.</span></li>` : `<li><b>${esc(x.title)}</b>${x.summary ? `<br>${para(x.summary)}` : ""}</li>`)}
        ${list("people", "People", (x) => `<li><b>${esc(x.name)}</b>${x.role || x.faction ? ` <span class="muted">${esc([x.role, x.faction].filter(Boolean).join(", "))}</span>` : ""}${x.desc ? `<br>${para(x.desc)}` : ""}</li>`)}
        ${list("places", "Places", (x) => `<li><b>${esc(x.name)}</b>${x.kind ? ` <span class="muted">${esc(x.kind)}</span>` : ""}${x.desc ? `<br>${para(x.desc)}` : ""}</li>`)}
        ${list("factions", "Factions", (x) => `<li><b>${esc(x.name)}</b>${x.desc ? `<br>${para(x.desc)}` : ""}</li>`)}` : "";
    }
  }
  const readForm = (f, kind) => {
    const v = (n) => (f.elements[n] ? f.elements[n].value : "");
    const e = Object.fromEntries(F[kind].map(([n]) => [n, v(n)]));
    if (S[kind]) e.status = v("status");
    if (kind === "arc" && TRIGGERS) { e.unlockCount = v("unlockCount"); e.unlockHint = !!(f.elements.unlockHint && f.elements.unlockHint.checked); }
    e.shared = !!(f.elements.shared && f.elements.shared.checked);
    return e;
  };
  const shareOf = () => JSON.stringify(cpPublic(c));
  const root = api.gmRoot;
  if (root) {
    root.addEventListener("submit", (e) => {
      const f = e.target.closest("[data-cpform]"); if (!f) return; e.preventDefault();
      const kind = f.dataset.cpform, before = shareOf();
      if (kind === "overview") {
        const v = (n) => f.elements[n].value;
        c = cpClean({ ...c, name: v("name"), tone: v("tone"), premise: v("premise"), themes: v("themes"), notes: v("notes"), sharePremise: f.elements.sharePremise.checked });
        editing = null; store(shareOf() !== before); say("Saved."); return;
      }
      const entry = readForm(f, kind), list = c[kind].slice(), at = editing && editing[1] !== "new" ? list.findIndex((x) => x.id === editing[1]) : -1;
      if (!entry[F[kind][0][0]].trim()) { say(`${TITLES[kind][1][0].toUpperCase() + TITLES[kind][1].slice(1)} needs a ${F[kind][0][1].toLowerCase()}.`, true); return; }
      if (at >= 0) list[at] = { ...entry, id: list[at].id, unlocked: list[at].unlocked }; else list.push({ ...entry, id: cpNewId(kind) });
      c = cpClean({ ...c, [kind]: list }); editing = null; draft = null; store(shareOf() !== before); say(at >= 0 ? "Saved." : "Added.");
      if (kind === "arc") check(); // a trigger the group's cards already meet fires at once
    });
    root.addEventListener("change", async (e) => {
      const t = e.target; if (!t.matches("[data-cpimport]") || !t.files || !t.files[0]) return;
      try {
        const d = JSON.parse(await t.files[0].text());
        if (!d || d.format !== PACK.id + "-campaign") throw new Error(d && /-campaign$/.test(d.format || "") ? "That campaign is for another game." : "That isn't a campaign file for this game.");
        if (cpCount(c) && !confirm(`Replace this browser's campaign${c.name ? ` (${c.name})` : ""} with the file's?`)) return;
        const before = shareOf(); c = cpClean(d); editing = null; draft = null; store(shareOf() !== before); say(`Campaign loaded${c.name ? `: ${c.name}` : ""}.`);
      } catch (err) { say(err.message && !/JSON/.test(err.message) ? err.message : "That file couldn't be read.", true); }
      finally { t.value = ""; }
    });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const kind = b.dataset.cpnew || b.dataset.cproll || b.dataset.cpedit || b.dataset.cpshare || b.dataset.cpdel || b.dataset.cpup, id = b.dataset.id;
      if (b.matches("[data-cprelock]")) { const x = c.arc.find((y) => y.id === b.dataset.cprelock); if (x) { x.unlocked = false; store(x.shared); check(); } return; }
      if (b.matches("[data-cpexport]")) { api.saveText(JSON.stringify({ format: PACK.id + "-campaign", version: 1, ...c }, null, 1), `${c.name || PACK.terms.title + " campaign"}.json`, say); return; }
      if (b.matches("[data-cpclear]")) { if (confirm("Start a new campaign? This browser's campaign is cleared (save it to a file first to keep it).")) { const before = shareOf(); c = cpClean(null); editing = null; draft = null; store(shareOf() !== before); } return; }
      if (b.matches("[data-cprollpremise]")) { const t = root.querySelector('[data-cpform="overview"] [name=premise]'); if (t) { t.value = cpRollPremise(PACK); t.focus(); } return; }
      if (b.matches("[data-cpcancel]")) { editing = null; draft = null; render(); return; }
      if (b.matches("[data-cpnew]")) { editing = [kind, "new"]; draft = null; render(); focusForm(kind); return; }
      if (b.matches("[data-cproll]")) {
        const keep = editing && editing[0] === kind ? editing[1] : "new", shared = draft ? draft.shared : false;
        editing = [kind, keep]; draft = { ...cpRoll(PACK, kind, c), shared, ...(keep !== "new" ? { status: (c[kind].find((x) => x.id === keep) || {}).status } : {}) };
        render(); focusForm(kind); return;
      }
      if (b.matches("[data-cpedit]")) { editing = [kind, id]; draft = null; render(); focusForm(kind); return; }
      if (b.matches("[data-cpshare]")) { const x = c[kind].find((y) => y.id === id); if (x) { x.shared = !x.shared; store(true); say(x.shared ? "Shared with the players." : "No longer shared."); } return; }
      if (b.matches("[data-cpup]")) { const i = c[kind].findIndex((y) => y.id === id); if (i > 0) { [c[kind][i - 1], c[kind][i]] = [c[kind][i], c[kind][i - 1]]; store(c[kind][i].shared || c[kind][i - 1].shared); } return; }
      if (b.matches("[data-cpdel]")) {
        const x = c[kind].find((y) => y.id === id); if (!x) return;
        if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
        c[kind] = c[kind].filter((y) => y.id !== id); if (editing && editing[1] === id) { editing = null; draft = null; } store(x.shared); say(`${x[F[kind][0][0]]} deleted.`);
      }
    });
  }
  /** Fire any trigger the group's cards now meet: the step unlocks for good, and the GM is told what happens. */
  function check() {
    if (!TRIGGERS) { if (!editing) render(); return; }
    const cards = groupCards(), fired = c.arc.filter((x) => !x.unlocked && cpHasTrigger(x) && cpTrigger(x, cards).met);
    if (!fired.length) { if (!editing) render(); return; } // no re-render under a form being filled in
    for (const x of fired) x.unlocked = true;
    store(fired.some((x) => x.shared));
    for (const x of fired) say(`Unlocked: ${x.title}.${x.unlockText ? " " + x.unlockText : ""}`);
  }
  function focusForm(kind) { const el = root && root.querySelector(`[data-cpform="${kind}"] input, [data-cpform="${kind}"] textarea`); if (el) el.focus(); }
  check();
  return {
    snapshot: () => cpPublic(c),
    check,
    /** The GM's shared campaign, from the shared table (players only). */
    receive: (raw) => {
      const p = cpCleanPublic(raw);
      if (JSON.stringify(p) === JSON.stringify(received)) return;
      received = p; try { p ? localStorage.setItem(cpSharedKey(PACK), JSON.stringify(p)) : localStorage.removeItem(cpSharedKey(PACK)); } catch {}
      render();
    },
  };
}
