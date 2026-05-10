// ============================================================
// Sweetart — Aesthetic quiz scoring.
//
// Given the user's chosen cards across N rounds, aggregate
// axis scores and pick a poetic label that best describes
// the resulting vector. Pure functions, no I/O.
// ============================================================

import {
  type AestheticAxis,
  type AestheticCard,
  type AestheticVector,
} from './aestheticCards';

const AXES: AestheticAxis[] = [
  'warmth',
  'density',
  'era',
  'form',
  'mood',
  'energy',
];

// Aggregate the user's choices into a single vector. Each picked
// card contributes its full vector; we then average and clamp.
export function computeAestheticVector(
  picks: AestheticCard[],
): AestheticVector {
  if (picks.length === 0) {
    return { warmth: 0, density: 0, era: 0, form: 0, mood: 0, energy: 0 };
  }
  const sum: AestheticVector = {
    warmth: 0, density: 0, era: 0, form: 0, mood: 0, energy: 0,
  };
  for (const c of picks) {
    for (const ax of AXES) sum[ax] += c.vector[ax];
  }
  for (const ax of AXES) sum[ax] = clamp(sum[ax] / picks.length, -1, 1);
  return sum;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ============================================================
// Label dictionary. Each label has a target "anchor" vector;
// the user's label is the nearest-neighbor of their aggregate
// vector. Designed so any region of the 6-D space lands on a
// flattering, evocative descriptor.
// ============================================================

type Label = {
  name: string;
  blurb: string;
  anchor: AestheticVector;
};

const LABEL_ANCHORS: Label[] = [
  {
    name: 'Neon Nostalgic',
    blurb: 'You love what feels both modern and lost.',
    anchor: { warmth: -0.1, density: 0.6, era: 0.2, form: 0.0, mood: -0.4, energy: 0.3 },
  },
  {
    name: 'Soft Brutalist',
    blurb: 'Structure and warmth, in the same breath.',
    anchor: { warmth: 0.4, density: -0.5, era: 0.4, form: 0.5, mood: -0.1, energy: -0.3 },
  },
  {
    name: 'Velvet Hermit',
    blurb: 'A rich inner world; you let few people in.',
    anchor: { warmth: 0.5, density: 0.5, era: -0.3, form: 0.0, mood: -0.2, energy: -0.8 },
  },
  {
    name: 'Quiet Maximalist',
    blurb: 'Lush, layered, and never loud about it.',
    anchor: { warmth: 0.4, density: 0.8, era: 0.0, form: 0.2, mood: 0.3, energy: -0.6 },
  },
  {
    name: 'Sun-drunk Romantic',
    blurb: 'Golden hour is your love language.',
    anchor: { warmth: 0.8, density: 0.5, era: 0.0, form: -0.2, mood: 0.7, energy: 0.2 },
  },
  {
    name: 'Wildflower Maximalist',
    blurb: 'More is more, and joy is the point.',
    anchor: { warmth: 0.6, density: 0.9, era: 0.0, form: 0.3, mood: 0.8, energy: 0.7 },
  },
  {
    name: 'Glacial Aesthete',
    blurb: 'Cool, considered, and quietly devastating.',
    anchor: { warmth: -0.7, density: -0.4, era: 0.4, form: 0.4, mood: -0.3, energy: -0.4 },
  },
  {
    name: 'Twilight Wanderer',
    blurb: 'You feel most alive between dusk and dawn.',
    anchor: { warmth: -0.3, density: 0.4, era: 0.3, form: 0.0, mood: -0.6, energy: 0.0 },
  },
  {
    name: 'Heirloom Romantic',
    blurb: 'Old letters, longer poems, slower rooms.',
    anchor: { warmth: 0.5, density: 0.5, era: -0.8, form: -0.3, mood: 0.0, energy: -0.5 },
  },
  {
    name: 'Chrome Dreamer',
    blurb: 'You see the future in the abstract.',
    anchor: { warmth: -0.2, density: 0.4, era: 0.8, form: 0.7, mood: 0.0, energy: 0.0 },
  },
  {
    name: 'Punk Tender',
    blurb: 'Loud on the outside, soft underneath.',
    anchor: { warmth: 0.0, density: 0.6, era: 0.2, form: 0.2, mood: 0.4, energy: 0.8 },
  },
  {
    name: 'Cinema Hermit',
    blurb: 'You frame your life like a long take.',
    anchor: { warmth: -0.2, density: 0.3, era: -0.2, form: -0.4, mood: -0.4, energy: -0.7 },
  },
  {
    name: 'Pastel Brutalist',
    blurb: 'Cotton-candy palette, monolithic intent.',
    anchor: { warmth: 0.5, density: -0.3, era: 0.5, form: 0.6, mood: 0.4, energy: -0.2 },
  },
  {
    name: 'Studio 54 Soul',
    blurb: 'Sequins, soul records, strangers becoming family.',
    anchor: { warmth: 0.5, density: 0.8, era: -0.4, form: 0.2, mood: 0.8, energy: 0.9 },
  },
  {
    name: 'Linen Minimalist',
    blurb: 'Less, slower, warmer.',
    anchor: { warmth: 0.5, density: -0.8, era: -0.1, form: 0.0, mood: 0.2, energy: -0.6 },
  },
  {
    name: 'Ink-stained Cinephile',
    blurb: "Old films, new books, late nights, soft lamps.",
    anchor: { warmth: 0.3, density: 0.5, era: -0.5, form: -0.5, mood: -0.2, energy: -0.6 },
  },
];

function distance(a: AestheticVector, b: AestheticVector): number {
  let sum = 0;
  for (const ax of AXES) sum += (a[ax] - b[ax]) ** 2;
  return Math.sqrt(sum);
}

export type AestheticResult = {
  vector: AestheticVector;
  label: string;
  blurb: string;
};

export function deriveResult(picks: AestheticCard[]): AestheticResult {
  const vector = computeAestheticVector(picks);
  let best: Label = LABEL_ANCHORS[0];
  let bestDist = distance(vector, best.anchor);
  for (let i = 1; i < LABEL_ANCHORS.length; i++) {
    const d = distance(vector, LABEL_ANCHORS[i].anchor);
    if (d < bestDist) {
      bestDist = d;
      best = LABEL_ANCHORS[i];
    }
  }
  return { vector, label: best.name, blurb: best.blurb };
}

// Human-readable axis labels for the result screen's bars.
export const AXIS_POLES: Record<AestheticAxis, [string, string]> = {
  warmth: ['cool', 'warm'],
  density: ['minimal', 'maximal'],
  era: ['vintage', 'contemporary'],
  form: ['figurative', 'abstract'],
  mood: ['melancholic', 'joyful'],
  energy: ['introspective', 'extroverted'],
};
