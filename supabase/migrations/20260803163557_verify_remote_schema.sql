-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION app_private.current_member_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select id from public.league_members where auth_user_id = (select auth.uid()) limit 1;
$function$;

CREATE OR REPLACE FUNCTION app_private.current_member_is_active()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.league_members
    where auth_user_id = (select auth.uid())
      and is_member = true
      and revoked_at is null
  );
$function$;

CREATE OR REPLACE FUNCTION app_private.current_member_is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.league_members
    where auth_user_id = (select auth.uid())
      and is_member = true
      and is_admin = true
      and revoked_at is null
  );
$function$;

CREATE OR REPLACE FUNCTION app_private.handle_new_auth_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION app_private.record_vote_history()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION app_private.touch_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.admin_audit_events TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.admin_audit_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.admin_audit_events TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.app_settings TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.app_settings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.app_settings TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.league_members TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.league_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.league_members TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_status_history TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_status_history TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_status_history TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_vote_options TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_vote_options TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposal_vote_options TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposals TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposals TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.proposals TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.vote_history TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.vote_history TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.vote_history TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.votes TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.votes TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.votes TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.voting_windows TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.voting_windows TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.voting_windows TO service_role;
