/**
 * Overlay colours for shop cards.
 *
 * Derived from the shop id rather than randomised, so a shop keeps the same
 * colour on every render, every device and every session — the colour becomes
 * a weak recognition cue for regulars instead of visual noise.
 *
 * All four are dark enough for white text to clear WCAG AA, and sit next to
 * the brand orange without fighting it on the ivory background.
 */
const ACCENTS = [
  { bg: "#c2410c", soft: "#fff1e7" }, // brand orange, deepened
  { bg: "#7a2f62", soft: "#f9edf4" }, // plum
  { bg: "#0f766e", soft: "#e7f6f4" }, // teal
  { bg: "#78350f", soft: "#f7efe6" }, // warm brown
] as const;

export type Accent = (typeof ACCENTS)[number];

export function shopAccent(id: number): Accent {
  return ACCENTS[Math.abs(id) % ACCENTS.length];
}
