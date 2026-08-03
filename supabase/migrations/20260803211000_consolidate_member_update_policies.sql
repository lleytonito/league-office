drop policy if exists "admins manage members" on public.league_members;
drop policy if exists "active members update own public profile" on public.league_members;

create policy "members update permitted profiles"
on public.league_members for update
to authenticated
using (
  app_private.current_member_is_admin()
  or (
    auth_user_id = (select auth.uid())
    and id = app_private.current_member_id()
    and is_admin = false
    and is_member = true
    and revoked_at is null
  )
)
with check (
  app_private.current_member_is_admin()
  or (
    auth_user_id = (select auth.uid())
    and id = app_private.current_member_id()
    and is_admin = false
    and is_member = true
    and revoked_at is null
  )
);
