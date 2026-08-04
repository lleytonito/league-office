import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  castVoteAction: vi.fn(),
}));

vi.mock("@/app/actions/proposals", () => ({
  castVoteAction: actionMocks.castVoteAction,
  closeVotingAction: vi.fn(),
  deleteProposalAction: vi.fn(),
  toggleProposalPinAction: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  actionMocks.castVoteAction.mockReset();
});

describe("ProposalFeedCard voting feedback", () => {
  it("rolls back optimistic selection and shows an error when voting fails", async () => {
    const votePromise = deferred<{ message: string; ok: boolean }>();
    actionMocks.castVoteAction.mockReturnValueOnce(votePromise.promise);

    render(
      <ProposalFeedCard
        isAdmin={false}
        isMemberActive={true}
        memberId="member-1"
        proposal={proposalFixture}
        votes={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Looks good/ }));

    expect(screen.getByText("Recording vote...")).toBeInTheDocument();

    votePromise.resolve({
      message: "Your vote was blocked by league access rules. Refresh, sign in again, and try once more.",
      ok: false,
    });

    await waitFor(() => {
      expect(
        screen.getByText("Your vote was blocked by league access rules. Refresh, sign in again, and try once more."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Recording vote...")).not.toBeInTheDocument();
  });

  it("stops showing recording forever when voting does not resolve", async () => {
    vi.useFakeTimers();
    actionMocks.castVoteAction.mockReturnValueOnce(new Promise(() => {}));

    render(
      <ProposalFeedCard
        isAdmin={false}
        isMemberActive={true}
        memberId="member-1"
        proposal={proposalFixture}
        votes={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Looks good/ }));

    expect(screen.getByText("Recording vote...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getByText("Voting is taking longer than expected. Refresh before trying again.")).toBeInTheDocument();
    expect(screen.queryByText("Recording vote...")).not.toBeInTheDocument();
  });
});

const proposalFixture: FeedProposal = {
  author: {
    display_name: "Commissioner",
    id: "admin-1",
    team_name: "League Office",
  },
  closed_at: null,
  created_at: "2026-08-04T00:00:00.000Z",
  id: "proposal-1",
  is_pinned: false,
  options: [
    { id: "option-1", label: "Looks good", sort_order: 0 },
    { id: "option-2", label: "Needs work", sort_order: 1 },
  ],
  passed: null,
  pinned_at: null,
  published_at: "2026-08-04T00:00:00.000Z",
  status: "voting",
  summary: "Temporary dev-only proposal for testing voting feedback.",
  title: "QA Vote Test",
  voting_closes_at: "2026-08-11T00:00:00.000Z",
  window: {
    closed_at: null,
    ends_at: "2026-08-11T00:00:00.000Z",
    starts_at: "2026-08-04T00:00:00.000Z",
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}
