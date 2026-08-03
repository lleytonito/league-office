import { AnnouncementForm } from "@/components/admin/announcement-form";
import { ManageAnnouncementCard } from "@/components/admin/manage-announcement-card";
import { MemberAccessForm } from "@/components/admin/member-access-form";
import { ReviewProposalCard } from "@/components/admin/review-proposal-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppHeader } from "@/components/layout/app-header";
import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import { canManageMember, getMemberStatusLabel } from "@/lib/members/status";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Crown, Megaphone, ShieldAlert } from "lucide-react";
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
    display_name: string;
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
    display_name: string;
    team_name: string | null;
  } | null;
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

  const [announcementResult, reviewResult, membersResult, activeResult, votesResult] = isAdmin
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
            "id, title, summary, rationale, created_at, author:league_members!proposals_author_member_id_fkey(display_name, team_name), options:proposal_vote_options(id, label, sort_order)",
          )
          .eq("status", "review")
          .order("created_at", { ascending: true })
          .returns<ReviewProposal[]>(),
        supabase
          .from("league_members")
          .select("id, display_name, team_name, is_member, is_admin, revoked_at, created_at, updated_at")
          .order("created_at", { ascending: true })
          .returns<DirectoryMember[]>(),
        supabase
          .from("proposals")
          .select(
            "id, title, summary, status, is_pinned, pinned_at, published_at, voting_closes_at, closed_at, passed, created_at, author:league_members!proposals_author_member_id_fkey(display_name, team_name), options:proposal_vote_options(id, label, sort_order), window:voting_windows!voting_windows_proposal_id_fkey(starts_at, ends_at, closed_at)",
          )
          .in("status", ["voting", "closed"])
          .order("published_at", { ascending: false })
          .limit(12)
          .returns<FeedProposal[]>(),
        supabase
          .from("votes")
          .select(
            "proposal_id, option_id, voter_member_id, voter:league_members!votes_voter_member_id_fkey(display_name, team_name)",
          )
          .returns<VoteRow[]>(),
      ])
    : [
        { data: [] as ManagedAnnouncement[] },
        { data: [] as ReviewProposal[] },
        { data: [] as DirectoryMember[] },
        { data: [] as FeedProposal[] },
        { data: [] as VoteRow[] },
      ];

  const reviewQueue = (reviewResult.data ?? []).map((proposal) => ({
    ...proposal,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const members = membersResult.data ?? [];
  const activeProposals = (activeResult.data ?? []).map((proposal) => ({
    ...proposal,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const votes = votesResult.data ?? [];
  const announcements = announcementResult.data ?? [];

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
                <h3 className="truncate text-sm font-semibold">{directoryMember.display_name}</h3>
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
