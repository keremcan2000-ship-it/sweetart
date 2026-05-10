// ============================================================
// Sweetart — Aesthetic quiz card dataset.
//
// Each card is a tiny "vibe" the user can choose between in a
// binary forced-choice quiz. Picks aggregate into a 6-axis
// aesthetic vector that drives the user's profile label and
// later powers a soft "shared aesthetic" matching signal.
//
// Axis convention (each in [-1, 1]):
//   warmth   : -1 cool        ↔  +1 warm
//   density  : -1 minimal     ↔  +1 maximal
//   era      : -1 vintage     ↔  +1 contemporary
//   form     : -1 figurative  ↔  +1 abstract
//   mood     : -1 melancholic ↔  +1 joyful
//   energy   : -1 introspective ↔ +1 extroverted
//
// Color scheme: each card carries a 2-stop gradient + foreground
// text color. Designed so cards feel like little posters, not
// generic chat bubbles. Background should reflect the vibe.
// ============================================================

export type AestheticAxis =
  | 'warmth'
  | 'density'
  | 'era'
  | 'form'
  | 'mood'
  | 'energy';

export type AestheticVector = Record<AestheticAxis, number>;

export type AestheticCard = {
  id: string;
  emoji: string;
  text: string;
  tags: [string, string]; // 2 short word tags shown on the card
  vector: AestheticVector;
  // Visual: linear gradient 160deg from `from` → `to`.
  from: string;
  to: string;
  fg: string; // foreground / text color
};

// Helper to construct a vector with defaults of 0.
const v = (
  partial: Partial<AestheticVector>,
): AestheticVector => ({
  warmth: 0,
  density: 0,
  era: 0,
  form: 0,
  mood: 0,
  energy: 0,
  ...partial,
});

