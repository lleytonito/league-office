create table if not exists public.espn_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status = any (array['running', 'completed', 'partial', 'failed'])),
  league_id text not null,
  seasons_requested integer[] not null default '{}',
  seasons_completed integer[] not null default '{}',
  error_summary text,
  triggered_by_member_id uuid references public.league_members(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.espn_league_snapshots (
  season integer primary key,
  league_id text not null,
  raw jsonb not null,
  status text not null default 'ok' check (status = any (array['ok', 'failed'])),
  error_summary text,
  fetched_at timestamptz not null default now(),
  sync_run_id uuid references public.espn_sync_runs(id) on delete set null
);

create table if not exists public.espn_teams (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  espn_team_id integer not null,
  espn_member_id text,
  team_name text not null,
  abbreviation text,
  logo_url text,
  final_rank integer,
  playoff_seed integer,
  points numeric,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  sync_run_id uuid references public.espn_sync_runs(id) on delete set null,
  unique (season, espn_team_id)
);

create table if not exists public.espn_matchups (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  espn_matchup_id integer not null,
  matchup_period_id integer not null,
  home_team_id integer,
  away_team_id integer,
  home_score numeric,
  away_score numeric,
  winner text,
  playoff_tier_type text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  sync_run_id uuid references public.espn_sync_runs(id) on delete set null,
  unique (season, espn_matchup_id)
);

create table if not exists public.member_team_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.league_members(id) on delete cascade,
  espn_member_id text not null,
  label text,
  created_by_member_id uuid references public.league_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id),
  unique (espn_member_id)
);

create table if not exists public.analytics_results (
  metric_key text primary key constraint analytics_results_metric_key_format check (metric_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null constraint analytics_results_title_length check (char_length(title) between 2 and 120),
  summary text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'fresh' check (status = any (array['fresh', 'stale', 'failed'])),
  error_summary text,
  last_refreshed_at timestamptz,
  updated_by_member_id uuid references public.league_members(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.championship_detections (
  season integer primary key,
  espn_team_id integer not null,
  espn_member_id text,
  team_name text not null,
  member_id uuid references public.league_members(id) on delete set null,
  runner_up_espn_team_id integer,
  runner_up_espn_member_id text,
  runner_up_team_name text,
  confidence text not null default 'rank_calculated_final' constraint championship_detections_confidence_length check (char_length(confidence) between 2 and 80),
  applied_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_espn_sync_runs_started_at on public.espn_sync_runs(started_at desc);
create index if not exists idx_espn_teams_espn_member_id on public.espn_teams(espn_member_id);
create index if not exists idx_espn_teams_season_rank on public.espn_teams(season, final_rank);
create index if not exists idx_espn_matchups_season_teams on public.espn_matchups(season, home_team_id, away_team_id);
create index if not exists idx_member_team_links_member_id on public.member_team_links(member_id);
create index if not exists idx_member_team_links_espn_member_id on public.member_team_links(espn_member_id);

create trigger member_team_links_touch_updated_at
before update on public.member_team_links
for each row execute function app_private.touch_updated_at();

create trigger analytics_results_touch_updated_at
before update on public.analytics_results
for each row execute function app_private.touch_updated_at();

create trigger championship_detections_touch_updated_at
before update on public.championship_detections
for each row execute function app_private.touch_updated_at();

alter table public.espn_sync_runs enable row level security;
alter table public.espn_league_snapshots enable row level security;
alter table public.espn_teams enable row level security;
alter table public.espn_matchups enable row level security;
alter table public.member_team_links enable row level security;
alter table public.analytics_results enable row level security;
alter table public.championship_detections enable row level security;

grant select, insert, update, delete on public.espn_sync_runs to authenticated;
grant select, insert, update, delete on public.espn_league_snapshots to authenticated;
grant select, insert, update, delete on public.espn_teams to authenticated;
grant select, insert, update, delete on public.espn_matchups to authenticated;
grant select, insert, update, delete on public.member_team_links to authenticated;
grant select, insert, update, delete on public.analytics_results to authenticated;
grant select, insert, update, delete on public.championship_detections to authenticated;

create policy "signed in users read espn sync runs"
on public.espn_sync_runs for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write espn sync runs"
on public.espn_sync_runs for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read espn snapshots"
on public.espn_league_snapshots for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write espn snapshots"
on public.espn_league_snapshots for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read espn teams"
on public.espn_teams for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write espn teams"
on public.espn_teams for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read espn matchups"
on public.espn_matchups for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write espn matchups"
on public.espn_matchups for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read member team links"
on public.member_team_links for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write member team links"
on public.member_team_links for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read analytics results"
on public.analytics_results for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write analytics results"
on public.analytics_results for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "signed in users read championship detections"
on public.championship_detections for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write championship detections"
on public.championship_detections for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());
