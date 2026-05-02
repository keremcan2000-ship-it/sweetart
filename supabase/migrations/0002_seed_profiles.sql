-- ============================================================
-- Sweetart — seed test profiles for the Discover deck.
-- Idempotent: re-running won't duplicate.
--
-- These profiles are NOT linked to auth.users (we drop that FK
-- so we can seed without creating fake auth users). Real sign-ups
-- still flow through the trigger and get a profile row.
-- ============================================================

-- Drop the FK so we can insert profiles with arbitrary UUIDs.
-- (Existing profiles created via the auth trigger keep working.)
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

insert into public.profiles
  (id, name, age, city, job, height_cm, religion, politics,
   art_forms, main_art_form, movements, originality, bio, looking_for, is_active)
values
  ('11111111-1111-1111-1111-111111111111',
   'Maya', 27, 'Brooklyn', 'Designer', 168, 'Spiritual', 'Progressive',
   array['Painting','Illustration'], 'Painting',
   array['Impressionism','Pop Art','Outsider Art'], 'Mostly originals',
   'Watercolor + bad jokes. Will share my brushes.', 'Something serious', true),

  ('22222222-2222-2222-2222-222222222222',
   'Theo', 30, 'Berlin', 'Director', 185, 'Atheist', 'Centrist',
   array['Filmmaking','Photography'], 'Filmmaking',
   array['Slow Cinema','New Wave','Documentary'], 'Originals only',
   'Cinephile. Tarkovsky enthusiast — not annoying about it.', 'Something serious', true),

  ('33333333-3333-3333-3333-333333333333',
   'Lila', 26, 'New Orleans', 'Musician', 163, 'Jewish', 'Liberal',
   array['Jazz','Songwriting'], 'Jazz',
   array['Jazz','Soul','Bossa Nova'], 'Mix of both',
   'Saxophonist looking for an audience of one.', 'Something serious', true),

  ('44444444-4444-4444-4444-444444444444',
   'Noor', 29, 'London', 'Architect', 173, 'Muslim', 'Progressive',
   array['Ceramics','Architecture'], 'Ceramics',
   array['Bauhaus','Brutalism','Wabi-sabi'], 'Originals only',
   'I''ll get clay on your shirt and it''ll be worth it.', 'Casual dating', true),

  ('55555555-5555-5555-5555-555555555555',
   'Felix', 32, 'London', 'Writer', 178, 'Agnostic', 'Liberal',
   array['Stand-up','Fiction writing'], 'Stand-up',
   array['Absurdism','Observational comedy','New Sincerity'], 'Originals only',
   'Three jokes ready. Four if it''s going well.', 'Something serious', true),

  ('66666666-6666-6666-6666-666666666666',
   'Anya', 28, 'London', 'Curator', 170, 'Atheist', 'Progressive',
   array['Illustration','Photography'], 'Illustration',
   array['Minimalism','Conceptual','Realism'], 'Mostly interpretations',
   'Will drag you to a gallery; you''ll thank me by pint two.', 'Friends', true)
on conflict (id) do nothing;

-- Bonus: seed reciprocal likes from Maya, Theo, and Lila to whichever real
-- user signed up most recently. This way, swiping right on any of those three
-- will instantly trigger a match (via the on_swipe_insert trigger).
-- Idempotent: if no real user exists yet, this is a no-op.
insert into public.swipes (swiper_id, swipee_id, direction)
select fake.fid, real.rid, 'like'
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid),
  ('22222222-2222-2222-2222-222222222222'::uuid),
  ('33333333-3333-3333-3333-333333333333'::uuid)
) as fake(fid),
lateral (
  select u.id as rid
  from auth.users u
  order by u.created_at desc
  limit 1
) as real
on conflict do nothing;