export const AESTHETIC_CARDS: AestheticCard[] = [
  // ---------- COOL · MELANCHOLIC · CONTEMPORARY ----------
  {
    id: 'wkw_hk',
    emoji: '🌃',
    text: "Wong Kar-wai's Hong Kong, neon bleeding into 3am rain",
    tags: ['cool', 'melancholic'],
    vector: v({ warmth: -0.7, density: 0.6, era: 0.5, mood: -0.6, energy: -0.4 }),
    from: '#1a2438',
    to: '#6b3a5e',
    fg: '#fce8d8',
  },
  {
    id: 'tokyo_rain',
    emoji: '☔',
    text: 'Tokyo, last train, fluorescent puddles reflecting empty platforms',
    tags: ['cool', 'quiet'],
    vector: v({ warmth: -0.6, density: -0.4, era: 0.6, mood: -0.5, energy: -0.6 }),
    from: '#0f2231',
    to: '#3d5775',
    fg: '#dde7f2',
  },
  {
    id: 'brutalist_fog',
    emoji: '🏙️',
    text: 'Brutalist concrete tower, fog clinging to the top floors',
    tags: ['cool', 'severe'],
    vector: v({ warmth: -0.5, density: -0.3, era: 0.3, form: 0.4, mood: -0.4, energy: -0.5 }),
    from: '#2c2f33',
    to: '#5a6068',
    fg: '#e6e8ea',
  },
  {
    id: 'lana_2am',
    emoji: '🌙',
    text: 'A Lana Del Rey song you only play at 2am, alone',
    tags: ['nocturnal', 'tender'],
    vector: v({ warmth: -0.2, density: 0.4, era: 0.4, mood: -0.7, energy: -0.7 }),
    from: '#1f1a2e',
    to: '#5a3a52',
    fg: '#f0d8e0',
  },
  {
    id: 'empty_apt_blue',
    emoji: '🪟',
    text: 'An empty apartment, blue hour, books stacked on the floor',
    tags: ['quiet', 'still'],
    vector: v({ warmth: -0.3, density: -0.6, era: 0.2, mood: -0.4, energy: -0.7 }),
    from: '#23344a',
    to: '#7891a8',
    fg: '#f0eee5',
  },

  // ---------- WARM · JOYFUL · CONTEMPORARY ----------
  {
    id: 'sun_kitchen',
    emoji: '🌸',
    text: 'A sun-warmed kitchen, peonies, espresso steaming on tile',
    tags: ['warm', 'tender'],
    vector: v({ warmth: 0.8, density: 0.5, era: 0.3, mood: 0.7, energy: -0.2 }),
    from: '#fbe4cf',
    to: '#e8554f',
    fg: '#4a1b0c',
  },
  {
    id: 'brunch_friends',
    emoji: '🥐',
    text: 'Saturday brunch with friends, jam-stained fingers, no rush',
    tags: ['warm', 'social'],
    vector: v({ warmth: 0.7, density: 0.6, era: 0.4, mood: 0.8, energy: 0.6 }),
    from: '#fceeda',
    to: '#f4a87c',
    fg: '#5a2410',
  },
  {
    id: 'peach_bedroom',
    emoji: '🍑',
    text: 'A peach-colored bedroom, linen curtains breathing in the breeze',
    tags: ['soft', 'tender'],
    vector: v({ warmth: 0.6, density: -0.3, era: 0.2, form: 0.2, mood: 0.5, energy: -0.4 }),
    from: '#fde4d0',
    to: '#e9a899',
    fg: '#5a2a1c',
  },
  {
    id: 'sunflower_french_pop',
    emoji: '🌻',
    text: "Sunflower fields, cassette deck playing a French pop tape",
    tags: ['warm', 'nostalgic'],
    vector: v({ warmth: 0.7, density: 0.4, era: -0.5, mood: 0.7, energy: 0.3 }),
    from: '#f5d96b',
    to: '#d97a4c',
    fg: '#3d1a0a',
  },
  {
    id: 'beach_karaoke',
    emoji: '🌺',
    text: 'Hawaiian shirt, beachside karaoke, no one keeping count',
    tags: ['loud', 'joyful'],
    vector: v({ warmth: 0.8, density: 0.7, era: 0.2, mood: 0.9, energy: 0.9 }),
    from: '#ffb89c',
    to: '#e8554f',
    fg: '#4a1b0c',
  },

  // ---------- VINTAGE · TIMELESS ----------
  {
    id: 'hopper_diner',
    emoji: '☕',
    text: "Hopper's empty diner, fluorescent fog, no one home",
    tags: ['vintage', 'quiet'],
    vector: v({ warmth: -0.2, density: -0.4, era: -0.7, mood: -0.5, energy: -0.7 }),
    from: '#d4d3c2',
    to: '#3d4a4a',
    fg: '#f5f1e8',
  },
  {
    id: 'super8_summer',
    emoji: '🎞️',
    text: "8mm film of a summer that won't come back",
    tags: ['vintage', 'wistful'],
    vector: v({ warmth: 0.5, density: -0.2, era: -0.8, mood: -0.4, energy: -0.4 }),
    from: '#e9c46a',
    to: '#b08458',
    fg: '#3d2410',
  },
  {
    id: 'marble_columns',
    emoji: '🏛️',
    text: 'Marble columns at golden hour, ivy creeping into cracks',
    tags: ['timeless', 'romantic'],
    vector: v({ warmth: 0.5, density: 0.4, era: -0.6, mood: 0.4, energy: -0.3 }),
    from: '#f5e6c8',
    to: '#8b5a2b',
    fg: '#3d2410',
  },
  {
    id: 'soul_vinyl',
    emoji: '📻',
    text: 'Dusty radio playing soul records, vinyl crackle in the air',
    tags: ['vintage', 'soulful'],
    vector: v({ warmth: 0.4, density: -0.3, era: -0.7, form: 0.3, mood: -0.2, energy: 0.0 }),
    from: '#a87856',
    to: '#5a3826',
    fg: '#f0e2c8',
  },
  {
    id: 'vanity_letters',
    emoji: '🪞',
    text: 'A vintage vanity mirror, old letters tucked into the frame',
    tags: ['vintage', 'tender'],
    vector: v({ warmth: 0.4, density: 0.4, era: -0.7, mood: -0.3, energy: -0.6 }),
    from: '#d6b896',
    to: '#7a5a4a',
    fg: '#3d1f1a',
  },

  // ---------- ABSTRACT · MAXIMAL ----------
  {
    id: 'rothko_cry',
    emoji: '🎨',
    text: "A Rothko that makes you cry without knowing why",
    tags: ['abstract', 'deep'],
    vector: v({ warmth: 0.3, density: 0.3, era: -0.2, form: 0.9, mood: -0.4, energy: -0.5 }),
    from: '#7a2c1f',
    to: '#1a1410',
    fg: '#f0d8c8',
  },
  {
    id: 'memphis_chaos',
    emoji: '🟪',
    text: 'Memphis design, clashing patterns, joyful geometric chaos',
    tags: ['maximal', 'playful'],
    vector: v({ warmth: 0.4, density: 0.9, era: -0.3, form: 0.7, mood: 0.7, energy: 0.6 }),
    from: '#ff8aae',
    to: '#5fb5d1',
    fg: '#1f1b16',
  },
  {
    id: 'kusama_infinity',
    emoji: '🌀',
    text: "Yayoi Kusama's infinity room, mirrors and dots forever",
    tags: ['abstract', 'immersive'],
    vector: v({ warmth: 0.0, density: 0.9, era: 0.4, form: 0.8, mood: 0.5, energy: 0.4 }),
    from: '#1a2240',
    to: '#d0506f',
    fg: '#f5e8d8',
  },
  {
    id: 'frank_ocean_loop',
    emoji: '💿',
    text: 'A Frank Ocean track that loops in the back of your head',
    tags: ['contemporary', 'introspective'],
    vector: v({ warmth: -0.1, density: 0.5, era: 0.7, form: 0.3, mood: -0.2, energy: -0.5 }),
    from: '#2a4a5a',
    to: '#7a5a8a',
    fg: '#f0ecde',
  },

  // ---------- MINIMAL · CLEAN ----------
  {
    id: 'single_candle',
    emoji: '🕯️',
    text: 'A single white candle on a wooden table, the room very quiet',
    tags: ['minimal', 'still'],
    vector: v({ warmth: 0.3, density: -0.9, era: -0.1, form: 0.2, mood: -0.2, energy: -0.8 }),
    from: '#ede5d3',
    to: '#a89880',
    fg: '#3d2e1a',
  },
  {
    id: 'iceland_black_sand',
    emoji: '🏔️',
    text: 'Iceland, black sand beach, no one for miles in every direction',
    tags: ['minimal', 'vast'],
    vector: v({ warmth: -0.7, density: -0.8, era: 0.4, form: 0.3, mood: -0.3, energy: -0.7 }),
    from: '#3a4047',
    to: '#7a8088',
    fg: '#e8ebee',
  },
  {
    id: 'yohji_runway',
    emoji: '⚫',
    text: "A Yohji Yamamoto runway, all black, no music",
    tags: ['minimal', 'severe'],
    vector: v({ warmth: -0.4, density: -0.7, era: 0.5, form: 0.4, mood: -0.3, energy: -0.4 }),
    from: '#0d0d0d',
    to: '#383838',
    fg: '#e8e6e0',
  },

  // ---------- ENERGY · EXTROVERTED ----------
  {
    id: 'jazz_midnight',
    emoji: '🎷',
    text: 'A jazz club at midnight, the bassist is sweating, smoke in the lights',
    tags: ['vintage', 'alive'],
    vector: v({ warmth: 0.6, density: 0.7, era: -0.6, mood: 0.6, energy: 0.8 }),
    from: '#5a2f4a',
    to: '#c97a3e',
    fg: '#f5e0c0',
  },
  {
    id: 'studio_54',
    emoji: '💃',
    text: 'Studio 54 mirror ball, sequins, strangers becoming friends',
    tags: ['glittery', 'social'],
    vector: v({ warmth: 0.5, density: 0.9, era: -0.5, form: 0.4, mood: 0.9, energy: 0.9 }),
    from: '#d0506f',
    to: '#e9c46a',
    fg: '#3d1a2a',
  },
  {
    id: 'punk_basement',
    emoji: '🎤',
    text: "A basement punk show, ears ringing for hours afterward",
    tags: ['raw', 'loud'],
    vector: v({ warmth: 0.0, density: 0.7, era: 0.0, mood: 0.4, energy: 0.9 }),
    from: '#3a2235',
    to: '#9d2b3f',
    fg: '#f0ddc8',
  },
  {
    id: 'berlin_techno',
    emoji: '🎛️',
    text: 'Berlin techno club at 6am, the bass still pulsing in your chest',
    tags: ['intense', 'modern'],
    vector: v({ warmth: -0.4, density: 0.6, era: 0.7, form: 0.5, mood: 0.3, energy: 0.8 }),
    from: '#1a1a1a',
    to: '#5a3a8a',
    fg: '#e8d8f5',
  },

  // ---------- ROMANTIC · DREAMY ----------
  {
    id: 'lavender_letters',
    emoji: '💌',
    text: 'Handwritten love letters in lavender ink, kept in a shoebox',
    tags: ['romantic', 'tender'],
    vector: v({ warmth: 0.5, density: 0.4, era: -0.8, mood: 0.3, energy: -0.7 }),
    from: '#e8d8f0',
    to: '#a890c4',
    fg: '#3d2a4a',
  },
  {
    id: 'bouquet_window',
    emoji: '🌹',
    text: 'A bouquet wrapped in butcher paper, left on a windowsill',
    tags: ['quiet', 'romantic'],
    vector: v({ warmth: 0.6, density: -0.2, era: 0.0, mood: 0.4, energy: -0.5 }),
    from: '#f5d0c8',
    to: '#c87a78',
    fg: '#4a1f1a',
  },
];

