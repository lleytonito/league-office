import { BadgePill } from "@/components/members/badge-pill";
import type { AccoladeRecord } from "@/components/analytics/accolades-card";
import type { AllTimeRankingRow } from "@/components/analytics/all-time-rankings-card";
import type { AveragePointsRow } from "@/components/analytics/average-points-card";
import type { LuckIndexRow } from "@/components/analytics/luck-index-card";
import { MemberAvatar } from "@/components/members/member-avatar";
import { ProfileForm } from "@/components/members/profile-form";
import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { SeasonFinishes } from "@/components/teams/season-finishes";
import { TeamAccolades } from "@/components/teams/team-accolades";
import { TeamEraCard } from "@/components/teams/team-era-card";
import { TeamLogo } from "@/components/teams/team-logo";
import {
  buildTeamEraSummary,
  type NormalizedEspnMatchup,
  type NormalizedEspnTeam,
} from "@/lib/espn/analytics";
import { attachBadgesToMember, type MemberBadge, type MemberBadgeAward } from "@/lib/members/badges";
import { memberDisplayName } from "@/lib/members/display";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Eye, Link2, Trophy, UserRound } from "lucide-react";
import Link from "next/link";

type Member = {
  avatar_color: string | null;
  badges: MemberBadge[] | null;
  display_name: string;
  id: string;
  is_admin: boolean;
  is_member: boolean;
  profile_bio: string | null;
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
  metric_key: string;
  payload: {
    records?: AccoladeRecord[];
    rankings?: Array<AllTimeRankingRow | AveragePointsRow>;
    luckIndex?: LuckIndexRow[];
  };
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: baseMember, error: memberError } = user
    ? await supabase
        .from("league_members")
        .select("id, display_name, team_name, profile_bio, avatar_color, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Omit<Member, "badges">>()
    : { data: null, error: null };
  const { data: badgeAwards } = baseMember
    ? await supabase
        .from("member_badges")
        .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
        .eq("member_id", baseMember.id)
        .returns<MemberBadgeAward[]>()
    : { data: [] as MemberBadgeAward[] };
  const { data: teamLink } = baseMember
    ? await supabase
        .from("member_team_links")
        .select("espn_member_id")
        .eq("member_id", baseMember.id)
        .maybeSingle<{ espn_member_id: string }>()
    : { data: null };
  const { data: linkedTeams } = teamLink?.espn_member_id
    ? await supabase
        .from("espn_teams")
        .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url, final_rank, points")
        .eq("espn_member_id", teamLink.espn_member_id)
        .order("season", { ascending: false })
        .returns<EspnTeamRow[]>()
    : { data: [] as EspnTeamRow[] };
  const [{ data: allTeams }, { data: matchups }, { data: analyticsResults }] = teamLink?.espn_member_id
    ? await Promise.all([
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
          .select("metric_key, payload")
          .in("metric_key", ["all-time-rankings", "average-points", "luck-index", "accolades"])
          .returns<AnalyticsResultRow[]>(),
      ])
    : [{ data: [] as EspnTeamRow[] }, { data: [] as MatchupRow[] }, { data: [] as AnalyticsResultRow[] }];
  const member = baseMember
    ? attachBadgesToMember({ ...baseMember, badges: [] as MemberBadge[] }, badgeAwards)
    : null;
  const latestLinkedTeam = linkedTeams?.[0] ?? null;
  const eraSummary = linkedTeams?.length
    ? buildTeamEraSummary({
        allTeams: (allTeams ?? []).map(normalizeTeamRow),
        matchups: (matchups ?? []).map(normalizeMatchupRow),
        targetTeams: linkedTeams.map(normalizeTeamRow),
      })
    : null;
  const championships = linkedTeams?.filter((team) => team.final_rank === 1).length ?? 0;
  const championshipSeasons = (linkedTeams ?? [])
    .filter((team) => team.final_rank === 1)
    .map((team) => ({ season: team.season, teamName: team.team_name }))
    .sort((a, b) => a.season - b.season);
  const analyticsByKey = new Map((analyticsResults ?? []).map((result) => [result.metric_key, result]));
  const rankingAccolades = teamLink?.espn_member_id
    ? rankingAccoladesForTeam(analyticsByKey, teamLink.espn_member_id)
    : [];
  const veteranSeasons = (linkedTeams ?? []).filter((team) => team.final_rank && team.final_rank > 0).length;
  const teamAccolades =
    teamLink?.espn_member_id
      ? analyticsByKey.get("accolades")?.payload?.records?.filter((record) => record.espnMemberId === teamLink.espn_member_id) ?? []
      : [];

  const canEdit = Boolean(member?.is_member && !member.revoked_at);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <div className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <UserRound className="text-[#587246]" size={24} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Your profile</h1>
          {memberError ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              Profile could not load: {memberError.message}
            </p>
          ) : member ? (
            <div className="mt-5 grid gap-5">
              <div className="flex items-center gap-3 rounded-[10px] bg-[#fbfcf8] p-4">
                <MemberAvatar color={member.avatar_color} name={memberDisplayName(member)} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[#293421]">
                    {memberDisplayName(member)}
                  </p>
                  <p className="truncate text-sm text-[#626b59]">
                    {member.is_admin ? "Commissioner" : "League member"}
                  </p>
                </div>
              </div>

              {canEdit ? (
                <ProfileForm member={member} />
              ) : (
                <p className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Your membership is not active, so profile editing is paused.
                </p>
              )}

              <section className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
                <div className="flex items-center gap-2">
                  <Link2 className="text-[#587246]" size={18} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Linked team</h2>
                </div>
                {latestLinkedTeam && teamLink?.espn_member_id ? (
                  <Link
                    className="mt-3 flex items-center gap-3 rounded-[10px] border border-[#d9decf] bg-white p-3 transition hover:bg-[#eef2e8]"
                    href={`/teams/${encodeURIComponent(teamLink.espn_member_id)}`}
                  >
                    <TeamLogo logoUrl={latestLinkedTeam.logo_url} teamName={latestLinkedTeam.team_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#293421]">
                        {latestLinkedTeam.owner_display_name ?? latestLinkedTeam.team_name}
                      </span>
                      <span className="block truncate text-sm text-[#626b59]">{latestLinkedTeam.team_name}</span>
                    </span>
                  </Link>
                ) : (
                  <p className="mt-3 rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                    Please link your team from the main feed.
                  </p>
                )}
              </section>

              {teamLink?.espn_member_id ? (
                <TeamAccolades
                  championships={championships}
                  championshipSeasons={championshipSeasons}
                  rankingAccolades={rankingAccolades}
                  records={teamAccolades}
                  veteranSeasons={veteranSeasons}
                />
              ) : null}

              {eraSummary ? <TeamEraCard summary={eraSummary} /> : null}

              {linkedTeams?.length ? <SeasonFinishes teams={linkedTeams} /> : null}

              <section className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#b8872f]" size={18} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Badges</h2>
                </div>
                {member.badges?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.badges.map((badge) => (
                      <BadgePill badge={badge} key={badge.badge?.slug ?? badge.quantity} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[#626b59]">
                    Badges appear here.
                  </p>
                )}
              </section>

              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-white px-4 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8]"
                href={`/members/${member.id}`}
              >
                <Eye size={17} aria-hidden="true" />
                View public profile
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-[#626b59]">
                Your league profile is still being created. Try refreshing in a moment.
              </p>
            </div>
          )}
        </div>
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

function rankingAccoladesForTeam(results: Map<string, AnalyticsResultRow>, espnMemberId: string) {
  return [
    rankingAccolade(results.get("all-time-rankings")?.payload.rankings, espnMemberId, "All-Time Rankings"),
    rankingAccolade(results.get("average-points")?.payload.rankings, espnMemberId, "Average Points Scored"),
    rankingAccolade(results.get("luck-index")?.payload.luckIndex, espnMemberId, "Luck Index"),
  ].filter((accolade): accolade is { category: string; label: string; rank: number } => Boolean(accolade));
}

function rankingAccolade(
  rows: Array<{ espnMemberId: string | null }> | undefined,
  espnMemberId: string,
  label: string,
) {
  const index = (rows ?? []).findIndex((row) => row.espnMemberId === espnMemberId);
  return index >= 0 && index < 3 ? { category: "Historical Rankings", label, rank: index + 1 } : null;
}
