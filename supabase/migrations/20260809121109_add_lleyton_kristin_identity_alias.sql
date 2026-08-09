insert into public.espn_identity_aliases (
  espn_member_id,
  canonical_espn_member_id,
  canonical_owner_display_name,
  note
) values
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
    'Canonical ESPN identity for Lleyton Ito.'
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
