grant delete on public.proposals to authenticated;

create policy "admins delete proposals"
on public.proposals for delete
to authenticated
using (app_private.current_member_is_admin());
