-- ============================================================
-- Sweetart — Briefs (open calls for collaborations).
-- A user posts a brief: "Looking for a saxophonist for a quartet."
-- Other users apply with a short pitch.
-- The brief creator accepts or declines applicants.
-- When capacity fills, status flips to 'filled'.
-- ============================================================

create table if not exists public.briefs (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 120),
  description     text not null check (char_length(description) between 10 and 2000),
  art_forms       text[] default '{}',     -- e.g. {Painting, Filmmaking}
  city            text,
  starts_at       date,
  duration_text   text,                    -- "2 weeks", "Ongoing", etc.
  capacity_total  int  not null default 1 check (capacity_total between 1 and 20),
  capacity_filled int  not null default 0,
  status          text not null default 'open'
                  check (status in ('open','filled','closed','cancelled')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists briefs_status_idx
  on public.briefs(status, created_at desc);
create index if not exists briefs_art_forms_idx
  on public.briefs using gin(art_forms);
create index if not exists briefs_creator_idx
  on public.briefs(creator_id);

create trigger briefs_updated_at
  before update on public.briefs
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Applications
-- ============================================================
create table if not exists public.brief_applications (
  id            uuid primary key default gen_random_uuid(),
  brief_id      uuid not null references public.briefs(id) on delete cascade,
  applicant_id  uuid not null references public.profiles(id) on delete cascade,
  message       text not null check (char_length(message) between 30 and 1500),
  status        text not null default 'pending'
                check (status in ('pending','accepted','declined','withdrawn')),
  created_at    timestamptz default now(),
  responded_at  timestamptz,
  unique (brief_id, applicant_id)
);

create index if not exists brief_apps_brief_idx
  on public.brief_applications(brief_id, status);
create index if not exists brief_apps_applicant_idx
  on public.brief_applications(applicant_id, status);

-- ============================================================
-- Trigger: keep briefs.capacity_filled and status in sync
-- when an application's status changes.
-- ============================================================
create or replace function public.handle_brief_app_status_change()
returns trigger as $$
declare
  delta int := 0;
begin
  if (TG_OP = 'INSERT') then
    if NEW.status = 'accepted' then delta := 1; end if;
  elsif (TG_OP = 'UPDATE') then
    if OLD.status = 'accepted' and NEW.status <> 'accepted' then
      delta := -1;
    elsif OLD.status <> 'accepted' and NEW.status = 'accepted' then
      delta := 1;
    end if;
  end if;

  if delta <> 0 then
    update public.briefs
    set capacity_filled = greatest(capacity_filled + delta, 0)
    where id = NEW.brief_id;

    update public.briefs
    set status = case
      when capacity_filled >= capacity_total then 'filled'
      when status = 'filled' and capacity_filled < capacity_total then 'open'
      else status
    end
    where id = NEW.brief_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_brief_app_change on public.brief_applications;
create trigger on_brief_app_change
  after insert or update on public.brief_applications
  for each row execute function public.handle_brief_app_status_change();

-- ============================================================
-- RLS
-- ============================================================
alter table public.briefs enable row level security;
alter table public.brief_applications enable row level security;

-- briefs: readable to all auth'd; insert/update only by creator.
drop policy if exists "Briefs readable" on public.briefs;
create policy "Briefs readable"
on public.briefs for select to authenticated
using (status in ('open','filled'));

drop policy if exists "Users post own briefs" on public.briefs;
create policy "Users post own briefs"
on public.briefs for insert to authenticated
with check (auth.uid() = creator_id);

drop policy if exists "Users update own briefs" on public.briefs;
create policy "Users update own briefs"
on public.briefs for update to authenticated
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

drop policy if exists "Users delete own briefs" on public.briefs;
create policy "Users delete own briefs"
on public.briefs for delete to authenticated
using (auth.uid() = creator_id);

-- brief_applications: applicant + brief creator can read.
drop policy if exists "Applications readable by participants" on public.brief_applications;
create policy "Applications readable by participants"
on public.brief_applications for select to authenticated
using (
  applicant_id = auth.uid()
  or exists (
    select 1 from public.briefs b
    where b.id = brief_id and b.creator_id = auth.uid()
  )
);

-- Applicant inserts their own application.
drop policy if exists "Users send applications" on public.brief_applications;
create policy "Users send applications"
on public.brief_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and exists (
    select 1 from public.briefs b
    where b.id = brief_id and b.status = 'open'
  )
);

-- Applicant can update their own (e.g. withdraw); brief creator can update
-- any application (accept/decline).
drop policy if exists "Participants update applications" on public.brief_applications;
create policy "Participants update applications"
on public.brief_applications for update to authenticated
using (
  applicant_id = auth.uid()
  or exists (
    select 1 from public.briefs b
    where b.id = brief_id and b.creator_id = auth.uid()
  )
)
with check (
  applicant_id = auth.uid()
  or exists (
    select 1 from public.briefs b
    where b.id = brief_id and b.creator_id = auth.uid()
  )
);

-- ============================================================
-- Seed: a few example briefs from the fake profiles.
-- Idempotent.
-- ============================================================
insert into public.briefs
  (id, creator_id, title, description, art_forms, city, duration_text, capacity_total)
values
  ('a1a1a1a1-0001-0001-0001-000000000001',
   '33333333-3333-3333-3333-333333333333',
   'Saksafonist arıyorum — caz dörtlüsü',
   'Önümüzdeki ay küçük bir kayıt yapacağız: piyano, davul, bas, saksofon. Caz / soul ağırlıklı. Standartlar + birkaç orijinal. Haftada bir prova, 4 hafta. Kayıt günü Brooklyn''de bir studio.',
   array['Jazz','Classical music'],
   'New Orleans', '4 weeks', 1),

  ('a1a1a1a1-0002-0002-0002-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'Kısa film için DP arıyorum',
   'Büyükannemin bahçesinde geçen 4 dakikalık bir kısa. Doğal ışık, sessiz tempo, 16mm hissi. Sony A7S veya benzeri kamera tercih. 2 gün çekim, post-prodüksiyon ortak.',
   array['Filmmaking','Photography'],
   'Berlin', '2 weeks', 1),

  ('a1a1a1a1-0003-0003-0003-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'İkili sergi için ressam kolaboratör',
   'Bir galeride iki kişilik küçük bir gösteri açıyoruz. Tema: "open windows". Ben suluboya çalışıyorum, akrilik / yağlı boya yapan birini istiyorum. Açılış 6 hafta sonra.',
   array['Painting','Illustration'],
   'Brooklyn', '6 weeks', 1),

  ('a1a1a1a1-0004-0004-0004-000000000004',
   '44444444-4444-4444-4444-444444444444',
   'Seramik atölyesi — küçük bir koleksiyon',
   'Lokal bir kafeyle anlaştık, 12 parçalık vazo serisi yapacağız. İki kişi daha lazım — biri çark, biri sırlama / dekorasyon. Wabi-sabi estetik. Atölye benim, ben malzemeyi tutuyorum.',
   array['Ceramics','Sculpture'],
   'London', 'Ongoing', 2)
on conflict (id) do nothing;