// ============================================================
// Quiz pair generation: produce N forced-choice rounds whose
// pairs maximize axis spread, so each pick gives strong signal.
// ============================================================

const ROUNDS = 12;

// Cosine-style distance on the 6-axis vector (small = similar).
function vectorDistance(a: AestheticVector, b: AestheticVector): number {
  const axes: AestheticAxis[] = ['warmth', 'density', 'era', 'form', 'mood', 'energy'];
  let sum = 0;
  for (const ax of axes) sum += (a[ax] - b[ax]) ** 2;
  return Math.sqrt(sum);
}

export type QuizRound = {
  left: AestheticCard;
  right: AestheticCard;
};

// Build N rounds: pick a random card, then pair it with the
// "most distant" card not yet used. This maximizes signal per
// round. Each card appears at most once.
export function buildQuizRounds(seed?: number): QuizRound[] {
  const pool = [...AESTHETIC_CARDS];
  // Simple seeded shuffle for stable testing if seed provided.
  const rng = seed != null ? mulberry32(seed) : Math.random;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const rounds: QuizRound[] = [];
  const used = new Set<string>();
  for (let r = 0; r < ROUNDS && pool.length >= 2; r++) {
    const left = pool.find((c) => !used.has(c.id));
    if (!left) break;
    used.add(left.id);
    // Find max-distance partner among the remaining cards.
    let best: AestheticCard | null = null;
    let bestDist = -1;
    for (const c of pool) {
      if (used.has(c.id)) continue;
      const d = vectorDistance(left.vector, c.vector);
      if (d > bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (!best) break;
    used.add(best.id);
    rounds.push({ left, right: best });
  }
  return rounds;
}

// Rebuild card list from saved IDs (used by the result screen
// when navigating from the quiz with just the picked IDs).
export function findCardsByIds(ids: string[]): AestheticCard[] {
  const map = new Map(AESTHETIC_CARDS.map((c) => [c.id, c]));
  const out: AestheticCard[] = [];
  for (const id of ids) {
    const c = map.get(id);
    if (c) out.push(c);
  }
  return out;
}

// Tiny seedable RNG for deterministic tests.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
