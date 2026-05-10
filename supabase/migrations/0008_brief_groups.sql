-- ============================================================
-- Sweetart — Brief group chats.
-- When an applicant is accepted into a brief, a group conversation
-- is auto-created with the creator + accepted applicants as members.
-- Messages can target either a 1-on-1 match OR a brief group.
-- ============================================================

-- One group per brief (created lazily on first acceptance).
create table if not exists public.brief_groups (
  id              uuid primary key default gen_random_uuid(),
  brief_id        uuid not null unique references public.briefs(id) on delete cascade,
  created_at      timestamptz default now(),
  last_message_at timestamptz
);

-- Members table.
create table if not exists public.brief_group_members (
  group_id  uuid not null references public.brief_groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('creator','member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create index if not exists brief_group_members_user_idx
  on public.brief_group_members(user_id);

-- Messages: add nullable brief_group_id, relax match_id, enforce one-of.
alter table public.messages
  add column if not exists brief_group_id uuid references public.brief_groups(id) on delete cascade;

alter table public.messages
  alter column match_id drop not null;

alter table public.messages
  drop constraint if exists messages_one_target;
alter table public.messages
  add constraint messages_one_target
  check (
    (match_id is not null and brief_group_id is null)
    or
    (match_id is null and brief_group_id is not null)
  );

create index if not exists messages_brief_group_idx
  on public.messages(brief_group_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.brief_groups enable row level security;
alter table public.brief_group_members enable row level security;

drop policy if exists "Members read groups" on public.brief_groups;
create policy "Members read groups"
on public.brief_groups for select to authenticated
using (
  exists (
    select 1 from public.brief_group_members
    where group_id = brief_groups.id and user_id = auth.uid()
  )
);

drop policy if exists "Members read group members" on public.brief_group_members;
create policy "Members read group members"
on public.brief_group_members for select to authenticated
using (
  exists (
    select 1 from public.brief_group_members m
    where m.group_id = brief_group_members.group_id
      and m.user_id = auth.uid()
  )
);

-- Replace messages policies to also allow brief_group access.
drop policy if exists "Users read messages in own matches" on public.messages;
create policy "Users read messages they belong to"
on public.messages for select to authenticated
using (
  (match_id is not null and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  ))
  or
  (brief_group_id is not null and exists (
    select 1 from public.brief_group_members gm
    where gm.group_id = brief_group_id and gm.user_id = auth.uid()
  ))
);

drop policy if exists "Users send messages in own matches" on public.messages;
create policy "Users send messages they belong to"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    (match_id is not null and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    ))
    or
    (brief_group_id is not null and exists (
      select 1 from public.brief_group_members gm
      where gm.group_id = brief_group_id and gm.user_id = auth.uid()
    ))
  )
);

drop policy if exists "Users mark read in own matches" on public.messages;
create policy "Users mark read"
on public.messages for update to authenticated
using (
  (match_id is not null and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  ))
  or
  (brief_group_id is not null and exists (
    select 1 from public.brief_group_members gm
    where gm.group_id = brief_group_id and gm.user_id = auth.uid()
  ))
)
with check (
  (match_id is not null and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  ))
  or
  (brief_group_id is not null and exists (
    select 1 from public.brief_group_members gm
    where gm.group_id = brief_group_id and gm.user_id = auth.uid()
  ))
);

-- ============================================================
-- Trigger: when an application becomes 'accepted', ensure the brief
-- group exists and add the applicant (and creator if first time).
-- We extend the existing capacity-tracking trigger function.
-- ============================================================
create or replace function public.handle_brief_app_status_change()
returns trigger as $$
declare
  delta int := 0;
  group_id_local uuid;
  brief_creator uuid;
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

  -- On acceptance: make sure the group exists and applicant + creator are members.
  if NEW.status = 'accepted'
     and (TG_OP = 'INSERT' or OLD.status <> 'accepted') then
    select creator_id into brief_creator from public.briefs where id = NEW.brief_id;

    select id into group_id_local from public.brief_groups where brief_id = NEW.brief_id;
    if group_id_local is null then
      insert into public.brief_groups (brief_id) values (NEW.brief_id)
      returning id into group_id_local;
    end if;

    insert into public.brief_group_members (group_id, user_id, role)
    values (group_id_local, brief_creator, 'creator')
    on conflict do nothing;

    insert into public.brief_group_members (group_id, user_id, role)
    values (group_id_local, NEW.applicant_id, 'member')
    on conflict do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Update message-receipts trigger to handle both match and group.
-- ============================================================
create or replace function public.handle_new_message()
returns trigger as $$
begin
  if new.match_id is not null then
    update public.matches set last_message_at = new.created_at
      where id = new.match_id;
  end if;
  if new.brief_group_id is not null then
    update public.brief_groups set last_message_at = new.created_at
      where id = new.brief_group_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Realtime: brief_groups and members already get caught by realtime
-- via messages publication; we just need messages publication to be in place
-- (which it already is from migration 0004).

-- Backfill: for any already-accepted applications, create their groups.
do $$
declare
  rec record;
  group_id_local uuid;
begin
  for rec in
    select ba.brief_id, ba.applicant_id, b.creator_id
    from public.brief_applications ba
    join public.briefs b on b.id = ba.brief_id
    where ba.status = 'accepted'
  loop
    select id into group_id_local from public.brief_groups where brief_id = rec.brief_id;
    if group_id_local is null then
      insert into public.brief_groups (brief_id) values (rec.brief_id)
      returning id into group_id_local;
    end if;
    insert into public.brief_group_members (group_id, user_id, role)
    values (group_id_local, rec.creator_id, 'creator')
    on conflict do nothing;
    insert into public.brief_group_members (group_id, user_id, role)
    values (group_id_local, rec.applicant_id, 'member')
    on conflict do nothing;
  end loop;
end $$;
