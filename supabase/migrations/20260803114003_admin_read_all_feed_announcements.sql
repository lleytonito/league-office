drop policy if exists "public reads published announcements" on public.feed_announcements;

create policy "anon reads published announcements"
on public.feed_announcements for select
to anon
using (published_at is not null);

create policy "authenticated reads allowed announcements"
on public.feed_announcements for select
to authenticated
using (
  published_at is not null
  or app_private.current_member_is_admin()
);
