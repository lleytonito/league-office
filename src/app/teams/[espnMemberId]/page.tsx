import { LoginWall } from "@/components/auth/login-wall";
import type { AccoladeRecord } from "@/components/analytics/accolades-card";
import { AppHeader } from "@/components/layout/app-header";
import { SeasonFinishes } from "@/components/teams/season-finishes";
import { TeamAccolades } from "@/components/teams/team-accolades";
import { TeamEraCard } from "@/components/teams/team-era-card";
import { TeamLogo } from "@/components/teams/team-logo";
import {
  buildHeadToHead,
  buildTeamEraSummary,
  teamSeasonKey,
  type NormalizedEspnMatchup,
  type NormalizedEspnTeam,
} from "@/lib/espn/analytics";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Link2, Swords } from "lucide-react";
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
  owner_display_name: string | null;
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

type AnalyticsResultRow = {
  payload: {
    records?: AccoladeRecord[];
  };
};

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ espnMemberId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { espnMemberId } = await params;
  const { from } = await searchParams;
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
    { data: accoladeResult },
  ] = await Promise.all([
    supabase
      .from("espn_teams")
      .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url, final_rank, points")
      .eq("espn_member_id", decodedEspnMemberId)
      .order("season", { ascending: false })
      .returns<EspnTeamRow[]>(),
    supabase
      .from("member_team_links")
      .select("espn_member_id, member:league_members!member_team_links_member_id_fkey(id, display_name, team_name)")
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
      .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url, final_rank, points")
      .returns<EspnTeamRow[]>(),
    supabase
      .from("espn_matchups")
      .select(
        "season, espn_matchup_id, matchup_period_id, home_team_id, away_team_id, home_score, away_score, winner, playoff_tier_type",
      )
      .returns<MatchupRow[]>(),
    supabase
      .from("analytics_results")
      .select("payload")
      .eq("metric_key", "accolades")
      .maybeSingle<AnalyticsResultRow>(),
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
  const normalizedTargetTeams = targetTeams.map(normalizeTeamRow);
  const normalizedAllTeams = (allLinkedTeams ?? []).map(normalizeTeamRow);
  const normalizedMatchups = (matchups ?? []).map(normalizeMatchupRow);
  const h2h =
    currentEspnMemberId && currentEspnMemberId !== decodedEspnMemberId
      ? buildHeadToHead(currentKeys, targetKeys, normalizedMatchups)
      : null;
  const isOwnTeam = currentEspnMemberId === decodedEspnMemberId;
  const eraSummary = buildTeamEraSummary({
    allTeams: normalizedAllTeams,
    matchups: normalizedMatchups,
    targetTeams: normalizedTargetTeams,
  });
  const teamAccolades =
    accoladeResult?.payload?.records?.filter((record) => record.espnMemberId === decodedEspnMemberId) ?? [];
  const championships = normalizedTargetTeams.filter((team) => team.finalRank === 1).length;

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={currentMember} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]"
          href={from === "analytics" ? "/analytics" : "/members"}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {from === "analytics" ? "Analytics" : "Teams"}
        </Link>

        <article className="overflow-hidden rounded-[10px] border border-[#d9decf] bg-white shadow-sm">
          <div className="border-l-4 border-[#587246] p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <TeamLogo logoUrl={latestTeam.logo_url} size="lg" teamName={latestTeam.team_name} />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-tight text-[#111411]">
                  {latestTeam.owner_display_name ?? latestTeam.team_name}
                </h1>
                <p className="mt-1 text-base text-[#626b59]">{latestTeam.team_name}</p>
                <p className="mt-1 text-sm text-[#626b59]">
                  {linkedMember ? `Linked to ${linkedMember.display_name}` : "No League Office profile linked yet"}
                </p>
              </div>
            </div>
          </div>
        </article>

        {!isOwnTeam ? (
          <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Swords className="text-[#587246]" size={18} aria-hidden="true" />
              <h2 className="text-xl font-semibold">Head to Head</h2>
            </div>
            {h2h ? (
              <HeadToHeadStats
                averageMargin={String(h2h.averageMargin)}
                matchups={String(h2h.totalMatchups)}
                pointsAgainst={h2h.pointsAgainst.toLocaleString()}
                pointsFor={h2h.pointsFor.toLocaleString()}
                record={`${h2h.wins}-${h2h.losses}${h2h.ties ? `-${h2h.ties}` : ""}`}
                seasons={`${h2h.seasons[0]}-${h2h.seasons.at(-1)}`}
              />
            ) : currentEspnMemberId ? (
              <>
                <HeadToHeadStats
                  averageMargin="N/A"
                  matchups="0"
                  pointsAgainst="N/A"
                  pointsFor="N/A"
                  record="0-0"
                  seasons="N/A"
                />
                <p className="mt-3 text-sm leading-6 text-[#626b59]">
                  No imported ESPN matchups were found for this pairing.
                </p>
              </>
            ) : (
              <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
                <Link2 className="mr-1 inline text-[#8a9380]" size={15} aria-hidden="true" />
                Link your League Office profile to an ESPN team to see your all-time matchup history here.
              </p>
            )}
          </section>
        ) : null}

        <TeamAccolades championships={championships} records={teamAccolades} />

        <TeamEraCard summary={eraSummary} />

        <SeasonFinishes teams={targetTeams} />
      </section>
    </main>
  );
}

function normalizeTeamRow(row: EspnTeamRow): NormalizedEspnTeam {
  return {
    abbreviation: null,
    espnMemberId: row.espn_member_id,
    espnTeamId: row.espn_team_id,
    finalRank: row.final_rank,
    logoUrl: row.logo_url,
    ownerDisplayName: row.owner_display_name,
    playoffSeed: null,
    points: row.points,
    season: row.season,
    teamName: row.team_name,
  };
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

function HeadToHeadStats({
  averageMargin,
  matchups,
  pointsAgainst,
  pointsFor,
  record,
  seasons,
}: {
  averageMargin: string;
  matchups: string;
  pointsAgainst: string;
  pointsFor: string;
  record: string;
  seasons: string;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label="Record" value={record} />
      <Stat label="Points for" value={pointsFor} />
      <Stat label="Points against" value={pointsAgainst} />
      <Stat label="Matchups" value={matchups} />
      <Stat label="Avg margin" value={averageMargin} />
      <Stat label="Seasons" value={seasons} />
    </div>
  );
}
