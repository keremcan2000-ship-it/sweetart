-- ============================================================
-- Sweetart — initial schema
-- Tables, RLS policies, triggers, and a few seed events.
-- Safe to run on an empty Supabase project.
-- ============================================================

-- Extensions ---------------------------------------------------
create extension if not exists "pgcrypto";

-- =============== PROFILES ===================================
-- Extends auth.users (managed by Supabase Auth).
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,

  -- basics
  name          text,
  age           int check (age is null or (age >= 18 and age <= 120)),
  pronouns      text,
  city          text,
  job           text,
  height_cm     int check (height_cm is null or (height_cm >= 120 and height_cm <= 230)),
  bio           text,

  -- worldview
  religion      text,
  politics      text,
  drinks        text,
  smokes        text,
  wants_kids    text,

  -- art DNA
  art_forms     text[] default '{}',          -- e.g. {Painting, Photography}
  main_art_form text,                         -- highlighted one
  movements     text[] default '{}',          -- {Impressionism, Bauhaus, ...}
  originality   text,                         -- 'Originals only' | 'Mix of both' | ...
  activities    text[] default '{}',          -- {paint, film, gig, ...}
  prompts       jsonb  default '[]'::jsonb,   -- [{question, answer}, ...]

  looking_for   text,                         -- 'Something serious' | 'Casual' | ...

  -- moderation flags
  is_active     boolean default true,
  is_verified   boolean default false,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index profiles_age_idx        on public.profiles(age);
create index profiles_city_idx       on public.profiles(city);
create index profiles_activities_idx on public.profiles using gin(activities);
create index profiles_movements_idx  on public.profiles using gin(movements);

-- =============== PHOTOS =====================================
create table public.profile_photos (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  url                text not null,
  position           smallint not null default 0,
  moderation_status  text default 'pending'
                     check (moderation_status in ('pending','approved','rejected')),
  moderation_reason  text,
  created_at         timestamptz default now()
);
create unique index profile_photos_position_uq on public.profile_photos(profile_id, position);
create index profile_photos_profile_idx        on public.profile_photos(profile_id);

-- =============== SWIPES =====================================
create table public.swipes (
  id          uuid primary key default gen_random_uuid(),
  swiper_id   uuid not null references public.profiles(id) on delete cascade,
  swipee_id   uuid not null references public.profiles(id) on delete cascade,
  direction   text not null check (direction in ('like','pass','super')),
  on_activity text,
  created_at  timestamptz default now(),
  unique (swiper_id, swipee_id),
  check (swiper_id <> swipee_id)
);
create index swipes_swipee_idx on public.swipes(swipee_id);

-- =============== MATCHES ====================================
-- We always store user_a_id < user_b_id to keep matches unique.
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  user_a_id       uuid not null references public.profiles(id) on delete cascade,
  user_b_id       uuid not null references public.profiles(id) on delete cascade,
  shared_activity text,
  created_at      timestamptz default now(),
  last_message_at timestamptz,
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);
create index matches_user_a_idx on public.matches(user_a_id);
create index matches_user_b_idx on public.matches(user_b_id);

-- =============== EVENTS (curated) ===========================
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  venue        text,
  city         text,
  starts_at    timestamptz not null,
  category     text check (category in ('theatre','cinema','music','gallery','comedy','dance','art','other')),
  emoji        text,
  description  text,
  ticket_url   text,
  image_url    text,
  is_published boolean default true,
  created_at   timestamptz default now()
);
create index events_starts_at_idx on public.events(starts_at);
create index events_city_idx      on public.events(city);
create index events_category_idx  on public.events(category);

-- =============== EVENT INVITES ==============================
create table public.event_invites (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.matches(id) on delete cascade,
  event_id      uuid not null references public.events(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  message       text,
  status        text default 'pending'
                check (status in ('pending','accepted','declined','cancelled')),
  created_at    timestamptz default now(),
  responded_at  timestamptz
);
create index event_invites_match_idx on public.event_invites(match_id);

-- =============== REPORTS ====================================
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null
              check (reason in ('inappropriate_photos','harassment','fake_profile','spam','underage','other')),
  details     text,
  status      text default 'open' check (status in ('open','reviewed','resolved','dismissed')),
  created_at  timestamptz default now()
);
create index reports_reported_idx on public.reports(reported_id);
create index reports_status_idx   on public.reports(status);

