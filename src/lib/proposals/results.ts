export type VoteOptionCount = {
  count: number;
  label: string;
};

export function closedResultText(
  counts: VoteOptionCount[],
  passed: boolean | null,
  totalVotes: number,
) {
  if (!totalVotes) {
    return "Vote closed with no votes cast.";
  }

  const sortedCounts = [...counts].sort((a, b) => b.count - a.count);
  const winner = sortedCounts[0];
  const runnerUp = sortedCounts[1];
  const hasClearWinner = winner && (!runnerUp || winner.count > runnerUp.count);

  if (passed && hasClearWinner) {
    return `${winner.label} has passed.`;
  }

  if (!hasClearWinner) {
    return "Vote failed: no option won outright.";
  }

  return `${winner.label} led, but did not receive a majority.`;
}
