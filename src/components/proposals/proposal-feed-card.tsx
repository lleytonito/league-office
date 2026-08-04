"use client";

import {
  castVoteAction,
  closeVotingAction,
  deleteProposalAction,
  toggleProposalPinAction,
} from "@/app/actions/proposals";
import { MemberAvatar } from "@/components/members/member-avatar";
import { MemberIdentity, type IdentityMember } from "@/components/members/member-identity";
import { memberDisplayName } from "@/lib/members/display";
import { closedResultText } from "@/lib/proposals/results";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  Pin,
  PinOff,
  Trash2,
  Vote,
  X,
} from "lucide-react";
import { useState } from "react";

export type FeedProposal = {
  id: string;
  closed_at: string | null;
  created_at: string;
  is_pinned: boolean;
  passed: boolean | null;
  pinned_at: string | null;
  published_at: string | null;
  status: string;
  summary: string;
  title: string;
  voting_closes_at: string | null;
  author: {
    avatar_color?: string | null;
    badges?: IdentityMember["badges"];
    display_name: string;
    espn_member_id?: string | null;
    id?: string;
    team_name: string | null;
  } | null;
  options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
  window: {
    closed_at: string | null;
    ends_at: string;
    starts_at: string;
  } | null;
};

type VoteRow = {
  option_id: string;
  proposal_id: string;
  voter_member_id: string;
  voter: {
    avatar_color?: string | null;
    badges?: IdentityMember["badges"];
    display_name: string;
    espn_member_id?: string | null;
    id?: string;
    team_name: string | null;
  } | null;
};

