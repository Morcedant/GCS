// The peoples of Fracture Lines: a portrait of each, drawn from the RPG's descriptions (legend-dynamics/packs/
// spaceopera/setting.md), on a hex token in its empire's colour. Used by the game (the people picker, Diplomacy), the
// printable Peoples page (peoples.mjs) and the token sheet. Each portrait is SVG in a 100 × 100 box, head and shoulders.

const SKIN = "#e9eef7", INK = "#0b1020";
/** Inner SVG for each people: they take the empire's colour (c) for clothing and accents. */
const PORTRAIT = {
  // Humans: adaptable, restless. A spacer in a flight jacket, hair tied back, a headset.
  concord: (c) => `
    <path d="M18 100 Q20 76 50 72 Q80 76 82 100 Z" fill="${c}"/><path d="M38 74 L50 88 L62 74" fill="none" stroke="${INK}" stroke-width="2" opacity=".5"/>
    <rect x="43" y="60" width="14" height="14" rx="4" fill="#d9b59a"/>
    <ellipse cx="50" cy="45" rx="17" ry="21" fill="#e2bf9f"/>
    <path d="M32 44 Q30 22 50 21 Q71 22 68 44 Q66 32 56 30 Q44 33 36 30 Q33 36 32 44 Z" fill="#4a3426"/>
    <path d="M66 36 Q76 40 72 54" fill="none" stroke="#4a3426" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="43" cy="46" rx="2.6" ry="2" fill="${INK}"/><ellipse cx="57" cy="46" rx="2.6" ry="2" fill="${INK}"/>
    <path d="M39 41 L46 40 M54 40 L61 41" stroke="#4a3426" stroke-width="1.6"/>
    <path d="M50 48 L48 55 L51 55" fill="none" stroke="#b08a6c" stroke-width="1.4"/><path d="M44 60 Q50 63 56 60" fill="none" stroke="#9c5a4a" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M33 45 Q31 56 38 58" fill="none" stroke="#2a2f3a" stroke-width="2.2"/><circle cx="39" cy="58" r="2.2" fill="${c}"/>`,
  // Tessan: large, scaled, long-lived. A heavy reptilian head, a long jaw, a crest, hooded eyes, robes of office.
  tessan: (c) => `
    <path d="M12 100 Q16 70 50 66 Q84 70 88 100 Z" fill="${c}"/><path d="M30 100 L40 70 M70 100 L60 70" stroke="#f3dfa6" stroke-width="2.5" opacity=".7"/>
    <path d="M28 58 Q24 30 44 22 Q64 16 72 30 L90 46 Q92 54 86 57 L72 60 Q66 70 50 70 Q34 70 28 58 Z" fill="#8f9a6a"/>
    <path d="M70 56 L88 52" stroke="#4f5a34" stroke-width="1.6" stroke-linecap="round"/><circle cx="86" cy="47" r="1.3" fill="${INK}"/>
    <path d="M46 22 Q52 8 64 10 Q58 16 60 24 Q66 14 76 18 Q68 24 70 32" fill="#6f7a4c"/>
    <path d="M44 40 Q52 34 60 40 Q52 44 44 40 Z" fill="#d8b23a"/><path d="M48 40 L56 40" stroke="${INK}" stroke-width="2.2"/>
    <path d="M42 37 Q52 30 62 37" fill="none" stroke="#4f5a34" stroke-width="2.4"/>
    <g fill="none" stroke="#5f6a3e" stroke-width="1.2" opacity=".8"><path d="M34 50 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0"/><path d="M36 58 q3 -3 6 0 q3 -3 6 0"/><path d="M40 30 q3 -3 6 0 q3 -3 6 0"/></g>
`,
  // Kel: chitin-plated hive beings. Compound eyes, plated head, mandibles, feelers.
  kel: (c) => `
    <path d="M14 100 Q18 74 50 70 Q82 74 86 100 Z" fill="${c}"/><path d="M26 86 Q50 78 74 86 M22 96 Q50 88 78 96" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".35"/>
    <path d="M34 26 Q24 10 18 6 M66 26 Q76 10 82 6" fill="none" stroke="#5a4a32" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 46 Q30 22 50 20 Q70 22 70 46 Q70 62 58 70 L42 70 Q30 62 30 46 Z" fill="#7a6a4a"/>
    <path d="M50 20 L50 70 M34 34 Q50 28 66 34 M32 50 Q50 46 68 50" fill="none" stroke="#5a4a32" stroke-width="1.6"/>
    <ellipse cx="38" cy="42" rx="8" ry="10" fill="#2c3a2a"/><ellipse cx="62" cy="42" rx="8" ry="10" fill="#2c3a2a"/>
    <g fill="#6fbf7a" opacity=".55"><circle cx="35" cy="38" r="1.6"/><circle cx="39" cy="42" r="1.6"/><circle cx="36" cy="46" r="1.6"/><circle cx="41" cy="37" r="1.4"/><circle cx="59" cy="38" r="1.6"/><circle cx="63" cy="42" r="1.6"/><circle cx="60" cy="46" r="1.6"/><circle cx="65" cy="37" r="1.4"/></g>
    <path d="M42 64 Q36 72 40 78 Q44 72 47 68 M58 64 Q64 72 60 78 Q56 72 53 68" fill="#5a4a32"/>`,
  // The Hegemony: the Ozhvek, massive and radial, sensory clusters all around, mineral plates; imperial gold.
  hegemony: (c) => `
    <path d="M10 100 Q14 66 50 62 Q86 66 90 100 Z" fill="${c}"/><path d="M50 64 L50 100 M30 70 L36 100 M70 70 L64 100" stroke="#e8c45a" stroke-width="2" opacity=".6"/>
    <path d="M24 52 Q22 24 50 18 Q78 24 76 52 Q72 66 50 68 Q28 66 24 52 Z" fill="#7c7f8c"/>
    <g fill="#5f6270"><path d="M30 30 L40 24 L42 34 Z"/><path d="M58 24 L70 30 L58 34 Z"/><path d="M26 46 L34 40 L36 50 Z"/><path d="M74 46 L66 40 L64 50 Z"/><path d="M42 54 L50 48 L58 54 L50 60 Z"/></g>
    <g fill="#f0c050"><circle cx="38" cy="38" r="3.4"/><circle cx="50" cy="32" r="3.6"/><circle cx="62" cy="38" r="3.4"/><circle cx="30" cy="54" r="2.6"/><circle cx="70" cy="54" r="2.6"/></g>
    <g fill="${INK}"><circle cx="38" cy="38" r="1.4"/><circle cx="50" cy="32" r="1.5"/><circle cx="62" cy="38" r="1.4"/><circle cx="30" cy="54" r="1.1"/><circle cx="70" cy="54" r="1.1"/></g>
    <path d="M40 14 L50 6 L60 14 L56 18 L50 12 L44 18 Z" fill="#e8c45a"/>`,
  // Vael: long, light, low-gravity beings who live aboard living ships. Elongated head, wide dark eyes, a fin-like crest.
  vael: (c) => `
    <path d="M24 100 Q26 78 50 74 Q74 78 76 100 Z" fill="${c}"/><path d="M34 100 Q38 84 50 80 Q62 84 66 100" fill="none" stroke="#e6d8ff" stroke-width="1.6" opacity=".6"/>
    <path d="M45 62 L44 76 L56 76 L55 62 Z" fill="#b9c8d8"/>
    <path d="M36 46 Q34 14 50 6 Q66 14 64 46 Q62 64 50 66 Q38 64 36 46 Z" fill="#c4d2e2"/>
    <path d="M50 6 Q56 -2 66 0 Q58 6 58 14" fill="#9fb4ca"/>
    <path d="M38 40 Q44 34 48 42 Q44 48 38 40 Z M62 40 Q56 34 52 42 Q56 48 62 40 Z" fill="${INK}"/>
    <circle cx="42" cy="40" r="1.2" fill="#9fe0ff"/><circle cx="58" cy="40" r="1.2" fill="#9fe0ff"/>
    <path d="M46 56 Q50 58 54 56" fill="none" stroke="#7d8ea2" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M40 24 Q50 20 60 24" fill="none" stroke="#9fb4ca" stroke-width="1.4"/>`,
  // Mirrun: smooth-skinned amphibians, famous for their humor. Big round eyes, a wide grin, gill-frills, wet sheen.
  mirrun: (c) => `
    <path d="M16 100 Q20 76 50 72 Q80 76 84 100 Z" fill="${c}"/><path d="M28 92 Q38 86 46 92 Q54 86 62 92 Q70 86 76 92" fill="none" stroke="#bff2ea" stroke-width="1.8" opacity=".6"/>
    <path d="M24 46 Q22 24 50 22 Q78 24 76 46 Q76 66 50 70 Q24 66 24 46 Z" fill="#5fb7c4"/>
    <path d="M24 40 Q12 36 8 44 Q16 46 14 54 Q22 52 25 50 Z M76 40 Q88 36 92 44 Q84 46 86 54 Q78 52 75 50 Z" fill="#3f97a6"/>
    <circle cx="38" cy="40" r="8" fill="#f2f7f9"/><circle cx="62" cy="40" r="8" fill="#f2f7f9"/>
    <circle cx="39" cy="41" r="4.4" fill="${INK}"/><circle cx="61" cy="41" r="4.4" fill="${INK}"/><circle cx="40.5" cy="39.5" r="1.4" fill="#fff"/><circle cx="62.5" cy="39.5" r="1.4" fill="#fff"/>
    <path d="M34 56 Q50 66 66 56" fill="none" stroke="#1f5560" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 60 l3 -2 M28 56 l3 -2 M70 60 l-3 -2 M72 56 l-3 -2" stroke="#2f7f8c" stroke-width="1.4"/>
    <path d="M36 28 Q46 24 54 26" fill="none" stroke="#bff2ea" stroke-width="2" opacity=".7" stroke-linecap="round"/>`,
  // Ylith: hollow-boned, feathered gliders with broad wing membranes and extraordinary eyes. A crest, a hooked beak.
  ylith: (c) => `
    <path d="M2 74 Q20 56 34 70 L30 100 L2 100 Z M98 74 Q80 56 66 70 L70 100 L98 100 Z" fill="#a98fc0" opacity=".9"/>
    <path d="M4 76 L24 66 M8 84 L28 70 M92 84 L72 70 M96 76 L76 66" stroke="#7d659a" stroke-width="1.4"/>
    <path d="M24 100 Q26 78 50 74 Q74 78 76 100 Z" fill="${c}"/>
    <path d="M34 48 Q32 24 50 20 Q68 24 66 48 Q64 64 50 68 Q36 64 34 48 Z" fill="#e8dcc8"/>
    <path d="M44 22 Q40 6 30 2 Q40 12 38 22 M50 20 Q50 2 44 -2 Q52 8 54 20 M56 22 Q62 6 72 4 Q64 12 62 24" fill="#b07a3a"/>
    <path d="M36 32 Q50 26 64 32 Q62 38 50 36 Q38 38 36 32 Z" fill="#c9905a" opacity=".6"/>
    <circle cx="42" cy="42" r="5.4" fill="#f7c948"/><circle cx="58" cy="42" r="5.4" fill="#f7c948"/><circle cx="42" cy="42" r="2.6" fill="${INK}"/><circle cx="58" cy="42" r="2.6" fill="${INK}"/>
    <path d="M46 48 L54 48 L50 62 Q47 56 46 48 Z" fill="#c8892e"/><path d="M50 56 L50 62" stroke="#8a5a1a" stroke-width="1"/>`,
  // Zhaq: flexible, tripedal, segmented limbs and three independently focusing eyes; a long dormancy behind them.
  zhaq: (c) => `
    <path d="M14 100 Q18 74 50 70 Q82 74 86 100 Z" fill="${c}"/><path d="M50 72 L50 100" stroke="#ffe2c4" stroke-width="2.4" opacity=".6"/><path d="M40 84 L50 78 L60 84" fill="none" stroke="#ffe2c4" stroke-width="2" opacity=".6"/>
    <path d="M44 58 Q42 66 44 72 L56 72 Q58 66 56 58 Z" fill="#8c9a7c"/><path d="M43 62 L57 62 M43 67 L57 67" stroke="#6c7a5c" stroke-width="1.2"/>
    <path d="M30 40 Q30 18 50 16 Q70 18 70 40 Q70 56 50 60 Q30 56 30 40 Z" fill="#a3b08f"/>
    <path d="M34 30 Q50 24 66 30 M32 44 Q50 40 68 44" fill="none" stroke="#7f8c6c" stroke-width="1.4"/>
    <circle cx="50" cy="28" r="5" fill="#f4f1dc"/><circle cx="51" cy="27" r="2.4" fill="${INK}"/>
    <circle cx="39" cy="40" r="5" fill="#f4f1dc"/><circle cx="37.6" cy="41" r="2.4" fill="${INK}"/>
    <circle cx="61" cy="40" r="5" fill="#f4f1dc"/><circle cx="62.4" cy="39" r="2.4" fill="${INK}"/>
    <path d="M44 52 Q50 55 56 52" fill="none" stroke="#5c6a4c" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M28 70 Q22 82 26 96 M72 70 Q78 82 74 96" fill="none" stroke="#7f8c6c" stroke-width="2.4" stroke-linecap="round"/>`,
};
/** A people's portrait as an <svg> (size in px), or "" if there's none. */
export function portraitSVG(id, color, size = 64) {
  const p = PORTRAIT[id]; if (!p) return "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${p(color)}</svg>`;
}
const HEX = "50,2 92,26 92,74 50,98 8,74 8,26";
/** A people's hex token: the portrait inside a hex in the empire's colour, its rim and (optionally) its name below. */
export function peopleToken(id, color, size = 96, label = "") {
  const p = PORTRAIT[id]; if (!p) return "";
  const uid = "pt-" + id + "-" + size;
  return `<svg width="${size}" height="${Math.round(size * (label ? 1.18 : 1))}" viewBox="0 0 100 ${label ? 118 : 100}" role="img" aria-label="${label || id}">
    <defs><clipPath id="${uid}"><polygon points="${HEX}"/></clipPath><radialGradient id="${uid}-g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="#0b1020"/></radialGradient></defs>
    <polygon points="${HEX}" fill="url(#${uid}-g)"/>
    <g clip-path="url(#${uid})"><g transform="translate(6 8) scale(.88)">${p(color)}</g></g>
    <polygon points="${HEX}" fill="none" stroke="${color}" stroke-width="4"/><polygon points="${HEX}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1" transform="translate(50 50) scale(.9) translate(-50 -50)"/>
    ${label ? `<text x="50" y="114" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="currentColor">${label}</text>` : ""}
  </svg>`;
}
// Painted portraits, if any: square images in the music bucket's peoples/ folder (R2, served cached from the public
// music address), named after the empire: peoples/mirrun.webp, .png or .jpg. A token shows its drawing, and the
// painting over it once it loads; with no painting it stays a drawing (each empire is tried once per page).
export const ART_BASE = "https://music.legenddynamicsrpg.com/peoples";
const ART_EXT = ["webp", "png", "jpg"];
const HEX_CLIP = "polygon(50% 6%, 88% 28%, 88% 72%, 50% 94%, 12% 72%, 12% 28%)";
/** A token with the painted portrait layered on (in a page's HTML): the drawing until a painting loads. */
export function peopleArt(id, color, size = 96) {
  const tok = peopleToken(id, color, size);
  if (!tok) return "";
  const missing = typeof window !== "undefined" && window.__ldArtMissing && window.__ldArtMissing[id];
  if (missing) return tok;
  const onerr = "var x=this.dataset.ext.split(',');if(x.length&&x[0]){this.dataset.ext=x.slice(1).join(',');this.src=this.dataset.base+'.'+x[0];}else{(window.__ldArtMissing=window.__ldArtMissing||{})[this.dataset.id]=1;this.remove();}";
  return `<span class="ld-art" style="position:relative;display:inline-block;line-height:0;width:${size}px;height:${size}px">${tok}<img alt="" loading="lazy" decoding="async" data-id="${id}" data-base="${ART_BASE}/${id}" data-ext="${ART_EXT.slice(1).join(",")}" src="${ART_BASE}/${id}.${ART_EXT[0]}" onerror="${onerr}" style="position:absolute;inset:0;width:${size}px;height:${size}px;object-fit:cover;clip-path:${HEX_CLIP}"></span>`;
}
/** What each people looks like, in words (from the RPG), for the Peoples page and the picker. */
export const LOOKS = {
  concord: "Humans: adaptable and restless. Three centuries in the corridors have scattered them across dozens of colonies and competing governments.",
  tessan: "Large, scaled and exceptionally long-lived, with heavy jaws and hooded eyes. Their dynasties hold debts older than human history.",
  kel: "Chitin-plated hive beings with compound eyes and mandibles. They think as one, and isolation distresses them.",
  hegemony: "The Ozhvek: massive, radially symmetrical, six-limbed, with mineralized plates and sensory clusters all around. With them stand the Dresh, the four-armed, heavily armored soldiers of a high-gravity world.",
  vael: "Long-bodied, lightly built, four-limbed, from a low-gravity world. They live aboard ships that are alive.",
  mirrun: "Smooth-skinned amphibians from a deep-ocean world, with large eyes and pressure-sensitive skin. Agile swimmers, and famous for their humor.",
  ylith: "Hollow-boned, feathered gliders with broad wing-membranes and extraordinary eyes. Confined spaces are profoundly uncomfortable for them.",
  zhaq: "Flexible, tripedal beings with segmented limbs and three independently focusing eyes, able to sleep through hard times for years.",
};
/** Prompts for painted portraits (for an image generator), if painted art should replace the drawings. */
export const ART_PROMPTS = {
  concord: "Portrait of a human starship captain in a weathered flight jacket, hair tied back, headset, hopeful but tired expression, science fiction, painterly, deep blue tones, dark starfield background, head and shoulders",
  tessan: "Portrait of a large, scaled, reptilian alien merchant prince, heavy jaw, hooded golden eyes, bony crest, rich ceremonial robes with gold trim, ancient and calculating, science fiction, painterly, warm gold tones, head and shoulders",
  kel: "Portrait of an insectoid hive alien with chitin plates, large green-tinted compound eyes, small mandibles and long feelers, analytical and calm, science fiction, painterly, olive green tones, head and shoulders",
  hegemony: "Portrait of a massive radially symmetrical alien emperor with mineralized grey skin plates and a ring of golden sensory eyes around its head, imperial crown, menacing and ancient, science fiction, painterly, deep red and gold tones, head and shoulders",
  vael: "Portrait of a tall, slender, delicate alien with an elongated pale head, large dark almond eyes and a fin-like crest, living spaceship interior behind, serene, science fiction, painterly, violet tones, head and shoulders",
  mirrun: "Portrait of a smooth-skinned amphibian alien with wet teal skin, large round eyes, a wide friendly grin and gill frills, playful and clever, underwater city glow behind, science fiction, painterly, teal tones, head and shoulders",
  ylith: "Portrait of a feathered avian alien with broad wing membranes, a hooked beak, huge golden raptor eyes and a crest of feathers, proud and far-seeing, high-altitude sky city behind, science fiction, painterly, lavender tones, head and shoulders",
  zhaq: "Portrait of a tripedal alien with a flexible segmented neck, pale green-grey skin and three independently focused eyes, stubborn and defiant, frontier fortress behind, science fiction, painterly, burnt orange tones, head and shoulders",
};
