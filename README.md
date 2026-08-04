# League Office

League Office is a fantasy football league home base for proposals, voting, member/team profiles, and ESPN-powered league history.

The app is built for a commissioner-managed fantasy football league where most members will use the site on mobile. The current production version supports public feed browsing, Google sign-in, proposal submission/review, one-vote-per-member voting, admin controls, team linking, badges, and early analytics.

## Environments

- Production: https://league-office.netlify.app
- Dev branch deploy: https://dev--league-office.netlify.app
- GitHub repo: https://github.com/lleytonito/league-office
- Production Supabase: `xbetynbakdhnjqdnxzkf`
- Dev Supabase: `lqduwieteamxlbnsjyxb`

Development happens on `dev` and promotes to production through `main`.

## Current Features

- Public feed with pinned/informational posts and proposal vote cards
- Google sign-in through Supabase Auth
- Member proposal submission with commissioner approval before feed visibility
- Custom proposal vote options, one vote per member, visible vote activity after voting
- Commissioner/admin proposal management, pinned posts, member access, exports, and ESPN refresh controls
- Team directory backed by ESPN league history
- Member-to-ESPN-team linking, including first-sign-in team selection
- Profile pages with linked team and season finishes
- Badge foundation with championship badge support
- Analytics screen with all-time PWR rankings, championship W/L, and formula details
- ESPN identity alias support for historical owner/team changes

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with Supabase and ESPN values from the relevant dev environment. Do not commit real secrets.

## Supabase Auth URLs

Each Supabase project should have URL configuration for the environment it serves:

- Site URL: `https://league-office.netlify.app`
- Redirect URL: `https://league-office.netlify.app/auth/callback`
- Redirect URL: `https://dev--league-office.netlify.app/auth/callback`
- Redirect URL: `http://127.0.0.1:3000/auth/callback`
- Redirect URL: `http://localhost:3000/auth/callback`

Google Cloud OAuth should allow the Supabase provider callback:

```text
https://lqduwieteamxlbnsjyxb.supabase.co/auth/v1/callback
https://xbetynbakdhnjqdnxzkf.supabase.co/auth/v1/callback
```

## Database

Schema changes live in `supabase/migrations`. The workspace should normally be linked to the dev Supabase project:

```bash
npx supabase projects list
```

Useful dev checks:

```bash
npx supabase db query --linked "select count(*) from public.league_members;"
npx supabase db advisors --linked
```

ESPN analytics can be refreshed from the backend against the currently linked Supabase project:

```bash
npm run espn:refresh:dev
```

Be careful with that command: despite the script name, it writes to whichever Supabase project is currently linked.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
npm run e2e
```

To run smoke tests against deployed environments:

```bash
$env:PLAYWRIGHT_BASE_URL='https://dev--league-office.netlify.app'; npm run e2e
$env:PLAYWRIGHT_BASE_URL='https://league-office.netlify.app'; npm run e2e
```

## Deployment Notes

Netlify deploys `main` to production and `dev` to the dev branch deploy. Before promoting analytics-related work, apply migrations to the target Supabase project and confirm the app is using the matching project URL/key in Netlify environment settings.

After production deployment, smoke test:

- Public feed
- Google sign-in
- Proposal voting feedback on mobile
- Analytics rankings
- Team directory and linked profile page
- Admin ESPN refresh controls
