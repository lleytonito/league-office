create schema if not exists app_private;

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null constraint league_members_display_name_length check (char_length(display_name) between 1 and 80),
  team_name text constraint league_members_team_name_length check (team_name is null or char_length(team_name) <= 80),
  avatar_url text,
  is_member boolean not null default true,
  is_admin boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_members_revoked_consistency check (((is_member = false) and (revoked_at is not null)) or (is_member = true))
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid not null references public.league_members(id),
  title text not null constraint proposals_title_length check (char_length(title) between 4 and 140),
  summary text not null constraint proposals_summary_length check (char_length(summary) between 10 and 4000),
  rationale text,
  status text not null default 'review' check (status = any (array['draft', 'review', 'approved', 'voting', 'closed', 'published', 'rejected'])),
  reviewed_by_member_id uuid references public.league_members(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_member_id uuid references public.league_members(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.proposal_vote_options (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  label text not null constraint proposal_vote_options_label_length check (char_length(label) between 1 and 80),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (proposal_id, label)
);

create table if not exists public.voting_windows (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  closed_at timestamptz,
  published_at timestamptz,
  passing_threshold text not null default 'simple_majority_votes_cast',
  created_by_member_id uuid references public.league_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voting_windows_dates_check check (ends_at > starts_at),
  constraint voting_windows_threshold_check check (passing_threshold = 'simple_majority_votes_cast')
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  option_id uuid not null references public.proposal_vote_options(id),
  voter_member_id uuid not null references public.league_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_id, voter_member_id)
);

create table if not exists public.vote_history (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  voter_member_id uuid not null references public.league_members(id),
  from_option_id uuid references public.proposal_vote_options(id),
  to_option_id uuid not null references public.proposal_vote_options(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_member_id uuid references public.league_members(id),
  action_type text not null,
  target_type text not null,
  target_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by_member_id uuid references public.league_members(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_events_actor_member_id on public.admin_audit_events(actor_member_id);
create index if not exists idx_app_settings_updated_by_member_id on public.app_settings(updated_by_member_id);
create index if not exists idx_proposal_status_history_actor_member_id on public.proposal_status_history(actor_member_id);
create index if not exists idx_proposal_status_history_proposal_id on public.proposal_status_history(proposal_id);
create index if not exists idx_proposals_author_member_id on public.proposals(author_member_id);
create index if not exists idx_proposals_reviewed_by_member_id on public.proposals(reviewed_by_member_id);
create index if not exists idx_proposals_status_created_at on public.proposals(status, created_at desc);
create index if not exists idx_vote_history_from_option_id on public.vote_history(from_option_id);
create index if not exists idx_vote_history_proposal_id on public.vote_history(proposal_id);
create index if not exists idx_vote_history_to_option_id on public.vote_history(to_option_id);
create index if not exists idx_vote_history_vote_id on public.vote_history(vote_id);
create index if not exists idx_vote_history_voter_member_id on public.vote_history(voter_member_id);
create index if not exists idx_votes_option_id on public.votes(option_id);
create index if not exists idx_votes_voter_member_id on public.votes(voter_member_id);
create index if not exists idx_voting_windows_created_by_member_id on public.voting_windows(created_by_member_id);
create index if not exists idx_voting_windows_dates on public.voting_windows(starts_at, ends_at);

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select id from public.league_members where auth_user_id = (select auth.uid()) limit 1;
$$;

create or replace function app_private.current_member_is_active()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.league_members
    where auth_user_id = (select auth.uid())
      and is_member = true
      and revoked_at is null
  );
$$;

create or replace function app_private.current_member_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.league_members
    where auth_user_id = (select auth.uid())
      and is_member = true
      and is_admin = true
      and revoked_at is null
  );
$$;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1),
    'League Member'
  );

  insert into public.league_members (
    auth_user_id,
    display_name,
    avatar_url,
    is_member,
    is_admin
  ) values (
    new.id,
    profile_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    true,
    lower(coalesce(new.email, '')) = 'lleytonito@gmail.com'
  )
  on conflict (auth_user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = coalesce(public.league_members.avatar_url, excluded.avatar_url),
    is_admin = public.league_members.is_admin or excluded.is_admin,
    updated_at = now();

  return new;
end;
$$;

create or replace function app_private.record_vote_history()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.vote_history (vote_id, proposal_id, voter_member_id, from_option_id, to_option_id)
    values (new.id, new.proposal_id, new.voter_member_id, null, new.option_id);
  elsif tg_op = 'UPDATE' and old.option_id is distinct from new.option_id then
    insert into public.vote_history (vote_id, proposal_id, voter_member_id, from_option_id, to_option_id)
    values (new.id, new.proposal_id, new.voter_member_id, old.option_id, new.option_id);
  end if;

  return new;
end;
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_member_id() to authenticated;
grant execute on function app_private.current_member_is_active() to authenticated;
grant execute on function app_private.current_member_is_admin() to authenticated;

create trigger on_auth_user_created_league_member
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

create trigger league_members_touch_updated_at
before update on public.league_members
for each row execute function app_private.touch_updated_at();

create trigger proposals_touch_updated_at
before update on public.proposals
for each row execute function app_private.touch_updated_at();

create trigger voting_windows_touch_updated_at
before update on public.voting_windows
for each row execute function app_private.touch_updated_at();

create trigger votes_record_history
after insert or update on public.votes
for each row execute function app_private.record_vote_history();

alter table public.admin_audit_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.league_members enable row level security;
alter table public.proposal_status_history enable row level security;
alter table public.proposal_vote_options enable row level security;
alter table public.proposals enable row level security;
alter table public.vote_history enable row level security;
alter table public.votes enable row level security;
alter table public.voting_windows enable row level security;

create policy "admins read audit events" on public.admin_audit_events for select to authenticated using (app_private.current_member_is_admin());
create policy "admins write audit events" on public.admin_audit_events for insert to authenticated with check (app_private.current_member_is_admin());

create policy "members read app settings" on public.app_settings for select to authenticated using (app_private.current_member_id() is not null);
create policy "admins insert app settings" on public.app_settings for insert to authenticated with check (app_private.current_member_is_admin());
create policy "admins update app settings" on public.app_settings for update to authenticated using (app_private.current_member_is_admin()) with check (app_private.current_member_is_admin());
create policy "admins delete app settings" on public.app_settings for delete to authenticated using (app_private.current_member_is_admin());

create policy "members can read member directory" on public.league_members for select to authenticated using (app_private.current_member_id() is not null);
create policy "admins manage members" on public.league_members for update to authenticated using (app_private.current_member_is_admin()) with check (app_private.current_member_is_admin());

create policy "members read proposals" on public.proposals for select to authenticated using (app_private.current_member_id() is not null);
create policy "active members submit proposals" on public.proposals for insert to authenticated with check (app_private.current_member_is_active() and author_member_id = app_private.current_member_id());
create policy "admins manage proposals" on public.proposals for update to authenticated using (app_private.current_member_is_admin()) with check (app_private.current_member_is_admin());

create policy "members read proposal status history" on public.proposal_status_history for select to authenticated using (app_private.current_member_id() is not null);
create policy "admins write proposal status history" on public.proposal_status_history for insert to authenticated with check (app_private.current_member_is_admin());

create policy "members read vote options" on public.proposal_vote_options for select to authenticated using (app_private.current_member_id() is not null);
create policy "admins insert vote options" on public.proposal_vote_options for insert to authenticated with check (app_private.current_member_is_admin());
create policy "admins update vote options" on public.proposal_vote_options for update to authenticated using (app_private.current_member_is_admin()) with check (app_private.current_member_is_admin());
create policy "admins delete vote options" on public.proposal_vote_options for delete to authenticated using (app_private.current_member_is_admin());

create policy "members read voting windows" on public.voting_windows for select to authenticated using (app_private.current_member_id() is not null);
create policy "admins insert voting windows" on public.voting_windows for insert to authenticated with check (app_private.current_member_is_admin());
create policy "admins update voting windows" on public.voting_windows for update to authenticated using (app_private.current_member_is_admin()) with check (app_private.current_member_is_admin());
create policy "admins delete voting windows" on public.voting_windows for delete to authenticated using (app_private.current_member_is_admin());

create policy "members read votes after voting starts" on public.votes for select to authenticated using (app_private.current_member_id() is not null);
create policy "active members cast votes" on public.votes for insert to authenticated with check (
  app_private.current_member_is_active()
  and voter_member_id = app_private.current_member_id()
  and exists (
    select 1 from public.voting_windows vw
    where vw.proposal_id = votes.proposal_id
      and now() >= vw.starts_at
      and now() < vw.ends_at
      and vw.closed_at is null
  )
  and exists (
    select 1 from public.proposal_vote_options pvo
    where pvo.id = votes.option_id
      and pvo.proposal_id = votes.proposal_id
  )
);
create policy "active members change votes before deadline" on public.votes for update to authenticated
using (
  app_private.current_member_is_active()
  and voter_member_id = app_private.current_member_id()
  and exists (
    select 1 from public.voting_windows vw
    where vw.proposal_id = votes.proposal_id
      and now() >= vw.starts_at
      and now() < vw.ends_at
      and vw.closed_at is null
  )
)
with check (
  app_private.current_member_is_active()
  and voter_member_id = app_private.current_member_id()
  and exists (
    select 1 from public.proposal_vote_options pvo
    where pvo.id = votes.option_id
      and pvo.proposal_id = votes.proposal_id
  )
);

create policy "members read vote history" on public.vote_history for select to authenticated using (app_private.current_member_id() is not null);

insert into public.app_settings (key, value)
values ('league', '{"name": "League Office", "commissioner_email": "lleytonito@gmail.com"}'::jsonb)
on conflict (key) do nothing;
