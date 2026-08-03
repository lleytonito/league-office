import { AnnouncementForm } from "@/components/admin/announcement-form";
import { MemberAccessForm } from "@/components/admin/member-access-form";
import { ReviewProposalCard } from "@/components/admin/review-proposal-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import { SubmitProposalForm } from "@/components/proposals/submit-proposal-form";
import { canManageMember, getMemberStatusLabel } from "@/lib/members/status";
import { createClient } from "@/lib/supabase/server";
import {
  ClipboardList,
  Crown,
  Megaphone,
  Pin,
  ShieldAlert,
  Trophy,
  Vote,
} from "lucide-react";

type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type DirectoryMember = Member & {
  created_at: string;
  updated_at: string;
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

type ReviewProposal = {
  id: string;
  created_at: string;
  rationale: string | null;
  summary: string;
  title: string;
  author: {
    display_name: string;
    team_name: string | null;
  } | null;
  options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
};

type VoteRow = {
  option_id: string;
  proposal_id: string;
  voter_member_id: string;
};

export default async function Home() {
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

  const isReadOnly = Boolean(member && (!member.is_member || member.revoked_at));
  const isAdmin = Boolean(member?.is_admin && member.is_member && !member.revoked_at);
  const isMemberActive = Boolean(member?.is_member && !member.revoked_at);

  const [announcementsResult, proposalsResult, votesResult, reviewResult, membersResult] =
    await Promise.all([
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
        .select(
          "id, title, summary, status, is_pinned, pinned_at, published_at, voting_closes_at, closed_at, passed, created_at, author:league_members!proposals_author_member_id_fkey(display_name, team_name), options:proposal_vote_options(id, label, sort_order), window:voting_windows!voting_windows_proposal_id_fkey(starts_at, ends_at, closed_at)",
        )
        .in("status", ["approved", "voting", "closed", "published"])
        .not("published_at", "is", null)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("published_at", { ascending: false })
        .limit(20)
        .returns<FeedProposal[]>(),
      member
        ? supabase
            .from("votes")
            .select("proposal_id, option_id, voter_member_id")
            .returns<VoteRow[]>()
        : Promise.resolve({ data: [] as VoteRow[] }),
      isAdmin
        ? supabase
            .from("proposals")
            .select(
              "id, title, summary, rationale, created_at, author:league_members!proposals_author_member_id_fkey(display_name, team_name), options:proposal_vote_options(id, label, sort_order)",
            )
            .eq("status", "review")
            .order("created_at", { ascending: true })
            .returns<ReviewProposal[]>()
        : Promise.resolve({ data: [] as ReviewProposal[] }),
      isAdmin
        ? supabase
            .from("league_members")
            .select(
              "id, display_name, team_name, is_member, is_admin, revoked_at, created_at, updated_at",
            )
            .order("created_at", { ascending: true })
            .returns<DirectoryMember[]>()
        : Promise.resolve({ data: [] as DirectoryMember[] }),
    ]);

  const announcements = announcementsResult.data ?? [];
  const proposals = (proposalsResult.data ?? []).map((proposal) => ({
    ...proposal,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const votes = votesResult.data ?? [];
  const reviewQueue = (reviewResult.data ?? []).map((proposal) => ({
    ...proposal,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const members = membersResult.data ?? [];
  const openVotes = proposals.filter((proposal) => proposal.status === "voting").length;

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-6">
        <div className="grid gap-5">
          <AppHeader member={member} userEmail={user?.email ?? null} />

          {isReadOnly ? (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
              <div>
                <h1 className="text-base font-semibold">Read-only access</h1>
                <p className="mt-1 text-sm leading-6">
                  You can view league activity, but proposal submissions and votes are disabled.
                </p>
              </div>
            </div>
          ) : null}

          <section className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricCard icon={Pin} label="Pinned" value={String(announcements.filter((item) => item.is_pinned).length + proposals.filter((item) => item.is_pinned).length)} />
            <MetricCard icon={Vote} label="Votes" value={String(openVotes)} />
            <MetricCard icon={ClipboardList} label="Review" value={isAdmin ? String(reviewQueue.length) : "Locked"} />
          </section>

          <section className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                  League feed
                </h1>
                <p className="mt-1 text-sm leading-6 text-[#626b59]">
                  Pinned updates first, active votes next. This is the main room.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {announcements.map((announcement) => (
                <article
                  className="rounded-lg border border-[#d9decf] bg-[#183a2b] p-4 text-white shadow-sm sm:p-5"
                  key={announcement.id}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#dce8d3]">
                    <Megaphone size={16} aria-hidden="true" />
                    {announcement.is_pinned ? "Pinned post" : "League post"}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold leading-tight">{announcement.title}</h2>
                  <p className="mt-3 text-base leading-7 text-[#edf4e6]">{announcement.body}</p>
                </article>
              ))}

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
                <div className="rounded-lg border border-dashed border-[#d9decf] bg-white p-6">
                  <p className="text-base font-semibold">The feed is quiet for now.</p>
                  <p className="mt-2 text-sm leading-6 text-[#626b59]">
                    Once proposals are approved or posts are pinned, they will show up here.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
          {!user ? (
            <section className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Join the vote</h2>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                You can read the feed now. Sign in to submit proposals and cast your locked vote.
              </p>
              <GoogleSignInButton
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
                label="Sign in to participate"
              />
            </section>
          ) : (
            <section className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Submit proposal</h2>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                Proposals go to commissioner review before they appear in the feed.
              </p>
              <div className="mt-4">
                <SubmitProposalForm disabled={!isMemberActive} />
              </div>
            </section>
          )}

          {isAdmin ? (
            <>
              <section className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
                <h2 className="text-xl font-semibold">Publish post</h2>
                <p className="mt-2 text-sm leading-6 text-[#626b59]">
                  Create informational posts and pin them above voting items.
                </p>
                <div className="mt-4">
                  <AnnouncementForm />
                </div>
              </section>

              <section className="rounded-lg border border-[#d9decf] bg-[#fbfcf8] p-4 shadow-sm">
                <h2 className="text-xl font-semibold">Review queue</h2>
                <div className="mt-4 grid gap-3">
                  {reviewQueue.length ? (
                    reviewQueue.map((proposal) => (
                      <ReviewProposalCard key={proposal.id} proposal={proposal} />
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                      No proposals waiting on commissioner review.
                    </p>
                  )}
                </div>
              </section>

              <MemberDirectory currentMemberId={member?.id ?? ""} members={members} />
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function AppHeader({
  member,
  userEmail,
}: {
  member: Member | null;
  userEmail: string | null;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#183a2b] text-white">
          <Trophy size={21} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.16em] text-[#3e4a36]">
            League Office
          </p>
          <p className="truncate text-sm text-[#6a725f]">
            {member?.team_name ?? member?.display_name ?? userEmail ?? "Public feed"}
          </p>
        </div>
      </div>
      {member ? <SignOutButton /> : null}
    </header>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Pin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9decf] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-[#626b59] sm:text-sm">{label}</p>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e9eee0] text-[#26351f] sm:size-9">
          <Icon size={17} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold sm:text-3xl">{value}</p>
    </div>
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
    <section className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Crown size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">Members</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {members.map((directoryMember) => {
          const isRevoked = !directoryMember.is_member || Boolean(directoryMember.revoked_at);
          return (
            <article
              className="grid gap-3 rounded-lg border border-[#e1e5d9] bg-[#fbfcf8] p-3"
              key={directoryMember.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">
                  {directoryMember.display_name}
                </h3>
                <p className="mt-1 truncate text-xs text-[#626b59]">
                  {directoryMember.team_name ?? "No team set"}
                </p>
              </div>
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
