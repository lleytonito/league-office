export type VoteActionFailure = {
  code?: string | null;
  message?: string | null;
};

export function voteFailureMessage(error: VoteActionFailure | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const normalized = message.toLowerCase();

  if (code === "23505" || normalized.includes("duplicate key")) {
    return "You already voted on this proposal.";
  }

  if (normalized.includes("row-level security")) {
    return "Your vote was blocked by league access rules. Refresh, sign in again, and try once more.";
  }

  if (normalized.includes("jwt") || normalized.includes("session")) {
    return "Your sign-in session expired. Refresh and sign in again to vote.";
  }

  return "Your vote could not be recorded. Refresh and try again.";
}
