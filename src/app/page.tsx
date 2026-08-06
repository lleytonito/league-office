import { AppHeader } from "@/components/layout/app-header";
import { LoginWall } from "@/components/auth/login-wall";
import { HomeActionPanel } from "@/components/feed/home-action-panel";
import { LeagueHistoryPanel, type HomeAnalyticsSlide } from "@/components/feed/league-history-panel";
import { TeamLinkPrompt } from "@/components/feed/team-link-prompt";
import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import type { AccoladeRecord } from "@/components/analytics/accolades-card";
import type { AllTimeRankingRow } from "@/components/analytics/all-time-rankings-card";
import type { AveragePointsRow } from "@/components/analytics/average-points-card";
import {
  buildTeamEraSummary,
  type NormalizedEspnMatchup,
  type NormalizedEspnTeam,
} from "@/lib/espn/analytics";
import { badgesForMember, type MemberBadge, type MemberBadgeAward } from "@/lib/members/badges";
import { createClient } from "@/lib/supabase/server";
import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type FeedAnnouncement = {
  id: string;
  body: string;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  published_at: string | null;
  title: string;
};

type VoteRow = {
  option_id: string;
  proposal_id: string;
  voter_member_id: string;
  voter: {
    avatar_color?: string | null;
    badges?: MemberBadge[] | null;
    display_name: string;
    espn_member_id?: string | null;
    id?: string;
    team_name: string | null;
  } | null;
};

