/**
 * Overlay colours for shop cards.
 *
 * Derived from the shop id rather than randomised, so a shop keeps the same
 * colour on every render, every device and every session — the colour becomes
 * a weak recognition cue for regulars instead of visual noise.
 *
 * All four are muted enough to sit together on warm paper without shouting,
 * and each clears WCAG AA against the white text they carry (measured: 6.4,
 * 8.5, 5.5, 6.7). If you adjust one, re-check it — lightening a swatch to
 * harmonise is exactly what quietly breaks the label on it.
 */
const ACCENTS = [
  { bg: "#0e6b5e", soft: "#e2f1ee" }, // teal — matches the brand
  { bg: "#7c3457", soft: "#f8ecf2" }, // plum
  { bg: "#a8501f", soft: "#fbeade" }, // terracotta
  { bg: "#43606f", soft: "#eaf0f3" }, // slate blue
] as const;

export type Accent = (typeof ACCENTS)[number];

export function shopAccent(id: number): Accent {
  return ACCENTS[Math.abs(id) % ACCENTS.length];
}
