import { ProposalFeedCard, type FeedProposal } from "@/components/proposals/proposal-feed-card";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("@/app/actions/proposals", () => ({
  closeVotingAction: vi.fn(),
  deleteProposalAction: vi.fn(),
  toggleProposalPinAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  routerMocks.refresh.mockReset();
});

describe("ProposalFeedCard voting feedback", () => {
  it("shows confirmed results immediately after the vote API succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => ({ message: "Vote recorded.", ok: true }),
      ok: true,
    } as Response);

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

    await waitFor(() => {
      expect(screen.getByText("1 / 100%")).toBeInTheDocument();
    });
    expect(screen.getByText("0 / 0%")).toBeInTheDocument();
    expect(screen.queryByText("Vote recorded.")).not.toBeInTheDocument();
    expect(screen.queryByText("Vote recorded. Results are loading...")).not.toBeInTheDocument();
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
  });

  it("rolls back optimistic selection and shows an error when voting fails", async () => {
    const votePromise = deferred<{ message: string; ok: boolean }>();
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(
      votePromise.promise.then(
        (payload) =>
          ({
            json: async () => payload,
            ok: payload.ok,
          }) as Response,
      ),
    );

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
    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_input, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        if (signal instanceof AbortSignal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Request aborted", "AbortError"));
          });
        }
      });
    });

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
      await Promise.resolve();
      await Promise.resolve();
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
  id: "cfbcea44-d8c9-4bdb-bcd2-48ab49878451",
  is_pinned: false,
  options: [
    { id: "a9008060-2689-483b-b3af-fd64e7397f49", label: "Looks good", sort_order: 0 },
    { id: "aeb15be6-06c3-4963-bd87-f7bb691e837a", label: "Needs work", sort_order: 1 },
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
