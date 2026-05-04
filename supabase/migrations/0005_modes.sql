-- ============================================================
-- Sweetart — Dating / Creating mode split.
-- A profile can be open to dating, creating (art collaborations),
-- or both. The Discover deck filters by the active mode.
-- ============================================================

alter table public.profiles
  add column if not exists looking_for_modes text[] default array['dating', 'creating'];

-- GIN index so `array && array['dating']` style filters are fast.
create index if not exists profiles_modes_idx
  on public.profiles using gin(looking_for_modes);

-- Backfill any rows where the new column is null/empty.
update public.profiles
set looking_for_modes = array['dating', 'creating']
where looking_for_modes is null
   or array_length(looking_for_modes, 1) is null;

-- Constraint: at least one mode required, only known values allowed.
alter table public.profiles
  drop constraint if exists profiles_looking_for_modes_check;
alter table public.profiles
  add constraint profiles_looking_for_modes_check
  check (
    looking_for_modes <@ array['dating', 'creating']
    and array_length(looking_for_modes, 1) >= 1
  );

-- Seed fake profiles with a mix of modes so we can exercise the filter.
update public.profiles set looking_for_modes = array['dating','creating']
  where id in (
    '11111111-1111-1111-1111-111111111111', -- Maya
    '22222222-2222-2222-2222-222222222222', -- Theo
    '33333333-3333-3333-3333-333333333333'  -- Lila
  );

update public.profiles set looking_for_modes = array['creating']
  where id in (
    '44444444-4444-4444-4444-444444444444', -- Noor
    '55555555-5555-5555-5555-555555555555'  -- Felix
  );

update public.profiles set looking_for_modes = array['dating']
  where id = '66666666-6666-6666-6666-666666666666'; -- Anya
