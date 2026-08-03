# League Office Supabase Setup

Project: `league-office`

Project ref: `lqduwieteamxlbnsjyxb`

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
