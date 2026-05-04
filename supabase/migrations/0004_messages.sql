-- ============================================================
-- Sweetart — Chat messages.
-- Two users in a match can send and read messages.
-- Realtime is enabled so both clients see new messages live.
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at  timestamptz default now(),
  read_at     timestamptz
);

create index if not exists messages_match_idx on public.messages(match_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.messages enable row level security;

drop policy if exists "Users read messages in own matches" on public.messages;
create policy "Users read messages in own matches"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  )
);

drop policy if exists "Users send messages in own matches" on public.messages;
create policy "Users send messages in own matches"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  )
);

drop policy if exists "Users mark read in own matches" on public.messages;
create policy "Users mark read in own matches"
on public.messages for update to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
  )
);

-- ============================================================
-- Trigger: keep matches.last_message_at in sync.
-- ============================================================
create or replace function public.handle_new_message()
returns trigger as $$
begin
  update public.matches
  set last_message_at = new.created_at
  where id = new.match_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_message on public.messages;
create trigger on_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ============================================================
-- Realtime: broadcast row changes on this table.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