-- =============== BLOCKS =====================================
create table public.blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocker_idx on public.blocks(blocker_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at maintenance ------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a blank profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-create a match when there's a mutual like / super-like.
create or replace function public.handle_new_swipe()
returns trigger as $$
declare
  reciprocal int;
  ua uuid;
  ub uuid;
begin
  if new.direction not in ('like','super') then
    return new;
  end if;

  select count(*) into reciprocal
    from public.swipes
   where swiper_id = new.swipee_id
     and swipee_id = new.swiper_id
     and direction in ('like','super');

  if reciprocal > 0 then
    if new.swiper_id < new.swipee_id then
      ua := new.swiper_id; ub := new.swipee_id;
    else
      ua := new.swipee_id; ub := new.swiper_id;
    end if;

    insert into public.matches (user_a_id, user_b_id, shared_activity)
    values (ua, ub, new.on_activity)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_swipe_insert
  after insert on public.swipes
  for each row execute function public.handle_new_swipe();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.profile_photos enable row level security;
alter table public.swipes         enable row level security;
alter table public.matches        enable row level security;
alter table public.events         enable row level security;
alter table public.event_invites  enable row level security;
alter table public.reports        enable row level security;
alter table public.blocks         enable row level security;

-- profiles -----------------------------------------------------
create policy "Profiles readable by authenticated"
  on public.profiles for select to authenticated
  using (is_active = true);

create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- profile_photos ----------------------------------------------
create policy "Photos readable by authenticated"
  on public.profile_photos for select to authenticated
  using (moderation_status = 'approved' or auth.uid() = profile_id);

create policy "Users manage own photos"
  on public.profile_photos for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- swipes -------------------------------------------------------
create policy "Users insert own swipes"
  on public.swipes for insert to authenticated
  with check (auth.uid() = swiper_id);

create policy "Users read own swipes"
  on public.swipes for select to authenticated
  using (auth.uid() = swiper_id);

-- matches ------------------------------------------------------
create policy "Users read own matches"
  on public.matches for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- events -------------------------------------------------------
create policy "Events readable by authenticated"
  on public.events for select to authenticated
  using (is_published = true);

-- event_invites -----------------------------------------------
create policy "Users read invites in own matches"
  on public.event_invites for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

create policy "Users send invites in own matches"
  on public.event_invites for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

-- reports ------------------------------------------------------
-- Users can file a report; reading is admin-only (service role).
create policy "Users file own reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- blocks -------------------------------------------------------
create policy "Users manage own blocks"
  on public.blocks for all to authenticated
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ============================================================
-- SEED — a handful of curated events for the Events tab.
-- ============================================================
insert into public.events (title, venue, city, starts_at, category, emoji, description, ticket_url) values
('La Bohème — Royal Opera',         'Royal Opera House, Covent Garden', 'London', now() + interval '2 days',  'theatre', '🎭', 'Puccini''s heartbreak classic, in glorious staging.', 'https://example.com/la-boheme'),
('Sundance Spotlight: Petite Maman','Brixton Ritzy',                    'London', now() + interval '1 day',   'cinema',  '🎬', 'Céline Sciamma''s tender, time-bending second feature.', 'https://example.com/petite-maman'),
('Ezra Collective — Live',          'The Roundhouse, Camden',           'London', now() + interval '3 days',  'music',   '🎻', 'British jazz outfit, all groove, all heart.', 'https://example.com/ezra'),
('Late at the Tate Modern',         'Tate Modern, Bankside',            'London', now() + interval '7 days',  'gallery', '🖼️', 'Galleries open late with live music and bars.', 'https://example.com/late-tate'),
('Comedy Open Mic',                 'Camden Assembly',                  'London', now() + interval '5 days',  'comedy',  '🎤', 'Twelve comics, eight minutes each, two for a tenner.', 'https://example.com/open-mic'),
('Paint & Sip — Spring Florals',    'Shoreditch Studios',               'London', now() + interval '6 days',  'art',     '🎨', 'BYO snacks, we provide canvas, wine, and instruction.', 'https://example.com/paint-sip');
