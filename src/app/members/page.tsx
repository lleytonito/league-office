import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ChevronRight, Link2, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";

type HeaderMember = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type EspnTeamRow = {
  espn_member_id: string | null;
  espn_team_id: number;
  logo_url: string | null;
  owner_display_name: string | null;
  season: number;
  team_name: string;
};

type TeamLinkRow = {
  espn_member_id: string;
  member: {
    display_name: string;
    id: string;
    team_name: string | null;
  } | null;
};

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const [{ data: currentMember }, { data: espnTeams, error: teamsError }, { data: links }] =
    await Promise.all([
      supabase
        .from("league_members")
        .select("display_name, team_name, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<HeaderMember>(),
      supabase
        .from("espn_teams")
        .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url")
        .not("espn_member_id", "is", null)
        .order("season", { ascending: false })
        .returns<EspnTeamRow[]>(),
      supabase
        .from("member_team_links")
        .select("espn_member_id, member:league_members(id, display_name, team_name)")
        .returns<TeamLinkRow[]>(),
    ]);

  const teams = latestTeamsByOwner(espnTeams ?? []);
  const linksByEspnId = new Map((links ?? []).map((link) => [link.espn_member_id, link.member]));

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={currentMember} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <header className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UsersRound className="text-[#587246]" size={22} aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold">Teams</h1>
              <p className="mt-1 text-sm text-[#626b59]">ESPN teams and linked League Office profiles</p>
            </div>
          </div>
        </header>

        {teamsError ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Teams could not load.
          </p>
        ) : teams.length ? (
          <div className="grid gap-3">
            {teams.map((team) => {
              const linkedMember = linksByEspnId.get(team.espn_member_id ?? "");
              return (
                <Link
                  className="group rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm transition hover:border-[#b9c7ad] hover:bg-[#fbfcf8]"
                  href={`/teams/${encodeURIComponent(team.espn_member_id ?? "")}`}
                  key={team.espn_member_id}
                >
                  <article className="flex items-center gap-3">
                    <TeamLogo logoUrl={team.logo_url} teamName={team.team_name} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-[#293421]">
                        {team.owner_display_name ?? team.team_name}
                      </h2>
                      <p className="truncate text-sm text-[#626b59]">
                        {team.team_name}
                      </p>
                      {linkedMember ? (
                        <p className="mt-1 truncate text-xs font-semibold text-[#587246]">
                          Linked to {linkedMember.display_name}
                        </p>
                      ) : null}
                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          linkedMember ? "bg-[#e9eee0] text-[#3e4a36]" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {linkedMember ? <ShieldCheck size={13} aria-hidden="true" /> : <Link2 size={13} aria-hidden="true" />}
                        {linkedMember ? "Profile connected" : "Awaiting profile link"}
                      </span>
                    </div>
                    <ChevronRight
                      className="shrink-0 text-[#8a9380] transition group-hover:translate-x-0.5 group-hover:text-[#587246]"
                      size={19}
                      aria-hidden="true"
                    />
                  </article>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
            Refresh ESPN analytics from the admin screen to load teams.
          </p>
        )}
      </section>
    </main>
  );
}

function latestTeamsByOwner(rows: EspnTeamRow[]) {
  const latestSeason = Math.max(...rows.map((row) => row.season));
  const teams = new Map<string, EspnTeamRow>();

  for (const row of rows.filter((item) => item.season === latestSeason)) {
    if (!row.espn_member_id || teams.has(row.espn_member_id)) {
      continue;
    }

    teams.set(row.espn_member_id, row);
  }

  return [...teams.values()].sort((a, b) => a.team_name.localeCompare(b.team_name));
}

function TeamLogo({ logoUrl, teamName }: { logoUrl: string | null; teamName: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-[#d9decf] bg-[#f7f8f4] object-cover"
        src={logoUrl}
      />
    );
  }

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#183a2b] text-sm font-semibold text-white">
      {teamName.slice(0, 2).toUpperCase()}
    </span>
  );
}
