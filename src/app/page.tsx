import { AppHeader } from "@/components/layout/app-header";
import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
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

  const isMemberActive = Boolean(member?.is_member && !member.revoked_at);
  const isAdmin = Boolean(member?.is_admin && member.is_member && !member.revoked_at);

  const [announcementsResult, proposalsResult, votesResult] = await Promise.all([
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
      ? supabase.from("votes").select("proposal_id, option_id, voter_member_id").returns<VoteRow[]>()
      : Promise.resolve({ data: [] as VoteRow[] }),
  ]);

  const announcements = announcementsResult.data ?? [];
  const proposals = (proposalsResult.data ?? []).map((proposal) => ({
    ...proposal,
    options: [...proposal.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const votes = votesResult.data ?? [];

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />

      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <h1 className="sr-only">League feed</h1>

        <div className="grid gap-3">
          {announcements.map((announcement, index) => (
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
                {index === 0 ? (
                  <Link
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#183a2b] transition hover:bg-[#edf4e6]"
                    href="/submit"
                  >
                    <Plus size={17} aria-hidden="true" />
                    Submit proposal
                  </Link>
                ) : null}
              </div>
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
            <div className="rounded-[10px] border border-dashed border-[#cfd8c4] bg-white p-6">
              <p className="text-lg font-semibold">The feed is quiet for now.</p>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                Once proposals are approved or posts are pinned, they will show up here.
              </p>
              <Link
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
                href="/submit"
              >
                <Plus size={17} aria-hidden="true" />
                Submit proposal
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
