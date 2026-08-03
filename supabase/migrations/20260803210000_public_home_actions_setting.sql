grant select on public.app_settings to anon;

create policy "public reads home actions setting"
on public.app_settings for select
to anon
using (key = 'home_actions');

insert into public.app_settings (key, value)
values ('home_actions', '{"visible": true}'::jsonb)
on conflict (key) do nothing;
