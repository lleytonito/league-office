create table if not exists public.feed_announcements (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid references public.league_members(id),
  title text not null constraint feed_announcements_title_length check (char_length(title) between 4 and 140),
  body text not null constraint feed_announcements_body_length check (char_length(body) between 10 and 4000),
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_announcements_pin_consistency check ((is_pinned = false) or (pinned_at is not null))
);

alter table public.proposals
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists voting_closes_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists passed boolean,
  add constraint proposals_pin_consistency check ((is_pinned = false) or (pinned_at is not null));

create index if not exists idx_feed_announcements_published_pinned
  on public.feed_announcements(published_at desc, pinned_at desc)
  where published_at is not null;

create index if not exists idx_proposals_feed_visibility
  on public.proposals(status, is_pinned desc, published_at desc, created_at desc);

create trigger feed_announcements_touch_updated_at
before update on public.feed_announcements
for each row execute function app_private.touch_updated_at();

alter table public.feed_announcements enable row level security;

grant select on public.feed_announcements to anon, authenticated;
grant insert, update, delete on public.feed_announcements to authenticated;
grant select on public.proposals to anon, authenticated;
grant insert, update on public.proposals to authenticated;
grant select on public.proposal_vote_options to anon, authenticated;
grant insert, update, delete on public.proposal_vote_options to authenticated;
grant select on public.voting_windows to anon, authenticated;
grant insert, update, delete on public.voting_windows to authenticated;
grant select, insert on public.votes to authenticated;

drop policy if exists "members read proposals" on public.proposals;
drop policy if exists "members read vote options" on public.proposal_vote_options;
drop policy if exists "members read voting windows" on public.voting_windows;
drop policy if exists "active members change votes before deadline" on public.votes;

create policy "public reads published announcements"
on public.feed_announcements for select
to anon, authenticated
using (published_at is not null);

create policy "admins insert announcements"
on public.feed_announcements for insert
to authenticated
with check (
  app_private.current_member_is_admin()
  and author_member_id = app_private.current_member_id()
);

create policy "admins update announcements"
on public.feed_announcements for update
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "admins delete announcements"
on public.feed_announcements for delete
to authenticated
using (app_private.current_member_is_admin());

create policy "public reads approved proposals"
on public.proposals for select
to anon, authenticated
using (
  status = any (array['approved', 'voting', 'closed', 'published'])
  and published_at is not null
);

create policy "members read their submitted proposals"
on public.proposals for select
to authenticated
using (author_member_id = app_private.current_member_id());

create policy "admins read all proposals"
on public.proposals for select
to authenticated
using (app_private.current_member_is_admin());

create policy "public reads options for approved proposals"
on public.proposal_vote_options for select
to anon, authenticated
using (
  exists (
    select 1
    from public.proposals p
    where p.id = proposal_vote_options.proposal_id
      and p.status = any (array['approved', 'voting', 'closed', 'published'])
      and p.published_at is not null
  )
);

create policy "members read options for their submitted proposals"
on public.proposal_vote_options for select
to authenticated
using (
  exists (
    select 1
    from public.proposals p
    where p.id = proposal_vote_options.proposal_id
      and p.author_member_id = app_private.current_member_id()
  )
);

create policy "admins read all vote options"
on public.proposal_vote_options for select
to authenticated
using (app_private.current_member_is_admin());

create policy "active members add options to their review proposals"
on public.proposal_vote_options for insert
to authenticated
with check (
  app_private.current_member_is_active()
  and exists (
    select 1
    from public.proposals p
    where p.id = proposal_vote_options.proposal_id
      and p.author_member_id = app_private.current_member_id()
      and p.status = 'review'
  )
);

create policy "public reads windows for approved proposals"
on public.voting_windows for select
to anon, authenticated
using (
  exists (
    select 1
    from public.proposals p
    where p.id = voting_windows.proposal_id
      and p.status = any (array['approved', 'voting', 'closed', 'published'])
      and p.published_at is not null
  )
);

create policy "members read windows for their submitted proposals"
on public.voting_windows for select
to authenticated
using (
  exists (
    select 1
    from public.proposals p
    where p.id = voting_windows.proposal_id
      and p.author_member_id = app_private.current_member_id()
  )
);

create policy "admins read all voting windows"
on public.voting_windows for select
to authenticated
using (app_private.current_member_is_admin());

insert into public.feed_announcements (title, body, is_pinned, pinned_at, published_at)
values (
  'Welcome to League Office',
  'This is the home base for league proposals, votes, and commissioner updates. For now, members can submit proposals for review and vote on approved items once they are open.',
  true,
  now(),
  now()
)
on conflict do nothing;
