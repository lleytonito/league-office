alter table public.league_members
  add column if not exists profile_bio text constraint league_members_profile_bio_length check (profile_bio is null or char_length(profile_bio) <= 280),
  add column if not exists avatar_color text not null default '#183a2b' constraint league_members_avatar_color_format check (avatar_color ~ '^#[0-9A-Fa-f]{6}$');

create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique constraint badge_definitions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null constraint badge_definitions_name_length check (char_length(name) between 2 and 80),
  description text constraint badge_definitions_description_length check (description is null or char_length(description) <= 240),
  icon_key text not null default 'award' constraint badge_definitions_icon_key_length check (char_length(icon_key) between 2 and 40),
  color text not null default '#b8872f' constraint badge_definitions_color_format check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_by_member_id uuid references public.league_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_badges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.league_members(id) on delete cascade,
  badge_id uuid not null references public.badge_definitions(id) on delete cascade,
  quantity integer not null default 1 constraint member_badges_quantity_positive check (quantity > 0),
  note text constraint member_badges_note_length check (note is null or char_length(note) <= 240),
  awarded_by_member_id uuid references public.league_members(id),
  awarded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, badge_id)
);

create index if not exists idx_badge_definitions_active_name
  on public.badge_definitions(is_active, name);

create index if not exists idx_member_badges_badge_id
  on public.member_badges(badge_id);

create index if not exists idx_member_badges_member_id
  on public.member_badges(member_id);

create trigger badge_definitions_touch_updated_at
before update on public.badge_definitions
for each row execute function app_private.touch_updated_at();

create trigger member_badges_touch_updated_at
before update on public.member_badges
for each row execute function app_private.touch_updated_at();

alter table public.badge_definitions enable row level security;
alter table public.member_badges enable row level security;

grant select on public.badge_definitions to authenticated;
grant insert, update, delete on public.badge_definitions to authenticated;

grant select on public.member_badges to authenticated;
grant insert, update, delete on public.member_badges to authenticated;

create policy "signed in users read badge definitions"
on public.badge_definitions for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins insert badge definitions"
on public.badge_definitions for insert
to authenticated
with check (app_private.current_member_is_admin());

create policy "admins update badge definitions"
on public.badge_definitions for update
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "admins delete badge definitions"
on public.badge_definitions for delete
to authenticated
using (app_private.current_member_is_admin());

create policy "signed in users read member badges"
on public.member_badges for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins insert member badges"
on public.member_badges for insert
to authenticated
with check (app_private.current_member_is_admin());

create policy "admins update member badges"
on public.member_badges for update
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

create policy "admins delete member badges"
on public.member_badges for delete
to authenticated
using (app_private.current_member_is_admin());

create policy "active members update own public profile"
on public.league_members for update
to authenticated
using (
  auth_user_id = (select auth.uid())
  and id = app_private.current_member_id()
  and is_admin = false
  and is_member = true
  and revoked_at is null
)
with check (
  auth_user_id = (select auth.uid())
  and id = app_private.current_member_id()
  and is_admin = false
  and is_member = true
  and revoked_at is null
);

insert into public.badge_definitions (slug, name, description, icon_key, color)
values (
  'league-champion',
  'League Champion',
  'Awarded to managers who have won the league championship.',
  'trophy',
  '#b8872f'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  color = excluded.color,
  is_active = true,
  updated_at = now();
