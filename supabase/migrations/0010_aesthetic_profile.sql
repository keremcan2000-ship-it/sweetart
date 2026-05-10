-- ============================================================
-- Sweetart — Aesthetic profile (vibe quiz output).
-- After the user takes the aesthetic quiz, we store:
--   • aesthetic_vector (jsonb): 6-axis scores in [-1.0, 1.0]
--       warmth   : cool ↔ warm
--       density  : minimal ↔ maximal
--       era      : contemporary ↔ vintage
--       form     : figurative ↔ abstract
--       mood     : melancholic ↔ joyful
--       energy   : introspective ↔ extroverted
--   • aesthetic_label (text): poetic name derived from the vector
--       e.g. "Neon Nostalgic", "Soft Brutalist", "Quiet Maximalist"
--   • aesthetic_completed_at (timestamptz): when the quiz finished
--
-- These power the result screen + a future "shared aesthetic"
-- soft-signal in matching (cosine similarity between vectors).
-- The fields are nullable — quiz is optional in onboarding.
-- ============================================================

alter table public.profiles
  add column if not exists aesthetic_vector       jsonb,
  add column if not exists aesthetic_label        text,
  add column if not exists aesthetic_completed_at timestamptz;

-- Lightweight index for "users who have completed the quiz" queries
-- (used later for matching candidate selection).
create index if not exists profiles_aesthetic_done_idx
  on public.profiles (aesthetic_completed_at)
  where aesthetic_completed_at is not null;
