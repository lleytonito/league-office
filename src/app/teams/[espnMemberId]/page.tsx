import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { buildHeadToHead, teamSeasonKey, type NormalizedEspnMatchup } from "@/lib/espn/analytics";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Link2, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type HeaderMember = {
  display_name: string;
  id: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type EspnTeamRow = {
  espn_member_id: string | null;
  espn_team_id: number;
  final_rank: number | null;
  logo_url: string | null;
  points: number | null;
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

type CurrentTeamLinkRow = {
  espn_member_id: string;
};

type MatchupRow = {
  away_score: number | null;
  away_team_id: number | null;
  espn_matchup_id: number;
  home_score: number | null;
  home_team_id: number | null;
  matchup_period_id: number;
  playoff_tier_type: string | null;
  season: number;
  winner: string | null;
};

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ espnMemberId: string }>;
}) {
  const { espnMemberId } = await params;
  const decodedEspnMemberId = decodeURIComponent(espnMemberId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: currentMember } = await supabase
    .from("league_members")
    .select("id, display_name, team_name, is_member, is_admin, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<HeaderMember>();

  const [
    { data: targetTeams },
    { data: targetLink },
    { data: currentLink },
    { data: allLinkedTeams },
    { data: matchups },
  ] = await Promise.all([
    supabase
      .from("espn_teams")
      .select("season, espn_member_id, espn_team_id, team_name, logo_url, final_rank, points")
      .eq("espn_member_id", decodedEspnMemberId)
      .order("season", { ascending: false })
      .returns<EspnTeamRow[]>(),
    supabase
      .from("member_team_links")
      .select("espn_member_id, member:league_members(id, display_name, team_name)")
      .eq("espn_member_id", decodedEspnMemberId)
      .maybeSingle<TeamLinkRow>(),
    currentMember
      ? supabase
          .from("member_team_links")
          .select("espn_member_id")
          .eq("member_id", currentMember.id)
          .maybeSingle<CurrentTeamLinkRow>()
      : { data: null },
    supabase
      .from("espn_teams")
      .select("season, espn_member_id, espn_team_id, team_name, logo_url, final_rank, points")
      .returns<EspnTeamRow[]>(),
    supabase
      .from("espn_matchups")
      .select(
        "season, espn_matchup_id, matchup_period_id, home_team_id, away_team_id, home_score, away_score, winner, playoff_tier_type",
      )
      .returns<MatchupRow[]>(),
  ]);

  if (!targetTeams?.length) {
    notFound();
  }

  const latestTeam = targetTeams[0];
  const linkedMember = targetLink?.member ?? null;
  const currentEspnMemberId = currentLink?.espn_member_id ?? null;
  const currentTeamRows = currentEspnMemberId
    ? (allLinkedTeams ?? []).filter((team) => team.espn_member_id === currentEspnMemberId)
    : [];
  const targetKeys = new Set(targetTeams.map((team) => teamSeasonKey(team.season, team.espn_team_id)));
  const currentKeys = new Set(currentTeamRows.map((team) => teamSeasonKey(team.season, team.espn_team_id)));
  const h2h =
    currentEspnMemberId && currentEspnMemberId !== decodedEspnMemberId
      ? buildHeadToHead(currentKeys, targetKeys, (matchups ?? []).map(normalizeMatchupRow))
      : null;

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={currentMember} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/members">
          <ArrowLeft size={16} aria-hidden="true" />
          Teams
        </Link>

        <article className="overflow-hidden rounded-[10px] border border-[#d9decf] bg-white shadow-sm">
          <div className="border-l-4 border-[#587246] p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <TeamLogo logoUrl={latestTeam.logo_url} teamName={latestTeam.team_name} />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-tight text-[#111411]">{latestTeam.team_name}</h1>
                <p className="mt-1 text-base text-[#626b59]">
                  {linkedMember ? `Linked to ${linkedMember.display_name}` : "No League Office profile linked yet"}
                </p>
              </div>
            </div>
          </div>
        </article>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Swords className="text-[#587246]" size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Head to Head</h2>
          </div>
          {h2h ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Record" value={`${h2h.wins}-${h2h.losses}${h2h.ties ? `-${h2h.ties}` : ""}`} />
              <Stat label="Points for" value={h2h.pointsFor.toLocaleString()} />
              <Stat label="Points against" value={h2h.pointsAgainst.toLocaleString()} />
              <Stat label="Matchups" value={String(h2h.totalMatchups)} />
              <Stat label="Avg margin" value={String(h2h.averageMargin)} />
              <Stat label="Seasons" value={`${h2h.seasons[0]}-${h2h.seasons.at(-1)}`} />
            </div>
          ) : (
            <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
              <Link2 className="mr-1 inline text-[#8a9380]" size={15} aria-hidden="true" />
              Link your League Office profile to an ESPN team to see your all-time matchup history here.
            </p>
          )}
        </section>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="text-[#b8872f]" size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Season finishes</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {targetTeams.map((team) => (
              <p
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] px-3 py-2 text-sm"
                key={`${team.season}-${team.espn_team_id}`}
              >
                <span className="font-semibold text-[#293421]">{team.season}</span>
                <span className="min-w-0 flex-1 truncate text-[#626b59]">{team.team_name}</span>
                <span className="font-semibold text-[#3e4a36]">
                  {team.final_rank ? `#${team.final_rank}` : "TBD"}
                </span>
              </p>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function normalizeMatchupRow(row: MatchupRow): NormalizedEspnMatchup {
  return {
    awayScore: row.away_score,
    awayTeamId: row.away_team_id,
    espnMatchupId: row.espn_matchup_id,
    homeScore: row.home_score,
    homeTeamId: row.home_team_id,
    matchupPeriodId: row.matchup_period_id,
    playoffTierType: row.playoff_tier_type,
    season: row.season,
    winner: row.winner,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#f7f8f4] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#293421]">{value}</p>
    </div>
  );
}

function TeamLogo({ logoUrl, teamName }: { logoUrl: string | null; teamName: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-16 w-16 shrink-0 rounded-full border border-[#d9decf] bg-[#f7f8f4] object-cover"
        src={logoUrl}
      />
    );
  }

  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#183a2b] text-lg font-semibold text-white">
      {teamName.slice(0, 2).toUpperCase()}
    </span>
  );
}
