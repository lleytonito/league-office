drop policy if exists "public reads approved proposals" on public.proposals;
drop policy if exists "members read their submitted proposals" on public.proposals;
drop policy if exists "admins read all proposals" on public.proposals;

create policy "anon reads approved proposals"
on public.proposals for select
to anon
using (
  status = any (array['approved', 'voting', 'closed', 'published'])
  and published_at is not null
);

create policy "authenticated reads allowed proposals"
on public.proposals for select
to authenticated
using (
  (
    status = any (array['approved', 'voting', 'closed', 'published'])
    and published_at is not null
  )
  or author_member_id = app_private.current_member_id()
  or app_private.current_member_is_admin()
);

drop policy if exists "public reads options for approved proposals" on public.proposal_vote_options;
drop policy if exists "members read options for their submitted proposals" on public.proposal_vote_options;
drop policy if exists "admins read all vote options" on public.proposal_vote_options;
drop policy if exists "active members add options to their review proposals" on public.proposal_vote_options;
drop policy if exists "admins insert vote options" on public.proposal_vote_options;

create policy "anon reads options for approved proposals"
on public.proposal_vote_options for select
to anon
using (
  exists (
    select 1
    from public.proposals p
    where p.id = proposal_vote_options.proposal_id
      and p.status = any (array['approved', 'voting', 'closed', 'published'])
      and p.published_at is not null
  )
);

create policy "authenticated reads allowed vote options"
on public.proposal_vote_options for select
to authenticated
using (
  app_private.current_member_is_admin()
  or exists (
    select 1
    from public.proposals p
    where p.id = proposal_vote_options.proposal_id
      and (
        (
          p.status = any (array['approved', 'voting', 'closed', 'published'])
          and p.published_at is not null
        )
        or p.author_member_id = app_private.current_member_id()
      )
  )
);

create policy "authenticated inserts allowed vote options"
on public.proposal_vote_options for insert
to authenticated
with check (
  app_private.current_member_is_admin()
  or (
    app_private.current_member_is_active()
    and exists (
      select 1
      from public.proposals p
      where p.id = proposal_vote_options.proposal_id
        and p.author_member_id = app_private.current_member_id()
        and p.status = 'review'
    )
  )
);

drop policy if exists "public reads windows for approved proposals" on public.voting_windows;
drop policy if exists "members read windows for their submitted proposals" on public.voting_windows;
drop policy if exists "admins read all voting windows" on public.voting_windows;

create policy "anon reads windows for approved proposals"
on public.voting_windows for select
to anon
using (
  exists (
    select 1
    from public.proposals p
    where p.id = voting_windows.proposal_id
      and p.status = any (array['approved', 'voting', 'closed', 'published'])
      and p.published_at is not null
  )
);

create policy "authenticated reads allowed voting windows"
on public.voting_windows for select
to authenticated
using (
  app_private.current_member_is_admin()
  or exists (
    select 1
    from public.proposals p
    where p.id = voting_windows.proposal_id
      and (
        (
          p.status = any (array['approved', 'voting', 'closed', 'published'])
          and p.published_at is not null
        )
        or p.author_member_id = app_private.current_member_id()
      )
  )
);
