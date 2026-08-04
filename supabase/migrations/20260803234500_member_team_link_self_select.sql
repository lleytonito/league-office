create policy "active members link own espn team"
on public.member_team_links for insert
to authenticated
with check (
  app_private.current_member_is_active()
  and member_id = app_private.current_member_id()
);
