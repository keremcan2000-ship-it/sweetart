-- ============================================================
-- Sweetart — City coordinates for proximity-based matching.
-- Profiles and briefs gain city_lat / city_lng so we can do
-- distance queries (Haversine in app for now, earthdistance later).
-- ============================================================

alter table public.profiles
  add column if not exists city_country text,
  add column if not exists city_lat double precision,
  add column if not exists city_lng double precision;

alter table public.briefs
  add column if not exists city_country text,
  add column if not exists city_lat double precision,
  add column if not exists city_lng double precision;

create index if not exists profiles_city_geo_idx
  on public.profiles(city_lat, city_lng);
create index if not exists briefs_city_geo_idx
  on public.briefs(city_lat, city_lng);

-- Backfill seed profile coordinates so existing test data still matches.
update public.profiles set city = 'Brooklyn', city_country = 'United States',
  city_lat = 40.6782, city_lng = -73.9442
  where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set city = 'Berlin', city_country = 'Germany',
  city_lat = 52.52, city_lng = 13.405
  where id = '22222222-2222-2222-2222-222222222222';

update public.profiles set city = 'New Orleans', city_country = 'United States',
  city_lat = 29.9511, city_lng = -90.0715
  where id = '33333333-3333-3333-3333-333333333333';

update public.profiles set city = 'London', city_country = 'United Kingdom',
  city_lat = 51.5074, city_lng = -0.1278
  where id in (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666'
  );

-- Also backfill seed briefs so the city display continues to make sense.
update public.briefs
set city_country = 'United States', city_lat = 40.6782, city_lng = -73.9442
where city = 'Brooklyn';

update public.briefs
set city_country = 'Germany', city_lat = 52.52, city_lng = 13.405
where city = 'Berlin';

update public.briefs
set city_country = 'United States', city_lat = 29.9511, city_lng = -90.0715
where city = 'New Orleans';

update public.briefs
set city_country = 'United Kingdom', city_lat = 51.5074, city_lng = -0.1278
where city = 'London';
