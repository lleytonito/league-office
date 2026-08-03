# League Office

League Office is a fantasy football league governance app for commissioner-managed proposals, voting windows, member access, and audit history.

## Environments

- Production: https://league-office.netlify.app
- Dev branch deploy: https://dev--league-office.netlify.app
- GitHub repo: https://github.com/lleytonito/league-office
- Supabase project ref: `lqduwieteamxlbnsjyxb`

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Supabase publishable key from the Supabase dashboard or Netlify environment settings.

## Supabase Auth URLs

Supabase `Authentication` -> `URL Configuration` should use:

- Site URL: `https://league-office.netlify.app`
- Redirect URL: `https://league-office.netlify.app/auth/callback`
- Redirect URL: `https://dev--league-office.netlify.app/auth/callback`
- Redirect URL: `http://127.0.0.1:3000/auth/callback`
- Redirect URL: `http://localhost:3000/auth/callback`

Google Cloud OAuth should allow the Supabase provider callback:

```text
https://lqduwieteamxlbnsjyxb.supabase.co/auth/v1/callback
```

## Database

The current remote schema is captured in:

```text
supabase/migrations/20260803063000_initial_league_office_schema.sql
```

The Supabase CLI scaffold is present in `supabase/config.toml` and linked to the remote project. Linked SQL queries and advisors work without Docker:

```bash
npx supabase db query --linked "select count(*) from public.league_members;"
npx supabase db advisors --linked
```

Docker Desktop is still required for CLI schema diff/dump workflows:

```bash
npx supabase db pull verify_remote_schema --linked --schema public,app_private
```

The committed migration was created from catalog inspection through the authenticated Supabase connector. Use `db pull` as a verification artifact once Docker Desktop is available.

## Verification

```bash
npm run lint
npm run test:run
npm run build
npm run e2e
```

For the Windows mobile wrapper:

```bash
npm run e2e:mobile
```
