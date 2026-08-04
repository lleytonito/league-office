import { AnnouncementForm } from "@/components/admin/announcement-form";
import { EspnAnalyticsAdmin } from "@/components/admin/espn-analytics-admin";
import { HomeActionsSettingsForm } from "@/components/admin/home-actions-settings-form";
import { ManageAnnouncementCard } from "@/components/admin/manage-announcement-card";
import { MemberAccessForm } from "@/components/admin/member-access-form";
import { MemberProfileAdminForm } from "@/components/admin/member-profile-admin-form";
import { ReviewProposalCard } from "@/components/admin/review-proposal-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppHeader } from "@/components/layout/app-header";
import { BadgePill } from "@/components/members/badge-pill";
import { MemberIdentity } from "@/components/members/member-identity";
import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import { probeEspnLeague, type EspnProbeResult } from "@/lib/espn/client";
import {
  attachBadgesToMembers,
  badgesForMember,
  championBadge,
  type MemberBadge,
  type MemberBadgeAward,
} from "@/lib/members/badges";
import { canManageMember, getMemberStatusLabel } from "@/lib/members/status";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Crown, Database, Download, GitBranch, Megaphone, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type DirectoryMember = Member & {
  badges: MemberBadge[] | null;
  created_at: string;
  updated_at: string;
};

type ReviewProposal = {
  id: string;
  created_at: string;
  rationale: string | null;
  summary: string;
  title: string;
  author: {
    avatar_color?: string | null;
    badges?: MemberBadge[] | null;
    display_name: string;
    id?: string;
    team_name: string | null;
  } | null;
  options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
};

type ManagedAnnouncement = {
  id: string;
  body: string;
  is_pinned: boolean;
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
  owner_display_name: string | null;
  season: number;
  team_name: string;
};

type MemberTeamLinkRow = {
  espn_member_id: string;
  member_id: string;
  member?: {
    display_name: string;
    team_name: string | null;
  } | null;
};

type ChampionshipDetectionRow = {
  member_id: string | null;
  owner_display_name: string | null;
  season: number;
  team_name: string;
};

