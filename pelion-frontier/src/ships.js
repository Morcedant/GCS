// Ship outlines, pointing right (+x), in a box from −12 to 12. SVG path data, usable on a canvas (Path2D) or in an <svg>.
export const SHIP_SHAPES = {
  // A Heavy Cruiser: saucer, neck, secondary hull, two nacelles on pylons.
  cruiser: "M11 0 A5.6 5.6 0 1 1 -0.2 0 A5.6 5.6 0 1 1 11 0 Z M1.2 -0.9 L-1 -1.2 L-1 1.2 L1.2 0.9 Z M-1 -1.9 Q-8.5 -2.3 -8.5 0 Q-8.5 2.3 -1 1.9 Z M-1.5 -8 L-12 -8 Q-12.6 -7 -12 -6 L-1.5 -6 Q-0.6 -7 -1.5 -8 Z M-1.5 8 L-12 8 Q-12.6 7 -12 6 L-1.5 6 Q-0.6 7 -1.5 8 Z M-4 -1.6 L-6.5 -6 M-6 -1.4 L-8.5 -6 M-4 1.6 L-6.5 6 M-6 1.4 L-8.5 6",
  // An escort: a smaller saucer with its nacelles slung close, no secondary hull.
  escort: "M10 0 A4.8 4.8 0 1 1 0.4 0 A4.8 4.8 0 1 1 10 0 Z M0.6 -2 L-3 -2 L-3 2 L0.6 2 Z M-1 -5.6 L-10 -5.6 Q-10.6 -4.7 -10 -3.8 L-1 -3.8 Q-0.3 -4.7 -1 -5.6 Z M-1 5.6 L-10 5.6 Q-10.6 4.7 -10 3.8 L-1 3.8 Q-0.3 4.7 -1 5.6 Z M-2.5 -2 L-3.5 -3.8 M-2.5 2 L-3.5 3.8",
  // A science vessel: a small saucer on a long boom, with a sensor pod and a pair of short nacelles.
  science: "M10.5 0 A4 4 0 1 1 2.5 0 A4 4 0 1 1 10.5 0 Z M2.6 -1 L-7 -1 L-7 1 L2.6 1 Z M-7 0 A2.6 2.6 0 1 1 -12.2 0 A2.6 2.6 0 1 1 -7 0 Z M-3 -1 L-5 -4.6 L-11 -4.6 L-11 -3.2 L-5.6 -3.2 M-3 1 L-5 4.6 L-11 4.6 L-11 3.2 L-5.6 3.2",
  // A Klingon battle cruiser: a command pod on a long neck, and swept wings carrying the nacelles.
  kbc: "M12 0 A2.4 2.4 0 1 1 7.2 0 A2.4 2.4 0 1 1 12 0 Z M7.3 -0.7 L2 -0.7 L2 0.7 L7.3 0.7 M2 -1.2 L-1 -2.4 L-7 -9 L-9.4 -9 L-7.2 -2.6 L-10.5 -1.4 L-10.5 1.4 L-7.2 2.6 L-9.4 9 L-7 9 L-1 2.4 L2 1.2 Z M-6.5 -10 L-12 -10 L-12 -8 L-6.5 -8 Z M-6.5 10 L-12 10 L-12 8 L-6.5 8 Z",
  // A Klingon bird-of-prey: a beaked head on a short neck, and broad wings swept forward.
  kbop: "M12 0 L8.5 -1.8 L5 -1.2 L2.5 -2.2 L1.5 -3 L5 -11.5 L2.8 -12 L-3 -4 L-8.5 -2.6 L-10 0 L-8.5 2.6 L-3 4 L2.8 12 L5 11.5 L1.5 3 L2.5 2.2 L5 1.2 L8.5 1.8 Z M-3 -4 L-4.5 -2 L-4.5 2 L-3 4",
  // A Romulan bird-of-prey: a broad, rounded hull between two nacelles, and a pointed prow.
  rbop: "M11 0 L6.5 -2.6 Q1 -6 -6 -5 Q-9 -2.5 -9 0 Q-9 2.5 -6 5 Q1 6 6.5 2.6 Z M3 -6.4 L-11.5 -8.4 L-11.5 -6.6 L1 -4.8 M3 6.4 L-11.5 8.4 L-11.5 6.6 L1 4.8 M-2 -3 Q-4.5 0 -2 3 M-2 0 L4 0",
  // An Orion raider: a lean arrowhead with swept fins, built for speed.
  orion: "M12 0 L1 -2.4 L-5 -8.5 L-7 -8.5 L-4.5 -2.6 L-10.5 -1.2 L-10.5 1.2 L-4.5 2.6 L-7 8.5 L-5 8.5 L1 2.4 Z M3 -1 L-3 -1 M3 1 L-3 1",
  // An Orion pirate base: a ring station on spokes.
  // A Federation listening post: a small station with a sensor dish, watching the Neutral Zone.
  post: "M-7 -2.2 L7 -2.2 L7 2.2 L-7 2.2 Z M-2.2 -6 L2.2 -6 L2.2 6 L-2.2 6 Z M-9.5 -3.5 L-7 -2.2 L-7 2.2 L-9.5 3.5 Z M9.5 -3.5 L7 -2.2 L7 2.2 L9.5 3.5 Z M0 -6 L0 -8.5 M-4 -9.5 Q0 -12.5 4 -9.5 Z",
  orionBase: "M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z M7 0 A7 7 0 1 1 -7 0 A7 7 0 1 1 7 0 Z M3 0 A3 3 0 1 1 -3 0 A3 3 0 1 1 3 0 Z M3 0 L7 0 M-3 0 L-7 0 M0 3 L0 7 M0 -3 L0 -7",
};
export const SHIP_LABELS = { cruiser: "USS Pelion (Heavy Cruiser)", escort: "Escort", science: "Science vessel", kbc: "Klingon battle cruiser", kbop: "Klingon bird-of-prey", rbop: "Romulan bird-of-prey", orion: "Orion raider", orionBase: "Orion pirate base", post: "Federation listening post" };
