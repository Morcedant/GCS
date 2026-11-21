// Build the game into one page: dist/index.html, every module inlined in dependency order.
//   node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ORDER = ["hex", "data", "peoples", "galaxy", "game", "orders", "crisis", "wilds", "traders", "sectors", "events", "envoys", "ai", "ui"];
const here = new URL(".", import.meta.url);
const strip = (src) => src
  .replace(/^import [^;]+;\s*$/gm, "")        // the modules share one scope once inlined
  .replace(/^export \{[^}]*\};\s*$/gm, "")
  .replace(/^export (?=(async )?function|const|let|class)/gm, "");
// A build stamp, shown on the new-game screen and in the menu, so it's plain which version a browser has.
const BUILD_STAMP = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
// The modules share one scope once inlined: two top-level functions or constants with one name would silently replace
// each other (the later wins), so a clash stops the build.
{
  const seen = {}, clash = [];
  for (const m of ORDER) for (const x of readFileSync(new URL(`src/${m}.js`, here), "utf8").matchAll(/^(?:export )?(?:async )?(?:function\s+|const\s+|let\s+|class\s+)([A-Za-z_$][\w$]*)/gm)) {
    if (seen[x[1]] && seen[x[1]] !== m) clash.push(`${x[1]} (${seen[x[1]]}.js and ${m}.js)`); else seen[x[1]] = m;
  }
  if (clash.length) { console.error("Name clash between modules: " + clash.join(", ")); process.exit(1); }
}
const body = `const BUILD = ${JSON.stringify(BUILD_STAMP)};\n` + ORDER.map((m) => `// ---- ${m}.js ----\n` + strip(readFileSync(new URL(`src/${m}.js`, here), "utf8"))).join("\n");
// The music comes from the shared table server, if one is deployed (its address in table-server/server-url.txt).
let musicServer = ""; try { musicServer = readFileSync(new URL("../legend-dynamics/table-server/server-url.txt", here), "utf8").trim(); } catch {}
if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(musicServer)) musicServer = "";
const page = readFileSync(new URL("index.html", here), "utf8").replace("/* APP */", () => `(() => {\n"use strict";\n${body.replace("__MUSIC_SERVER__", () => musicServer).replace(/<\//g, "<\\/")}\n})();`);
mkdirSync(new URL("dist/", here), { recursive: true });
writeFileSync(new URL("dist/index.html", here), page);
// A standalone copy with its own document skeleton, for a website or opening from disk.
writeFileSync(new URL("dist/play.html", here), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${page}\n</body></html>\n`);
console.log(`wrote dist/index.html (${Math.round(page.length / 1024)} KB)`);
await import("./tokens.mjs");     // the printable ship tokens, from the same outlines
await import("./strategy.mjs");   // the strategy guide, from the same data
await import("./peoples.mjs");    // the peoples: tokens, portraits and traits