export function ProposalFeedCard({
  isAdmin,
  isMemberActive,
  memberId,
  proposal,
  revealResultsForAdmin = false,
  showAdminControls = false,
  votes,
}: {
  isAdmin: boolean;
  isMemberActive: boolean;
  memberId: string | null;
  proposal: FeedProposal;
  revealResultsForAdmin?: boolean;
  showAdminControls?: boolean;
  votes: VoteRow[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const proposalVotes = votes.filter((vote) => vote.proposal_id === proposal.id);
  const userVote = memberId
    ? proposalVotes.find((vote) => vote.voter_member_id === memberId)
    : undefined;
  const canVote = Boolean(
    isMemberActive &&
      !userVote &&
      proposal.status === "voting" &&
      proposal.window &&
      !proposal.window.closed_at &&
      new Date(proposal.window.ends_at) > new Date(),
  );
  const canSeeResults = Boolean(
    (revealResultsForAdmin && isAdmin) || userVote || proposal.status === "closed",
  );
  const totalVotes = proposalVotes.length;
  const counts = proposal.options.map((option) => ({
    ...option,
    count: proposalVotes.filter((vote) => vote.option_id === option.id).length,
  }));
  const resultText = closedResultText(counts, proposal.passed, totalVotes);
  const detailsId = `proposal-details-${proposal.id}`;

  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d9decf] bg-white shadow-sm">
      <div className="border-l-4 border-[#587246] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <button
          aria-controls={detailsId}
          aria-expanded={isExpanded}
          className="group min-w-0 flex-1 rounded-md text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#9eb58d]"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {proposal.is_pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4e6] px-2.5 py-1 text-xs font-semibold text-[#315235]">
                    <Pin size={13} aria-hidden="true" />
                    Pinned
                  </span>
                ) : null}
                <span className="rounded-full bg-[#f2eee8] px-2.5 py-1 text-xs font-semibold capitalize text-[#7a5638]">
                  {proposal.status}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-[#111411] transition group-hover:text-[#315235]">
                {proposal.title}
              </h2>
            </div>
          </div>
        </button>
        {showAdminControls && isAdmin ? (
          <form action={toggleProposalPinAction}>
            <input name="proposalId" type="hidden" value={proposal.id} />
            <input name="shouldPin" type="hidden" value={proposal.is_pinned ? "false" : "true"} />
            <button
              className="flex size-10 items-center justify-center rounded-md border border-[#d9decf] bg-[#fbfcf8] text-[#3e4a36] transition hover:bg-[#eef2e8]"
              title={proposal.is_pinned ? "Unpin proposal" : "Pin proposal"}
              type="submit"
            >
              {proposal.is_pinned ? <PinOff size={17} aria-hidden="true" /> : <Pin size={17} aria-hidden="true" />}
            </button>
          </form>
        ) : null}
      </div>
      <div className="mt-1">
        <MemberIdentity member={proposal.author ?? null} showBadge={false} size="sm" />
      </div>
      <button
        aria-controls={detailsId}
        aria-expanded={isExpanded}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#718063] outline-none transition hover:text-[#315235] focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#9eb58d] sm:hidden"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        {isExpanded ? "Tap to collapse" : "Tap for details"}
        <ChevronDown
          className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          size={15}
          aria-hidden="true"
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0 sm:mt-4 sm:grid-rows-[1fr] sm:opacity-100"
        }`}
        id={detailsId}
      >
        <div className="overflow-hidden">
          <p className="text-base leading-7 text-[#374032]">{proposal.summary}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#596153]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f8ef] px-3 py-1.5">
          <Vote size={15} aria-hidden="true" />
          {totalVotes} votes cast
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f0e7] px-3 py-1.5 text-[#6c5136]">
          <Clock size={15} aria-hidden="true" />
          {proposal.status === "closed"
            ? "Closed"
            : `Closes ${formatShortDate(proposal.window?.ends_at ?? proposal.voting_closes_at)}`}
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        {counts.map((option) => {
          const percent = totalVotes ? Math.round((option.count / totalVotes) * 100) : 0;
          const selected = userVote?.option_id === option.id;

          if (canSeeResults) {
            return (
              <div
                className={`overflow-hidden rounded-[10px] border ${
                  selected ? "border-[#587246] bg-[#f4f8ef]" : "border-[#e1e5d9] bg-white"
                }`}
                key={option.id}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0 text-sm font-semibold text-[#293421]">
                    {option.label}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[#596153]">
                    {option.count} / {percent}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#edf0e7]">
                  <div className="h-full bg-[#587246]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          }

          return (
            <form action={castVoteAction} key={option.id}>
              <input name="proposalId" type="hidden" value={proposal.id} />
              <input name="optionId" type="hidden" value={option.id} />
              <button
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[10px] border border-[#d9decf] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#293421] transition hover:border-[#587246] hover:bg-[#f4f8ef] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canVote}
                type="submit"
              >
                <span>{option.label}</span>
                {canVote ? (
                  <Vote className="shrink-0 text-[#587246]" size={17} aria-hidden="true" />
                ) : (
                  <Lock className="shrink-0 text-[#8a9380]" size={16} aria-hidden="true" />
                )}
              </button>
            </form>
          );
        })}
      </div>

      {!memberId ? (
        <p className="mt-4 rounded-md bg-[#f4f0e7] px-3 py-2 text-sm leading-6 text-[#6c5136]">
          Sign in to vote or submit a proposal.
        </p>
      ) : !canSeeResults && userVote ? null : !canSeeResults ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#6a725f]">
          <BarChart3 size={16} aria-hidden="true" />
          Results unlock after you vote.
        </p>
      ) : proposal.status === "closed" ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#293421]">
          <CheckCircle2 size={16} aria-hidden="true" />
          {resultText}
        </p>
      ) : null}

      {canSeeResults && proposalVotes.length ? (
        <div
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
            isExpanded
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0 sm:mt-4 sm:grid-rows-[1fr] sm:opacity-100"
          }`}
        >
          <div className="overflow-hidden">
          <div className="rounded-[10px] bg-[#fbfcf8] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
              <BarChart3 size={16} aria-hidden="true" />
              Vote activity
            </div>
            <div className="mt-3 grid gap-2">
              {proposalVotes.map((vote) => (
                <div className="flex items-center gap-3 text-sm" key={vote.voter_member_id}>
                  <MemberAvatar
                    color={vote.voter?.avatar_color ?? null}
                    name={vote.voter ? memberDisplayName(vote.voter) : "League member"}
                    size="sm"
                  />
                  <p className="min-w-0 text-[#626b59]">
                    <MemberIdentity member={vote.voter ?? null} showBadge={false} size="sm" />{" "}
                    voted for{" "}
                    <span className="font-semibold text-[#293421]">
                      {proposal.options.find((option) => option.id === vote.option_id)?.label ?? "an option"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {showAdminControls && isAdmin ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {proposal.status === "voting" ? (
            <form action={closeVotingAction}>
              <input name="proposalId" type="hidden" value={proposal.id} />
              <button
                className="h-10 w-full rounded-md border border-[#d9decf] bg-white px-3 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8]"
                type="submit"
              >
                Close voting
              </button>
            </form>
          ) : null}
          <form action={deleteProposalAction} className={proposal.status === "voting" ? "" : "sm:col-span-2"}>
            <input name="proposalId" type="hidden" value={proposal.id} />
            {isConfirmingDelete ? (
              <div className="grid grid-cols-2 gap-2 rounded-md border border-red-200 bg-red-50 p-2">
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  <X size={16} aria-hidden="true" />
                  Cancel
                </button>
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800"
                  type="submit"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            ) : (
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                onClick={() => setIsConfirmingDelete(true)}
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete proposal
              </button>
            )}
          </form>
        </div>
      ) : null}
      </div>
    </article>
  );
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "soon";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}
