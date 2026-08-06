create table if not exists public.espn_identity_aliases (
  espn_member_id text primary key,
  canonical_espn_member_id text not null,
  canonical_owner_display_name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists espn_identity_aliases_touch_updated_at on public.espn_identity_aliases;
create trigger espn_identity_aliases_touch_updated_at
before update on public.espn_identity_aliases
for each row execute function app_private.touch_updated_at();

alter table public.espn_identity_aliases enable row level security;

grant select, insert, update, delete on public.espn_identity_aliases to authenticated;

create policy "signed in users read espn identity aliases"
on public.espn_identity_aliases for select
to authenticated
using (app_private.current_member_id() is not null);

create policy "admins write espn identity aliases"
on public.espn_identity_aliases for all
to authenticated
using (app_private.current_member_is_admin())
with check (app_private.current_member_is_admin());

insert into public.espn_identity_aliases (
  espn_member_id,
  canonical_espn_member_id,
  canonical_owner_display_name,
  note
) values
  (
    '{BD9F3F04-AA6D-4D3F-9F3F-04AA6D8D3F1B}',
    '{3989A41F-14C1-4996-811E-52C1D0860E3C}',
    'Jorden Morales',
    'Manual historical ESPN identity merge for Jorden.'
  ),
  (
    '{B72290F6-E5CD-4577-9AE1-B5A31FC1B513}',
    '{3989A41F-14C1-4996-811E-52C1D0860E3C}',
    'Jorden Morales',
    'Manual historical ESPN identity merge for Jorden.'
  ),
  (
    '{3989A41F-14C1-4996-811E-52C1D0860E3C}',
    '{3989A41F-14C1-4996-811E-52C1D0860E3C}',
    'Jorden Morales',
    'Canonical active ESPN identity for Jorden.'
  ),
  (
    '{8664AAFC-E475-437E-A4AA-FCE475637ED5}',
    '{8AD4B9A3-43CC-4BD2-80AE-1ED203C5862E}',
    'Benton Worthen',
    'Manual historical ESPN identity merge for Benton.'
  ),
  (
    '{8AD4B9A3-43CC-4BD2-80AE-1ED203C5862E}',
    '{8AD4B9A3-43CC-4BD2-80AE-1ED203C5862E}',
    'Benton Worthen',
    'Canonical ESPN identity for Benton.'
  ),
  (
    '{2154EA28-82E4-4ED1-BA34-A74C7332BE99}',
    '{7B3A367D-C0E4-479B-8F05-DF44A8B7A481}',
    'Lleyton Ito',
    'Manual historical ESPN identity merge for Lleyton/Kristin Ito.'
  ),
  (
    '{7B3A367D-C0E4-479B-8F05-DF44A8B7A481}',
    '{7B3A367D-C0E4-479B-8F05-DF44A8B7A481}',
    'Lleyton Ito',
    'Canonical active ESPN identity for Lleyton.'
  )
on conflict (espn_member_id) do update
set
  canonical_espn_member_id = excluded.canonical_espn_member_id,
  canonical_owner_display_name = excluded.canonical_owner_display_name,
  note = excluded.note,
  updated_at = now();

update public.member_team_links link
set
  espn_member_id = alias.canonical_espn_member_id,
  updated_at = now()
from public.espn_identity_aliases alias
where link.espn_member_id = alias.espn_member_id
  and link.espn_member_id <> alias.canonical_espn_member_id
  and not exists (
    select 1
    from public.member_team_links existing
    where existing.espn_member_id = alias.canonical_espn_member_id
  );