type HomeActionsSetting = {
  value: {
    leagueHistoryVisible?: boolean;
    visible?: boolean;
  } | null;
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

type TeamLinkRow = {
  espn_member_id: string;
  member_id: string;
};

type AnalyticsResultRow = {
  metric_key: string;
  payload: {
    records?: AccoladeRecord[];
    rankings?: Array<AllTimeRankingRow | AveragePointsRow>;
  };
};

const signedInProposalSelect =
  "id, title, summary, status, is_pinned, pinned_at, published_at, voting_closes_at, closed_at, passed, created_at, author:league_members!proposals_author_member_id_fkey(id, display_name, team_name, avatar_color), options:proposal_vote_options(id, label, sort_order), window:voting_windows!voting_windows_proposal_id_fkey(starts_at, ends_at, closed_at)";

const publicProposalSelect =
  "id, title, summary, status, is_pinned, pinned_at, published_at, voting_closes_at, closed_at, passed, created_at, options:proposal_vote_options(id, label, sort_order), window:voting_windows!voting_windows_proposal_id_fkey(starts_at, ends_at, closed_at)";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: member } = user
    ? await supabase
        .from("league_members")
        .select("id, display_name, team_name, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Member>()
    : { data: null };

  const isMemberActive = Boolean(member?.is_member && !member.revoked_at);
  const isAdmin = Boolean(member?.is_admin && member.is_member && !member.revoked_at);

  const [
    announcementsResult,
    proposalsResult,
    votesResult,
    homeActionsResult,
    analyticsResult,
    espnTeamsResult,
    matchupsResult,
    teamLinksResult,
  ] = await Promise.all([
    supabase
      .from("feed_announcements")
      .select("id, title, body, is_pinned, pinned_at, published_at, created_at")
      .not("published_at", "is", null)
      .order("is_pinned", { ascending: false })
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false })
      .limit(8)
      .returns<FeedAnnouncement[]>(),
    supabase
      .from("proposals")
      .select(member ? signedInProposalSelect : publicProposalSelect)
      .in("status", ["approved", "voting", "closed", "published"])
      .not("published_at", "is", null)
      .order("is_pinned", { ascending: false })
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false })
      .limit(20)
      .returns<Array<FeedProposal | (Omit<FeedProposal, "author"> & { author?: null })>>(),
    member
      ? supabase
          .from("votes")
          .select(
            "proposal_id, option_id, voter_member_id, voter:league_members!votes_voter_member_id_fkey(id, display_name, team_name, avatar_color)",
          )
          .returns<VoteRow[]>()
      : Promise.resolve({ data: [] as VoteRow[] }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "home_actions")
      .maybeSingle<HomeActionsSetting>(),
    member
      ? supabase
          .from("analytics_results")
          .select("metric_key, payload")
          .in("metric_key", ["all-time-rankings", "average-points", "accolades"])
          .returns<AnalyticsResultRow[]>()
      : Promise.resolve({ data: [] as AnalyticsResultRow[] }),
    member
      ? supabase
          .from("espn_teams")
          .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url, final_rank, points")
          .not("espn_member_id", "is", null)
          .order("season", { ascending: false })
          .returns<EspnTeamRow[]>()
      : Promise.resolve({ data: [] as EspnTeamRow[] }),
    member
      ? supabase
          .from("espn_matchups")
          .select(
            "season, espn_matchup_id, matchup_period_id, home_team_id, away_team_id, home_score, away_score, winner, playoff_tier_type",
          )
          .returns<MatchupRow[]>()
      : Promise.resolve({ data: [] as MatchupRow[] }),
    member
      ? supabase
          .from("member_team_links")
          .select("member_id, espn_member_id")
          .returns<TeamLinkRow[]>()
      : Promise.resolve({ data: [] as TeamLinkRow[] }),
  ]);

  const announcements = announcementsResult.data ?? [];
  const showHomeActions = homeActionsResult.data?.value?.visible ?? true;
  const showLeagueHistoryActions = homeActionsResult.data?.value?.leagueHistoryVisible ?? true;
  const currentTeamLink = member
    ? (teamLinksResult.data ?? []).find((link) => link.member_id === member.id) ?? null
    : null;
  const latestLinkedTeam = currentTeamLink
    ? (espnTeamsResult.data ?? []).find((team) => team.espn_member_id === currentTeamLink.espn_member_id) ?? null
    : null;
  const homeAnalyticsSlides =
    latestLinkedTeam && currentTeamLink
      ? buildHomeAnalyticsSlides({
          analyticsRows: analyticsResult.data ?? [],
          espnMemberId: currentTeamLink.espn_member_id,
          matchups: matchupsResult.data ?? [],
          teams: espnTeamsResult.data ?? [],
          teamName: latestLinkedTeam.team_name,
        })
      : [];
  const teamLinkPromptOptions =
    member && isMemberActive && !(teamLinksResult.data ?? []).some((link) => link.member_id === member.id)
      ? unlinkedCurrentTeams(espnTeamsResult.data ?? [], teamLinksResult.data ?? [])
      : [];
  const badgeMemberIds = uniqueStrings([
    ...(proposalsResult.data ?? []).map((proposal) => proposal.author?.id),
    ...(votesResult.data ?? []).map((vote) => vote.voter?.id),
  ]);
  const { data: badgeAwards } = member && badgeMemberIds.length
    ? await supabase
        .from("member_badges")
        .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
        .in("member_id", badgeMemberIds)
        .returns<MemberBadgeAward[]>()
    : { data: [] as MemberBadgeAward[] };
  const linkByMemberId = new Map((teamLinksResult.data ?? []).map((link) => [link.member_id, link.espn_member_id]));
  const proposals = (proposalsResult.data ?? []).map((proposal) => ({
    ...proposal,
    author: proposal.author
      ? {
          ...proposal.author,
          badges: proposal.author.id ? badgesForMember(badgeAwards, proposal.author.id) : [],
          espn_member_id: proposal.author.id ? linkByMemberId.get(proposal.author.id) ?? null : null,
        }
      : null,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const votes = (votesResult.data ?? []).map((vote) => ({
    ...vote,
    voter: vote.voter
      ? {
          ...vote.voter,
          badges: vote.voter.id ? badgesForMember(badgeAwards, vote.voter.id) : [],
          espn_member_id: vote.voter.id ? linkByMemberId.get(vote.voter.id) ?? null : null,
        }
      : null,
  }));

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />

      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <h1 className="sr-only">League feed</h1>

        <div className="grid gap-3">
          {announcements.map((announcement) => (
            <article
              className="overflow-hidden rounded-[10px] border border-[#cfd8c4] bg-[#183a2b] text-white shadow-sm"
              key={announcement.id}
            >
              <div className="border-l-4 border-[#a4774e] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#dce8d3]">
                  <Megaphone size={16} aria-hidden="true" />
                  {announcement.is_pinned ? "Pinned post" : "League post"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold leading-tight">{announcement.title}</h2>
                <p className="mt-3 text-base leading-7 text-[#edf4e6]">{announcement.body}</p>
              </div>
            </article>
          ))}

          <TeamLinkPrompt teams={teamLinkPromptOptions} />

          {latestLinkedTeam && showLeagueHistoryActions ? (
            <LeagueHistoryPanel
              slides={homeAnalyticsSlides}
              teamName={latestLinkedTeam.team_name}
            />
          ) : null}

          {showHomeActions ? <HomeActionPanel /> : null}

          {proposals.map((proposal) => (
            <ProposalFeedCard
              isAdmin={isAdmin}
              isMemberActive={isMemberActive}
              key={proposal.id}
              memberId={member?.id ?? null}
              proposal={proposal}
              votes={votes}
            />
          ))}

          {!announcements.length && !proposals.length ? (
            <div className="rounded-[10px] border border-dashed border-[#cfd8c4] bg-white p-6">
              <p className="text-lg font-semibold">The feed is quiet for now.</p>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                Once proposals are approved or posts are pinned, they will show up here.
              </p>
              {!showHomeActions ? (
                <Link
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
                  href="/submit"
                >
                  <Plus size={17} aria-hidden="true" />
                  Submit proposal
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function buildHomeAnalyticsSlides({
  analyticsRows,
  espnMemberId,
  matchups,
  teams,
  teamName,
}: {
  analyticsRows: AnalyticsResultRow[];
  espnMemberId: string;
  matchups: MatchupRow[];
  teams: EspnTeamRow[];
  teamName: string;
}): HomeAnalyticsSlide[] {
  const byKey = new Map(analyticsRows.map((row) => [row.metric_key, row]));
  const allTimeRank = findRank(byKey.get("all-time-rankings")?.payload.rankings, espnMemberId);
  const averagePointsRank = findRank(byKey.get("average-points")?.payload.rankings, espnMemberId);
  const leagueRecords = byKey.get("accolades")?.payload.records ?? [];
  const linkedTeams = teams.filter((team) => team.espn_member_id === espnMemberId);
  const eraSummary = linkedTeams.length
    ? buildTeamEraSummary({
        allTeams: teams.map(normalizeTeamRow),
        matchups: matchups.map(normalizeMatchupRow),
        targetTeams: linkedTeams.map(normalizeTeamRow),
      })
    : null;
  const favoriteOpponentDetail = eraSummary?.favoriteOpponent
    ? formatH2hRecord(
        eraSummary.favoriteOpponent.wins,
        eraSummary.favoriteOpponent.losses,
        eraSummary.favoriteOpponent.ties,
      )
    : undefined;
  const slides: HomeAnalyticsSlide[] = [
    {
      href: `/teams/${encodeURIComponent(espnMemberId)}`,
      kind: "team",
      label: "Your team",
      stats: [
        { label: "Avg finish", value: eraSummary?.averageFinish ? `#${eraSummary.averageFinish}` : "N/A" },
        {
          detail: favoriteOpponentDetail,
          href: eraSummary?.favoriteOpponent?.espnMemberId
            ? `/teams/${encodeURIComponent(eraSummary.favoriteOpponent.espnMemberId)}`
            : undefined,
          label: "Favorite opponent",
          value: eraSummary?.favoriteOpponent?.managerLabel ?? "N/A",
        },
      ],
      title: teamName,
      tone: "brown",
      value: "",
    },
  ];

  if (allTimeRank) {
    slides.push({
      href: "/analytics?metric=all-time-rankings#all-time-rankings-current-team",
      kind: "historicalRanking",
      label: "Historical ranking",
      rankLabel: `${(allTimeRank.row as AllTimeRankingRow).powerScore} PWR`,
      title: "All-Time Ranking",
      tone: "slate",
      value: `#${allTimeRank.index + 1}`,
    });
  }

  if (averagePointsRank) {
    const row = averagePointsRank.row as AveragePointsRow;
    slides.push({
      href: "/analytics?metric=average-points#average-points-current-team",
      kind: "historicalRanking",
      label: "Historical ranking",
      rankLabel: `${row.averagePoints.toLocaleString()} AVG`,
      title: "Average Points Scored",
      tone: "slate",
      value: `#${averagePointsRank.index + 1}`,
    });
  }

  for (const record of leagueRecords) {
    slides.push({
      href: "/analytics?metric=accolades#accolades",
      label: "Accolade",
      rankLabel: record.valueLabel,
      title: record.title,
      meta: `${record.holderLabel} - ${record.matchupLabel}`,
      stats: [
        { label: "Holder", value: record.holderLabel.split(" ")[0] ?? record.holderLabel },
        { label: "Score", value: record.scoreLine ?? record.valueLabel },
      ],
      tone: record.id === "biggest-blowout" ? "red" : record.id === "most-points-game" ? "blue" : "slate",
      value: "Record",
    });
  }

  return slides;
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

function findRank(rows: AnalyticsResultRow["payload"]["rankings"], espnMemberId: string) {
  const index = (rows ?? []).findIndex((row) => row.espnMemberId === espnMemberId);
  return index >= 0 ? { index, row: (rows ?? [])[index] } : null;
}

function formatH2hRecord(wins: number, losses: number, ties: number) {
  return ties ? `${wins}-${losses}-${ties} H2H` : `${wins}-${losses} H2H`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function unlinkedCurrentTeams(rows: EspnTeamRow[], links: TeamLinkRow[]) {
  const latestSeason = rows.length ? Math.max(...rows.map((row) => row.season)) : null;
  const linkedEspnIds = new Set(links.map((link) => link.espn_member_id));

  return rows
    .filter((row) => row.season === latestSeason && row.espn_member_id && !linkedEspnIds.has(row.espn_member_id))
    .map((row) => ({
      espnMemberId: row.espn_member_id as string,
      logoUrl: row.logo_url,
      ownerDisplayName: row.owner_display_name,
      teamName: row.team_name,
    }))
    .sort((a, b) => (a.ownerDisplayName ?? a.teamName).localeCompare(b.ownerDisplayName ?? b.teamName));
}