type EspnMatchupIntegrityRow = {
  away_score: number | null;
  home_score: number | null;
  season: number;
  winner: string | null;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("league_members")
        .select("id, display_name, team_name, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Member>()
    : { data: null };

  const isAdmin = Boolean(member?.is_admin && member.is_member && !member.revoked_at);
  const isMemberActive = Boolean(member?.is_member && !member.revoked_at);

  const [
    announcementResult,
    reviewResult,
    membersResult,
    activeResult,
    votesResult,
    homeActionsResult,
    espnProbe,
    espnTeamsResult,
    espnMatchupsResult,
    teamLinksResult,
    championshipDetectionsResult,
  ] = isAdmin
    ? await Promise.all([
        supabase
          .from("feed_announcements")
          .select("id, title, body, is_pinned, published_at")
          .order("is_pinned", { ascending: false })
          .order("pinned_at", { ascending: false, nullsFirst: false })
          .limit(20)
          .returns<ManagedAnnouncement[]>(),
        supabase
          .from("proposals")
          .select(
            "id, title, summary, rationale, created_at, author:league_members!proposals_author_member_id_fkey(id, display_name, team_name, avatar_color), options:proposal_vote_options(id, label, sort_order)",
          )
          .eq("status", "review")
          .order("created_at", { ascending: true })
          .returns<ReviewProposal[]>(),
        supabase
          .from("league_members")
          .select("id, display_name, team_name, is_member, is_admin, revoked_at, created_at, updated_at")
          .order("created_at", { ascending: true })
          .returns<Array<Omit<DirectoryMember, "badges">>>(),
        supabase
          .from("proposals")
          .select(
            "id, title, summary, status, is_pinned, pinned_at, published_at, voting_closes_at, closed_at, passed, created_at, author:league_members!proposals_author_member_id_fkey(id, display_name, team_name, avatar_color), options:proposal_vote_options(id, label, sort_order), window:voting_windows!voting_windows_proposal_id_fkey(starts_at, ends_at, closed_at)",
          )
          .in("status", ["voting", "closed"])
          .order("published_at", { ascending: false })
          .limit(12)
          .returns<FeedProposal[]>(),
        supabase
          .from("votes")
          .select(
            "proposal_id, option_id, voter_member_id, voter:league_members!votes_voter_member_id_fkey(id, display_name, team_name, avatar_color)",
          )
          .returns<VoteRow[]>(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "home_actions")
          .maybeSingle<HomeActionsSetting>(),
        probeEspnLeague(),
        supabase
          .from("espn_teams")
          .select("season, espn_member_id, owner_display_name, team_name")
          .not("espn_member_id", "is", null)
          .order("season", { ascending: false })
          .returns<EspnTeamRow[]>(),
        supabase
          .from("espn_matchups")
          .select("season, winner, home_score, away_score")
          .returns<EspnMatchupIntegrityRow[]>(),
        supabase
          .from("member_team_links")
          .select("member_id, espn_member_id, member:league_members!member_team_links_member_id_fkey(display_name, team_name)")
          .returns<MemberTeamLinkRow[]>(),
        supabase
          .from("championship_detections")
          .select("season, team_name, owner_display_name, member_id")
          .order("season", { ascending: false })
          .returns<ChampionshipDetectionRow[]>(),
      ])
    : [
        { data: [] as ManagedAnnouncement[] },
        { data: [] as ReviewProposal[] },
        { data: [] as DirectoryMember[] },
        { data: [] as FeedProposal[] },
        { data: [] as VoteRow[] },
        { data: null as HomeActionsSetting | null },
        null as EspnProbeResult | null,
        { data: [] as EspnTeamRow[] },
        { data: [] as EspnMatchupIntegrityRow[] },
        { data: [] as MemberTeamLinkRow[] },
        { data: [] as ChampionshipDetectionRow[] },
      ];

  const memberIds = uniqueStrings([
    ...(membersResult.data ?? []).map((directoryMember) => directoryMember.id),
    ...(reviewResult.data ?? []).map((proposal) => proposal.author?.id),
    ...(activeResult.data ?? []).map((proposal) => proposal.author?.id),
    ...(votesResult.data ?? []).map((vote) => vote.voter?.id),
  ]);
  const { data: badgeAwards } = memberIds.length
    ? await supabase
        .from("member_badges")
        .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
        .in("member_id", memberIds)
        .returns<MemberBadgeAward[]>()
    : { data: [] as MemberBadgeAward[] };

  const reviewQueue = (reviewResult.data ?? []).map((proposal) => ({
    ...proposal,
    author: proposal.author
      ? { ...proposal.author, badges: badgesForMember(badgeAwards, proposal.author.id) }
      : null,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const members = attachBadgesToMembers(membersResult.data, badgeAwards);
  const activeProposals = (activeResult.data ?? []).map((proposal) => ({
    ...proposal,
    author: proposal.author
      ? { ...proposal.author, badges: badgesForMember(badgeAwards, proposal.author.id) }
      : null,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const votes = (votesResult.data ?? []).map((vote) => ({
    ...vote,
    voter: vote.voter ? { ...vote.voter, badges: badgesForMember(badgeAwards, vote.voter.id) } : null,
  }));
  const announcements = announcementResult.data ?? [];
  const homeActionsVisible = homeActionsResult.data?.value?.visible ?? true;
  const leagueHistoryActionsVisible = homeActionsResult.data?.value?.leagueHistoryVisible ?? true;
  const systemInfo = getSystemInfo();
  const queryErrorMessages = [
    announcementResult.error,
    reviewResult.error,
    membersResult.error,
    activeResult.error,
    votesResult.error,
    homeActionsResult.error,
    "error" in espnTeamsResult ? espnTeamsResult.error : null,
    "error" in espnMatchupsResult ? espnMatchupsResult.error : null,
    "error" in teamLinksResult ? teamLinksResult.error : null,
    "error" in championshipDetectionsResult ? championshipDetectionsResult.error : null,
  ].flatMap((error) => (error ? [error.message] : []));
  const espnOwners = buildEspnOwnerOptions(espnTeamsResult.data ?? []);
  const matchupIntegrity = buildMatchupIntegrity(
    espnMatchupsResult.data ?? [],
    espnTeamsResult.data ?? [],
  );

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />

      <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        {!user ? (
          <GateCard title="Admin sign-in required">
            <p className="text-sm leading-6 text-[#626b59]">
              Sign in with the commissioner account to manage posts, proposals, and members.
            </p>
            <GoogleSignInButton
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
              label="Sign in with Google"
              shortLabel="Sign in"
            />
          </GateCard>
        ) : !isAdmin ? (
          <GateCard title="Commissioner access only">
            <div className="flex gap-3 text-amber-900">
              <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
              <p className="text-sm leading-6">
                This page is available only to league admins.
              </p>
            </div>
          </GateCard>
        ) : (
          <div className="grid gap-4">
            {queryErrorMessages.length ? (
              <section className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                <p className="font-semibold">Some admin data could not load.</p>
                <ul className="mt-2 list-disc pl-5">
                  {queryErrorMessages.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <SystemSafetyPanel espnProbe={espnProbe} systemInfo={systemInfo} />

            <EspnAnalyticsAdmin
              championshipDetections={championshipDetectionsResult.data ?? []}
              espnOwners={espnOwners}
              matchupIntegrity={matchupIntegrity}
              links={teamLinksResult.data ?? []}
              members={members.map((directoryMember) => ({
                display_name: directoryMember.display_name,
                id: directoryMember.id,
                team_name: directoryMember.team_name,
              }))}
            />

            <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Megaphone className="text-[#587246]" size={20} aria-hidden="true" />
                <h1 className="text-2xl font-semibold">Publish post</h1>
              </div>
              <div className="mt-4">
                <AnnouncementForm />
              </div>
            </section>

            <section className="rounded-[10px] border border-[#d9decf] bg-[#fbfcf8] p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">Pinned posts</h2>
              <div className="mt-4 grid gap-3">
                {announcements.length ? (
                  announcements.map((announcement) => (
                    <ManageAnnouncementCard
                      announcement={announcement}
                      key={announcement.id}
                    />
                  ))
                ) : (
                  <p className="rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                    No published posts to manage.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">Home feed actions</h2>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                Controls the feed helper panels for proposals, rules, teams, and analytics.
              </p>
              <div className="mt-4">
                <HomeActionsSettingsForm
                  leagueHistoryVisible={leagueHistoryActionsVisible}
                  visible={homeActionsVisible}
                />
              </div>
            </section>

            <section className="rounded-[10px] border border-[#d9decf] bg-[#fbfcf8] p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">Review queue</h2>
              <div className="mt-4 grid gap-3">
                {reviewQueue.length ? (
                  reviewQueue.map((proposal) => (
                    <ReviewProposalCard key={proposal.id} proposal={proposal} />
                  ))
                ) : (
                  <p className="rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                    No proposals waiting on commissioner review.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[10px] border border-[#d9decf] bg-[#fbfcf8] p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">Active votes</h2>
              <div className="mt-4 grid gap-3">
                {activeProposals.length ? (
                  activeProposals.map((proposal) => (
                    <ProposalFeedCard
                      isAdmin
                      isMemberActive={isMemberActive}
                      key={proposal.id}
                      memberId={member?.id ?? null}
                      proposal={proposal}
                      revealResultsForAdmin
                      showAdminControls
                      votes={votes}
                    />
                  ))
                ) : (
                  <p className="rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                    No active votes to manage.
                  </p>
                )}
              </div>
            </section>

            <MemberDirectory currentMemberId={member?.id ?? ""} members={members} />
          </div>
        )}
      </section>
    </main>
  );
}

function getSystemInfo() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const context = process.env.CONTEXT ?? "local";
  const branch = process.env.BRANCH ?? (context === "local" ? "local" : "unknown");
  const commit = process.env.COMMIT_REF?.slice(0, 7) ?? "local";
  const supabaseProjectRef = getSupabaseProjectRef(supabaseUrl);

  return {
    branch,
    commit,
    context,
    isProduction: context === "production",
    supabaseProjectRef,
  };
}

function getSupabaseProjectRef(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function SystemSafetyPanel({
  espnProbe,
  systemInfo,
}: {
  espnProbe: EspnProbeResult | null;
  systemInfo: ReturnType<typeof getSystemInfo>;
}) {
  const exports = [
    { href: "/admin/exports/members", label: "Members" },
    { href: "/admin/exports/proposals", label: "Proposals" },
    { href: "/admin/exports/votes", label: "Votes" },
    { href: "/admin/exports/badges", label: "Badges" },
    { href: "/admin/exports/announcements", label: "Posts" },
  ];

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="text-[#587246]" size={19} aria-hidden="true" />
          <h1 className="text-2xl font-semibold">System safety</h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            systemInfo.isProduction ? "bg-[#183a2b] text-white" : "bg-amber-50 text-amber-800"
          }`}
        >
          {systemInfo.context}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[#4e5a45] sm:grid-cols-3">
        <div className="rounded-[8px] bg-[#f7f8f4] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Supabase</p>
          <p className="mt-1 font-semibold text-[#293421]">{systemInfo.supabaseProjectRef}</p>
        </div>
        <div className="rounded-[8px] bg-[#f7f8f4] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Branch</p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-[#293421]">
            <GitBranch size={14} aria-hidden="true" />
            {systemInfo.branch}
          </p>
        </div>
        <div className="rounded-[8px] bg-[#f7f8f4] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Commit</p>
          <p className="mt-1 font-semibold text-[#293421]">{systemInfo.commit}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-[#293421]">CSV exports</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {exports.map((item) => (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-[#fbfcf8] px-3 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8]"
              href={item.href}
              key={item.href}
            >
              <Download size={15} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[#e1e5d9] pt-4">
        <p className="text-sm font-semibold text-[#293421]">ESPN connector probe</p>
        {!espnProbe?.configured ? (
          <p className="mt-2 rounded-[8px] bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            ESPN env is not fully configured
            {espnProbe?.missing.length ? `: ${espnProbe.missing.join(", ")}` : "."}
          </p>
        ) : (
          <div className="mt-2 grid gap-2">
            <p className="text-sm leading-6 text-[#626b59]">
              League ID {espnProbe.leagueId}. Private ESPN credentials are loaded server-side only.
            </p>
            {espnProbe.seasons.map((season) => (
              <article
                className="rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3 text-sm"
                key={season.season}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#293421]">{season.season}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      season.error ? "bg-red-50 text-red-800" : "bg-[#e9eee0] text-[#3e4a36]"
                    }`}
                  >
                    {season.error ? "Needs attention" : "Connected"}
                  </span>
                </div>
                {season.error ? (
                  <p className="mt-2 leading-6 text-red-800">{season.error}</p>
                ) : (
                  <div className="mt-2 grid gap-2 text-[#4e5a45] sm:grid-cols-3">
                    <p>Teams: {season.teamCount ?? "unknown"}</p>
                    <p>Matchups: {season.matchupsCount ?? "unknown"}</p>
                    <p>Draft picks: {season.draftPickCount ?? "unknown"}</p>
                    <p className="sm:col-span-3">
                      Sections: {season.availableTopLevelKeys.join(", ") || "none reported"}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function buildMatchupIntegrity(matchups: EspnMatchupIntegrityRow[], teams: EspnTeamRow[]) {
  const teamCounts = new Map<number, { missingOwnerNames: number; teams: number }>();
  for (const team of teams) {
    const existing = teamCounts.get(team.season) ?? { missingOwnerNames: 0, teams: 0 };
    existing.teams += 1;
    existing.missingOwnerNames += team.owner_display_name ? 0 : 1;
    teamCounts.set(team.season, existing);
  }

  const bySeason = new Map<
    number,
    {
      matchups: number;
      missingOwnerNames: number;
      teams: number;
      undecided: number;
      zeroZero: number;
    }
  >();

  for (const matchup of matchups) {
    const existing = bySeason.get(matchup.season) ?? {
      matchups: 0,
      missingOwnerNames: teamCounts.get(matchup.season)?.missingOwnerNames ?? 0,
      teams: teamCounts.get(matchup.season)?.teams ?? 0,
      undecided: 0,
      zeroZero: 0,
    };
    existing.matchups += 1;
    existing.undecided += matchup.winner === "UNDECIDED" ? 1 : 0;
    existing.zeroZero += matchup.home_score === 0 && matchup.away_score === 0 ? 1 : 0;
    bySeason.set(matchup.season, existing);
  }

  for (const [season, counts] of teamCounts) {
    if (!bySeason.has(season)) {
      bySeason.set(season, {
        matchups: 0,
        missingOwnerNames: counts.missingOwnerNames,
        teams: counts.teams,
        undecided: 0,
        zeroZero: 0,
      });
    }
  }

  return [...bySeason.entries()]
    .map(([season, value]) => ({ season, ...value }))
    .sort((a, b) => b.season - a.season);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildEspnOwnerOptions(rows: EspnTeamRow[]) {
  const latestSeason = rows.length ? Math.max(...rows.map((row) => row.season)) : null;
  const byMember = new Map<
    string,
    {
      espnMemberId: string;
      label: string;
      latestSeason: number;
      ownerDisplayName: string | null;
      teamName: string;
    }
  >();

  for (const row of rows.filter((item) => item.season === latestSeason)) {
    if (!row.espn_member_id || byMember.has(row.espn_member_id)) {
      continue;
    }

    const ownerName = row.owner_display_name ?? row.team_name;
    byMember.set(row.espn_member_id, {
      espnMemberId: row.espn_member_id,
      label: `${ownerName} - ${row.team_name}`,
      latestSeason: row.season,
      ownerDisplayName: row.owner_display_name,
      teamName: row.team_name,
    });
  }

  return [...byMember.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function GateCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MemberDirectory({
  currentMemberId,
  members,
}: {
  currentMemberId: string;
  members: DirectoryMember[];
}) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Crown className="text-[#7a5638]" size={18} aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Members</h2>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {members.map((directoryMember) => {
          const isRevoked = !directoryMember.is_member || Boolean(directoryMember.revoked_at);
          return (
            <article
              className="grid gap-3 rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-3"
              key={directoryMember.id}
            >
              <div className="min-w-0">
                <MemberIdentity member={directoryMember} showBadge={false} />
                {directoryMember.badges?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {directoryMember.badges.map((badge) => (
                      <BadgePill badge={badge} compact key={badge.badge?.slug ?? badge.quantity} />
                    ))}
                  </div>
                ) : null}
              </div>
              <MemberProfileAdminForm
                championCount={championBadge(directoryMember.badges)?.quantity ?? 0}
                member={directoryMember}
              />
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isRevoked ? "bg-amber-50 text-amber-800" : "bg-[#e9eee0] text-[#3e4a36]"
                  }`}
                >
                  {getMemberStatusLabel(directoryMember)}
                </span>
                <MemberAccessForm
                  disabled={!canManageMember(currentMemberId, directoryMember.id)}
                  isRevoked={isRevoked}
                  memberId={directoryMember.id}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
