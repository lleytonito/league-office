alter table public.espn_teams
  add column if not exists owner_display_name text;

alter table public.championship_detections
  add column if not exists owner_display_name text,
  add column if not exists runner_up_owner_display_name text;
