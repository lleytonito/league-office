import { voteFailureMessage } from "@/lib/proposals/voting";
import type { createClient } from "@/lib/supabase/server";

export type VoteActionState = {
  message: string;
  ok: boolean;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function castProposalVote(
  supabase: SupabaseServerClient,
  proposalId: string,
  optionId: string,
): Promise<VoteActionState> {
  const member = await getCurrentMember(supabase);

  if (!member) {
    return { message: "Sign in with Google to vote.", ok: false };
  }

  if (!member.isActive) {
    return { message: "Your league access is inactive, so this vote was not recorded.", ok: false };
  }

  if (!proposalId || !optionId) {
    return { message: "Choose a voting option.", ok: false };
  }

  const { data: option, error: optionError } = await supabase
    .from("proposal_vote_options")
    .select("id, proposal_id")
    .eq("id", optionId)
    .maybeSingle<{ id: string; proposal_id: string }>();

  if (optionError) {
    return { message: voteFailureMessage(optionError), ok: false };
  }

  if (!option || option.proposal_id !== proposalId) {
    return { message: "That voting option is no longer available.", ok: false };
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .maybeSingle<{ id: string; status: string }>();

  if (proposalError) {
    return { message: voteFailureMessage(proposalError), ok: false };
  }

  if (!proposal || proposal.status !== "voting") {
    return { message: "Voting is not open for this proposal.", ok: false };
  }

  const { data: votingWindow, error: windowError } = await supabase
    .from("voting_windows")
    .select("starts_at, ends_at, closed_at")
    .eq("proposal_id", proposalId)
    .maybeSingle<{ closed_at: string | null; ends_at: string; starts_at: string }>();

  if (windowError) {
    return { message: voteFailureMessage(windowError), ok: false };
  }

  const now = Date.now();
  if (
    !votingWindow ||
    votingWindow.closed_at ||
    new Date(votingWindow.starts_at).getTime() > now ||
    new Date(votingWindow.ends_at).getTime() <= now
  ) {
    return { message: "Voting is closed for this proposal.", ok: false };
  }

  const { data: existingVote, error: existingVoteError } = await supabase
    .from("votes")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("voter_member_id", member.id)
    .maybeSingle<{ id: string }>();

  if (existingVoteError) {
    return { message: voteFailureMessage(existingVoteError), ok: false };
  }

  if (existingVote) {
    return { message: "You already voted on this proposal.", ok: false };
  }

  const { error } = await supabase.from("votes").insert({
    option_id: optionId,
    proposal_id: proposalId,
    voter_member_id: member.id,
  });

  if (error) {
    console.error("Vote insert failed", {
      code: error.code,
      memberId: member.id,
      optionId,
      proposalId,
    });
    return { message: voteFailureMessage(error), ok: false };
  }

  return { message: "Vote recorded.", ok: true };
}

async function getCurrentMember(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("league_members")
    .select("id, is_admin, is_member, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      is_admin: boolean;
      is_member: boolean;
      revoked_at: string | null;
    }>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    isActive: data.is_member && !data.revoked_at,
    isAdmin: data.is_admin && data.is_member && !data.revoked_at,
  };
}
