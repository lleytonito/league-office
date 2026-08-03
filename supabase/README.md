# League Office Supabase Setup

Project: `league-office`

Project ref: `lqduwieteamxlbnsjyxb`

Local migration snapshot:

- `migrations/20260803063000_initial_league_office_schema.sql`

Applied setup:

- `league_members`
- `proposals`
- `proposal_status_history`
- `voting_windows`
- `proposal_vote_options`
- `votes`
- `vote_history`
- `admin_audit_events`
- `app_settings`
- RLS policies for authenticated reads, active-member submissions/votes, admin management, and revoked read-only access
- Auth trigger that creates a member profile on first sign-in
- Commissioner bootstrap: `lleytonito@gmail.com` becomes admin on first Google sign-in

Google OAuth still needs provider credentials in the Supabase dashboard:

- App URL: `https://league-office.netlify.app`
- Local URL: `http://127.0.0.1:3000`
- App callback: `/auth/callback`
- Supabase provider callback: `https://lqduwieteamxlbnsjyxb.supabase.co/auth/v1/callback`

CLI status:

- `supabase/config.toml` has been initialized.
- The local CLI is linked to project ref `lqduwieteamxlbnsjyxb`.
- Linked SQL queries and advisors work without Docker.
- `supabase db pull` and `supabase db dump` are blocked until Docker Desktop is installed because the CLI uses Docker for those workflows.
