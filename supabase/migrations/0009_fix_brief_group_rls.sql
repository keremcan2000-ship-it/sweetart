-- ============================================================
-- Sweetart — Fix infinite recursion in brief_group_members RLS.
-- The previous policy on brief_group_members was self-referential
-- (it queried brief_group_members from inside its own SELECT policy),
-- which Postgres rejects as recursive — and that broke brief_groups
-- SELECT too, since brief_groups' policy uses brief_group_members in
-- an EXISTS subquery.
--
-- Fix: each user can read only their OWN membership rows. That's
-- enough for "am I a member of group X?" checks used by
-- brief_groups SELECT, MatchesScreen list, and ChatScreen RLS.
-- For member counts / co-member info, use a security-definer RPC.
-- ============================================================

drop policy if exists "Members read group members" on public.brief_group_members;
drop policy if exists "Users read own membership" on public.brief_group_members;

create policy "Users read own membership"
on public.brief_group_members for select to authenticated
using (user_id = auth.uid());

-- ============================================================
-- RPC helper: return member counts + names for groups the caller
-- is a member of. Bypasses RLS (security definer) but verifies
-- caller membership before returning anything.
-- ============================================================
create or replace function public.brief_group_member_count(p_group_id uuid)
returns int
language plpgsql
security definer
stable
as $$
declare
  cnt int;
begin
  -- Caller must be a member to see the count.
  if not exists (
    select 1 from public.brief_group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    return 0;
  end if;
  select count(*) into cnt from public.brief_group_members where group_id = p_group_id;
  return cnt;
end;
$$;

grant execute on function public.brief_group_member_count(uuid) to authenticated;
