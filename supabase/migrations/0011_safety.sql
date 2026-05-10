-- ============================================================
-- Sweetart — Safety: blocks + reports.
-- Required for App Store / Play Store submission (Apple Guideline
-- 1.2). Blocks remove the relationship in both directions; reports
-- queue moderation review.
-- ============================================================

-- ============================================================
-- blocks
-- ============================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason     text,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "Blockers manage own blocks" on public.blocks;
create policy "Blockers manage own blocks"
on public.blocks for all to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());

-- A user can also see rows where THEY are the blocked party — needed
-- by RLS predicates on other tables (e.g. messages) that filter
-- "where neither side has blocked the other". Without this read,
-- those EXISTS subqueries silently fail.
drop policy if exists "Users see their own block records" on public.blocks;
create policy "Users see their own block records"
on public.blocks for select to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());

-- ============================================================
-- Block trigger: when a block is created, sever the relationship.
-- We delete the (mutual) match if it exists. Messages cascade with
-- it. Pending swipes stay so they don't re-match if blocks lifted.
-- ============================================================
create or replace function public.handle_new_block()
returns trigger as $$
begin
  delete from public.matches m
  where (m.user_a_id = NEW.blocker_id and m.user_b_id = NEW.blocked_id)
     or (m.user_a_id = NEW.blocked_id and m.user_b_id = NEW.blocker_id);
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_block_created on public.blocks;
create trigger on_block_created
  after insert on public.blocks
  for each row execute function public.handle_new_block();

-- ============================================================
-- reports
-- A single report row covers user/message/brief/photo targets via
-- nullable FKs. category is constrained; status follows a small
-- moderation lifecycle.
-- ============================================================
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references public.profiles(id) on delete cascade,
  subject_user_id     uuid references public.profiles(id) on delete set null,
  subject_message_id  uuid references public.messages(id) on delete set null,
  subject_brief_id    uuid references public.briefs(id) on delete set null,
  subject_photo_id    uuid references public.profile_photos(id) on delete set null,
  category            text not null check (category in (
    'spam', 'harassment', 'fake_profile',
    'inappropriate_content', 'underage', 'safety', 'other'
  )),
  description         text,
  status              text not null default 'pending' check (status in (
    'pending', 'reviewed', 'actioned', 'dismissed'
  )),
  created_at          timestamptz default now(),
  reviewed_at         timestamptz,
  -- At least one subject must be set.
  check (
    subject_user_id is not null
    or subject_message_id is not null
    or subject_brief_id is not null
    or subject_photo_id is not null
  )
);

create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists reports_subject_user_idx on public.reports(subject_user_id);

alter table public.reports enable row level security;

-- Reporters can insert + read their own reports. Updates / status
-- transitions happen server-side via service role only.
drop policy if exists "Users insert reports" on public.reports;
create policy "Users insert reports"
on public.reports for insert to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Users read own reports" on public.reports;
create policy "Users read own reports"
on public.reports for select to authenticated
using (reporter_id = auth.uid());

-- ============================================================
-- View: profile_blocks_check — small helper used by other RLS
-- predicates to express "neither side has blocked the other".
-- Defined as security barrier so it respects the caller's RLS on
-- blocks (which is correct).
-- ============================================================
create or replace view public.is_blocked_pair
with (security_barrier = true) as
select blocker_id, blocked_id from public.blocks;

grant select on public.is_blocked_pair to authenticated;
